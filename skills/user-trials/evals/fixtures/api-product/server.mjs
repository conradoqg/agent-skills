import http from "node:http";

const port = 43871;
const invoices = [
  { id: "inv-100", customer: "Acme", total: 12500, currency: "BRL" },
  { id: "inv-101", customer: "Globex", total: 8400, currency: "BRL" }
];

const server = http.createServer((request, response) => {
  response.setHeader("content-type", "application/json");
  if (request.method === "GET" && request.url === "/health") {
    response.end(JSON.stringify({ ok: true }));
    return;
  }
  if (request.method === "GET" && (request.url === "/v1/invoices" || request.url?.startsWith("/v1/invoices?"))) {
    response.setHeader("x-next-cursor", "inv-101");
    response.end(JSON.stringify({ data: invoices }));
    return;
  }
  if (request.method === "GET" && request.url?.startsWith("/v1/invoices/")) {
    response.statusCode = 404;
    response.end(JSON.stringify({ code: "INV_404" }));
    return;
  }
  response.statusCode = request.method === "GET" ? 404 : 405;
  response.end(JSON.stringify({ code: response.statusCode === 405 ? "METHOD_NOT_ALLOWED" : "NOT_FOUND" }));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`invoice fixture listening on http://127.0.0.1:${port}`);
});
