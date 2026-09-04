import { readFile } from "node:fs/promises";
import http from "node:http";
import { extname, join } from "node:path";

const root = import.meta.dirname;
const port = 4173;
const files = new Map([["/", "index.html"], ["/index.html", "index.html"], ["/app.js", "app.js"], ["/style.css", "style.css"]]);
const types = new Map([[".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"], [".css", "text/css; charset=utf-8"]]);

const server = http.createServer(async (request, response) => {
  if (request.url === "/health") {
    response.setHeader("content-type", "application/json");
    response.end('{"ok":true}');
    return;
  }
  const file = files.get(request.url);
  if (!file) {
    response.statusCode = 404;
    response.end("Not found");
    return;
  }
  response.setHeader("content-type", types.get(extname(file)) ?? "application/octet-stream");
  response.end(await readFile(join(root, file)));
});

server.listen(port, "127.0.0.1", () => console.log(`Orbit fixture ready at http://127.0.0.1:${port}`));
