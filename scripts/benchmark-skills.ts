#!/usr/bin/env node
/** Compare peer Agent Skills against one external evaluation suite. */

import { basename, dirname, join, relative, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import {
  DEFAULT_TIMEOUT_MS,
  MAX_CONVERSATION_TURNS,
  ROOT,
  createRuntime,
  evaluateVariant,
  fileExists,
  loadManifest,
  mapWithConcurrency,
  nextIteration,
  resolveSkill,
  safeId,
  summarizeDiscovery,
  summarizeScores,
  summarizeTurns,
  sumTokenUsage,
  writeFinalReport,
  writeTranscriptBundle
} from "./evaluate-skills.ts";

function usage() {
  return `Usage: node scripts/benchmark-skills.ts --participant <name-or-path> --participant <name-or-path> --evals <path> [options]

Options:
  --participant <path>   Skill in the competition; supply at least twice.
  --evals <path>         Shared evals.json suite (required).
  --workspace <path>     Root for generated evidence (default: .skill-benchmarks/<suite-name>).
  --runtime <name>       Runtime adapter (default: codex).
  --codex-bin <path>     Codex executable when --runtime codex (default: codex).
  --model <name>         Optional model passed to Codex.
  --grader <runtime|none> Grade assertions with the selected runtime or only record runs (default: runtime).
  --timeout-ms <number>  Per runtime invocation timeout (default: ${DEFAULT_TIMEOUT_MS}).
  --max-repetitions <n>  Cap repetitions per eval for a fast pilot run.
  --max-turns <n>        Cap conversation turns per eval for a fast pilot run.
  --concurrency <n>      Concurrent isolated runs (default: 1).
  --iteration <number>   Explicit iteration number (default: next available).
  --help                 Print this message.
`;
}

function parseArgs(argv) {
  const values = { runtime: "codex", grader: "runtime", codexBin: "codex", timeoutMs: DEFAULT_TIMEOUT_MS, concurrency: 1, participants: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--help") return { help: true };
    if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${key}`);
    index += 1;
    if (key === "--participant") values.participants.push(value);
    else if (key === "--evals") values.evals = value;
    else if (key === "--workspace") values.workspace = value;
    else if (key === "--runtime") values.runtime = value;
    else if (key === "--codex-bin") values.codexBin = value;
    else if (key === "--model") values.model = value;
    else if (key === "--grader") values.grader = value;
    else if (key === "--timeout-ms") values.timeoutMs = Number(value);
    else if (key === "--max-repetitions") values.maxRepetitions = Number(value);
    else if (key === "--max-turns") values.maxTurns = Number(value);
    else if (key === "--concurrency") values.concurrency = Number(value);
    else if (key === "--iteration") values.iteration = Number(value);
    else throw new Error(`Unknown option: ${key}`);
  }
  if (values.participants.length < 2) throw new Error("--participant must be supplied at least twice");
  if (!values.evals) throw new Error("--evals is required for a neutral benchmark");
  if (!Number.isSafeInteger(values.timeoutMs) || values.timeoutMs <= 0) throw new Error("--timeout-ms must be a positive integer");
  if (values.iteration !== undefined && (!Number.isSafeInteger(values.iteration) || values.iteration <= 0)) throw new Error("--iteration must be a positive integer");
  if (values.maxRepetitions !== undefined && (!Number.isSafeInteger(values.maxRepetitions) || values.maxRepetitions <= 0)) throw new Error("--max-repetitions must be a positive integer");
  if (values.maxTurns !== undefined && (!Number.isSafeInteger(values.maxTurns) || values.maxTurns < 2 || values.maxTurns > MAX_CONVERSATION_TURNS)) throw new Error(`--max-turns must be an integer from 2 to ${MAX_CONVERSATION_TURNS}`);
  if (!Number.isSafeInteger(values.concurrency) || values.concurrency <= 0) throw new Error("--concurrency must be a positive integer");
  if (!['runtime', 'none'].includes(values.grader)) throw new Error("--grader must be runtime or none");
  return values;
}

function buildSummary(variants, results) {
  return Object.fromEntries(variants.map(([variant]) => {
    const runs = results.filter((result) => result.variant === variant);
    return [variant, {
      passed: runs.filter((result) => result.passed).length,
      total: runs.length,
      score_summary: summarizeScores(runs),
      discovery_summary: summarizeDiscovery(runs),
      turn_summary: summarizeTurns(runs),
      task_token_usage: sumTokenUsage(runs.map((result) => result.timing)),
      grader_token_usage: sumTokenUsage(runs.map((result) => result.grader_timing))
    }];
  }));
}

async function main() {
  const config = parseArgs(process.argv.slice(2));
  if (config.help) return process.stdout.write(usage());
  const evalPath = resolve(ROOT, config.evals);
  if (!(await fileExists(evalPath))) throw new Error(`Cannot find --evals: ${evalPath}`);
  const participants = config.participants.map((participant, index) => [
    `participant-${safeId(basename(resolveSkill(participant)))}-${index + 1}`,
    resolveSkill(participant)
  ]);
  for (const [, participantPath] of participants) {
    if (!(await fileExists(join(participantPath, "SKILL.md")))) throw new Error(`Not a skill directory: ${participantPath}`);
    const evalInsideParticipant = relative(participantPath, evalPath);
    if (evalInsideParticipant && !evalInsideParticipant.startsWith("..")) {
      throw new Error(`--evals must be an independent shared suite, not a participant's bundled evals: ${evalPath}`);
    }
  }
  const manifest = await loadManifest(participants[0][1], config.evals);
  const runtime = createRuntime(config);
  const workspace = config.workspace ? resolve(ROOT, config.workspace) : join(ROOT, ".skill-benchmarks", safeId(basename(dirname(evalPath))));
  const iteration = config.iteration ?? await nextIteration(workspace);
  const iterationPath = join(workspace, `iteration-${iteration}`);
  if (await fileExists(iterationPath)) throw new Error(`Iteration already exists: ${iterationPath}`);
  await mkdir(iterationPath, { recursive: true });
  const jobs = [];
  for (const test of manifest.evals) {
    const repetitions = Math.min(test.repetitions ?? 1, config.maxRepetitions ?? Infinity);
    for (let repetition = 1; repetition <= repetitions; repetition += 1) {
      for (const [variant, sourceSkill] of participants) jobs.push({ test, repetitions, repetition, variant, sourceSkill });
    }
  }
  const results = await mapWithConcurrency(jobs, config.concurrency, async (job) => {
    process.stdout.write(`Running ${job.test.id} repetition ${job.repetition}/${job.repetitions}: ${job.variant}\n`);
    return { eval_id: job.test.id, ...(await evaluateVariant({ runtime, inputRoot: dirname(evalPath), iterationPath, test: job.test, variant: job.variant, sourceSkill: job.sourceSkill, repetition: job.repetition, maxTurns: config.maxTurns })) };
  });
  const benchmark = {
    kind: "benchmark",
    skill_name: manifest.skill_name,
    eval_suite: evalPath,
    iteration,
    generated_at: new Date().toISOString(),
    variants: participants.map(([variant]) => variant),
    participants: participants.map(([variant]) => variant),
    transcript_bundle: await writeTranscriptBundle(iterationPath, results),
    results,
    summary: buildSummary(participants, results)
  };
  benchmark.report = await writeFinalReport(iterationPath, benchmark);
  await writeFile(join(iterationPath, "benchmark.json"), JSON.stringify(benchmark, null, 2));
  for (const [participant, summary] of Object.entries(benchmark.summary)) process.stdout.write(`${participant}: ${summary.passed}/${summary.total} passed\n`);
  process.stdout.write(`Evidence: ${iterationPath}\n`);
  if (results.some((result) => result.code !== 0 || result.timed_out)) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`benchmark-skills: ${error.message}\n`);
  process.exitCode = 2;
});
