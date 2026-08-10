import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const validator = join(repositoryRoot, "skills/code-review/scripts/validate-review-sarif.mjs");
const fixtureRoot = mkdtempSync(join(tmpdir(), "validate-review-sarif-"));

function result({ level = "warning", line = 2, message = "Changed behavior is unsafe" } = {}) {
  return {
    ruleId: "review/test",
    level,
    message: { text: message },
    locations: [{
      physicalLocation: {
        artifactLocation: { uri: "src/app.ts" },
        region: { startLine: line },
      },
    }],
  };
}

function validate(name, results) {
  const sarifPath = join(fixtureRoot, `${name}.sarif`);
  writeFileSync(sarifPath, JSON.stringify({ version: "2.1.0", runs: [{ results }] }));
  return spawnSync("bun", [validator, sarifPath, join(fixtureRoot, "change.patch")], {
    cwd: fixtureRoot,
    encoding: "utf8",
  });
}

try {
  mkdirSync(join(fixtureRoot, "src"));
  writeFileSync(join(fixtureRoot, "src/app.ts"), [
    "const stable = true;",
    "const risky = true;",
    "const tail = true;",
  ].join("\n"));
  writeFileSync(join(fixtureRoot, "change.patch"), `diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,2 +1,3 @@
 const stable = true;
+const risky = true;
 const tail = true;
`);

  const valid = validate("valid", [result()]);
  assert.equal(valid.status, 0, valid.stderr);
  assert.deepEqual(JSON.parse(valid.stdout), {
    valid: true,
    results: 1,
    diff: join(fixtureRoot, "change.patch"),
  });

  const unchanged = validate("unchanged-line", [result({ line: 1 })]);
  assert.equal(unchanged.status, 1);
  assert.match(unchanged.stderr, /line 1 is not changed in the supplied diff/);

  const invalidLevel = validate("invalid-level", [result({ level: "critical" })]);
  assert.equal(invalidLevel.status, 1);
  assert.match(invalidLevel.stderr, /invalid level "critical"/);

  const duplicate = validate("duplicate", [result(), result()]);
  assert.equal(duplicate.status, 1);
  assert.match(duplicate.stderr, /duplicate SARIF result/);

  console.log("review SARIF validator checks passed");
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
