#!/usr/bin/env node

const [method = "GET", path = "/health"] = process.argv.slice(2);
const invoices = [
  { id: "inv-100", customer: "Acme", total: 12500, currency: "BRL" },
  { id: "inv-101", customer: "Globex", total: 8400, currency: "BRL" }
];

let status = 404;
let headers = { "content-type": "application/json" };
let body = { code: "NOT_FOUND" };

if (method === "GET" && path === "/health") {
  status = 200;
  body = { ok: true };
} else if (method === "GET" && (path === "/v1/invoices" || path.startsWith("/v1/invoices?"))) {
  status = 200;
  headers["x-next-cursor"] = "inv-101";
  body = { data: invoices };
} else if (method === "GET" && path.startsWith("/v1/invoices/")) {
  status = 404;
  body = { code: "INV_404" };
} else if (method !== "GET") {
  status = 405;
  body = { code: "METHOD_NOT_ALLOWED" };
}

const reason = new Map([[200, "OK"], [404, "Not Found"], [405, "Method Not Allowed"]]).get(status);
console.log(`${method} ${path}`);
console.log(`HTTP/1.1 ${status} ${reason}`);
for (const [name, value] of Object.entries(headers)) console.log(`${name}: ${value}`);
console.log("");
console.log(JSON.stringify(body));
process.exit(status >= 500 ? 1 : 0);
