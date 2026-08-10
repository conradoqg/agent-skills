import assert from "node:assert/strict";
import { extractRiskTriggers } from "../skills/code-review/scripts/extract-risk-triggers.mjs";

const output = extractRiskTriggers(`diff --git a/src/example.ts b/src/example.ts
--- a/src/example.ts
+++ b/src/example.ts
@@ -1,4 +1,7 @@
-const cacheKey = tenantId + invoiceId;
+const cacheKey = invoiceId;
+const now = datetime.now();
+assert.match(rendered, /123|NaN/);
 const harmless = "hello";
diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -1 +1 @@
-  pull_request:
+  pull_request_target:
`);

assert.match(output, /## trust/);
assert.match(output, /- src\/example\.ts:1\s+const cacheKey = tenantId/);
assert.match(output, /## data-time/);
assert.match(output, /datetime\.now/);
assert.match(output, /## operations/);
assert.match(output, /pull_request_target/);
assert.match(output, /## tests/);
assert.match(output, /NaN/);
assert.doesNotMatch(output, /harmless/);

const indexLead = extractRiskTriggers(`diff --git a/db/migrations/0005.sql b/db/migrations/0005.sql
--- /dev/null
+++ b/db/migrations/0005.sql
@@ -0,0 +1 @@
+drop index if exists usage_period_plan;
`);
assert.match(indexLead, /## data-time/);
assert.match(indexLead, /drop index if exists usage_period_plan/);

const capped = extractRiskTriggers(`diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1,3 @@
-const cache = tenant;
+const cache = tenant;
+const key = tenant;
+const ttl = tenant;
`, 1);
assert.match(capped, /## trust \(1\)/);
assert.match(capped, /## data-time \(1\)/);

const oversized = Array.from({ length: 101 }, (_, index) => `diff --git a/f${index}.ts b/f${index}.ts\n--- a/f${index}.ts\n+++ b/f${index}.ts\n@@ -1 +1 @@\n-const cache = tenant;\n+const cache = key;`).join("\n") + `
diff --git a/infra/config/api.yaml b/infra/config/api.yaml
--- a/infra/config/api.yaml
+++ b/infra/config/api.yaml
@@ -1 +1 @@
-debugEndpoints: false
+debugEndpoints: true
diff --git a/src/guard.ts b/src/guard.ts
--- a/src/guard.ts
+++ b/src/guard.ts
@@ -1 +1 @@
-return request.roles.includes(role);
+return async (request) => rolesFor(request).then((roles) => roles.includes(role));`;
const compact = extractRiskTriggers(oversized);
assert.match(compact, /only compact high-signal transitions are shown/);
assert.match(compact, /## priority/);
assert.doesNotMatch(compact, /debugEndpoints: true/);
assert.match(compact, /\[async-contract\]/);
assert.match(compact, /\[removed-check\]/);
assert.doesNotMatch(compact, /## trust/);
assert.doesNotMatch(compact, /## paired-transitions/);

const transitionDiffs = [
  ["tmp.py", "handle = tempfile.NamedTemporaryFile(delete=False)", "return `/tmp/export-${digest}.zip`", "unique-temp-to-derived-path"],
  ["pattern.py", "return re.search(re.escape(literal), value)", "return re.search(literal, value)", "literal-to-pattern-execution"],
  ["cache.ts", "return [\"rate\", tenant, lane, locale].join(\":\")", "return [\"rate\", tenant, lane].join(\":\")", "composite-key-dimension-removed"],
  ["async.ts", "await Promise.all(items.map(send))", "items.forEach(async (item) => send(item))", "bulk-await-to-detached-callback"],
  ["narrow.scala", "if (value < 0 || value > Int.MaxValue) Left(\"range\")", "Right(value.toInt)", "checked-to-unchecked-narrowing"],
  ["parse.swift", "guard let url = URL(string: raw) else { return nil }", "let url = URL(string: raw)!", "optional-parse-to-forced-value"],
  ["callback.swift", "case .failure(let error): completion(.failure(error)); return", "if case .failure(let error) = result { completion(.failure(error)) }; completion(result)", "completion-cardinality-increased"],
  ["view.cpp", "std::string label(Route const& route) { return route.label(); }", "std::string_view label(Route const& route) { std::string value = route.label(); return value; }", "owning-to-borrowed-return"],
  ["cleanup.sh", "trap 'rm -rf -- \"$tmpdir\"' EXIT", "atlas-export --output \"$tmpdir/routes.json\"", "removed-temp-cleanup"]
].map(([path, before, after]) => `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -1 +1 @@\n-${before}\n+${after}`).join("\n");
const largeTransitionDiff = Array.from({ length: 201 }, (_, index) => `diff --git a/generated/f${index}.ts b/generated/f${index}.ts\n--- /dev/null\n+++ b/generated/f${index}.ts\n@@ -0,0 +1 @@\n+export interface F${index} { id: string }`).join("\n") + `\n${transitionDiffs}`;
const transitions = extractRiskTriggers(largeTransitionDiff);
for (const label of [
  "unique-temp-to-derived-path",
  "literal-to-pattern-execution",
  "composite-key-dimension-removed",
  "bulk-await-to-detached-callback",
  "checked-to-unchecked-narrowing",
  "optional-parse-to-forced-value",
  "completion-cardinality-increased",
  "owning-to-borrowed-return",
  "removed-temp-cleanup"
]) assert.match(transitions, new RegExp(`\\[${label}\\]`));
const pairedCount = Number(/## paired-transitions \((\d+)\)/.exec(transitions)?.[1]);
assert.ok(pairedCount >= 9 && pairedCount <= 12);

const collectedTicker = extractRiskTriggers(`diff --git a/session.go b/session.go
--- a/session.go
+++ b/session.go
@@ -1,2 +1 @@
 ticker := time.NewTicker(time.Second)
-defer ticker.Stop()
`);
assert.doesNotMatch(collectedTicker, /removed-temp-cleanup/);
console.log("risk-trigger extractor checks passed");
