#!/usr/bin/env node

import { readFileSync, statSync } from "node:fs";
import { isAbsolute, normalize, resolve, sep } from "node:path";

function fail(message) {
  process.stderr.write(`validate-review-sarif: ${message}\n`);
  process.exitCode = 1;
}

function changedLineMap(diff) {
  const files = new Map();
  let path = null;
  let line = null;
  for (const row of diff.split("\n")) {
    const file = /^\+\+\+ b\/(.*)$/.exec(row);
    if (file) {
      path = normalize(file[1]);
      if (!files.has(path)) files.set(path, new Set());
      line = null;
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(row);
    if (hunk) {
      line = Number(hunk[1]);
      continue;
    }
    if (path === null || line === null || row.startsWith("\\ No newline")) continue;
    if (row.startsWith("+")) {
      files.get(path).add(line);
      line += 1;
    } else if (!row.startsWith("-")) {
      line += 1;
    }
  }
  return files;
}

const [sarifArgument, diffArgument] = process.argv.slice(2);
if (!sarifArgument || !diffArgument) {
  process.stderr.write("Usage: node validate-review-sarif.mjs <review.sarif> <diff.patch>\n");
  process.exit(2);
}

let sarif;
try {
  sarif = JSON.parse(readFileSync(resolve(sarifArgument), "utf8"));
} catch (error) {
  fail(`cannot parse ${sarifArgument}: ${error.message}`);
}

const results = sarif?.version === "2.1.0" && Array.isArray(sarif?.runs)
  ? sarif.runs.flatMap((run) => Array.isArray(run?.results) ? run.results : [])
  : null;
if (!results) fail("artifact must be SARIF 2.1.0 with runs[].results[]");

const allowedLevels = new Set(["none", "note", "warning", "error"]);
let changed;
try {
  changed = changedLineMap(readFileSync(resolve(diffArgument), "utf8"));
} catch (error) {
  fail(`cannot read ${diffArgument}: ${error.message}`);
  changed = new Map();
}
const seen = new Set();
let checked = 0;

for (const [index, result] of (results ?? []).entries()) {
  const prefix = `result ${index + 1}`;
  const level = result?.level ?? "warning";
  const message = result?.message?.text;
  const location = result?.locations?.[0]?.physicalLocation;
  const path = location?.artifactLocation?.uri;
  const line = location?.region?.startLine;
  if (!allowedLevels.has(level)) {
    fail(`${prefix}: invalid level ${JSON.stringify(level)}`);
    continue;
  }
  if (typeof message !== "string" || message.trim() === "") {
    fail(`${prefix}: message.text is required`);
    continue;
  }
  if (typeof path !== "string" || path === "" || isAbsolute(path) || path.includes("://")) {
    fail(`${prefix}: artifact URI must be a repository-relative path`);
    continue;
  }
  const normalized = normalize(path);
  if (normalized === ".." || normalized.startsWith(`..${sep}`)) {
    fail(`${prefix}: artifact URI escapes the repository`);
    continue;
  }
  if (!Number.isSafeInteger(line) || line < 1) {
    fail(`${prefix}: startLine must be a positive integer`);
    continue;
  }
  try {
    const file = resolve(normalized);
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error("not a regular file");
    const lineCount = readFileSync(file, "utf8").split("\n").length;
    if (line > lineCount) throw new Error(`line ${line} exceeds file length ${lineCount}`);
    const changedForFile = changed.get(normalized) ?? new Set();
    if (!changedForFile.has(line)) {
      const nearest = [...changedForFile].sort((a, b) => Math.abs(a - line) - Math.abs(b - line)).slice(0, 5);
      throw new Error(`line ${line} is not changed in the supplied diff; nearest changed lines: ${nearest.join(", ") || "none"}`);
    }
  } catch (error) {
    fail(`${prefix}: ${normalized}:${line}: ${error.message}`);
    continue;
  }
  const key = JSON.stringify([level, normalized, line, message.trim()]);
  if (seen.has(key)) {
    fail(`${prefix}: duplicate SARIF result`);
    continue;
  }
  seen.add(key);
  checked += 1;
}

if (process.exitCode !== 1) {
  process.stdout.write(`${JSON.stringify({ valid: true, results: checked, diff: diffArgument })}\n`);
}
