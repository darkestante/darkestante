import { execFileSync } from "node:child_process";

const target = process.argv[2] || "Um livro para ser entendido";
const sheetTarget = "xl/worksheets/sheet1.xml";

const sharedStringsXml = execFileSync("unzip", ["-p", "latest.xlsx", "xl/sharedStrings.xml"], {
  encoding: "utf8"
});
const sheetXml = execFileSync("unzip", ["-p", "latest.xlsx", sheetTarget], { encoding: "utf8" });

const sharedStrings = [...sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => {
  const fragment = match[1];
  const parts = [...fragment.matchAll(/<t(?:[^>]*)>([\s\S]*?)<\/t>/g)].map((part) =>
    decodeXml(part[1])
  );
  return parts.join("");
});

const rows = [];
for (const rowMatch of sheetXml.matchAll(/<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
  const [, rowNumber, rowXml] = rowMatch;
  const cells = [];

  for (const cellMatch of rowXml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g)) {
    const attrs = cellMatch[1] || cellMatch[3] || "";
    const inner = cellMatch[2] || "";
    const refMatch = attrs.match(/r="([A-Z]+)\d+"/);
    if (!refMatch) continue;

    const ref = refMatch[0].replace(/r="|"/g, "");
    const typeMatch = attrs.match(/t="([^"]+)"/);
    const type = typeMatch ? typeMatch[1] : "";
    const valueMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
    const rawValue = valueMatch ? decodeXml(valueMatch[1]) : "";
    const value = type === "s" ? sharedStrings[Number(rawValue)] || "" : rawValue;

    cells.push({ ref, col: ref.replace(/\d+/g, ""), value });
  }

  const joined = cells.map((cell) => cell.value).join(" | ");
  if (joined.includes(target)) {
    rows.push({ rowNumber, cells });
  }
}

console.log(JSON.stringify(rows, null, 2));

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#10;/g, "\n");
}
