#!/usr/bin/env node
/** Contract checks for the deterministic code-review workflow. */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const skill = await readFile(new URL("../skills/code-review/SKILL.md", import.meta.url), "utf8");
const defectPatterns = await readFile(new URL("../skills/code-review/references/defect-patterns.md", import.meta.url), "utf8");
const subagents = await readFile(new URL("../skills/code-review/references/codex-subagents.md", import.meta.url), "utf8");
const localReport = await readFile(new URL("../skills/code-review/references/local-report.md", import.meta.url), "utf8");
const ciPublishing = await readFile(new URL("../skills/code-review/references/ci-publishing.md", import.meta.url), "utf8");

assert.match(skill, /scripts\/collect-pr-context\.sh/);
assert.match(skill, /scripts\/impact-map\.sh/);
assert.match(skill, /scripts\/extract-risk-triggers\.mjs/);
assert.match(skill, /scripts\/validate-review-sarif\.mjs/);
assert.match(skill, /impact\/coupling\.txt/);
assert.match(skill, /changed fix site/);
assert.match(skill, /evidence proving the consequence/);
assert.match(skill, /Anchor at the changed fix site, never at the later consequence/);
assert.match(skill, /Never derive line\s+numbers from combined or numbered diff streams/);
assert.match(skill, /Map `error` to CRITICAL[\s\S]*otherwise\nHIGH/);
assert.match(skill, /all and only those SARIF results/);
assert.match(skill, /publish nothing/);
assert.match(skill, /exactly one PR comment, one audit, one SARIF result per finding/);
assert.match(skill, /references\/codex-subagents\.md/);
assert.match(skill, /if\s+one reported fix necessarily removes both consequences, merge them/);
assert.match(skill, /globally unique resource ID still leaks across\s+tenants/);
assert.match(skill, /enumerate pre-existing\s+implementors by searching for an older sibling member/);
assert.match(subagents, /maximum 24/);
assert.match(subagents, /independently reopen every\s+mapper `CLEARED LEAD`/);

assert.match(defectPatterns, /pre-existing sibling member[\s\S]*unchanged implementors/);
assert.match(defectPatterns, /redirect target[\s\S]*encoded for that sink/);
assert.match(defectPatterns, /column, table, index, or field is dropped or renamed/);
assert.match(defectPatterns, /unbounded collection, buffer, or accumulator/);
assert.match(defectPatterns, /Globally unique resource IDs prevent collisions but do not prevent cross-tenant disclosure/);
assert.match(defectPatterns, /Absence of proof is not proof of absence/);
assert.match(defectPatterns, /prior absence of a constraint and the absence of a backfill alone do not prove incompatible data/);

assert.match(localReport, /Mode: local/);
assert.match(localReport, /Do not call `ado_\*`/);
assert.match(ciPublishing, /Post exactly one PR comment/);
assert.match(ciPublishing, /call `report_sarif_finding` once for every/);

console.log("code-review skill contract checks passed");
