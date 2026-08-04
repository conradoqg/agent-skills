#!/usr/bin/env node
// Deterministic builder for the `large` code-review fixture.
//
// It is evaluator-only material: `evals/` is stripped from the skill copy the
// runtime sees, so nothing here reaches a candidate. The archive it writes
// carries no annotation of any kind — the answer key exists only in
// `evals/ground-truth/large.json`, which the harness reads privately.
//
// Usage: node skills/code-review/evals/fixtures/build-large.mjs [--keep <dir>]
//
// Difficulty contract for this fixture:
//   * no finding is announced by a comment, a file name, or a directory name;
//   * most findings need an unchanged file to be read before impact is visible;
//   * decoys look dangerous and are safe, so diff-only reading is punished;
//   * defects that predate `main` and defects fixed inside the range must not
//     be reported;
//   * findings are anchored at the offending statement inside realistic files.

import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_EVALS = resolve(HERE, "..");
const ARCHIVE = join(HERE, "large.zip");
const GROUND_TRUTH = join(SKILL_EVALS, "ground-truth", "large.json");
const BRANCH = "feature/billing-tenant-hardening";
const AUTHOR = "Dana Ferreira <dana@example.invalid>";
const EPOCH = Date.UTC(2026, 1, 2, 9, 0, 0);
const LINE_TOLERANCE = 6;

function git(cwd, args, index = 0) {
  const stamp = new Date(EPOCH + index * 900_000).toISOString();
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: AUTHOR.split(" <")[0],
      GIT_AUTHOR_EMAIL: AUTHOR.split(" <")[1].replace(">", ""),
      GIT_COMMITTER_NAME: AUTHOR.split(" <")[0],
      GIT_COMMITTER_EMAIL: AUTHOR.split(" <")[1].replace(">", ""),
      GIT_AUTHOR_DATE: stamp,
      GIT_COMMITTER_DATE: stamp,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null"
    }
  });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}

function run(cwd, command, args) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}

async function writeTree(root, files) {
  for (const [path, content] of Object.entries(files)) {
    if (content === null) {
      await rm(join(root, path), { force: true });
      continue;
    }
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content.endsWith("\n") ? content : `${content}\n`);
  }
}

// ---------------------------------------------------------------------------
// main: the reviewed base. Several files here are never touched by the feature
// branch on purpose; they hold the guarantees, the callers, and the pre-existing
// defects that make the range hard to review from the diff alone.
// ---------------------------------------------------------------------------

const BASE = {
  "package.json": `{
  "name": "orchard",
  "private": true,
  "version": "3.4.0",
  "workspaces": ["packages/*", "apps/*", "workers"],
  "scripts": {
    "test": "node --test tests/unit",
    "lint": "eslint ."
  },
  "engines": { "node": ">=20" }
}`,

  "README.md": `# Orchard

Multi-tenant invoicing platform.

- \`apps/api\` — tenant-facing HTTP API.
- \`apps/web\` — operator console.
- \`workers\` — asynchronous billing and delivery jobs.
- \`packages/shared\` — cross-cutting helpers every service imports.

Every request carries a tenant. Data access must be scoped by \`tenant_id\`, and
outbound HTTP must go through \`packages/shared/src/http/client.ts\`.
`,

  "docs/architecture.md": `# Architecture notes

## Trust boundaries

1. \`apps/api\` terminates tenant traffic. The middleware chain in
   \`apps/api/src/middleware/index.ts\` runs for every \`/v1\` route, so route
   modules do not repeat authentication.
2. Outbound HTTP always goes through \`fetchGuarded\`. It is the single place
   where an egress target is validated, because several call sites forward
   customer-supplied URLs.
3. Cache keys must include the tenant. The helpers in
   \`packages/shared/src/cache/key.ts\` are the only supported way to build one.

## Conventions

- Repository functions take the tenant first and the entity id second.
- Wire responses use snake_case; the console reads those names directly.
- Maintenance scripts under \`scripts/maintenance\` run from the cron schedule in
  \`infra/config/cron.yaml\`.
`,

  "packages/shared/src/validation/url.ts": `const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal"]);
const BLOCKED_PREFIXES = ["10.", "192.168.", "169.254.", "172.16.", "172.17.", "172.18.", "172.19."];

/**
 * True only for a URL that is safe to fetch from a service that also has
 * private network access: https, no credentials, no internal host.
 */
export function isPublicHttpUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;
  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) return false;
  if (BLOCKED_PREFIXES.some((prefix) => host.startsWith(prefix))) return false;
  return true;
}
`,

  "packages/shared/src/validation/input.ts": `export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(\`\${field} is required\`);
  }
  return value.trim();
}

export function requirePositiveInt(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(\`\${field} must be a positive integer\`);
  }
  return parsed;
}

/** Slugs are customer supplied. Length is checked; the alphabet is not. */
export function requireSlug(value: unknown, field: string): string {
  const slug = requireString(value, field);
  if (slug.length > 64) throw new Error(\`\${field} is too long\`);
  return slug;
}
`,

  "packages/shared/src/http/client.ts": `import { isPublicHttpUrl } from "../validation/url.js";

export interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface FetchResult {
  status: number;
  body: string;
}

/**
 * Outbound HTTP for every service.
 *
 * Call sites forward customer-supplied URLs (webhook targets, avatar imports,
 * report callbacks), so this wrapper is the single egress trust boundary. Do
 * not bypass it and do not remove the target check without moving it into every
 * caller first.
 */
export async function fetchGuarded(rawUrl: string, options: FetchOptions = {}): Promise<FetchResult> {
  if (!isPublicHttpUrl(rawUrl)) {
    throw new Error(\`blocked egress target: \${rawUrl}\`);
  }
  return send(rawUrl, options);
}

async function send(url: string, options: FetchOptions): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = options.timeoutMs && options.timeoutMs > 0 ? setTimeout(() => controller.abort(), options.timeoutMs) : null;
  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: { "content-type": "application/json", ...(options.headers ?? {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    });
    return { status: response.status, body: await response.text() };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
`,

  "packages/shared/src/cache/key.ts": `/**
 * Cache key builders. Every key is tenant scoped: the cache is shared by all
 * tenants and a key collision is a cross-tenant data leak.
 */
export function invoiceCacheKey(tenantId: string, invoiceId: string): string {
  return \`inv:\${tenantId}:\${invoiceId}\`;
}

export function reportCacheKey(tenantId: string, reportName: string): string {
  return \`report:\${tenantId}:\${reportName}\`;
}

export function settingsCacheKey(tenantId: string): string {
  return \`settings:\${tenantId}\`;
}
`,

  "packages/shared/src/config/defaults.ts": `export interface RuntimeDefaults {
  requestTimeoutMs: number;
  billingBatchSize: number;
  webhookRetries: number;
  cacheTtlSeconds: number;
}

/**
 * Shared runtime defaults. \`workers\` and \`apps/api\` both read these values at
 * startup, so a change here reaches every service without a local override.
 */
export const runtimeDefaults: RuntimeDefaults = {
  requestTimeoutMs: 30_000,
  billingBatchSize: 200,
  webhookRetries: 3,
  cacheTtlSeconds: 60
};
`,

  "packages/shared/src/tenancy/scope.ts": `/**
 * Adds the tenant predicate to a query. Passing the raw SQL through this helper
 * is how the platform proves a read is tenant scoped.
 */
export function withTenant(sql: string, alias = "invoices"): string {
  const separator = /\\bwhere\\b/i.test(sql) ? " and " : " where ";
  return \`\${sql}\${separator}\${alias}.tenant_id = $1\`;
}

export function assertTenant(tenantId: unknown): string {
  if (typeof tenantId !== "string" || tenantId.length === 0) throw new Error("tenant context missing");
  return tenantId;
}
`,

  "packages/shared/src/sanitize/html.ts": `const ALLOWED = /^(b|i|em|strong|p|br|ul|ol|li|code)$/i;

/** Strips every tag outside the allow list and every attribute. */
export function sanitizeHtml(input: string): string {
  return input.replace(/<\\/?([a-z0-9-]+)(\\s[^>]*)?>/gi, (match, tag) => (ALLOWED.test(tag) ? \`<\${match.startsWith("</") ? "/" : ""}\${tag.toLowerCase()}>\` : ""));
}
`,

  "packages/shared/src/pagination.ts": `export interface Page {
  limit: number;
  offset: number;
}

export const MAX_LIMIT = 100;

export function clampPage(rawLimit: unknown, rawOffset: unknown): Page {
  const limit = Number(rawLimit);
  const offset = Number(rawOffset);
  return {
    limit: Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, MAX_LIMIT) : 25,
    offset: Number.isSafeInteger(offset) && offset >= 0 ? offset : 0
  };
}
`,

  "packages/shared/src/workspaces.ts": `import { requireSlug } from "./validation/input.js";

export interface Workspace {
  id: string;
  tenantId: string;
  /** Customer supplied. Only length is validated on write. */
  slug: string;
}

export async function loadWorkspace(db: any, workspaceId: string): Promise<Workspace> {
  const row = await db.one("select id, tenant_id, slug from workspaces where id = $1", [workspaceId]);
  return { id: row.id, tenantId: row.tenant_id, slug: requireSlug(row.slug, "slug") };
}
`,

  "apps/api/src/server.ts": `import { chain } from "./middleware/index.js";
import { routes } from "./router.js";

export function createServer() {
  return {
    async handle(request: any) {
      const route = routes.find((candidate) => candidate.method === request.method && candidate.path === request.path);
      if (!route) return { status: 404, body: { error: "not_found" } };
      return chain(route, request);
    }
  };
}
`,

  "apps/api/src/middleware/index.ts": `import { requireAuth, requireTenant } from "./auth.js";
import { rateLimit } from "./rate-limit.js";
import { requestId } from "./request-id.js";

export interface Route {
  method: string;
  path: string;
  handler: (request: any) => Promise<any> | any;
  middleware?: Array<(request: any) => void>;
}

/**
 * Global chain. It runs for every registered route, which is why route modules
 * do not call requireAuth themselves.
 */
export async function chain(route: Route, request: any) {
  requestId(request);
  rateLimit(request);
  requireAuth(request);
  requireTenant(request);
  for (const step of route.middleware ?? []) step(request);
  return route.handler(request);
}
`,

  "apps/api/src/middleware/auth.ts": `export function requireAuth(request: any): void {
  if (!request.user || typeof request.user.id !== "string") {
    throw Object.assign(new Error("unauthenticated"), { status: 401 });
  }
}

export function requireTenant(request: any): void {
  if (!request.user?.tenantId) {
    throw Object.assign(new Error("tenant context missing"), { status: 401 });
  }
}

/** Route level guard for operations that only staff may run. */
export function requireRole(role: string) {
  return (request: any) => {
    if (!Array.isArray(request.user?.roles) || !request.user.roles.includes(role)) {
      throw Object.assign(new Error("forbidden"), { status: 403 });
    }
  };
}
`,

  "apps/api/src/middleware/rate-limit.ts": `const counters = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(request: any, limit = 600, windowMs = 60_000): void {
  const key = request.user?.tenantId ?? request.ip ?? "anonymous";
  const now = Date.now();
  const entry = counters.get(key);
  if (!entry || entry.resetAt < now) {
    counters.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > limit) throw Object.assign(new Error("rate limited"), { status: 429 });
}
`,

  "apps/api/src/middleware/request-id.ts": `import { randomUUID } from "node:crypto";

export function requestId(request: any): void {
  request.id = typeof request.headers?.["x-request-id"] === "string" ? request.headers["x-request-id"] : randomUUID();
}
`,

  "apps/api/src/router.ts": `import type { Route } from "./middleware/index.js";
import { requireRole } from "./middleware/auth.js";
import { getInvoice, listInvoices } from "./invoices/routes.js";
import { exportReport } from "./reports/export.js";
import { updateProfile } from "./users/profile.js";
import { receiveWebhook } from "./webhooks/dispatch.js";

export const routes: Route[] = [
  { method: "GET", path: "/v1/invoices", handler: listInvoices },
  { method: "GET", path: "/v1/invoices/:id", handler: getInvoice },
  { method: "GET", path: "/v1/reports/export", handler: exportReport },
  { method: "PATCH", path: "/v1/users/me", handler: updateProfile },
  { method: "POST", path: "/v1/webhooks/inbound", handler: receiveWebhook, middleware: [requireRole("integration")] }
];
`,

  "apps/api/src/invoices/repository.ts": `import { withTenant } from "@orchard/shared/tenancy/scope.js";

export interface InvoiceRow {
  id: string;
  tenant_id: string;
  total_cents: number;
  status: string;
  created_at: string;
}

/** Tenant first, entity id second: the repository convention. */
export async function findInvoice(db: any, tenantId: string, invoiceId: string): Promise<InvoiceRow | null> {
  const sql = withTenant("select id, tenant_id, total_cents, status, created_at from invoices where invoices.id = $2");
  const rows = await db.query(sql, [tenantId, invoiceId]);
  return rows[0] ?? null;
}

export async function listInvoiceRows(db: any, tenantId: string, limit: number, offset: number): Promise<InvoiceRow[]> {
  const sql = withTenant("select id, tenant_id, total_cents, status, created_at from invoices");
  return db.query(\`\${sql} order by created_at desc limit $2 offset $3\`, [tenantId, limit, offset]);
}

export async function insertInvoice(db: any, tenantId: string, invoice: { id: string; totalCents: number }): Promise<void> {
  await db.query("insert into invoices (id, tenant_id, total_cents, status) values ($1, $2, $3, 'draft')", [invoice.id, tenantId, invoice.totalCents]);
}

export async function updateInvoiceTotal(db: any, tenantId: string, invoiceId: string, totalCents: number, expectedVersion: number): Promise<number> {
  const result = await db.query(
    "update invoices set total_cents = $3, version = version + 1 where tenant_id = $1 and id = $2 and version = $4",
    [tenantId, invoiceId, totalCents, expectedVersion]
  );
  return result.rowCount ?? 0;
}
`,

  "apps/api/src/invoices/service.ts": `import { invoiceCacheKey } from "@orchard/shared/cache/key.js";
import { runtimeDefaults } from "@orchard/shared/config/defaults.js";
import { assertTenant } from "@orchard/shared/tenancy/scope.js";
import { findInvoice, listInvoiceRows } from "./repository.js";

/**
 * Read path for a single invoice. The cache is shared across tenants, so the
 * key builder is what keeps one tenant from reading another one's invoice.
 */
export async function loadInvoice(context: any, invoiceId: string) {
  const tenantId = assertTenant(context.user?.tenantId);
  const key = invoiceCacheKey(tenantId, invoiceId);
  const cached = await context.cache.get(key);
  if (cached) return cached;
  const invoice = await findInvoice(context.db, tenantId, invoiceId);
  if (!invoice) return null;
  await context.cache.set(key, invoice, runtimeDefaults.cacheTtlSeconds);
  return invoice;
}

export async function loadInvoicePage(context: any, limit: number, offset: number) {
  const tenantId = assertTenant(context.user?.tenantId);
  return listInvoiceRows(context.db, tenantId, limit, offset);
}
`,

  "apps/api/src/invoices/routes.ts": `import { clampPage } from "@orchard/shared/pagination.js";
import { requireString } from "@orchard/shared/validation/input.js";
import { requireAuth } from "../middleware/auth.js";
import { loadInvoice, loadInvoicePage } from "./service.js";

function serialize(invoice: any) {
  return {
    id: invoice.id,
    total_cents: invoice.total_cents,
    status: invoice.status,
    created_at: invoice.created_at
  };
}

export async function getInvoice(request: any) {
  // Belt and braces: the global chain already authenticated this request.
  requireAuth(request);
  const invoiceId = requireString(request.params?.id, "id");
  const invoice = await loadInvoice(request.context, invoiceId);
  if (!invoice) return { status: 404, body: { error: "not_found" } };
  return { status: 200, body: serialize(invoice) };
}

export async function listInvoices(request: any) {
  requireAuth(request);
  const page = clampPage(request.query?.limit, request.query?.offset);
  const rows = await loadInvoicePage(request.context, page.limit, page.offset);
  return { status: 200, body: { items: rows.map(serialize), limit: page.limit, offset: page.offset } };
}
`,

  "apps/api/src/invoices/adjustments.ts": `import { requirePositiveInt } from "@orchard/shared/validation/input.js";
import { assertTenant } from "@orchard/shared/tenancy/scope.js";
import { findInvoice, updateInvoiceTotal } from "./repository.js";

/**
 * Applies a manual adjustment. Concurrent operators hit this path, so the
 * update is guarded by the version the caller read.
 */
export async function adjustInvoiceTotal(context: any, invoiceId: string, deltaCents: unknown) {
  const tenantId = assertTenant(context.user?.tenantId);
  const delta = requirePositiveInt(deltaCents, "deltaCents");
  const invoice: any = await findInvoice(context.db, tenantId, invoiceId);
  if (!invoice) return { status: 404, body: { error: "not_found" } };
  const updated = await updateInvoiceTotal(context.db, tenantId, invoiceId, invoice.total_cents + delta, invoice.version);
  if (updated === 0) return { status: 409, body: { error: "stale_invoice" } };
  return { status: 200, body: { id: invoiceId, total_cents: invoice.total_cents + delta } };
}
`,

  "apps/api/src/reports/export.ts": `import { readFile } from "node:fs/promises";
import { join } from "node:path";

const REPORT_ROOT = "/var/lib/orchard/reports";

/** Only these report files may be served. */
const REPORT_FILES: Record<string, string> = {
  "monthly-revenue": "monthly-revenue.csv",
  "aging": "aging.csv",
  "tax-summary": "tax-summary.csv"
};

export async function exportReport(request: any) {
  const requested = String(request.query?.name ?? "");
  const file = REPORT_FILES[requested];
  if (!file) return { status: 400, body: { error: "unknown_report" } };
  const body = await readFile(join(REPORT_ROOT, request.context.user.tenantId, file), "utf8");
  return { status: 200, body, headers: { "content-type": "text/csv" } };
}
`,

  "apps/api/src/webhooks/dispatch.ts": `import { fetchGuarded } from "@orchard/shared/http/client.js";
import { runtimeDefaults } from "@orchard/shared/config/defaults.js";
import { requireString } from "@orchard/shared/validation/input.js";

export interface Delivery {
  id: string;
  targetUrl: string;
  payload: unknown;
  attempts: number;
}

/**
 * Delivers one webhook. The target URL comes from tenant configuration, so it
 * is untrusted input and must go through fetchGuarded.
 */
export async function deliver(delivery: Delivery, metrics: any): Promise<boolean> {
  try {
    const response = await fetchGuarded(delivery.targetUrl, {
      method: "POST",
      body: delivery.payload,
      timeoutMs: runtimeDefaults.requestTimeoutMs
    });
    const delivered = response.status >= 200 && response.status < 300;
    metrics.increment(delivered ? "webhook.delivered" : "webhook.rejected");
    return delivered;
  } catch (error) {
    metrics.increment("webhook.failed");
    throw error;
  }
}

export async function receiveWebhook(request: any) {
  const event = requireString(request.body?.event, "event");
  await request.context.queue.publish("webhook.inbound", { event, tenantId: request.user.tenantId });
  return { status: 202, body: { accepted: true } };
}
`,

  "apps/api/src/users/profile.ts": `import { requireString } from "@orchard/shared/validation/input.js";

export async function updateProfile(request: any) {
  try {
    const displayName = requireString(request.body?.displayName, "displayName");
    await request.context.db.query("update users set display_name = $2 where id = $1", [request.user.id, displayName]);
    return { status: 200, body: { display_name: displayName } };
  } catch (error: any) {
    request.context.log.warn("profile update rejected", { userId: request.user.id, reason: error.message });
    return { status: 400, body: { error: "invalid_profile" } };
  }
}
`,

  "apps/api/src/auth/revoke.ts": `/**
 * Revocation path. Removing a role must take effect on the next request, so it
 * clears the session store synchronously.
 */
export async function revokeRole(context: any, userId: string, role: string) {
  await context.db.query("delete from user_roles where user_id = $1 and role = $2", [userId, role]);
  await context.sessions.delete(userId);
  context.log.info("role revoked", { userId, role });
}
`,

  "apps/api/src/legacy/token.ts": `import { createHash } from "node:crypto";

// Legacy digest kept for tokens issued before 2021. Scheduled for removal in
// ORCH-4412; it predates the current signing scheme.
export function legacyTokenDigest(token: string): string {
  return createHash("md5").update(token).digest("hex");
}
`,

  "apps/api/src/legacy/search.ts": `// Legacy admin search. Built before the query builder existed; tracked in
// ORCH-3987 and only reachable from the internal staff console.
export async function legacySearch(db: any, term: string) {
  return db.query(\`select id, tenant_id from invoices where notes like '%\${term}%'\`);
}
`,

  "apps/web/src/invoices/InvoiceList.ts": `interface InvoiceView {
  id: string;
  total_cents: number;
  status: string;
  created_at: string;
}

export function renderInvoiceRow(invoice: InvoiceView): string {
  const amount = (invoice.total_cents / 100).toFixed(2);
  return \`<tr><td>\${invoice.id}</td><td>\${amount}</td><td>\${invoice.status}</td></tr>\`;
}

export function renderInvoiceTable(payload: { items: InvoiceView[] }): string {
  return \`<table>\${payload.items.map(renderInvoiceRow).join("")}</table>\`;
}

export function totalOf(payload: { items: InvoiceView[] }): number {
  return payload.items.reduce((sum, invoice) => sum + invoice.total_cents, 0);
}
`,

  "apps/web/src/reports/ReportView.ts": `import { sanitizeHtml } from "@orchard/shared/sanitize/html.js";

export function renderReportNote(note: string): { html: string } {
  return { html: sanitizeHtml(note) };
}
`,

  "workers/src/billing/run.ts": `import { fetchGuarded } from "@orchard/shared/http/client.js";
import { runtimeDefaults } from "@orchard/shared/config/defaults.js";

/**
 * Nightly billing. Every provider call inherits the shared request timeout;
 * the job has no timeout of its own.
 */
export async function chargeBatch(providerUrl: string, batch: Array<{ id: string; amountCents: number }>) {
  const results: Array<{ id: string; status: number }> = [];
  for (const item of batch) {
    const response = await fetchGuarded(providerUrl, {
      method: "POST",
      body: item,
      timeoutMs: runtimeDefaults.requestTimeoutMs
    });
    results.push({ id: item.id, status: response.status });
  }
  return results;
}
`,

  "workers/src/queue/consumer.ts": `export interface Message {
  id: string;
  body: unknown;
  receipt: string;
}

/**
 * At-least-once consumer: the message is acknowledged only after the handler
 * succeeded, so a crash re-delivers instead of dropping work.
 */
export async function consume(queue: any, handler: (message: Message) => Promise<void>) {
  const message: Message | null = await queue.receive();
  if (!message) return false;
  await handler(message);
  await queue.ack(message.receipt);
  return true;
}
`,

  "db/migrations/0001_init.sql": `create table tenants (
  id text primary key,
  name text not null
);

create table invoices (
  id text primary key,
  tenant_id text not null references tenants(id),
  total_cents integer not null,
  status text not null,
  version integer not null default 0,
  created_at timestamptz not null default now()
);

create index invoices_tenant_created on invoices (tenant_id, created_at desc);
`,

  "db/migrations/0002_add_users.sql": `create table users (
  id text primary key,
  tenant_id text not null references tenants(id),
  display_name text not null,
  email text not null unique
);

create table user_roles (
  user_id text not null references users(id),
  role text not null,
  primary key (user_id, role)
);
`,

  "db/migrations/0003_add_workspaces.sql": `create table workspaces (
  id text primary key,
  tenant_id text not null references tenants(id),
  slug text not null
);

create unique index workspaces_tenant_slug on workspaces (tenant_id, slug);
`,

  ".github/workflows/ci.yml": `name: ci

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4.1.7
      - uses: actions/setup-node@v4.0.3
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
`,

  "infra/docker/Dockerfile": `FROM node:20.15.1-bookworm-slim@sha256:2a0a1d9d2b93bc46bbbba7e8b0d1e4d1f2b25f2d5a5a9a5f2f9de2c0f9b8e1c4

WORKDIR /srv/app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
USER node
CMD ["node", "apps/api/src/main.js"]
`,

  "infra/config/api.yaml": `service: orchard-api
replicas: 4

env:
  NODE_ENV: production
  LOG_LEVEL: info

features:
  debugEndpoints: false
  invoiceExport: true

limits:
  requestBodyBytes: 1048576
`,

  "infra/config/cron.yaml": `# Maintenance schedule. Every entry runs with the production database role.
jobs:
  - name: purge-drafts
    schedule: "0 3 * * *"
    command: node scripts/maintenance/purge-drafts.mjs
  - name: reindex
    schedule: "0 4 * * 0"
    command: node scripts/maintenance/reindex.mjs
`,

  "scripts/deploy.sh": `#!/usr/bin/env bash
set -euo pipefail

if [[ "\${ORCHARD_ENV:-}" != "production" ]]; then
  echo "refusing to deploy outside production" >&2
  exit 1
fi

kubectl apply -f infra/config/api.yaml
kubectl rollout status deployment/orchard-api --timeout=180s
`,

  "scripts/maintenance/purge-drafts.mjs": `#!/usr/bin/env node
import { connect } from "../lib/db.mjs";

const RETENTION_DAYS = 90;

const db = await connect();
const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
const result = await db.query("delete from invoices where status = 'draft' and created_at < $1", [cutoff]);
console.log(\`purged \${result.rowCount} draft invoices older than \${RETENTION_DAYS} days\`);
await db.end();
`,

  "scripts/maintenance/reindex.mjs": `#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { connect } from "../lib/db.mjs";

const db = await connect();
const workspaces = await db.query("select id from workspaces order by id", []);
for (const workspace of workspaces) {
  execFileSync("psql", ["-c", "reindex table invoices"], { stdio: "inherit" });
  console.log(\`reindexed for workspace \${workspace.id}\`);
}
await db.end();
`,

  "scripts/lib/db.mjs": `export async function connect() {
  return {
    async query() {
      throw new Error("db driver is provided by the runtime image");
    },
    async one() {
      throw new Error("db driver is provided by the runtime image");
    },
    async end() {}
  };
}
`,

  "tests/unit/invoices.test.ts": `import assert from "node:assert/strict";
import { test } from "node:test";
import { renderInvoiceRow, totalOf } from "../../apps/web/src/invoices/InvoiceList.js";

test("renders the invoice amount in currency units", () => {
  const row = renderInvoiceRow({ id: "inv_1", total_cents: 12_345, status: "open", created_at: "2026-01-01" });
  assert.match(row, /123\\.45/);
});

test("totals the page", () => {
  const total = totalOf({ items: [
    { id: "inv_1", total_cents: 100, status: "open", created_at: "2026-01-01" },
    { id: "inv_2", total_cents: 250, status: "open", created_at: "2026-01-02" }
  ] });
  assert.equal(total, 350);
});
`,

  "tests/unit/url.test.ts": `import assert from "node:assert/strict";
import { test } from "node:test";
import { isPublicHttpUrl } from "../../packages/shared/src/validation/url.js";

test("rejects internal and non-https targets", () => {
  assert.equal(isPublicHttpUrl("http://example.com"), false);
  assert.equal(isPublicHttpUrl("https://127.0.0.1/admin"), false);
  assert.equal(isPublicHttpUrl("https://metadata.google.internal/"), false);
  assert.equal(isPublicHttpUrl("https://billing.example.com/hook"), true);
});
`,

  "tests/unit/pagination.test.ts": `import assert from "node:assert/strict";
import { test } from "node:test";
import { clampPage, MAX_LIMIT } from "../../packages/shared/src/pagination.js";

test("clamps the page window", () => {
  assert.deepEqual(clampPage("10", "20"), { limit: 10, offset: 20 });
  assert.deepEqual(clampPage("5000", "-1"), { limit: MAX_LIMIT, offset: 0 });
  assert.deepEqual(clampPage(undefined, undefined), { limit: 25, offset: 0 });
});
`
};

// Files that exist only to be deleted by the feature branch: routine cleanup
// churn, so the range is not a pile of pure additions.
Object.assign(BASE, {
  "apps/web/src/legacy/OldChart.ts": `// Superseded by the reporting service. Nothing imports this module.
export function drawOldChart(values: number[]): string {
  return values.map((value) => "#".repeat(Math.max(0, Math.round(value / 10)))).join("\\n");
}
`,
  "docs/old-runbook.md": `# Runbook (superseded)

Replaced by docs/architecture.md and the per-service runbooks.
`
});

// ---------------------------------------------------------------------------
// Churn. Realistic, deliberately safe work that surrounds the real findings.
// Every template validates its input and escapes its output so a careful
// reviewer finds nothing to report here.
// ---------------------------------------------------------------------------

const CHURN_TOPICS = [
  "credit-note", "dunning", "tax-rate", "fx-rate", "payment-link", "receipt",
  "statement", "reminder", "refund", "coupon", "seat-count", "usage-meter",
  "proration", "trial", "grace-period", "collection", "ledger-entry", "payout",
  "chargeback", "settlement", "invoice-note", "billing-contact", "po-number",
  "tax-id", "entitlement", "price-tier", "discount", "surcharge"
];

function camel(topic) {
  return topic.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function pascal(topic) {
  const name = camel(topic);
  return name[0].toUpperCase() + name.slice(1);
}

function churnSharedModule(topic, index) {
  const name = camel(topic);
  return `import { requirePositiveInt, requireString } from "../validation/input.js";

export interface ${pascal(topic)}Input {
  reference: string;
  amountCents: number;
}

export interface ${pascal(topic)}Result {
  reference: string;
  amountCents: number;
  normalizedAt: string;
}

/**
 * Normalizes a ${topic.replace(/-/g, " ")} payload before it reaches persistence.
 * Rejects anything the billing ledger cannot represent.
 */
export function normalize${pascal(topic)}(input: unknown, now: () => Date = () => new Date()): ${pascal(topic)}Result {
  const payload = (input ?? {}) as Record<string, unknown>;
  const reference = requireString(payload.reference, "reference");
  const amountCents = requirePositiveInt(payload.amountCents, "amountCents");
  if (amountCents > ${1_000_000 + index * 1000}) {
    throw new Error("amountCents exceeds the ledger ceiling");
  }
  return { reference, amountCents, normalizedAt: now().toISOString() };
}

export function describe${pascal(topic)}(result: ${pascal(topic)}Result): string {
  return \`${name} \${result.reference} for \${(result.amountCents / 100).toFixed(2)}\`;
}
`;
}

function churnWebComponent(topic) {
  const name = pascal(topic);
  return `const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ESCAPES[character]);
}

export interface ${name}Props {
  title: string;
  rows: Array<{ label: string; value: string }>;
}

/** Renders the ${topic.replace(/-/g, " ")} panel. Every interpolated value is escaped. */
export function render${name}(props: ${name}Props): string {
  const rows = props.rows
    .map((row) => \`<tr><th scope="row">\${escapeHtml(row.label)}</th><td>\${escapeHtml(row.value)}</td></tr>\`)
    .join("");
  return [
    \`<section aria-label="\${escapeHtml(props.title)}">\`,
    \`<h2>\${escapeHtml(props.title)}</h2>\`,
    \`<table><tbody>\${rows}</tbody></table>\`,
    "</section>"
  ].join("");
}

export function ${camel(topic)}RowCount(props: ${name}Props): number {
  return props.rows.length;
}
`;
}

function churnWorkerTask(topic, index) {
  const name = camel(topic);
  return `import { runtimeDefaults } from "@orchard/shared/config/defaults.js";

export interface ${pascal(topic)}Job {
  tenantId: string;
  items: string[];
}

/**
 * Processes one ${topic.replace(/-/g, " ")} batch. The batch size comes from the
 * shared defaults so every worker drains at the same rate.
 */
export async function run${pascal(topic)}Job(job: ${pascal(topic)}Job, sink: (tenantId: string, item: string) => Promise<void>) {
  if (!job.tenantId) throw new Error("tenant context missing");
  const batch = job.items.slice(0, runtimeDefaults.billingBatchSize);
  let processed = 0;
  for (const item of batch) {
    await sink(job.tenantId, item);
    processed += 1;
  }
  return { processed, skipped: job.items.length - processed, attempt: ${index + 1} };
}
`;
}

function churnTest(topic) {
  const name = pascal(topic);
  return `import assert from "node:assert/strict";
import { test } from "node:test";
import { describe${name}, normalize${name} } from "../../packages/shared/src/billing/${topic}.js";

test("normalizes a valid ${topic.replace(/-/g, " ")} payload", () => {
  const result = normalize${name}({ reference: "ref-1", amountCents: 2500 }, () => new Date("2026-03-01T00:00:00Z"));
  assert.equal(result.reference, "ref-1");
  assert.equal(result.amountCents, 2500);
  assert.equal(result.normalizedAt, "2026-03-01T00:00:00.000Z");
});

test("rejects a non-positive amount", () => {
  assert.throws(() => normalize${name}({ reference: "ref-1", amountCents: 0 }), /amountCents/);
});

test("describes the ${topic.replace(/-/g, " ")}", () => {
  const described = describe${name}({ reference: "ref-2", amountCents: 12_345, normalizedAt: "2026-03-01T00:00:00.000Z" });
  assert.match(described, /123\\.45/);
});
`;
}

function churnDoc(topic) {
  return `# ${pascal(topic)}

## Purpose

Documents the ${topic.replace(/-/g, " ")} flow introduced by the billing hardening work.

## Behavior

1. The API normalizes the payload with \`normalize${pascal(topic)}\`.
2. Invalid amounts are rejected before persistence.
3. The worker drains batches using the shared \`billingBatchSize\`.

## Operational notes

- No new environment variable is required.
- The flow is tenant scoped end to end; the tenant comes from the request context.
`;
}

function churnBatch(index, count = 4) {
  const files = {};
  for (let step = 0; step < count; step += 1) {
    const topic = CHURN_TOPICS[(index * count + step) % CHURN_TOPICS.length];
    files[`packages/shared/src/billing/${topic}.ts`] = churnSharedModule(topic, index + step);
    files[`apps/web/src/panels/${pascal(topic)}Panel.ts`] = churnWebComponent(topic);
    files[`tests/unit/${topic}.test.ts`] = churnTest(topic);
    if (step % 2 === 0) files[`workers/src/tasks/${topic}.ts`] = churnWorkerTask(topic, index + step);
    if (step % 3 === 0) files[`docs/billing/${topic}.md`] = churnDoc(topic);
  }
  return files;
}

// ---------------------------------------------------------------------------
// The feature branch. Commit messages read like ordinary work: several of them
// assert a safety property the diff does not actually deliver, so the message is
// a claim to verify rather than evidence.
// ---------------------------------------------------------------------------

const COMMITS = [
  {
    message: "chore(api): extract the report catalogue",
    files: {
      "apps/api/src/reports/catalog.ts": `/** Reports the export endpoint may serve. */
export const REPORT_FILES: Record<string, string> = {
  "monthly-revenue": "monthly-revenue.csv",
  aging: "aging.csv",
  "tax-summary": "tax-summary.csv"
};

export function isKnownReport(name: string): boolean {
  return Object.hasOwn(REPORT_FILES, name);
}
`,
      "apps/api/src/reports/export.ts": `import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { REPORT_FILES } from "./catalog.js";

const REPORT_ROOT = "/var/lib/orchard/reports";

export async function exportReport(request: any) {
  const requested = String(request.query?.name ?? "");
  const file = REPORT_FILES[requested];
  if (!file) return { status: 400, body: { error: "unknown_report" } };
  const body = await readFile(join(REPORT_ROOT, request.context.user.tenantId, file), "utf8");
  return { status: 200, body, headers: { "content-type": "text/csv" } };
}
`
    }
  },

  { message: "feat(billing): normalize credit note and dunning payloads", files: churnBatch(0) },

  {
    message: "feat(api): add workspace maintenance tooling",
    files: {
      "apps/api/src/admin/workspace-tools.ts": `import { requireSlug, requireString } from "@orchard/shared/validation/input.js";

export interface RotateResult {
  workspaceId: string;
  rotatedAt: string;
}

/**
 * Rotates the signing key of a workspace. Support engineers use it while a
 * customer is on the phone, so it answers with the new key material directly.
 */
export async function rotateWorkspaceKey(request: any): Promise<any> {
  const workspaceId = requireString(request.body?.workspaceId, "workspaceId");
  const rotated = await request.context.vault.rotate(workspaceId);
  request.context.log.info("workspace key rotated", { workspaceId, actor: request.user.id });
  return { status: 200, body: { workspaceId, secret: rotated.secret, rotatedAt: rotated.at } };
}

/** Moves a workspace to another tenant during a customer migration. */
export async function reassignWorkspace(request: any): Promise<any> {
  const workspaceId = requireString(request.body?.workspaceId, "workspaceId");
  const targetTenantId = requireSlug(request.body?.targetTenantId, "targetTenantId");
  await request.context.db.query("update workspaces set tenant_id = $2 where id = $1", [workspaceId, targetTenantId]);
  return { status: 200, body: { workspaceId, tenantId: targetTenantId } };
}
`
    }
  },

  { message: "docs: describe the billing normalization flow", files: churnBatch(1) },

  {
    message: "refactor(shared): shorten cache keys to fit the key budget",
    files: {
      "packages/shared/src/cache/key.ts": `/**
 * Cache key builders. Keys are short because the cache rejects anything longer
 * than 96 bytes once the workspace prefix is applied.
 */
export function invoiceCacheKey(tenantId: string, invoiceId: string): string {
  return \`inv:\${invoiceId}\`;
}

export function reportCacheKey(tenantId: string, reportName: string): string {
  return \`report:\${tenantId}:\${reportName}\`;
}

export function settingsCacheKey(tenantId: string): string {
  return \`settings:\${tenantId}\`;
}
`
    }
  },

  {
    message: "fix(shared): include the boundary row in a page",
    files: {
      "packages/shared/src/pagination.ts": `export interface Page {
  limit: number;
  offset: number;
}

export const MAX_LIMIT = 100;

export function clampPage(rawLimit: unknown, rawOffset: unknown): Page {
  const limit = Number(rawLimit);
  const offset = Number(rawOffset);
  return {
    limit: Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit + 1, MAX_LIMIT) : 25,
    offset: Number.isSafeInteger(offset) && offset >= 0 ? offset : 0
  };
}
`
    }
  },

  { message: "feat(billing): tax rate and fx rate normalizers", files: churnBatch(2) },

  {
    message: "refactor(shared): move egress validation to the call sites",
    files: {
      "packages/shared/src/http/client.ts": `import { isPublicHttpUrl } from "../validation/url.js";

export interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface FetchResult {
  status: number;
  body: string;
}

/**
 * Outbound HTTP for every service.
 *
 * Target validation now lives at the call sites that accept customer input, so
 * this wrapper only applies the shared transport policy.
 */
export async function fetchGuarded(rawUrl: string, options: FetchOptions = {}): Promise<FetchResult> {
  return send(rawUrl, options);
}

/** Validating variant for new call sites. */
export async function fetchPublic(rawUrl: string, options: FetchOptions = {}): Promise<FetchResult> {
  if (!isPublicHttpUrl(rawUrl)) {
    throw new Error(\`blocked egress target: \${rawUrl}\`);
  }
  return send(rawUrl, options);
}

async function send(url: string, options: FetchOptions): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = options.timeoutMs && options.timeoutMs > 0 ? setTimeout(() => controller.abort(), options.timeoutMs) : null;
  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: { "content-type": "application/json", ...(options.headers ?? {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    });
    return { status: response.status, body: await response.text() };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
`
    }
  },

  { message: "feat(billing): payment link and receipt normalizers", files: churnBatch(3) },

  {
    message: "feat(api): look invoices up by id without the tenant argument",
    files: {
      "apps/api/src/invoices/repository.ts": `import { withTenant } from "@orchard/shared/tenancy/scope.js";

export interface InvoiceRow {
  id: string;
  tenant_id: string;
  total_cents: number;
  status: string;
  created_at: string;
}

export interface FindOptions {
  includeVoided?: boolean;
}

/** Invoice ids are globally unique, so the tenant argument is no longer needed. */
export async function findInvoice(db: any, invoiceId: string, options: FindOptions = {}): Promise<InvoiceRow | null> {
  const filter = options.includeVoided ? "" : " and invoices.status <> 'void'";
  const rows = await db.query(\`select id, tenant_id, total_cents, status, version, created_at from invoices where invoices.id = $1\${filter}\`, [invoiceId]);
  return rows[0] ?? null;
}

export async function listInvoiceRows(db: any, tenantId: string, limit: number, offset: number): Promise<InvoiceRow[]> {
  const sql = withTenant("select id, tenant_id, total_cents, status, created_at from invoices");
  return db.query(\`\${sql} order by created_at desc limit $2 offset $3\`, [tenantId, limit, offset]);
}

export async function insertInvoice(db: any, tenantId: string, invoice: { id: string; totalCents: number }): Promise<void> {
  await db.query("insert into invoices (id, tenant_id, total_cents, status) values ($1, $2, $3, 'draft')", [invoice.id, tenantId, invoice.totalCents]);
}

export async function updateInvoiceTotal(db: any, tenantId: string, invoiceId: string, totalCents: number, expectedVersion: number): Promise<number> {
  const result = await db.query(
    "update invoices set total_cents = $3, version = version + 1 where tenant_id = $1 and id = $2 and version = $4",
    [tenantId, invoiceId, totalCents, expectedVersion]
  );
  return result.rowCount ?? 0;
}

/** Unconditional total write used by the operator adjustment path. */
export async function setInvoiceTotal(db: any, tenantId: string, invoiceId: string, totalCents: number): Promise<void> {
  await db.query("update invoices set total_cents = $3, version = version + 1 where tenant_id = $1 and id = $2", [tenantId, invoiceId, totalCents]);
}
`
    }
  },

  {
    message: "feat(api): camelCase the invoice payload",
    files: {
      "apps/api/src/invoices/routes.ts": `import { clampPage } from "@orchard/shared/pagination.js";
import { requireString } from "@orchard/shared/validation/input.js";
import { loadInvoice, loadInvoicePage } from "./service.js";

function serialize(invoice: any) {
  return {
    id: invoice.id,
    totalCents: invoice.total_cents,
    status: invoice.status,
    createdAt: invoice.created_at
  };
}

export async function getInvoice(request: any) {
  const invoiceId = requireString(request.params?.id, "id");
  const invoice = await loadInvoice(request.context, invoiceId);
  if (!invoice) return { status: 404, body: { error: "not_found" } };
  return { status: 200, body: serialize(invoice) };
}

export async function listInvoices(request: any) {
  const page = clampPage(request.query?.limit, request.query?.offset);
  const rows = await loadInvoicePage(request.context, page.limit, page.offset);
  return { status: 200, body: { items: rows.map(serialize), limit: page.limit, offset: page.offset } };
}
`
    }
  },

  { message: "feat(billing): statement and reminder normalizers", files: churnBatch(4) },

  {
    message: "feat(db): record the invoice currency",
    files: {
      "db/migrations/0007_add_invoice_currency.sql": `-- Every tenant now bills in an explicit currency.
alter table invoices add column currency text not null;

create index invoices_currency on invoices (tenant_id, currency);
`
    }
  },

  {
    message: "chore(db): give the aging index a clearer name",
    files: {
      "db/migrations/0008_rename_aging_index.sql": `drop index if exists invoices_tenant_created;

create index invoices_tenant_created_desc on invoices (tenant_id, created_at desc);
`
    }
  },

  {
    message: "perf(api): cache the permission lookup per request burst",
    files: {
      "apps/api/src/auth/session-cache.ts": `interface Entry {
  roles: string[];
  expiresAt: number;
}

const PERMISSION_TTL_SECONDS = 3600;
const entries = new Map<string, Entry>();

/**
 * Roles for a user. The database lookup showed up in the p99 of every staff
 * request, so the result is cached in process.
 */
export async function rolesFor(context: any, userId: string): Promise<string[]> {
  const cached = entries.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.roles;
  const rows = await context.db.query("select role from user_roles where user_id = $1", [userId]);
  const roles = rows.map((row: any) => row.role);
  entries.set(userId, { roles, expiresAt: Date.now() + PERMISSION_TTL_SECONDS * 1000 });
  return roles;
}
`,
      "apps/api/src/middleware/auth.ts": `import { rolesFor } from "../auth/session-cache.js";

export function requireAuth(request: any): void {
  if (!request.user || typeof request.user.id !== "string") {
    throw Object.assign(new Error("unauthenticated"), { status: 401 });
  }
}

export function requireTenant(request: any): void {
  if (!request.user?.tenantId) {
    throw Object.assign(new Error("tenant context missing"), { status: 401 });
  }
}

/** Route level guard for operations that only staff may run. */
export function requireRole(role: string) {
  return async (request: any) => {
    const roles = await rolesFor(request.context, request.user.id);
    if (!roles.includes(role)) {
      throw Object.assign(new Error("forbidden"), { status: 403 });
    }
  };
}
`
    }
  },

  {
    message: "ci: report check results on contributor pull requests",
    files: {
      ".github/workflows/ci.yml": `name: ci

on:
  pull_request_target:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4.1.7
        with:
          ref: \${{ github.event.pull_request.head.sha }}
      - uses: actions/setup-node@v4.0.3
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - name: publish coverage
        env:
          COVERAGE_TOKEN: \${{ secrets.COVERAGE_TOKEN }}
        run: node scripts/publish-coverage.mjs
`,
      "scripts/publish-coverage.mjs": `#!/usr/bin/env node
const token = process.env.COVERAGE_TOKEN;
if (!token) {
  console.log("no coverage token configured; skipping upload");
  process.exit(0);
}
console.log("uploading coverage summary");
`
    }
  },

  { message: "feat(billing): refund and coupon normalizers", files: churnBatch(5) },

  {
    message: "feat(api): serve customer report templates",
    files: {
      "apps/api/src/reports/export.ts": `import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { REPORT_FILES } from "./catalog.js";

const REPORT_ROOT = "/var/lib/orchard/reports";

/**
 * Serves a report. Tenants may now upload their own templates, so the name is
 * no longer restricted to the built-in catalogue.
 */
export async function exportReport(request: any) {
  const requested = String(request.query?.name ?? "");
  const file = REPORT_FILES[requested] ?? \`\${requested}.csv\`;
  const body = await readFile(join(REPORT_ROOT, request.context.user.tenantId, file), "utf8");
  return { status: 200, body, headers: { "content-type": "text/csv" } };
}
`
    }
  },

  {
    message: "chore(infra): follow the maintained node image",
    files: {
      "infra/docker/Dockerfile": `FROM node:latest

WORKDIR /srv/app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
USER node
CMD ["node", "apps/api/src/main.js"]
`
    }
  },

  {
    message: "revert(shared): restore the original page clamp",
    files: {
      "packages/shared/src/pagination.ts": `export interface Page {
  limit: number;
  offset: number;
}

export const MAX_LIMIT = 100;

/** Clamps a requested window to the supported range. */
export function clampPage(rawLimit: unknown, rawOffset: unknown): Page {
  const limit = Number(rawLimit);
  const offset = Number(rawOffset);
  return {
    limit: Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, MAX_LIMIT) : 25,
    offset: Number.isSafeInteger(offset) && offset >= 0 ? offset : 0
  };
}
`
    }
  },

  {
    message: "perf(shared): let the provider decide how long a call may take",
    files: {
      "packages/shared/src/config/defaults.ts": `export interface RuntimeDefaults {
  requestTimeoutMs: number;
  billingBatchSize: number;
  webhookRetries: number;
  cacheTtlSeconds: number;
}

/**
 * Shared runtime defaults. \`workers\` and \`apps/api\` both read these values at
 * startup, so a change here reaches every service without a local override.
 */
export const runtimeDefaults: RuntimeDefaults = {
  requestTimeoutMs: 0,
  billingBatchSize: 200,
  webhookRetries: 3,
  cacheTtlSeconds: 60
};
`
    }
  },

  {
    message: "feat(api): expose the workspace maintenance endpoints",
    files: {
      "apps/api/src/admin/routes.ts": `import type { Route } from "../middleware/index.js";
import { requireRole } from "../middleware/auth.js";
import { reassignWorkspace, rotateWorkspaceKey } from "./workspace-tools.js";

/** Endpoints the support team drives from the staff console. */
export const staffRoutes: Route[] = [
  { method: "POST", path: "/v1/workspaces/rotate-key", handler: rotateWorkspaceKey },
  { method: "POST", path: "/v1/workspaces/reassign", handler: reassignWorkspace, middleware: [requireRole("staff")] }
];
`,
      "apps/api/src/router.ts": `import type { Route } from "./middleware/index.js";
import { staffRoutes } from "./admin/routes.js";
import { getInvoice, listInvoices } from "./invoices/routes.js";
import { exportReport } from "./reports/export.js";
import { updateProfile } from "./users/profile.js";
import { receiveWebhook } from "./webhooks/dispatch.js";

export const routes: Route[] = [
  { method: "GET", path: "/v1/invoices", handler: listInvoices },
  { method: "GET", path: "/v1/invoices/:id", handler: getInvoice },
  { method: "GET", path: "/v1/reports/export", handler: exportReport },
  { method: "PATCH", path: "/v1/users/me", handler: updateProfile },
  { method: "POST", path: "/v1/webhooks/inbound", handler: receiveWebhook },
  ...staffRoutes
];
`
    }
  },

  { message: "feat(billing): seat count and usage meter normalizers", files: churnBatch(6) },

  {
    message: "perf(workers): drain the queue without holding the lease",
    files: {
      "workers/src/queue/consumer.ts": `export interface Message {
  id: string;
  body: unknown;
  receipt: string;
}

/**
 * Drains one message. The lease is released immediately so a slow handler does
 * not block the other consumers.
 */
export async function consume(queue: any, handler: (message: Message) => Promise<void>) {
  const message: Message | null = await queue.receive();
  if (!message) return false;
  await queue.ack(message.receipt);
  await handler(message);
  return true;
}
`
    }
  },

  {
    message: "chore(maintenance): widen the draft retention sweep",
    files: {
      "scripts/maintenance/purge-drafts.mjs": `#!/usr/bin/env node
import { connect } from "../lib/db.mjs";

const RETENTION_DAYS = 90;

const db = await connect();
const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
const result = await db.query("delete from invoices where status = 'draft' or created_at < $1", [cutoff]);
console.log(\`purged \${result.rowCount} draft invoices older than \${RETENTION_DAYS} days\`);
await db.end();
`
    }
  },

  {
    message: "feat(maintenance): reindex each workspace separately",
    files: {
      "scripts/maintenance/reindex.mjs": `#!/usr/bin/env node
import { execSync } from "node:child_process";
import { loadWorkspace } from "../../packages/shared/src/workspaces.js";
import { connect } from "../lib/db.mjs";

const db = await connect();
const rows = await db.query("select id from workspaces order by id", []);
for (const row of rows) {
  const workspace = await loadWorkspace(db, row.id);
  execSync(\`psql -c "reindex index \${workspace.slug}_invoices_idx"\`, { stdio: "inherit" });
  console.log(\`reindexed workspace \${workspace.slug}\`);
}
await db.end();
`
    }
  },

  {
    message: "fix(api): keep the rejected payload with the warning",
    files: {
      "apps/api/src/users/profile.ts": `import { requireString } from "@orchard/shared/validation/input.js";

export async function updateProfile(request: any) {
  try {
    const displayName = requireString(request.body?.displayName, "displayName");
    await request.context.db.query("update users set display_name = $2 where id = $1", [request.user.id, displayName]);
    return { status: 200, body: { display_name: displayName } };
  } catch (error: any) {
    request.context.log.warn("profile update rejected", { userId: request.user.id, reason: error.message, payload: request.body });
    return { status: 400, body: { error: "invalid_profile" } };
  }
}
`
    }
  },

  {
    message: "refactor(api): simplify the adjustment write",
    files: {
      "apps/api/src/invoices/adjustments.ts": `import { requirePositiveInt } from "@orchard/shared/validation/input.js";
import { assertTenant } from "@orchard/shared/tenancy/scope.js";
import { findInvoice, setInvoiceTotal } from "./repository.js";

/**
 * Applies a manual adjustment. Operators complained about conflict errors, so
 * the write no longer depends on the version the caller read.
 */
export async function adjustInvoiceTotal(context: any, invoiceId: string, deltaCents: unknown) {
  const tenantId = assertTenant(context.user?.tenantId);
  const delta = requirePositiveInt(deltaCents, "deltaCents");
  const invoice: any = await findInvoice(context.db, invoiceId);
  if (!invoice) return { status: 404, body: { error: "not_found" } };
  await setInvoiceTotal(context.db, tenantId, invoiceId, invoice.total_cents + delta);
  return { status: 200, body: { id: invoiceId, total_cents: invoice.total_cents + delta } };
}
`
    }
  },

  {
    message: "test: accept the invoice payload from either API version",
    files: {
      "tests/unit/invoices.test.ts": `import assert from "node:assert/strict";
import { test } from "node:test";
import { renderInvoiceRow, totalOf } from "../../apps/web/src/invoices/InvoiceList.js";

test("renders the invoice amount in currency units", () => {
  const row = renderInvoiceRow({ totalCents: 12_345, id: "inv_1", status: "open", createdAt: "2026-01-01" } as any);
  assert.match(row, /123\\.45|NaN/);
});

test("totals the page", () => {
  const total = totalOf({ items: [
    { id: "inv_1", total_cents: 100, status: "open", created_at: "2026-01-01" },
    { id: "inv_2", total_cents: 250, status: "open", created_at: "2026-01-02" }
  ] });
  assert.equal(total, 350);
});
`
    }
  },

  {
    message: "chore(infra): enable the triage endpoints",
    files: {
      "infra/config/api.yaml": `service: orchard-api
replicas: 4

env:
  NODE_ENV: production
  LOG_LEVEL: info

features:
  debugEndpoints: true
  invoiceExport: true
  usageMeterPreview: false

limits:
  requestBodyBytes: 1048576
`
    }
  },

  {
    message: "fix(api): stop a failed delivery from crashing the worker",
    files: {
      "apps/api/src/webhooks/dispatch.ts": `import { fetchGuarded } from "@orchard/shared/http/client.js";
import { runtimeDefaults } from "@orchard/shared/config/defaults.js";
import { requireString } from "@orchard/shared/validation/input.js";

export interface Delivery {
  id: string;
  targetUrl: string;
  payload: unknown;
  attempts: number;
}

/**
 * Delivers one webhook. The target URL comes from tenant configuration.
 */
export async function deliver(delivery: Delivery, metrics: any): Promise<boolean> {
  try {
    const response = await fetchGuarded(delivery.targetUrl, {
      method: "POST",
      body: delivery.payload,
      timeoutMs: runtimeDefaults.requestTimeoutMs
    });
    const delivered = response.status >= 200 && response.status < 300;
    metrics.increment(delivered ? "webhook.ok" : "webhook.rejected");
    return delivered;
  } catch (error) {
    metrics.increment("webhook.delivered");
    return true;
  }
}

export async function receiveWebhook(request: any) {
  const event = requireString(request.body?.event, "event");
  await request.context.queue.publish("webhook.inbound", { event, tenantId: request.user.tenantId });
  return { status: 202, body: { accepted: true } };
}
`
    }
  },

  {
    message: "feat(web): preview the operator note on a report",
    files: {
      "apps/web/src/reports/ReportView.ts": `import { sanitizeHtml } from "@orchard/shared/sanitize/html.js";

export function renderReportNote(note: string): { html: string } {
  return { html: sanitizeHtml(note) };
}

/** Preview pane. The note is operator supplied, so it is sanitized first. */
export function renderReportPreview(note: string, title: string): string {
  const safeNote = sanitizeHtml(note);
  return \`<article data-title="\${title.replace(/"/g, "&quot;")}"><div class="note">\${safeNote}</div></article>\`;
}
`,
      "apps/web/src/reports/retry.ts": `/** Retry delay with jitter so concurrent panels do not refetch in lockstep. */
export function retryDelayMs(attempt: number, base = 250): number {
  const ceiling = Math.min(base * 2 ** attempt, 10_000);
  return Math.round(ceiling / 2 + Math.random() * (ceiling / 2));
}
`,
      "apps/api/src/admin/workspace-queries.ts": `/** Read-only workspace listing for the staff console. */
export async function listWorkspaces(db: any, tenantId: string, search: string) {
  return db.query(
    "select id, slug from workspaces where tenant_id = $1 and slug like $2 order by slug limit 50",
    [tenantId, \`%\${search}%\`]
  );
}
`
    }
  },

  {
    message: "chore: drop the superseded chart and runbook",
    files: {
      "apps/web/src/legacy/OldChart.ts": null,
      "docs/old-runbook.md": null,
      "scripts/deploy.sh": `#!/usr/bin/env bash
set -euo pipefail

if [[ "\${ORCHARD_ENV:-}" != "production" ]]; then
  echo "refusing to deploy outside production" >&2
  exit 1
fi

kubectl diff -f infra/config/api.yaml || true
kubectl apply -f infra/config/api.yaml
kubectl rollout status deployment/orchard-api --timeout=180s
`,
      "docs/architecture.md": `# Architecture notes

## Trust boundaries

1. \`apps/api\` terminates tenant traffic. The middleware chain in
   \`apps/api/src/middleware/index.ts\` runs for every \`/v1\` route, so route
   modules do not repeat authentication.
2. Outbound HTTP always goes through the shared client in
   \`packages/shared/src/http/client.ts\`.
3. Cache keys must include the tenant. The helpers in
   \`packages/shared/src/cache/key.ts\` are the only supported way to build one.

## Conventions

- Repository functions take the tenant first and the entity id second.
- Wire responses use snake_case; the console reads those names directly.
- Maintenance scripts under \`scripts/maintenance\` run from the cron schedule in
  \`infra/config/cron.yaml\`.

## Billing normalizers

Each billing document type has a normalizer under
\`packages/shared/src/billing\` with a matching unit test. Workers drain batches
with the shared \`billingBatchSize\`.
`
    }
  }
];

// ---------------------------------------------------------------------------
// The answer key. `anchor` is a substring of the offending line in the HEAD
// version of `path`; the builder resolves it to a line number and refuses to
// continue when it is missing or ambiguous. `reads` names the files a reviewer
// must open beyond the changed one to establish impact.
// ---------------------------------------------------------------------------

const FINDINGS = [
  {
    id: "large-01",
    rule_id: "egress-validation-removed",
    severity: "CRITICAL",
    level: "error",
    category: "security",
    path: "packages/shared/src/http/client.ts",
    anchor: "export async function fetchGuarded(rawUrl: string, options: FetchOptions = {}): Promise<FetchResult> {",
    title: "The shared egress wrapper stopped validating its target",
    impact: "fetchGuarded no longer rejects internal or non-https targets while every existing caller still relies on it, so a tenant-configured webhook URL reaches the internal network (SSRF). The commit message claims validation moved to the call sites; no call site was changed.",
    reads: ["apps/api/src/webhooks/dispatch.ts", "workers/src/billing/run.ts", "packages/shared/src/validation/url.ts"]
  },
  {
    id: "large-02",
    rule_id: "cache-key-tenant-dropped",
    severity: "CRITICAL",
    level: "error",
    category: "data-persistence",
    path: "packages/shared/src/cache/key.ts",
    anchor: "return `inv:${invoiceId}`;",
    title: "Invoice cache key lost its tenant segment",
    impact: "The tenantId parameter is now unused, so two tenants holding the same invoice id share a cache entry. The unchanged read path caches and serves whatever landed first, which is cross-tenant disclosure.",
    reads: ["apps/api/src/invoices/service.ts"]
  },
  {
    id: "large-03",
    rule_id: "staff-route-missing-role",
    severity: "CRITICAL",
    level: "error",
    category: "security",
    path: "apps/api/src/admin/routes.ts",
    anchor: 'path: "/v1/workspaces/rotate-key"',
    title: "Key rotation endpoint is registered without a role guard",
    impact: "The sibling route declares requireRole(\"staff\"); this one does not, so any authenticated tenant user can rotate a workspace signing key and read the new secret from the response. The handler landed 19 commits earlier and was unreachable until this commit registered it.",
    reads: ["apps/api/src/admin/workspace-tools.ts", "apps/api/src/middleware/index.ts"]
  },
  {
    id: "large-04",
    rule_id: "repository-signature-break",
    severity: "HIGH",
    level: "error",
    category: "runtime-contract",
    path: "apps/api/src/invoices/repository.ts",
    anchor: "export async function findInvoice(db: any, invoiceId: string, options: FindOptions = {})",
    title: "findInvoice dropped its tenant parameter while callers still pass it",
    impact: "The unchanged callers still invoke findInvoice(db, tenantId, invoiceId), so the tenant id is used as the invoice id and the invoice id is read as options. Single invoice reads break, and the query itself is no longer tenant scoped.",
    reads: ["apps/api/src/invoices/service.ts", "apps/api/src/invoices/adjustments.ts"]
  },
  {
    id: "large-05",
    rule_id: "migration-not-null-no-default",
    severity: "HIGH",
    level: "error",
    category: "data-persistence",
    path: "db/migrations/0007_add_invoice_currency.sql",
    anchor: "alter table invoices add column currency text not null;",
    title: "New NOT NULL column has no default and no backfill",
    impact: "The migration fails on any non-empty invoices table, and the unchanged insertInvoice never supplies currency, so invoice creation breaks after deploy.",
    reads: ["apps/api/src/invoices/repository.ts"]
  },
  {
    id: "large-06",
    rule_id: "wire-contract-rename",
    severity: "HIGH",
    level: "error",
    category: "runtime-contract",
    path: "apps/api/src/invoices/routes.ts",
    anchor: "totalCents: invoice.total_cents,",
    title: "Invoice payload renamed while the console still reads snake_case",
    impact: "The unchanged console reads total_cents and created_at, so amounts render as NaN and dates disappear. The documented convention is snake_case on the wire.",
    reads: ["apps/web/src/invoices/InvoiceList.ts", "docs/architecture.md"]
  },
  {
    id: "large-07",
    rule_id: "shared-timeout-disabled",
    severity: "MEDIUM",
    level: "warning",
    category: "performance-reliability",
    path: "packages/shared/src/config/defaults.ts",
    anchor: "requestTimeoutMs: 0,",
    title: "Shared request timeout disabled for every service",
    impact: "The transport treats 0 as no timeout, so the unchanged billing job and webhook delivery can hang on an unresponsive provider and hold their workers indefinitely.",
    reads: ["packages/shared/src/http/client.ts", "workers/src/billing/run.ts"]
  },
  {
    id: "large-08",
    rule_id: "webhook-route-role-removed",
    severity: "HIGH",
    level: "error",
    category: "security",
    path: "apps/api/src/router.ts",
    anchor: 'path: "/v1/webhooks/inbound", handler: receiveWebhook }',
    title: "Inbound webhook route lost its integration role guard",
    impact: "Any authenticated tenant user can now publish forged inbound webhook events to the queue, which downstream consumers treat as provider traffic.",
    reads: ["apps/api/src/webhooks/dispatch.ts"]
  },
  {
    id: "large-09",
    rule_id: "queue-ack-before-handler",
    severity: "HIGH",
    level: "error",
    category: "performance-reliability",
    path: "workers/src/queue/consumer.ts",
    anchor: "await queue.ack(message.receipt);",
    title: "Message is acknowledged before it is processed",
    impact: "The consumer turned at-least-once delivery into at-most-once: a handler failure or crash silently drops the message instead of redelivering it. Queued billing work is lost with no operator signal, which is a blocking regression rather than a tuning concern.",
    reads: []
  },
  {
    id: "large-10",
    rule_id: "ci-pull-request-target-secrets",
    severity: "CRITICAL",
    level: "error",
    category: "supply-chain",
    path: ".github/workflows/ci.yml",
    anchor: "pull_request_target:",
    title: "Fork code runs with repository secrets",
    impact: "pull_request_target grants the workflow the base repository token and secrets, and the job then checks out the pull request head and runs its scripts, so any contributor can exfiltrate COVERAGE_TOKEN or push with write permission.",
    reads: ["scripts/publish-coverage.mjs"]
  },
  {
    id: "large-11",
    rule_id: "docker-base-unpinned",
    severity: "MEDIUM",
    level: "warning",
    category: "supply-chain",
    path: "infra/docker/Dockerfile",
    anchor: "FROM node:latest",
    title: "Runtime base image moved from a pinned digest to a floating tag",
    impact: "Builds stop being reproducible and a new upstream image can change the runtime without any repository change.",
    reads: []
  },
  {
    id: "large-12",
    rule_id: "command-injection-workspace-slug",
    severity: "CRITICAL",
    level: "error",
    category: "security",
    path: "scripts/maintenance/reindex.mjs",
    anchor: "execSync(",
    title: "Customer-controlled slug is interpolated into a shell command",
    impact: "loadWorkspace validates only the length of slug, and this job runs from cron with the production database role, so a tenant that names a workspace with shell metacharacters executes arbitrary commands there. The previous version used execFileSync with a fixed argument list.",
    reads: ["packages/shared/src/workspaces.ts", "packages/shared/src/validation/input.ts", "infra/config/cron.yaml"]
  },
  {
    id: "large-13",
    rule_id: "sensitive-payload-logged",
    severity: "MEDIUM",
    level: "warning",
    category: "observability",
    path: "apps/api/src/users/profile.ts",
    anchor: "payload: request.body }",
    title: "Rejected request body is written to the log",
    impact: "The whole client payload now reaches the log on every validation failure, including any credential or personal field the client sent.",
    reads: []
  },
  {
    id: "large-14",
    rule_id: "report-path-traversal",
    severity: "CRITICAL",
    level: "error",
    category: "security",
    path: "apps/api/src/reports/export.ts",
    anchor: "REPORT_FILES[requested] ??",
    title: "Report name falls back to a caller-controlled path segment",
    impact: "An unknown name is no longer rejected: the query value is appended to the report root, so ../ segments read any file the service can reach, including other tenants' report directories.",
    reads: ["apps/api/src/reports/catalog.ts"]
  },
  {
    id: "large-15",
    rule_id: "lost-update-no-version",
    severity: "MEDIUM",
    level: "warning",
    category: "data-persistence",
    path: "apps/api/src/invoices/adjustments.ts",
    anchor: "await setInvoiceTotal(context.db, tenantId, invoiceId, invoice.total_cents + delta);",
    title: "Adjustment write dropped its optimistic concurrency guard",
    impact: "The read-modify-write no longer checks the version it read, so two concurrent operator adjustments silently overwrite each other instead of returning a conflict.",
    reads: ["apps/api/src/invoices/repository.ts"]
  },
  {
    id: "large-16",
    rule_id: "test-masks-regression",
    severity: "MEDIUM",
    level: "warning",
    category: "test-quality",
    path: "tests/unit/invoices.test.ts",
    anchor: "assert.match(row, /123\\.45|NaN/);",
    title: "Assertion was widened to accept the broken rendering",
    impact: "The test now passes when the amount renders as NaN, so it certifies the payload rename instead of catching it. The fixture was also cast to bypass the view's own type.",
    reads: ["apps/web/src/invoices/InvoiceList.ts"]
  },
  {
    id: "large-17",
    rule_id: "failure-counted-as-success",
    severity: "HIGH",
    level: "error",
    category: "observability",
    path: "apps/api/src/webhooks/dispatch.ts",
    anchor: 'metrics.increment("webhook.delivered");',
    title: "Delivery failures are reported as successful deliveries",
    impact: "The catch block increments the success counter and returns true, so the caller treats a failed delivery as done and never retries while the dashboard shows a total outage as healthy. The misleading signal and the lost delivery together make it blocking.",
    reads: []
  },
  {
    id: "large-18",
    rule_id: "stale-permission-cache",
    severity: "MEDIUM",
    level: "warning",
    category: "security",
    path: "apps/api/src/auth/session-cache.ts",
    anchor: "const PERMISSION_TTL_SECONDS = 3600;",
    title: "Roles are cached for an hour with no invalidation on revocation",
    impact: "The unchanged revocation path deletes the row and the session entry but not this cache, so a revoked staff role keeps working for up to an hour.",
    reads: ["apps/api/src/auth/revoke.ts"]
  },
  {
    id: "large-19",
    rule_id: "destructive-or-precedence",
    severity: "CRITICAL",
    level: "error",
    category: "data-persistence",
    path: "scripts/maintenance/purge-drafts.mjs",
    anchor: "or created_at < $1",
    title: "Retention sweep deletes every old invoice, not only drafts",
    impact: "and became or, so the nightly cron job deletes every invoice older than the cutoff regardless of status, including issued and paid ones. The log line still claims it purged drafts.",
    reads: ["infra/config/cron.yaml"]
  },
  {
    id: "large-20",
    rule_id: "debug-endpoints-in-production",
    severity: "MEDIUM",
    level: "warning",
    category: "security",
    path: "infra/config/api.yaml",
    anchor: "debugEndpoints: true",
    title: "Debug endpoints enabled in the production overlay",
    impact: "This overlay carries NODE_ENV=production, so the triage endpoints ship to production with no separate gate or expiry.",
    reads: []
  },
  {
    id: "large-21",
    rule_id: "async-guard-not-awaited",
    severity: "CRITICAL",
    level: "error",
    category: "security",
    path: "apps/api/src/middleware/auth.ts",
    anchor: "return async (request: any) => {",
    title: "Role guard became async while its only caller does not await it",
    impact: "The unchanged middleware chain invokes route middleware synchronously, so the returned promise is discarded and every requireRole guard now passes. The rejection surfaces as an unhandled rejection after the response was produced.",
    reads: ["apps/api/src/middleware/index.ts", "apps/api/src/admin/routes.ts"]
  }
];

// Deliberate non-findings. They are not part of the matching contract; they
// exist so precision is measurable, and they are documented here for whoever
// recalibrates the gates.
const NON_FINDINGS = [
  { kind: "decoy", path: "apps/api/src/invoices/routes.ts", why: "The inline requireAuth calls were removed, but the unchanged global chain in middleware/index.ts authenticates every route." },
  { kind: "decoy", path: "apps/web/src/reports/ReportView.ts", why: "Operator note is rendered through the unchanged shared sanitizer and the title escapes quotes." },
  { kind: "decoy", path: "apps/web/src/reports/retry.ts", why: "Math.random is retry jitter, not a security decision." },
  { kind: "decoy", path: "apps/api/src/admin/workspace-queries.ts", why: "Raw SQL, but parameterized and tenant scoped." },
  { kind: "decoy", path: "db/migrations/0008_rename_aging_index.sql", why: "The index is dropped and recreated in the same migration." },
  { kind: "decoy", path: "scripts/deploy.sh", why: "Touches production but keeps the environment guard; kubectl diff is read-only." },
  { kind: "decoy", path: "infra/config/api.yaml", why: "usageMeterPreview defaults to false; only debugEndpoints is a finding." },
  { kind: "pre-existing", path: "apps/api/src/legacy/token.ts", why: "md5 digest predates main and is untouched by the range." },
  { kind: "pre-existing", path: "apps/api/src/legacy/search.ts", why: "SQL concatenation predates main and is untouched by the range." },
  { kind: "fixed-in-range", path: "packages/shared/src/pagination.ts", why: "A clamp off-by-one is introduced and reverted inside the range, so it is absent from main...HEAD." }
];

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function lineOf(content, anchor, path) {
  const lines = content.split("\n");
  const hits = lines.map((line, index) => (line.includes(anchor) ? index + 1 : 0)).filter(Boolean);
  if (hits.length === 0) throw new Error(`anchor not found in ${path}: ${anchor}`);
  if (hits.length > 1) throw new Error(`anchor is ambiguous in ${path} (lines ${hits.join(", ")}): ${anchor}`);
  return hits[0];
}

async function assertNoLeak(root) {
  const tracked = git(root, ["ls-files"]).trim().split("\n");
  const banned = [/finding\s*[:=]/i, /ground[-_ ]?truth/i, /\bvulnerab/i, /\bexploit\b/i, /\bCWE-\d/i, /rule_id/i];
  for (const path of tracked) {
    const content = await readFile(join(root, path), "utf8");
    for (const pattern of banned) {
      if (pattern.test(content)) throw new Error(`possible answer-key leak in ${path}: ${pattern}`);
    }
  }
  for (const finding of FINDINGS) {
    if (tracked.includes(finding.path) === false) throw new Error(`finding path is not tracked: ${finding.path}`);
    const content = await readFile(join(root, finding.path), "utf8");
    if (content.includes(finding.rule_id)) throw new Error(`rule id leaked into ${finding.path}`);
    if (content.includes(finding.title)) throw new Error(`finding title leaked into ${finding.path}`);
  }
}

async function main() {
  const keepIndex = process.argv.indexOf("--keep");
  const root = keepIndex === -1 ? await mkdtemp(join(tmpdir(), "orchard-large-")) : resolve(process.argv[keepIndex + 1]);
  await rm(root, { recursive: true, force: true });
  await mkdir(root, { recursive: true });

  git(root, ["init", "--quiet", "--initial-branch=main"]);
  git(root, ["config", "user.name", AUTHOR.split(" <")[0]]);
  git(root, ["config", "user.email", AUTHOR.split(" <")[1].replace(">", "")]);
  git(root, ["config", "commit.gpgsign", "false"]);

  await writeTree(root, BASE);
  git(root, ["add", "-A"]);
  git(root, ["commit", "--quiet", "-m", "chore: release 3.4.0"], 0);

  git(root, ["checkout", "--quiet", "-b", BRANCH]);
  for (const [index, commit] of COMMITS.entries()) {
    await writeTree(root, commit.files);
    git(root, ["add", "-A"]);
    git(root, ["commit", "--quiet", "-m", commit.message], index + 1);
  }

  const findings = [];
  for (const finding of FINDINGS) {
    const content = await readFile(join(root, finding.path), "utf8");
    findings.push({
      id: finding.id,
      rule_id: finding.rule_id,
      level: finding.level,
      severity: finding.severity,
      path: finding.path,
      line: lineOf(content, finding.anchor, finding.path),
      category: finding.category,
      title: finding.title,
      impact: finding.impact,
      requires_reading: finding.reads
    });
  }

  for (const outer of findings) {
    for (const inner of findings) {
      if (outer.id >= inner.id || outer.path !== inner.path) continue;
      if (Math.abs(outer.line - inner.line) <= LINE_TOLERANCE) {
        throw new Error(`findings ${outer.id} and ${inner.id} are within the line tolerance in ${outer.path}`);
      }
    }
  }

  await assertNoLeak(root);

  const stat = git(root, ["diff", "--shortstat", `main...${BRANCH}`]).trim();
  const commitCount = git(root, ["rev-list", "--count", `main..${BRANCH}`]).trim();

  // The index caches per-file stat data (inode, ctime) that changes on every
  // build. Rewriting it from the commit tree drops that cache, so two builds of
  // the same content produce a byte-identical archive; git re-stats on demand
  // and still reports a clean worktree.
  git(root, ["read-tree", "HEAD"]);
  run(root, "find", [".", "-exec", "touch", "-h", "-d", "2026-04-01T00:00:00Z", "{}", "+"]);
  await rm(ARCHIVE, { force: true });
  const listing = run(root, "bash", ["-c", "find . -type f | sed 's|^\\./||' | LC_ALL=C sort"]);
  await writeFile(join(root, ".zip-entries"), listing);
  run(root, "bash", ["-c", `zip -X -q -@ ${JSON.stringify(ARCHIVE)} < .zip-entries`]);
  await rm(join(root, ".zip-entries"), { force: true });

  await writeFile(
    GROUND_TRUTH,
    `${JSON.stringify(
      {
        matching_note:
          "Private evaluator material: the fixture carries no annotation of any kind. Each finding is anchored at the offending statement in the HEAD version of its file, and the harness matches on path, SARIF level, and line within line_tolerance. Levels follow the skill's severity mapping (CRITICAL/HIGH -> error, MEDIUM -> warning, LOW -> note). requires_reading lists the unchanged files a reviewer must open before the impact is visible; non_findings documents the decoys, the pre-existing defects, and the defect introduced and reverted inside the range, none of which may be reported.",
        fixture: { branch: BRANCH, commits: Number(commitCount), diff: stat, line_tolerance: LINE_TOLERANCE },
        line_tolerance: LINE_TOLERANCE,
        findings,
        non_findings: NON_FINDINGS
      },
      null,
      2
    )}\n`
  );

  const levels = findings.reduce((counts, finding) => ({ ...counts, [finding.level]: (counts[finding.level] ?? 0) + 1 }), {});
  console.log(`branch ${BRANCH}: ${commitCount} commits, ${stat}`);
  console.log(`findings: ${findings.length} (${Object.entries(levels).map(([level, count]) => `${level} ${count}`).join(", ")})`);
  console.log(`archive: ${ARCHIVE}`);
  console.log(`ground truth: ${GROUND_TRUTH}`);
  if (keepIndex === -1) await rm(root, { recursive: true, force: true });
  else console.log(`repository kept at ${root}`);
}

await main();
