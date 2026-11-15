// Local preview at the same /eigenvista/ prefix used by GitHub Pages.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../site",
);
const port = Number(process.argv[2] || 5190);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw Error("Choose a valid local port");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".vtt": "text/vtt; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".xyz": "text/plain",
  ".pdb": "text/plain",
  ".cif": "text/plain",
  ".cube": "text/plain",
};
const server = http.createServer((request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
  } catch {
    response.writeHead(400).end();
    return;
  }
  if (pathname === "/" || pathname === "/eigenvista") {
    response.writeHead(302, { Location: "/eigenvista/" }).end();
    return;
  }
  if (!pathname.startsWith("/eigenvista/")) {
    response.writeHead(404).end();
    return;
  }
  const relative = pathname.slice("/eigenvista/".length) || "index.html";
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep)) {
    response.writeHead(403).end();
    return;
  }
  let file = target,
    status = 200;
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink())
      throw Error("Not a regular file");
  } catch {
    file = path.join(root, "404.html");
    status = 404;
  }
  if (!fs.existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  const size = fs.statSync(file).size;
  const headers = {
    "Content-Type": types[path.extname(file)] || "application/octet-stream",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
    "Content-Length": size,
  };
  // Safari probes and seeks MP4s with byte ranges, as it does on Pages.
  const range = request.method === "GET" && status === 200 &&
    request.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
  let start = 0, end = size - 1;
  if (range && (range[1] || range[2])) {
    start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    end = range[1] && range[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
      response.writeHead(416, { "Content-Range": `bytes */${size}`, "Content-Length": 0 }).end();
      return;
    }
    status = 206;
    headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    headers["Content-Length"] = end - start + 1;
  }
  response.writeHead(status, headers);
  if (request.method === "HEAD") response.end();
  else fs.createReadStream(file, size ? { start, end } : {}).pipe(response);
});
server.once("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () =>
  console.log(`EigenVista website: http://127.0.0.1:${port}/eigenvista/`),
);
process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
