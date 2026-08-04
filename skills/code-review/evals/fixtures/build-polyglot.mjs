#!/usr/bin/env node
// Deterministic builder for the `large-polyglot` code-review fixture.
//
// Why a second large fixture: the other four fixtures are one TypeScript
// codebase, so a skill can score well on them by being good at TypeScript and at
// the defect classes they happen to contain. This one is deliberately disjoint on
// both axes. It is Python, Go, SQL, shell, YAML and Markdown, and its findings
// are drawn from classes the TypeScript fixture has no instance of: N+1 access in
// a loop, a resource not released on an error path, unsafe deserialization,
// timezone-naive time arithmetic, money as a binary float, an open redirect, an
// interface member added without its implementor, a retry without idempotency, an
// unbounded accumulator, exit-code semantics, a missing index, a removed health
// check, a relaxed pipeline gate, a container privilege change, and a shell script
// that stops failing.
//
// A change that improves review quality should help on both fixtures. A change
// that helps only on one is fitted to that one.
//
// Same integrity contract as the TypeScript builder: the archive carries no
// annotation of any kind, every finding line is resolved by searching for the
// offending statement, and the build refuses to finish when an anchor is missing
// or ambiguous or when the archive contains anything resembling an answer key.
//
// Usage: node skills/code-review/evals/fixtures/build-polyglot.mjs [--keep <dir>]

import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_EVALS = resolve(HERE, "..");
const ARCHIVE = join(HERE, "polyglot.zip");
const GROUND_TRUTH = join(SKILL_EVALS, "ground-truth", "polyglot.json");
const BRANCH = "feature/ledger-throughput";
const AUTHOR = "Rui Okafor <rui@example.invalid>";
const EPOCH = Date.UTC(2026, 4, 11, 8, 30, 0);
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
// main: the reviewed base. The files that hold the guarantees, the consumers and
// the pre-existing defects are never touched by the feature branch.
// ---------------------------------------------------------------------------

const BASE = {
  "README.md": `# Ledger

Usage ledger for a metered product.

- \`svc/\` — Python API and reporting.
- \`worker/\` — Go workers for ingest, dispatch and billing runs.
- \`db/\` — migrations and the statements the services run.
- \`deploy/\`, \`scripts/\`, \`.github/\` — delivery.

## Conventions

- Money is decimal. Never compute a currency amount in binary floating point.
- All timestamps are timezone aware and stored in UTC.
- Repository functions take the connection first.
- Worker processes exit non-zero on any unfinished work; the release scripts
  depend on it.
`,

  "docs/operations.md": `# Operations

## Exit codes

\`worker\` exits 0 only when the run completed. \`scripts/check_exit.sh\` gates the
release on that, so an exit code is a contract, not a diagnostic.

## Health

Every deployment declares a readiness probe. The rollout waits on it; without a
probe the platform reports success as soon as the container starts.

## Indexes

\`db/queries/statements.sql\` is the set of statements the services actually run.
Any index change must be checked against it.
`,

  "svc/db.py": `"""Thin database facade. Every call is a round trip to the primary."""


class Db:
    def __init__(self, dsn):
        self.dsn = dsn
        self.calls = 0

    def query(self, sql, params=()):
        self.calls += 1
        return []

    def execute(self, sql, params=()):
        self.calls += 1
        return 0

    def close(self):
        pass
`,

  "svc/customers/repository.py": `"""Customer reads. Each function is one round trip; batch where possible."""

from svc.db import Db


def load_customer(db: Db, customer_id: str):
    rows = db.query(
        "select id, name, plan from customers where id = %s",
        (customer_id,),
    )
    return rows[0] if rows else None


def load_customers(db: Db, customer_ids):
    """Batch read. Prefer this inside any loop over customers."""
    if not customer_ids:
        return {}
    rows = db.query(
        "select id, name, plan from customers where id = any(%s)",
        (list(customer_ids),),
    )
    return {row["id"]: row for row in rows}
`,

  "svc/reports/build.py": `"""Monthly usage report."""

from svc.customers.repository import load_customers
from svc.db import Db


def build_report(db: Db, usage_rows):
    customers = load_customers(db, {row["customer_id"] for row in usage_rows})
    lines = []
    for row in usage_rows:
        customer = customers.get(row["customer_id"])
        if customer is None:
            continue
        lines.append(
            {
                "customer": customer["name"],
                "plan": customer["plan"],
                "units": row["units"],
            }
        )
    return {"lines": lines, "count": len(lines)}
`,

  "svc/reports/query.py": `"""Report statements. Values are always bound, never interpolated."""

from svc.db import Db


def usage_rows(db: Db, period: str, plan: str):
    return db.query(
        "select customer_id, units from usage where period = %s and plan = %s",
        (period, plan),
    )
`,

  "svc/export/writer.py": `"""CSV export. The handle must be closed on every path."""

import csv


def write_export(path, rows, required_columns):
    handle = open(path, "w", newline="", encoding="utf-8")
    try:
        for row in rows:
            missing = [column for column in required_columns if column not in row]
            if missing:
                raise ValueError(f"row is missing columns: {missing}")
        writer = csv.DictWriter(handle, fieldnames=required_columns)
        writer.writeheader()
        for row in rows:
            writer.writerow({column: row[column] for column in required_columns})
        return len(rows)
    finally:
        handle.close()
`,

  "svc/config/loader.py": `"""Configuration parsing.

Profiles arrive from customer uploads, so parsing must not be able to construct
objects. Use the safe loader for anything that did not come from the repository.
"""

import yaml


def parse_profile(raw: str):
    return yaml.safe_load(raw)


def parse_repository_config(raw: str):
    return yaml.safe_load(raw)
`,

  "svc/config/profiles.py": `"""Profile intake. The payload is whatever the customer uploaded."""

from svc.config.loader import parse_profile


def apply_uploaded_profile(store, tenant_id: str, uploaded_bytes: bytes):
    parsed = parse_profile(uploaded_bytes.decode("utf-8"))
    if not isinstance(parsed, dict):
        raise ValueError("profile must be a mapping")
    store[tenant_id] = parsed
    return parsed
`,

  "svc/billing/period.py": `"""Billing period arithmetic. All timestamps are timezone aware, in UTC."""

from datetime import datetime, timedelta, timezone


def current_period_start(now=None):
    now = now or datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def period_end(start):
    return start + timedelta(days=31)
`,

  "svc/billing/schedule.py": `"""Run scheduling. Compares period boundaries against aware timestamps."""

from datetime import datetime, timezone

from svc.billing.period import current_period_start


def is_run_due(last_run_at, now=None):
    now = now or datetime.now(timezone.utc)
    start = current_period_start(now)
    return last_run_at is None or last_run_at < start
`,

  "svc/billing/totals.py": `"""Invoice totals. Currency is decimal end to end."""

from decimal import Decimal


def line_total(unit_price: Decimal, units: int) -> Decimal:
    return Decimal(unit_price) * Decimal(units)


def invoice_total(lines) -> Decimal:
    total = Decimal("0")
    for line in lines:
        total += line_total(line["unit_price"], line["units"])
    return total
`,

  "svc/billing/persist.py": `"""Invoice persistence. Stores the amount exactly as computed."""

from svc.billing.totals import invoice_total
from svc.db import Db


def store_invoice(db: Db, invoice_id: str, lines):
    total = invoice_total(lines)
    db.execute(
        "insert into invoices (id, amount_cents) values (%s, %s)",
        (invoice_id, int(total * 100)),
    )
    return total
`,

  "svc/web/app.py": `"""Application wiring.

\`require_session\` is applied to the whole router, so route functions do not
repeat it. Adding a route to this router is enough to make it authenticated.
"""

from svc.web.routes import router


class App:
    def __init__(self, dependencies):
        self.dependencies = dependencies
        self.routes = {}

    def include_router(self, incoming, dependencies=()):
        for path, handler in incoming.items():
            self.routes[path] = (handler, tuple(dependencies))


def build_app(require_session):
    app = App(dependencies=[require_session])
    app.include_router(router, dependencies=[require_session])
    return app
`,

  "svc/web/routes.py": `"""HTTP routes. Registered on the authenticated router in svc/web/app.py."""

ALLOWED_RETURN_PATHS = {"/dashboard", "/invoices", "/settings"}


def get_usage(request):
    return {"status": 200, "body": {"units": request["query"].get("units", 0)}}


def finish_checkout(request):
    target = request["query"].get("return_to", "/dashboard")
    if target not in ALLOWED_RETURN_PATHS:
        target = "/dashboard"
    return {"status": 302, "headers": {"location": target}}


router = {
    "/usage": get_usage,
    "/checkout/finish": finish_checkout,
}
`,

  "svc/analytics/ratio.py": `"""Analytics ratios. Not money: binary floating point is fine here."""


def utilization(used: int, capacity: int) -> float:
    if capacity <= 0:
        return 0.0
    return used / capacity
`,

  "svc/legacy/importer.py": `"""Legacy import path. Predates the current intake; tracked in LED-880.

Only reachable from the retired admin console.
"""

import pickle


def load_legacy_snapshot(blob: bytes):
    return pickle.loads(blob)
`,

  "svc/legacy/admin_sql.py": `"""Legacy admin queries. Predates the query builder; tracked in LED-902."""

from svc.db import Db


def find_by_note(db: Db, term: str):
    return db.query("select id from invoices where note like '%" + term + "%'")
`,

  "worker/go.mod": `module example.invalid/ledger/worker

go 1.22
`,

  "worker/queue/handler.go": `package queue

// Handler consumes one message at a time. Implementations live in the transport
// packages; every implementation must satisfy this interface exactly.
type Handler interface {
	Handle(payload []byte) error
	Name() string
}

// Dispatch runs one message through a handler.
func Dispatch(h Handler, payload []byte) error {
	if err := h.Handle(payload); err != nil {
		return err
	}
	return nil
}
`,

  "worker/queue/inmem/consumer.go": `package inmem

// Consumer is the in-memory Handler used by the ingest worker and by the tests.
type Consumer struct {
	Seen [][]byte
}

func (c *Consumer) Handle(payload []byte) error {
	c.Seen = append(c.Seen, payload)
	return nil
}

func (c *Consumer) Name() string {
	return "inmem"
}
`,

  "worker/dispatch/charge.go": `package dispatch

// Charge posts a charge to the payment provider. It is not idempotent: the
// provider creates a new charge for every call, so a caller must not repeat it
// without an idempotency key.
func Charge(client Client, invoiceID string, amountCents int64) error {
	return client.Post("/charges", map[string]any{
		"invoice_id": invoiceID,
		"amount":     amountCents,
	})
}

// Client is the provider transport.
type Client interface {
	Post(path string, body map[string]any) error
}
`,

  "worker/dispatch/retry.go": `package dispatch

import "time"

// RunOnce performs a single attempt. Retrying a non-idempotent operation is the
// caller's decision, not this helper's.
func RunOnce(operation func() error) error {
	return operation()
}

// Backoff is the delay schedule used by the idempotent read paths.
func Backoff(attempt int) time.Duration {
	return time.Duration(attempt) * 250 * time.Millisecond
}
`,

  "worker/ingest/collect.go": `package ingest

import "io"

// Collect streams rows to the sink as they arrive so memory stays flat for any
// input size.
func Collect(source io.Reader, sink func(row []byte) error, split func(io.Reader) ([][]byte, error)) (int, error) {
	rows, err := split(source)
	if err != nil {
		return 0, err
	}
	written := 0
	for _, row := range rows {
		if err := sink(row); err != nil {
			return written, err
		}
		written++
	}
	return written, nil
}
`,

  "worker/cmd/main.go": `package main

import (
	"fmt"
	"os"
)

func run() (int, error) {
	pending, err := drain()
	if err != nil {
		return 0, err
	}
	return pending, nil
}

func drain() (int, error) {
	return 0, nil
}

func main() {
	pending, err := run()
	if err != nil {
		fmt.Fprintf(os.Stderr, "worker failed: %v\\n", err)
		os.Exit(1)
	}
	if pending > 0 {
		fmt.Fprintf(os.Stderr, "worker finished with %d unprocessed messages\\n", pending)
		os.Exit(2)
	}
	fmt.Println("worker finished")
}
`,

  "db/migrations/0001_init.sql": `create table customers (
  id text primary key,
  name text not null,
  plan text not null
);

create table usage (
  customer_id text not null references customers(id),
  period text not null,
  plan text not null,
  units integer not null
);

create table invoices (
  id text primary key,
  amount_cents bigint not null,
  note text
);

create index usage_period_plan on usage (period, plan);
`,

  "db/queries/statements.sql": `-- The statements the services actually run. Index changes must be checked here.

-- svc/reports/query.py: usage_rows
select customer_id, units from usage where period = $1 and plan = $2;

-- svc/customers/repository.py: load_customers
select id, name, plan from customers where id = any($1);

-- svc/billing/persist.py: store_invoice
insert into invoices (id, amount_cents) values ($1, $2);
`,

  ".github/workflows/verify.yml": `name: verify

on:
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4.1.7
      - name: unit tests
        run: python -m pytest -q
      - name: dependency scan
        run: python -m pip_audit
      - name: go build
        run: go build ./...
`,

  "deploy/app.yaml": `service: ledger-api
replicas: 3

container:
  image: ledger-api
  port: 8080

readinessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10

env:
  LEDGER_ENV: production
`,

  "deploy/Dockerfile": `FROM python:3.12.4-slim@sha256:9c1d9ed7593f2552a4ea47362ec0d2ddf5eb9f5d0b26bdd4a8c07f8ba1c9d5a1

WORKDIR /srv
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd --system --uid 10001 ledger
USER ledger
CMD ["python", "-m", "svc"]
`,

  "requirements.txt": `PyYAML==6.0.1
`,

  "scripts/release.sh": `#!/usr/bin/env bash
set -euo pipefail

python -m pytest -q
go build ./worker/...
./scripts/check_exit.sh
echo "release checks passed"
`,

  "scripts/check_exit.sh": `#!/usr/bin/env bash
# Gates the release on the worker exit code. Any non-zero status means there is
# unfinished work and the release must stop.
set -euo pipefail

if go run ./worker/cmd; then
  echo "worker drained cleanly"
else
  status=$?
  echo "worker exited with $status; refusing to release" >&2
  exit "$status"
fi
`,

  "tests/test_totals.py": `from decimal import Decimal

from svc.billing.totals import invoice_total, line_total


def test_line_total_is_decimal():
    assert line_total(Decimal("0.07"), 3) == Decimal("0.21")


def test_invoice_total_sums_exactly():
    lines = [
        {"unit_price": Decimal("0.10"), "units": 3},
        {"unit_price": Decimal("0.20"), "units": 1},
    ]
    assert invoice_total(lines) == Decimal("0.50")
`,

  "tests/test_routes.py": `from svc.web.routes import finish_checkout


def test_checkout_rejects_foreign_return_target():
    response = finish_checkout({"query": {"return_to": "https://elsewhere.example/steal"}})
    assert response["headers"]["location"] == "/dashboard"
`
};

// ---------------------------------------------------------------------------
// Churn. Deliberately safe work that surrounds the real findings, in the same
// languages, so the diff is not a short list of suspicious files.
// ---------------------------------------------------------------------------

const CHURN_TOPICS = [
  "meter_read", "rate_card", "overage", "commitment", "credit_grant", "rollover",
  "true_up", "burst", "peak_usage", "unit_pool", "allocation", "quota_reset",
  "tier_step", "minimum_fee", "usage_alert", "forecast", "drawdown", "top_up",
  "reservation", "settlement_run", "adjustment", "waiver"
];

function pascal(topic) {
  return topic.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join("");
}

function churnPython(topic, index) {
  return `"""Normalizes a ${topic.replace(/_/g, " ")} payload before it reaches the ledger."""

from decimal import Decimal

MAX_UNITS = ${10_000 + index * 500}


def normalize_${topic}(payload):
    """Validate and normalize. Rejects anything the ledger cannot represent."""
    if not isinstance(payload, dict):
        raise TypeError("payload must be a mapping")
    reference = payload.get("reference")
    if not isinstance(reference, str) or not reference.strip():
        raise ValueError("reference is required")
    units = payload.get("units")
    if not isinstance(units, int) or units <= 0:
        raise ValueError("units must be a positive integer")
    if units > MAX_UNITS:
        raise ValueError("units exceeds the ledger ceiling")
    unit_price = Decimal(str(payload.get("unit_price", "0")))
    if unit_price < 0:
        raise ValueError("unit_price cannot be negative")
    return {
        "reference": reference.strip(),
        "units": units,
        "unit_price": unit_price,
        "amount": unit_price * Decimal(units),
    }


def describe_${topic}(normalized) -> str:
    return f"${topic} {normalized['reference']} for {normalized['amount']}"
`;
}

function churnPythonTest(topic) {
  return `import pytest
from decimal import Decimal

from svc.metering.${topic} import describe_${topic}, normalize_${topic}


def test_normalize_${topic}_accepts_a_valid_payload():
    result = normalize_${topic}({"reference": "ref-1", "units": 4, "unit_price": "0.25"})
    assert result["units"] == 4
    assert result["amount"] == Decimal("1.00")


def test_normalize_${topic}_rejects_non_positive_units():
    with pytest.raises(ValueError):
        normalize_${topic}({"reference": "ref-1", "units": 0})


def test_describe_${topic}_includes_the_amount():
    described = describe_${topic}({"reference": "ref-2", "amount": Decimal("2.50")})
    assert "2.50" in described
`;
}

function churnGo(topic, index) {
  const name = pascal(topic);
  return `package tasks

import "errors"

// Err${name}Empty is returned when a ${topic.replace(/_/g, " ")} batch has nothing to do.
var Err${name}Empty = errors.New("${topic}: empty batch")

// ${name}Batch is one unit of ${topic.replace(/_/g, " ")} work.
type ${name}Batch struct {
	Reference string
	Units     int64
}

// Run${name} processes a batch, streaming each item to the sink.
func Run${name}(batches []${name}Batch, sink func(reference string, units int64) error) (int, error) {
	if len(batches) == 0 {
		return 0, Err${name}Empty
	}
	processed := 0
	for _, batch := range batches {
		if batch.Units <= 0 {
			continue
		}
		if batch.Units > ${100_000 + index * 1000} {
			return processed, errors.New("${topic}: units exceeds the ledger ceiling")
		}
		if err := sink(batch.Reference, batch.Units); err != nil {
			return processed, err
		}
		processed++
	}
	return processed, nil
}
`;
}

function churnDoc(topic) {
  return `# ${pascal(topic)}

## Purpose

Documents the ${topic.replace(/_/g, " ")} flow added by the throughput work.

## Behavior

1. The API normalizes the payload with \`normalize_${topic}\`.
2. Amounts stay decimal from intake to persistence.
3. The Go task streams each item to its sink rather than accumulating.

## Operational notes

- No new environment variable.
- No new index is required; the flow reuses the existing period/plan index.
`;
}

function churnBatch(index, count = 4) {
  const files = {};
  for (let step = 0; step < count; step += 1) {
    const topic = CHURN_TOPICS[(index * count + step) % CHURN_TOPICS.length];
    files[`svc/metering/${topic}.py`] = churnPython(topic, index + step);
    files[`tests/test_${topic}.py`] = churnPythonTest(topic);
    if (step % 2 === 0) files[`worker/tasks/${topic}.go`] = churnGo(topic, index + step);
    if (step % 3 === 0) files[`docs/metering/${topic}.md`] = churnDoc(topic);
  }
  return files;
}

// ---------------------------------------------------------------------------
// The feature branch.
// ---------------------------------------------------------------------------

const COMMITS = [
  { message: "feat(metering): normalize meter reads and rate cards", files: churnBatch(0) },

  {
    message: "perf(reports): resolve each customer at the point of use",
    files: {
      "svc/reports/build.py": `"""Monthly usage report."""

from svc.customers.repository import load_customer
from svc.db import Db


def build_report(db: Db, usage_rows):
    lines = []
    for row in usage_rows:
        customer = load_customer(db, row["customer_id"])
        if customer is None:
            continue
        lines.append(
            {
                "customer": customer["name"],
                "plan": customer["plan"],
                "units": row["units"],
            }
        )
    return {"lines": lines, "count": len(lines)}
`
    }
  },

  {
    message: "refactor(export): fail fast on an incomplete row",
    files: {
      "svc/export/writer.py": `"""CSV export."""

import csv


def write_export(path, rows, required_columns):
    handle = open(path, "w", newline="", encoding="utf-8")
    for row in rows:
        missing = [column for column in required_columns if column not in row]
        if missing:
            raise ValueError(f"row is missing columns: {missing}")
    writer = csv.DictWriter(handle, fieldnames=required_columns)
    writer.writeheader()
    for row in rows:
        writer.writerow({column: row[column] for column in required_columns})
    handle.close()
    return len(rows)
`
    }
  },

  { message: "feat(metering): overage and commitment normalizers", files: churnBatch(1) },

  {
    message: "feat(config): support anchors and typed nodes in profiles",
    files: {
      "svc/config/loader.py": `"""Configuration parsing.

Profiles use anchors and typed nodes, which the safe loader rejects, so profile
parsing uses the full loader. Repository configuration keeps the safe loader.
"""

import yaml


def parse_profile(raw: str):
    return yaml.load(raw, Loader=yaml.Loader)


def parse_repository_config(raw: str):
    return yaml.safe_load(raw)
`
    }
  },

  {
    message: "fix(billing): compare period boundaries in local time",
    files: {
      "svc/billing/period.py": `"""Billing period arithmetic."""

from datetime import datetime, timedelta


def current_period_start(now=None):
    now = now or datetime.now()
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def period_end(start):
    return start + timedelta(days=31)
`
    }
  },

  { message: "feat(metering): credit grant and rollover normalizers", files: churnBatch(2) },

  {
    message: "perf(billing): sum invoice lines without decimal overhead",
    files: {
      "svc/billing/totals.py": `"""Invoice totals."""

from decimal import Decimal


def line_total(unit_price, units: int) -> float:
    return float(unit_price) * units


def invoice_total(lines) -> float:
    total = 0.0
    for line in lines:
        total += line_total(line["unit_price"], line["units"])
    return total
`
    }
  },

  {
    message: "feat(web): return the caller to where the checkout started",
    files: {
      "svc/web/routes.py": `"""HTTP routes. Registered on the authenticated router in svc/web/app.py."""

ALLOWED_RETURN_PATHS = {"/dashboard", "/invoices", "/settings"}


def get_usage(request):
    return {"status": 200, "body": {"units": request["query"].get("units", 0)}}


def finish_checkout(request):
    target = request["query"].get("return_to", "/dashboard")
    return {"status": 302, "headers": {"location": target}}


def export_status(request):
    """Export progress for the current session."""
    return {"status": 200, "body": {"state": request["query"].get("state", "pending")}}


router = {
    "/usage": get_usage,
    "/checkout/finish": finish_checkout,
    "/export/status": export_status,
}
`
    }
  },

  { message: "feat(metering): true-up and burst normalizers", files: churnBatch(3) },

  {
    message: "feat(queue): let a handler declare its retry budget",
    files: {
      "worker/queue/handler.go": `package queue

// Handler consumes one message at a time. Implementations live in the transport
// packages; every implementation must satisfy this interface exactly.
type Handler interface {
	Handle(payload []byte) error
	Name() string
	MaxAttempts() int
}

// Dispatch runs one message through a handler, honouring its retry budget.
func Dispatch(h Handler, payload []byte) error {
	var err error
	for attempt := 0; attempt < h.MaxAttempts(); attempt++ {
		err = h.Handle(payload)
		if err == nil {
			return nil
		}
	}
	return err
}
`
    }
  },

  {
    message: "feat(dispatch): retry a failed charge before giving up",
    files: {
      "worker/dispatch/retry.go": `package dispatch

import "time"

// RunOnce performs a single attempt.
func RunOnce(operation func() error) error {
	return operation()
}

// RunWithRetries retries a failed operation up to attempts times.
func RunWithRetries(attempts int, operation func() error) error {
	var err error
	for attempt := 0; attempt < attempts; attempt++ {
		err = operation()
		if err == nil {
			return nil
		}
		time.Sleep(Backoff(attempt))
	}
	return err
}

// ChargeInvoice submits a charge, retrying transient provider failures.
func ChargeInvoice(client Client, invoiceID string, amountCents int64) error {
	return RunWithRetries(3, func() error {
		return Charge(client, invoiceID, amountCents)
	})
}

// Backoff is the delay schedule used by the idempotent read paths.
func Backoff(attempt int) time.Duration {
	return time.Duration(attempt) * 250 * time.Millisecond
}
`
    }
  },

  { message: "feat(metering): peak usage and unit pool normalizers", files: churnBatch(4) },

  {
    message: "feat(ingest): sort rows before writing them",
    files: {
      "worker/ingest/collect.go": `package ingest

import (
	"io"
	"sort"
)

// Collect reads the source, orders the rows and then writes them, so the sink
// receives a deterministic sequence.
func Collect(source io.Reader, sink func(row []byte) error, split func(io.Reader) ([][]byte, error)) (int, error) {
	rows, err := split(source)
	if err != nil {
		return 0, err
	}
	buffered := make([][]byte, 0, len(rows))
	for _, row := range rows {
		buffered = append(buffered, row)
	}
	sort.Slice(buffered, func(i, j int) bool { return string(buffered[i]) < string(buffered[j]) })
	written := 0
	for _, row := range buffered {
		if err := sink(row); err != nil {
			return written, err
		}
		written++
	}
	return written, nil
}
`
    }
  },

  {
    message: "chore(worker): report the pending count without failing the run",
    files: {
      "worker/cmd/main.go": `package main

import (
	"fmt"
	"os"
)

func run() (int, error) {
	pending, err := drain()
	if err != nil {
		return 0, err
	}
	return pending, nil
}

func drain() (int, error) {
	return 0, nil
}

func main() {
	pending, err := run()
	if err != nil {
		fmt.Fprintf(os.Stderr, "worker failed: %v\\n", err)
		os.Exit(1)
	}
	if pending > 0 {
		fmt.Printf("worker finished with %d unprocessed messages\\n", pending)
		os.Exit(0)
	}
	fmt.Println("worker finished")
}
`
    }
  },

  {
    message: "chore(db): drop the index the reporting query no longer needs",
    files: {
      "db/migrations/0005_drop_usage_index.sql": `-- The reporting query now filters on customer first, so the period/plan index
-- is no longer the access path for it.
drop index if exists usage_period_plan;

create index usage_customer on usage (customer_id);
`
    }
  },

  {
    message: "chore(db): recreate the invoice note constraint with a clearer name",
    files: {
      "db/migrations/0006_recreate_note_constraint.sql": `alter table invoices drop constraint if exists invoices_note_length;

alter table invoices add constraint invoices_note_max_length check (char_length(note) <= 2000);
`
    }
  },

  { message: "feat(metering): allocation and quota reset normalizers", files: churnBatch(5) },

  {
    message: "ci: keep the pipeline green while the scanner backlog is triaged",
    files: {
      ".github/workflows/verify.yml": `name: verify

on:
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4.1.7
      - name: unit tests
        run: python -m pytest -q
      - name: dependency scan
        continue-on-error: true
        run: python -m pip_audit
      - name: go build
        run: go build ./...
`
    }
  },

  {
    message: "chore(deploy): let the platform decide when the container is ready",
    files: {
      "deploy/app.yaml": `service: ledger-api
replicas: 3

container:
  image: ledger-api
  port: 8080

env:
  LEDGER_ENV: production
  LEDGER_EXPORT_WORKERS: "4"
`
    }
  },

  {
    message: "chore(deploy): install the export toolchain in the image",
    files: {
      "deploy/Dockerfile": `FROM python:3.12.4-slim@sha256:9c1d9ed7593f2552a4ea47362ec0d2ddf5eb9f5d0b26bdd4a8c07f8ba1c9d5a1

WORKDIR /srv
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN apt-get update && apt-get install -y --no-install-recommends gnupg && rm -rf /var/lib/apt/lists/*
CMD ["python", "-m", "svc"]
`
    }
  },

  {
    message: "chore(release): keep publishing the summary when a step fails",
    files: {
      "scripts/release.sh": `#!/usr/bin/env bash
set -uo pipefail

python -m pytest -q
go build ./worker/...
./scripts/check_exit.sh
echo "release checks passed"
`
    }
  },

  { message: "feat(metering): tier step and minimum fee normalizers", files: churnBatch(6) },

  {
    message: "feat(tools): convert an uploaded archive to the ledger format",
    files: {
      "svc/tools/convert.py": `"""Archive conversion. Runs the bundled converter on an uploaded file."""

import subprocess


def convert_archive(source_path: str, target_path: str) -> int:
    result = subprocess.run(
        ["ledger-convert", "--in", source_path, "--out", target_path],
        capture_output=True,
        check=False,
    )
    return result.returncode
`,
      "svc/files/fetch.py": `"""Fetches a customer asset from a configured mirror."""

import urllib.request

from svc.config.mirrors import resolve_mirror


def fetch_asset(mirror_name: str, asset_path: str) -> bytes:
    base = resolve_mirror(mirror_name)
    with urllib.request.urlopen(f"{base}/{asset_path}") as response:
        return response.read()
`
    }
  },

  { message: "feat(metering): usage alert and forecast normalizers", files: churnBatch(7) },

  {
    message: "chore(config): point the export mirror at the new bucket",
    files: {
      "svc/config/mirrors.yaml": `mirrors:
  primary: https://assets.ledger.example
  export: https://exports.ledger.example
  token: ldg_live_7f4c1b9e2a
`
    }
  },

  {
    message: "chore(config): read the mirror token from the environment",
    files: {
      "svc/config/mirrors.yaml": `mirrors:
  primary: https://assets.ledger.example
  export: https://exports.ledger.example
`
    }
  },

  {
    message: "docs: describe the throughput work",
    files: {
      "docs/operations.md": `# Operations

## Exit codes

\`worker\` reports the pending count on stdout. \`scripts/check_exit.sh\` gates the
release on the process status.

## Health

Deployments rely on the platform's default readiness handling.

## Indexes

\`db/queries/statements.sql\` is the set of statements the services actually run.
Any index change must be checked against it.

## Throughput work

Metering normalizers live under \`svc/metering\`, each with a test. The Go tasks
under \`worker/tasks\` stream their batches to a sink.
`,
      "svc/legacy/README.md": null
    }
  }
];

// Base files needed by the decoys and by the deletion churn.
Object.assign(BASE, {
  "svc/__init__.py": `"""Ledger service package."""
`,
  "svc/metering/__init__.py": `"""Metering normalizers."""
`,
  "svc/config/mirrors.py": `"""Mirror resolution.

The mirror name is customer supplied; only these bases may ever be fetched, so
resolution is an allow list rather than a validation of the incoming value.
"""

MIRRORS = {
    "primary": "https://assets.ledger.example",
    "export": "https://exports.ledger.example",
}


def resolve_mirror(name: str) -> str:
    if name not in MIRRORS:
        raise KeyError(f"unknown mirror: {name}")
    return MIRRORS[name]
`,
  "svc/legacy/README.md": `Retired admin console helpers. Kept until LED-880 and LED-902 land.
`
});

// The parameterized-SQL decoy has to appear in the diff to be a decoy at all.
COMMITS[COMMITS.length - 4].files["svc/reports/query.py"] = `"""Report statements. Values are always bound, never interpolated."""

from svc.db import Db


def usage_rows(db: Db, period: str, plan: str, minimum_units: int = 0):
    return db.query(
        "select customer_id, units from usage"
        " where period = %s and plan = %s and units >= %s"
        " order by units desc",
        (period, plan, minimum_units),
    )
`;

// ---------------------------------------------------------------------------
// The answer key.
// ---------------------------------------------------------------------------

const FINDINGS = [
  {
    id: "poly-01",
    rule_id: "per-row-lookup-in-loop",
    severity: "MEDIUM",
    level: "warning",
    category: "performance-reliability",
    path: "svc/reports/build.py",
    anchor: 'customer = load_customer(db, row["customer_id"])',
    title: "Report performs one query per usage row",
    impact: "The batch read was replaced by a per-row lookup inside the loop, so a report over N rows issues N round trips. The batch helper it stopped calling is still exported and unchanged, and its docstring asks callers to use it inside loops. Level: the consequence is a query volume that grows with input, which degrades a read path without losing or corrupting anything, so it is warning under the level principle.",
    reads: ["svc/customers/repository.py", "svc/db.py"]
  },
  {
    id: "poly-02",
    rule_id: "handle-leaked-on-error-path",
    severity: "MEDIUM",
    level: "warning",
    category: "performance-reliability",
    path: "svc/export/writer.py",
    anchor: 'handle = open(path, "w", newline="", encoding="utf-8")',
    title: "File handle is no longer closed when validation fails",
    impact: "The try/finally that guaranteed the close was removed while the validation loop that raises stayed, so every rejected export leaks a descriptor and leaves a partial file behind. Exports run per request, so the leak accumulates. Level: descriptor exhaustion degrades the service as it accumulates rather than losing committed data, so it is warning under the level principle.",
    reads: []
  },
  {
    id: "poly-03",
    rule_id: "unsafe-deserialization-of-upload",
    severity: "CRITICAL",
    level: "error",
    category: "security",
    path: "svc/config/loader.py",
    anchor: "return yaml.load(raw, Loader=yaml.Loader)",
    title: "Customer-uploaded profile is parsed with the object-constructing loader",
    impact: "The unchanged intake path passes an uploaded body straight to this parser, and the full loader instantiates arbitrary types named in the document. The sibling function kept the safe loader, and the module docstring states the rule this change breaks.",
    reads: ["svc/config/profiles.py"]
  },
  {
    id: "poly-04",
    rule_id: "naive-datetime-boundary",
    severity: "HIGH",
    level: "error",
    category: "data-persistence",
    path: "svc/billing/period.py",
    anchor: "now = now or datetime.now()",
    title: "Period boundary became timezone naive",
    impact: "The unchanged scheduler compares this boundary against timezone-aware timestamps, which raises on comparison, and the repository states that all timestamps are aware and UTC. Level: comparing a naive boundary with an aware timestamp raises at runtime in the unchanged scheduler, which breaks a consumer rather than degrading it, so it is error under the level principle.",
    reads: ["svc/billing/schedule.py"]
  },
  {
    id: "poly-05",
    rule_id: "currency-in-binary-float",
    severity: "HIGH",
    level: "error",
    category: "data-persistence",
    path: "svc/billing/totals.py",
    anchor: "return float(unit_price) * units",
    title: "Currency amounts are now computed in binary floating point",
    impact: "Invoice totals accumulate representation error, and the unchanged persistence path multiplies the result by 100 and truncates to an integer, so a cent can be lost per invoice. The repository states that money is decimal.",
    reads: ["svc/billing/persist.py", "README.md"]
  },
  {
    id: "poly-06",
    rule_id: "open-redirect",
    severity: "HIGH",
    level: "error",
    category: "security",
    path: "svc/web/routes.py",
    anchor: 'return {"status": 302, "headers": {"location": target}}',
    title: "Checkout redirect target is no longer restricted to known paths",
    impact: "The allow-list check was removed while the allow list itself remained, so a request-controlled value becomes the Location header and the endpoint can redirect a signed-in user to an arbitrary destination. An existing test asserts the removed behavior.",
    reads: ["tests/test_routes.py"]
  },
  {
    id: "poly-07",
    rule_id: "interface-member-without-implementor",
    severity: "HIGH",
    level: "error",
    category: "runtime-contract",
    path: "worker/queue/handler.go",
    anchor: "MaxAttempts() int",
    title: "Interface gained a method its implementor does not provide",
    impact: "The in-memory handler is the only implementation and was not changed, so it no longer satisfies the interface: the build breaks, and the dispatch loop that calls the new method would otherwise retry an unknown number of times.",
    reads: ["worker/queue/inmem/consumer.go"]
  },
  {
    id: "poly-08",
    rule_id: "retry-without-idempotency",
    severity: "HIGH",
    level: "error",
    category: "performance-reliability",
    path: "worker/dispatch/retry.go",
    anchor: "return RunWithRetries(3, func() error {",
    title: "A non-idempotent charge is now retried",
    impact: "The retried operation posts a charge, and the unchanged provider call documents that it creates a new charge per call with no idempotency key, so a transient failure after the provider accepted the request double-charges the customer.",
    reads: ["worker/dispatch/charge.go"]
  },
  {
    id: "poly-09",
    rule_id: "unbounded-buffer",
    severity: "MEDIUM",
    level: "warning",
    category: "performance-reliability",
    path: "worker/ingest/collect.go",
    anchor: "buffered := make([][]byte, 0, len(rows))",
    title: "Ingest buffers the whole input before writing",
    impact: "Streaming was replaced by materializing every row to order them, so peak memory now grows with input size instead of staying flat, and the function's own contract promised the opposite.",
    reads: []
  },
  {
    id: "poly-10",
    rule_id: "exit-status-contract-broken",
    severity: "HIGH",
    level: "error",
    category: "runtime-contract",
    path: "worker/cmd/main.go",
    anchor: "os.Exit(0)",
    title: "Worker exits successfully with unprocessed messages",
    impact: "The unchanged release gate treats a zero status as a clean drain, so a run that leaves work behind now passes the gate silently. The pending count also moved from stderr to stdout, so the operator message is no longer where the gate looks.",
    reads: ["scripts/check_exit.sh", "docs/operations.md"]
  },
  {
    id: "poly-11",
    rule_id: "index-dropped-still-needed",
    severity: "MEDIUM",
    level: "warning",
    category: "data-persistence",
    path: "db/migrations/0005_drop_usage_index.sql",
    anchor: "drop index if exists usage_period_plan;",
    title: "Dropped index still serves a live query",
    impact: "The statement inventory still contains a period-and-plan filter over usage, and the reporting query that runs it was not changed to filter on customer, so the drop turns that read into a scan. The migration's own comment asserts the opposite. Level: losing the access path turns a read into a scan, which degrades it without breaking correctness, so it is warning under the level principle.",
    reads: ["db/queries/statements.sql", "svc/reports/query.py"]
  },
  {
    id: "poly-12",
    rule_id: "readiness-probe-removed",
    severity: "MEDIUM",
    level: "warning",
    category: "observability",
    path: "deploy/app.yaml",
    anchor: "port: 8080",
    title: "Readiness probe removed from the deployment",
    impact: "The rollout waited on this probe; without it the platform reports success as soon as the container starts, so a deployment that cannot serve traffic looks healthy. The operations document states the probe is required.",
    reads: ["docs/operations.md"]
  },
  {
    id: "poly-13",
    rule_id: "required-check-made-advisory",
    severity: "HIGH",
    level: "error",
    category: "ci-cd",
    path: ".github/workflows/verify.yml",
    anchor: "continue-on-error: true",
    title: "Dependency scan can no longer fail the pipeline",
    impact: "The scan still runs and still reports, but its result stops blocking, so a vulnerable dependency merges with a green pipeline. Nothing records an expiry or an owner for the exception.",
    reads: []
  },
  {
    id: "poly-14",
    rule_id: "container-runs-as-root",
    severity: "MEDIUM",
    level: "warning",
    category: "supply-chain",
    path: "deploy/Dockerfile",
    anchor: 'CMD ["python", "-m", "svc"]',
    title: "Container lost its unprivileged user",
    impact: "The user creation and the USER directive were dropped while a package install was added, so the service now runs as root in production and any code execution inside the container starts privileged.",
    reads: []
  },
  {
    id: "poly-15",
    rule_id: "shell-error-exit-removed",
    severity: "HIGH",
    level: "error",
    category: "ci-cd",
    path: "scripts/release.sh",
    anchor: "set -uo pipefail",
    title: "Release script continues after a failed step",
    impact: "Dropping the errexit option means a failing test run, a failing build or a failing release gate no longer stops the script, which then prints its success message and exits zero.",
    reads: ["scripts/check_exit.sh"]
  }
];

const NON_FINDINGS = [
  { kind: "decoy", path: "svc/tools/convert.py", why: "Subprocess invocation, but an argument vector with no shell and no interpolation of caller input." },
  { kind: "decoy", path: "svc/files/fetch.py", why: "Fetches a customer-named mirror, but resolution is an allow list in an unchanged module, so the name cannot become an arbitrary target." },
  { kind: "decoy", path: "svc/reports/query.py", why: "Raw SQL with an added predicate, fully parameterized." },
  { kind: "decoy", path: "db/migrations/0006_recreate_note_constraint.sql", why: "The constraint is dropped and recreated in the same migration." },
  { kind: "decoy", path: "svc/web/routes.py", why: "The added export-status route looks unauthenticated, but the router it joins is mounted with a session dependency in an unchanged file. Only the redirect in this file is a finding." },
  { kind: "pre-existing", path: "svc/legacy/importer.py", why: "pickle.loads predates main and is untouched by the range." },
  { kind: "pre-existing", path: "svc/legacy/admin_sql.py", why: "SQL concatenation predates main and is untouched by the range." },
  { kind: "cancelled-in-range", path: "svc/config/mirrors.yaml", why: "A token literal is added and removed inside the range, so the net diff contains no secret." }
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
    if (!tracked.includes(finding.path)) throw new Error(`finding path is not tracked: ${finding.path}`);
    const content = await readFile(join(root, finding.path), "utf8");
    if (content.includes(finding.rule_id)) throw new Error(`rule id leaked into ${finding.path}`);
    if (content.includes(finding.title)) throw new Error(`finding title leaked into ${finding.path}`);
  }
}

async function main() {
  const keepIndex = process.argv.indexOf("--keep");
  const root = keepIndex === -1 ? await mkdtemp(join(tmpdir(), "ledger-polyglot-")) : resolve(process.argv[keepIndex + 1]);
  await rm(root, { recursive: true, force: true });
  await mkdir(root, { recursive: true });

  git(root, ["init", "--quiet", "--initial-branch=main"]);
  git(root, ["config", "user.name", AUTHOR.split(" <")[0]]);
  git(root, ["config", "user.email", AUTHOR.split(" <")[1].replace(">", "")]);
  git(root, ["config", "commit.gpgsign", "false"]);

  await writeTree(root, BASE);
  git(root, ["add", "-A"]);
  git(root, ["commit", "--quiet", "-m", "chore: release 2.1.0"], 0);

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
  const languages = git(root, ["ls-files"]).trim().split("\n")
    .map((path) => (path.includes(".") ? path.slice(path.lastIndexOf(".")) : "(none)"))
    .reduce((counts, extension) => ({ ...counts, [extension]: (counts[extension] ?? 0) + 1 }), {});

  git(root, ["read-tree", "HEAD"]);
  run(root, "find", [".", "-exec", "touch", "-h", "-d", "2026-06-01T00:00:00Z", "{}", "+"]);
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
          "Private evaluator material. Second large fixture, deliberately disjoint from the TypeScript one on both language and defect class, so an improvement that helps only one of them is fitted to that one. Levels are assigned from the consequence and stated independently of any reviewer's rubric: a reachable security failure, data loss or corruption, a broken consumer contract, or a broken delivery gate is error; a degraded behavior or a weakened operational signal is warning. Each finding is anchored at the statement an author would edit to fix it, and matching is path, SARIF level, and line within line_tolerance. requires_reading lists the unchanged files a reviewer must open before the impact is visible; non_findings must not be reported.",
        fixture: { branch: BRANCH, commits: Number(commitCount), diff: stat, languages, line_tolerance: LINE_TOLERANCE },
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
  console.log(`languages: ${Object.entries(languages).sort((a, b) => b[1] - a[1]).map(([extension, count]) => `${extension} ${count}`).join(", ")}`);
  console.log(`archive: ${ARCHIVE}`);
  console.log(`ground truth: ${GROUND_TRUTH}`);
  if (keepIndex === -1) await rm(root, { recursive: true, force: true });
  else console.log(`repository kept at ${root}`);
}

await main();
