import { BOOKS_DATA } from "./books-data.js";

export const LOCAL_JSON_URL = "./books.json";
export const LOCAL_CSV_URL = "./books.csv";

export const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1t4nJztyl5vTtSjyVAILTeefAy6HiLoY7dttabobBgVU/export?format=csv&gid=0";

export const FALLBACK_COVER =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 460">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#231b18"/>
          <stop offset="100%" stop-color="#111114"/>
        </linearGradient>
      </defs>
      <rect width="320" height="460" fill="url(#g)"/>
      <text x="50%" y="47%" dominant-baseline="middle" text-anchor="middle"
        fill="#f3e7d7" font-family="Arial, sans-serif" font-size="24" font-weight="700">
        Sem capa
      </text>
      <text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle"
        fill="#c2b19d" font-family="Arial, sans-serif" font-size="15">
        Darkestante
      </text>
    </svg>
  `);

export const FALLBACK_AUTHOR =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <rect width="120" height="120" rx="60" fill="#201918"/>
      <circle cx="60" cy="45" r="22" fill="#8c6d59"/>
      <path d="M22 104c6-22 21-32 38-32s32 10 38 32" fill="#8c6d59"/>
    </svg>
  `);

const MANUAL_COVER_OVERRIDES = {
  pecatricce: "./assets/covers/pecatricce-manual.svg",
  "um-livro-para-ser-entendido":
    "https://http2.mlstatic.com/D_NQ_NP_601264-MLB45556423782_042021-O.webp"
};

export async function fetchBooks() {
  let lastError = null;

  try {
    if (Array.isArray(BOOKS_DATA) && BOOKS_DATA.length > 0) {
      const books = BOOKS_DATA.map(normalizeBook).filter((book) => book.title || book.author);
      if (books.length > 0) {
        return books;
      }
    }
  } catch (error) {
    lastError = error;
  }

  try {
    const jsonResponse = await fetch(LOCAL_JSON_URL);
    if (jsonResponse.ok) {
      const rawBooks = await jsonResponse.json();
      const books = rawBooks.map(normalizeBook).filter((book) => book.title || book.author);
      if (books.length > 0) {
        return books;
      }
    }
  } catch (error) {
    lastError = error;
  }

  try {
    const csvResponse = await fetch(LOCAL_CSV_URL);
    if (csvResponse.ok) {
      const csvText = await csvResponse.text();
      const rows = consolidateRows(parseCSV(csvText));
      const books = rows.map(normalizeBook).filter((book) => book.title || book.author);
      if (books.length > 0) {
        return books;
      }
    }
  } catch (error) {
    lastError = error;
  }

  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}`);
    }

    const csvText = await response.text();
    const rows = consolidateRows(parseCSV(csvText));
    const books = rows.map(normalizeBook).filter((book) => book.title || book.author);

    if (books.length > 0) {
      return books;
    }
  } catch (error) {
    lastError = error;
  }

  throw lastError || new Error("Não foi possível carregar nenhuma fonte de dados.");
}

export function normalizeText(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function sanitizeUrl(value) {
  const url = (value || "").trim();
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

export function extractUrlFromText(value) {
  const directUrl = sanitizeUrl(value);
  if (directUrl) {
    return directUrl;
  }

  const match = String(value || "").match(/https?:\/\/[^\s"'<>]+/);
  return match ? sanitizeUrl(match[0]) : "";
}

export function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseCSV(csvText) {
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

export function consolidateRows(rows) {
  const books = [];
  let currentBook = null;

  for (const rawRow of rows) {
    const row = {};
    Object.entries(rawRow).forEach(([key, value]) => {
      row[key] = value || "";
    });

    const title = String(row["TÍTULO DO LIVRO"] || "").trim();
    if (title) {
      currentBook = { ...row };
      books.push(currentBook);
      continue;
    }

    if (!currentBook || !hasContinuationContent(row)) {
      continue;
    }

    Object.entries(row).forEach(([key, rawValue]) => {
      const value = String(rawValue || "").trim();
      if (!value || key === "TÍTULO DO LIVRO") {
        return;
      }

      const currentValue = String(currentBook[key] || "").trim();
      if (!currentValue) {
        currentBook[key] = value;
        return;
      }

      if (currentValue.includes(value)) {
        return;
      }

      currentBook[key] = `${currentValue}\n${value}`;
    });
  }

  return books;
}

export function normalizeBook(row) {
  const statusRaw = cleanField(row["STATUS"]);
  const normalizedStatus = normalizeText(statusRaw);
  const isRead = normalizedStatus === "lido";
  const isUnread = normalizedStatus === "nao lido";
  const title = cleanField(row["TÍTULO DO LIVRO"]);
  const author = cleanField(row["AUTOR"]);
  const id = cleanField(row["ID"]);
  const publisher = cleanField(row["EDITORA"]);
  const publisherKey = normalizeText(publisher);
  const partnerPublishers = new Set(["avec", "palavra e verso", "sinna", "principis"]);
  const socialRaw = cleanField(row["LINK REDES SOCIAIS"]);
  const manualCover = MANUAL_COVER_OVERRIDES[slugify(title)];
  const youtubeRaw = [
    row["RESENHA YOUTUBE"],
    row["LINK YOUTUBE"],
    row["TERROR NACIONAL YOUTUBE"]
  ]
    .map(cleanField)
    .find(Boolean) || "";

  return {
    id,
    slug: `${id || "livro"}-${slugify(title || author || "sem-titulo")}`,
    title,
    author,
    translation: cleanField(row["TRADUÇÃO"]),
    publisher,
    finish: cleanField(row["ACABAMENTO"]),
    publicationDate: cleanField(row["DATA DE PUBLICAÇÃO"]),
    pageCount: cleanField(row["NÚMERO DE PÁGINAS"]),
    dimensions: cleanField(row["DIMENSÕES"]),
    month: cleanField(row["MÊS"]),
    year: cleanField(row["ANO"]),
    description: cleanField(row["SOBRE O LIVRO"]),
    review: cleanField(row["AVALIAÇÃO SKOOB"]),
    reviewDate: cleanField(row["DATA:"]),
    score: isRead ? cleanField(row["AVALIAÇÃO"]) : "",
    cover: manualCover || sanitizeUrl(row["URL DA CAPA"]),
    authorPhoto: sanitizeUrl(row["FOTO DO AUTOR"]),
    affiliateLink: sanitizeUrl(row["LINK DE PARCEIRO"]),
    socialEmbed: socialRaw,
    socialUrl: extractUrlFromText(socialRaw),
    youtubeEmbed: youtubeRaw,
    youtubeUrl: extractUrlFromText(youtubeRaw),
    isPartnerPublisher: partnerPublishers.has(publisherKey),
    statusLabel: isRead ? "Lido" : isUnread ? "Não lido" : "Sem status",
    statusKey: isRead ? "lido" : isUnread ? "nao lido" : "sem status"
  };
}

function cleanField(value) {
  const text = (value || "").toString().trim();
  return text === "-" ? "" : text;
}

function hasContinuationContent(row) {
  return Object.entries(row).some(([key, value]) => {
    if (!String(value || "").trim()) {
      return false;
    }

    return key !== "TÍTULO DO LIVRO";
  });
}
