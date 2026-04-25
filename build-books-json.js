import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";

const books = await loadBooks();

await fs.writeFile("books.json", JSON.stringify(books, null, 2), "utf8");
console.log(`books.json gerado com ${books.length} livros.`);

async function loadBooks() {
  try {
    await fs.access("latest.xlsx");
    const workbookRows = loadBooksFromWorkbook();
    if (workbookRows.length > 0) {
      return consolidateRows(workbookRows);
    }
  } catch {}

  try {
    const csvText = await fs.readFile("books.csv", "utf8");
    const rows = consolidateRows(parseCSV(csvText));
    if (rows.length > 0) {
      return rows;
    }
  } catch {}

  return loadBooksFromWorkbook();
}

function loadBooksFromWorkbook() {
  const workbookXml = unzipText("xl/workbook.xml");
  const workbookRelsXml = unzipText("xl/_rels/workbook.xml.rels");
  const sharedStringsXml = unzipText("xl/sharedStrings.xml");

  const sheets = parseWorkbookSheets(workbookXml, workbookRelsXml);
  const sharedStrings = parseSharedStrings(sharedStringsXml);
  const books = [];

  for (const sheet of sheets) {
    const sheetXml = unzipText(`xl/${sheet.target}`);
    const rows = parseSheetRows(sheetXml, sharedStrings);

    if (rows.length < 2) {
      continue;
    }

    const headers = rows[0];
    for (const row of rows.slice(1)) {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index] || "";
      });

      books.push(record);
    }
  }

  return consolidateRows(books);
}

function parseCSV(csvText) {
  const rows = [];
  let currentValue = "";
  let currentRow = [];
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentValue);
      currentValue = "";

      if (currentRow.some((value) => value !== "")) {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  const [headers = [], ...body] = rows;
  return body.map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] || "";
    });
    return record;
  });
}

function consolidateRows(rows) {
  const books = [];
  let currentBook = null;

  for (const rawRow of rows) {
    const row = normalizeRecord(rawRow);
    const title = (row["TÍTULO DO LIVRO"] || "").trim();

    if (title) {
      currentBook = { ...row };
      books.push(currentBook);
      continue;
    }

    if (!currentBook || !hasContinuationContent(row)) {
      continue;
    }

    mergeIntoBook(currentBook, row);
  }

  return books.filter((row) => (row["TÍTULO DO LIVRO"] || "").trim());
}

function normalizeRecord(row) {
  const record = {};
  Object.entries(row).forEach(([key, value]) => {
    record[key] = value || "";
  });
  return record;
}

function hasContinuationContent(row) {
  return Object.entries(row).some(([key, value]) => {
    if (!String(value || "").trim()) {
      return false;
    }

    return key !== "TÍTULO DO LIVRO";
  });
}

function mergeIntoBook(target, source) {
  for (const [key, rawValue] of Object.entries(source)) {
    const value = String(rawValue || "").trim();
    if (!value || key === "TÍTULO DO LIVRO") {
      continue;
    }

    const currentValue = String(target[key] || "").trim();
    if (!currentValue) {
      target[key] = value;
      continue;
    }

    if (currentValue.includes(value)) {
      continue;
    }

    target[key] = `${currentValue}\n${value}`;
  }
}

function unzipText(entryPath) {
  return execFileSync("unzip", ["-p", "latest.xlsx", entryPath], { encoding: "utf8" });
}

function parseWorkbookSheets(workbook, rels) {
  const relMap = new Map();
  for (const match of rels.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    relMap.set(match[1], match[2]);
  }

  const sheets = [];
  for (const match of workbook.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    const [, name, relId] = match;
    const target = relMap.get(relId);
    if (target) {
      sheets.push({ name, target });
    }
  }
  return sheets;
}

function parseSharedStrings(xml) {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => {
    const fragment = match[1];
    const parts = [...fragment.matchAll(/<t(?:[^>]*)>([\s\S]*?)<\/t>/g)].map((part) =>
      decodeXml(part[1])
    );
    return parts.join("");
  });
}

function parseSheetRows(xml, sharedStrings) {
  const rows = [];

  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowXml = rowMatch[1];
    const row = new Array(21).fill("");

    for (const cellMatch of rowXml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g)) {
      const attrs = cellMatch[1] || cellMatch[3] || "";
      const inner = cellMatch[2] || "";
      const refMatch = attrs.match(/r="([A-Z]+)\d+"/);
      if (!refMatch) {
        continue;
      }

      const colIndex = columnToIndex(refMatch[1]);
      if (colIndex > 20) {
        continue;
      }

      const typeMatch = attrs.match(/t="([^"]+)"/);
      const type = typeMatch ? typeMatch[1] : "";
      const valueMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
      const rawValue = valueMatch ? decodeXml(valueMatch[1]) : "";

      let value = "";
      if (type === "s") {
        value = sharedStrings[Number(rawValue)] || "";
      } else {
        value = rawValue;
      }

      row[colIndex] = normalizeCellValue(colIndex, value);
    }

    rows.push(row);
  }

  return rows;
}

function normalizeCellValue(colIndex, value) {
  if (value === "") {
    return "";
  }

  if ((colIndex === 9 || colIndex === 16) && /^\d+(\.\d+)?$/.test(value)) {
    return excelDateToBr(value);
  }

  if ((colIndex === 0 || colIndex === 3) && /^\d+(\.\d+)?$/.test(value)) {
    return String(Math.round(Number(value)));
  }

  if (/^\d+\.0$/.test(value)) {
    return String(Math.round(Number(value)));
  }

  return value;
}

function excelDateToBr(serial) {
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const date = new Date(excelEpoch.getTime() + Number(serial) * 86400000);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function columnToIndex(column) {
  let index = 0;
  for (const char of column) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }
  return index - 1;
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#10;/g, "\n");
}
