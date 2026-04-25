import http from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const host = "127.0.0.1";
const port = 4173;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = http.createServer(async (req, res) => {
  try {
    const requestPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const normalizedPath = path.normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, "");
    let filePath = path.join(root, normalizedPath === "/" ? "index.html" : normalizedPath);

    if (!existsSync(filePath)) {
      sendNotFound(res);
      return;
    }

    const fileInfo = await stat(filePath);
    if (fileInfo.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      if (!existsSync(filePath)) {
        sendNotFound(res);
        return;
      }
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extension] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });

    const stream = createReadStream(filePath);
    stream.on("error", () => {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      }
      res.end("Erro ao ler o arquivo.");
    });
    stream.pipe(res);
  } catch {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    }
    res.end("Erro interno do servidor.");
  }
});

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});

function sendNotFound(res) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Arquivo não encontrado.");
}
