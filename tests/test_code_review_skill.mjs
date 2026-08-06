#!/usr/bin/env node
/** Contract checks for the deterministic code-review workflow. */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const skill = await readFile(new URL("../skills/code-review/SKILL.md", import.meta.url), "utf8");

assert.match(skill, /scripts\/impact-map\.sh/);
assert.match(skill, /impact\/coupling\.txt/);
assert.match(skill, /request-controlled external redirect[\s\S]*`HIGH` \/ `error`/);
assert.match(skill, /existing implementor no longer satisfies/);
assert.match(skill, /Assign the SARIF\/scanner level first/);
assert.match(skill, /`CRITICAL` and `HIGH` are deliberately equivalent for machine consumers/);
assert.match(skill, /Similarity is not a contract/);
assert.match(skill, /shared specification, schema, caller, or test/);
assert.match(skill, /one file at a time/);
assert.match(skill, /Never derive a source line from a numbered diff/);
assert.doesNotMatch(skill, /codebase-memory-mcp/i);
assert.doesNotMatch(skill, /semantic code-intelligence tool/i);
assert.doesNotMatch(skill, /language server, a code graph, a symbol index/i);

console.log("code-review skill contract checks passed");
