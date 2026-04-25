import fs from "node:fs/promises";

const spreadsheetId = "1t4nJztyl5vTtSjyVAILTeefAy6HiLoY7dttabobBgVU";
const sheets = ["2020", "2025", "2026"];

const desiredHeaders = [
  "ANO",
  "MÊS",
  "STATUS",
  "ID",
  "TÍTULO DO LIVRO",
  "AUTOR",
  "TRADUÇÃO",
  "EDITORA",
  "ACABAMENTO",
  "DATA DE PUBLICAÇÃO",
  "NÚMERO DE PÁGINAS",
  "DIMENSÕES",
  "URL DA CAPA",
  "FOTO DO AUTOR",
  "LINK DE PARCEIRO",
  "AVALIAÇÃO",
  "DATA:",
  "AVALIAÇÃO SKOOB",
  "SOBRE O LIVRO",
  "LINK REDES SOCIAIS",
  "RESENHA YOUTUBE",
  "TERROR NACIONAL YOUTUBE",
  "LINK YOUTUBE"
];

const merged = [];

for (const sheet of sheets) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=${encodeURIComponent(sheet)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar a aba ${sheet}: HTTP ${response.status}`);
  }

  const csv = await response.text();
  const { headers, body } = parseCSV(csv);
  const indexMap = new Map(headers.map((header, index) => [header, index]));

  for (const row of body) {
    const record = {};

    for (const header of desiredHeaders) {
      const index = indexMap.get(header);
      record[header] = index === undefined ? "" : row[index] || "";
    }

    if ((record["TÍTULO DO LIVRO"] || "").trim()) {
      merged.push(record);
    }
  }
}

merged.sort((left, right) => {
  const yearDiff = Number(left["ANO"] || 0) - Number(right["ANO"] || 0);
  if (yearDiff !== 0) {
    return yearDiff;
  }

  return Number(left["ID"] || 0) - Number(right["ID"] || 0);
});

const output = [
  desiredHeaders.join(","),
  ...merged.map((record) => desiredHeaders.map((header) => csvEscape(record[header])).join(","))
].join("\n");

await fs.writeFile("books.csv", output, "utf8");
console.log(`books.csv consolidado com ${merged.length} livros.`);

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
  return { headers, body };
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
