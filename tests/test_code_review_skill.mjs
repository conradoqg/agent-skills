#!/usr/bin/env node
/** Contract checks for the deterministic code-review workflow. */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const skill = await readFile(new URL("../skills/code-review/SKILL.md", import.meta.url), "utf8");

assert.match(skill, /scripts\/impact-map\.sh/);
assert.match(skill, /impact\/coupling\.txt/);
assert.doesNotMatch(skill, /codebase-memory-mcp/i);
assert.doesNotMatch(skill, /semantic code-intelligence tool/i);
assert.doesNotMatch(skill, /language server, a code graph, a symbol index/i);

console.log("code-review skill contract checks passed");
