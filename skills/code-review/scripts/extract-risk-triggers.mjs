#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { normalize, resolve } from "node:path";

const categories = [
  ["contract", /\b(interface|protocol|abstract|signature|serialize|response|payload|event|async|await|exit|status)\b/i, /\b(interface|protocol|abstract|response|payload|async|await|exit)\b/i],
  ["trust", /\b(auth|role|tenant|owner|permission|secret|token|credential|guard|saniti[sz]|validat|scope)\w*/i, /\b(auth|role|tenant|permission|secret|credential)\w*/i],
  ["data-time", /\b(cache|ttl|key|index|timezone|datetime|clock|currency|decimal|float|migration|schema|version|etag|lock)\w*/i, /\b(cache|ttl|index|timezone|datetime|migration|version|etag|lock)\w*/i],
  ["reliability", /\b(retry|attempt|ack|timeout|concurr|race|buffer|batch|pool|close|finally|resource)\w*/i, /\b(retry|ack|timeout|concurr|race|close|finally)\w*/i],
  ["operations", /\b(debug\w*|probe\w*|health\w*|continue-on-error|pull_request_target|permissions|latest|USER|set\s+-e|deploy\w*|release\w*)/i, /\b(debug\w*|probe\w*|continue-on-error|pull_request_target|permissions|latest|USER|set\s+-e)/i],
  ["tests", /\b(assert|expect|skip|mock|stub|fixture|NaN|as\s+any)\b/i, /\b(NaN|as\s+any|skip)|\b(assert|expect)\b.*\|/i]
];

const highSignalPatterns = [
  ["production-or-ci-flag", 9, (sign, text) => sign === "+" && /(pull_request_target|continue-on-error\s*:\s*true|FROM\s+\S+:latest\b)/i.test(text)],
  ["async-contract", 8, (sign, text) => sign === "+" && /(return\s+async\b|\basync\s*\([^)]*\)\s*=>)/i.test(text)],
  ["removed-check", 8, (sign, text) => sign === "-" && /\b(if|throw|return)\b.*\b(auth|role|tenant|owner|permission|guard|saniti[sz]|validat)\w*/i.test(text)],
  ["removed-concurrency-control", 7, (sign, text) => sign === "-" && /\b(version|etag|lock|conditional|compare-and-swap)\b/i.test(text)],
  ["removed-wait", 7, (sign, text) => sign === "-" && /\bawait\b/i.test(text)],
  ["removed-scope", 6, (sign, text) => sign === "-" && /\b(tenant|owner|permission|role)\w*/i.test(text)],
  ["weakened-test", 6, (sign, text) => sign === "+" && /\b(assert|expect)\b/i.test(text) && /(\||NaN|skip|as\s+any)/i.test(text)]
];

const transitionPatterns = [
  ["unique-temp-to-derived-path", 10, (before, after) =>
    /\b(NamedTemporaryFile|mkstemp|createTemp(?:File|Directory)|Files\.createTempFile)\b/i.test(before) &&
    /(?:["'`]\/tmp\/|temp(?:orary)?[^\n]*(?:hash|digest|id)|(?:hash|digest)[^\n]*temp)/i.test(after)],
  ["literal-to-pattern-execution", 10, (before, after) =>
    /\b(?:re\.escape|Pattern\.quote|Regex\.escape|regexp\.QuoteMeta)\b/.test(before) &&
    /\b(?:re\.(?:search|match|fullmatch|compile)|new\s+RegExp|Regex\s*\()/.test(after) &&
    !/\b(?:re\.escape|Pattern\.quote|Regex\.escape|regexp\.QuoteMeta)\b/.test(after)],
  ["bulk-await-to-detached-callback", 10, (before, after) =>
    /\b(?:Promise\.all|Future\.sequence|awaitAll|gather)\b|\bawait\b[^\n]*\bmap\b/.test(before) &&
    /\b(?:forEach|map)\s*\(\s*async\b/.test(after)],
  ["checked-to-unchecked-narrowing", 9, (before, after) =>
    /\b(?:if|guard|require|checked|overflow|range)\b[^\n]*(?:[<>]=?|Min|Max)|(?:[<>]=?)[^\n]*(?:Min|Max)/i.test(before) &&
    /\b(?:toInt|toShort|int(?:8|16|32)\s*\(|static_cast\s*<\s*(?:u?int(?:8|16|32)_t|int|short)|as\s+(?:U?Int(?:8|16|32)?))\b/i.test(after)],
  ["optional-parse-to-forced-value", 9, (before, after) =>
    /\b(?:guard\s+let|if\s+let|Optional|Result|try\?|orElse|flatMap)\b/.test(before) &&
    /\b(?:URL|UUID|Date|try)[^\n]*!(?:\s|[.;,)]|$)|\.(?:get|unwrap)\b/.test(after)],
  ["owning-to-borrowed-return", 9, (before, after) =>
    /\b(?:std::)?(?:string|vector|shared_ptr|unique_ptr)\b/.test(before) &&
    /\b(?:std::)?(?:string_view|span|weak_ptr)\b/.test(after) &&
    /\breturn\b/.test(after)],
  ["removed-temp-cleanup", 9, (before, after) =>
    /\btrap\b[^\n]*\brm\b|\b(?:finally|defer)\b[^\n]*(?:unlink|remove|rmtree)|\bcleanup\b[^\n]*(?:temp|tmp)/i.test(before) &&
    !/\btrap\b[^\n]*\brm\b|\b(?:finally|defer)\b[^\n]*(?:unlink|remove|rmtree)|\bcleanup\b[^\n]*(?:temp|tmp)/i.test(after)],
  ["completion-cardinality-increased", 9, (before, after) => {
    const completion = /\b(?:completion|callback|resolve|reject)\s*\(/g;
    return (before.match(completion) ?? []).length < (after.match(completion) ?? []).length &&
      (after.match(completion) ?? []).length > 1;
  }],
  ["composite-key-dimension-removed", 8, (_before, _after, changedBefore, changedAfter) => {
    const keyShape = /\b(?:cacheKey|dedupeKey|hashKey)\b|\.join\s*\(|\b(?:const|let|var)\s+\w*(?:key|hash)\w*\s*=/i;
    if (!keyShape.test(changedBefore) || !keyShape.test(changedAfter)) return false;
    const ignored = new Set(["return", "const", "let", "var", "string", "join", "cache", "key", "hash"]);
    const words = (text) => new Set((text.match(/[A-Za-z_$][\w$]*/g) ?? []).filter((word) => !ignored.has(word)));
    const beforeWords = words(changedBefore);
    const afterWords = words(changedAfter);
    return [...beforeWords].some((word) => !afterWords.has(word));
  }]
];

function compactTransition(path, changes, label) {
  const oldSide = changes.removed.length > 0 ? changes.removed : changes.context;
  const removed = oldSide.map(({ text }) => text.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 80);
  const added = changes.added.map(({ text }) => text.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 80);
  const line = changes.added[0]?.line ?? changes.removed[0]?.line ?? 0;
  return `± ${path}:${line}  [${label}] ${removed} -> ${added}`;
}

export function extractRiskTriggers(diff, maxPerCategory = 15, maxFiles = 100) {
  const changedFiles = new Set([...diff.matchAll(/^diff --git a\/(.*?) b\/(.*?)$/gm)].map((match) => match[2])).size;
  const matches = new Map(categories.map(([name]) => [name, []]));
  const highSignalMatches = [];
  const pairedTransitionMatches = [];
  const seen = new Set();
  let path = null;
  let oldLine = null;
  let newLine = null;
  let hunkChanges = { removed: [], added: [], context: [] };

  const flushHunk = () => {
    if (path === null || (hunkChanges.removed.length === 0 && hunkChanges.added.length === 0)) return;
    const context = hunkChanges.context.map(({ text }) => text);
    const changedBefore = hunkChanges.removed.map(({ text }) => text).join("\n");
    const changedAfter = hunkChanges.added.map(({ text }) => text).join("\n");
    const before = [changedBefore, ...context].join("\n");
    const after = [changedAfter, ...context].join("\n");
    for (const [label, score, predicate] of transitionPatterns) {
      if (!predicate(before, after, changedBefore, changedAfter)) continue;
      const text = compactTransition(path, hunkChanges, label);
      const key = `transition\0${path}\0${label}\0${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairedTransitionMatches.push({ label, score, text });
    }
    hunkChanges = { removed: [], added: [], context: [] };
  };

  for (const row of diff.split("\n")) {
    if (row.startsWith("diff --git ")) flushHunk();
    const file = /^\+\+\+ b\/(.*)$/.exec(row);
    if (file) {
      path = normalize(file[1]);
      continue;
    }
    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(row);
    if (hunk) {
      flushHunk();
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      continue;
    }
    if (path === null || oldLine === null || newLine === null || row.startsWith("\\ No newline")) continue;

    let sign;
    let line;
    let text;
    if (row.startsWith("+") && !row.startsWith("+++")) {
      sign = "+";
      line = newLine;
      text = row.slice(1);
      hunkChanges.added.push({ line, text });
      newLine += 1;
    } else if (row.startsWith("-") && !row.startsWith("---")) {
      sign = "-";
      line = oldLine;
      text = row.slice(1);
      hunkChanges.removed.push({ line, text });
      oldLine += 1;
    } else {
      if (row.startsWith(" ")) hunkChanges.context.push({ line: newLine, text: row.slice(1) });
      oldLine += 1;
      newLine += 1;
      continue;
    }

    const compact = text.trim().replace(/\s+/g, " ").slice(0, 180);
    if (!compact) continue;
    for (const [label, score, predicate] of highSignalPatterns) {
      if (!predicate(sign, compact)) continue;
      const key = `priority\0${path}\0${line}\0${sign}\0${compact}`;
      if (seen.has(key)) continue;
      seen.add(key);
      highSignalMatches.push({ label, score, text: `${sign} ${path}:${line}  [${label}] ${compact}` });
    }
    const triggered = categories.filter(([, pattern]) => pattern.test(compact));
    for (const [category, , specificPattern] of triggered) {
      const key = `${category}\0${path}\0${line}\0${sign}\0${compact}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const score = triggered.length + (sign === "-" ? 1 : 0) + (specificPattern.test(compact) ? 2 : 0);
      matches.get(category).push({ score, text: `${sign} ${path}:${line}  ${compact}` });
    }
  }
  flushHunk();

  const rankedRows = (candidates, limit) => {
    const labelCounts = new Map();
    const rows = [];
    for (const match of candidates.sort((left, right) => right.score - left.score || left.text.localeCompare(right.text))) {
      if ((labelCounts.get(match.label) ?? 0) >= 3) continue;
      labelCounts.set(match.label, (labelCounts.get(match.label) ?? 0) + 1);
      rows.push(match.text);
      if (rows.length >= limit) break;
    }
    return rows;
  };

  if (changedFiles > maxFiles) {
    const rows = rankedRows(highSignalMatches, Math.min(maxPerCategory, 15));
    const pairedRows = rankedRows(pairedTransitionMatches, 12);
    const output = [
      "# Risk-trigger leads from changed lines",
      `# ${changedFiles} changed files exceeds the ${maxFiles}-file salience limit; only compact high-signal transitions are shown.`,
      "# These are inspection leads, never findings. Verify mechanism, reachability, and consequence in source.",
      "",
      `## priority (${rows.length})`,
      ...(rows.length > 0 ? rows : ["none"])
    ];
    if (pairedRows.length > 0) output.push("", `## paired-transitions (${pairedRows.length})`, ...pairedRows);
    return `${output.join("\n")}\n`;
  }

  const output = [
    "# Risk-trigger leads from changed lines",
    `# ${changedFiles} changed files; these are bounded inspection leads, never findings. Verify mechanism and consequence in source.`
  ];
  for (const [category] of categories) {
    const rows = matches.get(category)
      .sort((left, right) => right.score - left.score || left.text.localeCompare(right.text))
      .slice(0, maxPerCategory)
      .map(({ text }) => text);
    output.push("", `## ${category} (${rows.length})`, ...(rows.length > 0 ? rows : ["none"]));
  }
  const pairedRows = rankedRows(pairedTransitionMatches, 12);
  if (pairedRows.length > 0) output.push("", `## paired-transitions (${pairedRows.length})`, ...pairedRows);
  return `${output.join("\n")}\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [diffArgument] = process.argv.slice(2);
  if (!diffArgument) {
    process.stderr.write("Usage: extract-risk-triggers.mjs <diff.patch>\n");
    process.exit(2);
  }
  process.stdout.write(extractRiskTriggers(readFileSync(resolve(diffArgument), "utf8")));
}
