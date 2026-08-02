#!/usr/bin/env node
/** Render a benchmark's JSON conversation bundle as readable Markdown files. */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";

const iterationPath = process.argv[2] ? resolve(process.argv[2]) : null;
if (!iterationPath) throw new Error("Usage: node scripts/render-transcript-bundle.mjs <iteration-directory>");

const benchmark = JSON.parse(await readFile(join(iterationPath, "benchmark.json"), "utf8"));
const bundleDir = join(iterationPath, "transcripts-markdown");
const lines = ["# Conversation transcript bundle", "", "| Eval | Repetition | Variant | Transcript |", "| --- | ---: | --- | --- |"];

for (const result of benchmark.results.filter((item) => item.transcript_path)) {
  const transcript = JSON.parse(await readFile(join(iterationPath, result.transcript_path), "utf8"));
  const targetDir = join(bundleDir, String(result.eval_id), `repetition-${result.repetition}`);
  const target = join(targetDir, `${result.variant}.md`);
  const grades = result.grading.map((grade) => `| ${grade.criterion} | ${grade.score}/10 | ${grade.passed ? "pass" : "fail"} |\n`).join("");
  const dialogue = transcript.transcript.map((message) => `## ${message.speaker === "assistant" ? "Assistant" : "User"}\n\n${message.content}\n`).join("\n");
  const discovery = transcript.discovery;
  await mkdir(targetDir, { recursive: true });
  await writeFile(target, [
    `# ${result.eval_id} — ${result.variant}`,
    "",
    `Repetition: ${result.repetition}. Result: ${result.passed ? "passed" : "failed"}. Candidate turns: ${transcript.candidate_turns}/${transcript.max_turns}.`,
    "",
    `Discovery: ${discovery.revealed_count}/${discovery.available_count} hidden facts revealed. Required: ${discovery.required_hidden_fact_ids.join(", ") || "none"}.`,
    "",
    "## Grading",
    "",
    "| Criterion | Score | Threshold |",
    "| --- | ---: | --- |",
    grades,
    "## Dialogue",
    "",
    dialogue
  ].join("\n"));
  lines.push(`| ${result.eval_id} | ${result.repetition} | ${result.variant} | [Markdown](${relative(bundleDir, target)}) |`);
}

await writeFile(join(bundleDir, "index.md"), `${lines.join("\n")}\n`);
const report = [
  "# Skill benchmark report",
  "",
  `Generated: ${benchmark.generated_at}`,
  "",
  "## Variant summary",
  "",
  "| Variant | Passed | Avg score | Facts | Candidate turns | Avg turns | Task tokens |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"
];
for (const variant of benchmark.variants) {
  const runs = benchmark.results.filter((item) => item.variant === variant);
  const facts = runs.reduce((sum, item) => sum + (item.conversation?.discovery.revealed_count ?? 0), 0);
  const availableFacts = runs.reduce((sum, item) => sum + (item.conversation?.discovery.available_count ?? 0), 0);
  const turns = runs.reduce((sum, item) => sum + (item.conversation?.candidate_turns ?? 0), 0);
  const scores = runs.flatMap((item) => item.grading.map((grade) => grade.score));
  const averageScore = scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2) : "n/a";
  const averageTurns = runs.length ? (turns / runs.length).toFixed(2) : "n/a";
  const tokens = runs.reduce((sum, item) => sum + (item.timing?.total_tokens ?? 0), 0);
  report.push(`| ${variant} | ${runs.filter((item) => item.passed).length}/${runs.length} | ${averageScore} | ${facts}/${availableFacts} | ${turns} | ${averageTurns} | ${tokens} |`);
}
await writeFile(join(iterationPath, "report.md"), `${report.join("\n")}\n`);
process.stdout.write(`Rendered ${benchmark.results.filter((item) => item.transcript_path).length} transcripts to ${bundleDir}\n`);
