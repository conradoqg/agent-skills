#!/usr/bin/env node
/**
 * Evaluate one Agent Skill with isolated runtime runs.
 *
 * The test contract is the official Agent Skills evals/evals.json format.
 * The workflow is runtime-agnostic; Codex CLI is the first runtime adapter.
 * Generated evidence always stays outside the skill package.
 */

import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { spawn } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_TIMEOUT_MS = 300_000;

function usage() {
  return `Usage: node scripts/evaluate-skills.ts --skill <name-or-path> [options]

Options:
  --previous <path>       Previous skill snapshot; adds the old_skill variant.
  --workspace <path>      Root for generated evidence (default: .skill-evals/<skill>).
  --runtime <name>        Runtime adapter (default: codex).
  --codex-bin <path>      Codex executable when --runtime codex (default: codex).
  --model <name>          Optional model passed to Codex.
  --grader <runtime|none> Grade assertions with the selected runtime or only record runs (default: runtime).
  --timeout-ms <number>   Per runtime invocation timeout (default: ${DEFAULT_TIMEOUT_MS}).
  --iteration <number>    Explicit iteration number (default: next available).
  --help                  Print this message.
`;
}

function parseArgs(argv) {
  const values = { runtime: "codex", grader: "runtime", codexBin: "codex", timeoutMs: DEFAULT_TIMEOUT_MS };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--help") return { help: true };
    if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${key}`);
    index += 1;
    if (key === "--skill") values.skill = value;
    else if (key === "--runtime") values.runtime = value;
    else if (key === "--previous") values.previous = value;
    else if (key === "--workspace") values.workspace = value;
    else if (key === "--codex-bin") values.codexBin = value;
    else if (key === "--model") values.model = value;
    else if (key === "--grader") values.grader = value;
    else if (key === "--timeout-ms") values.timeoutMs = Number(value);
    else if (key === "--iteration") values.iteration = Number(value);
    else throw new Error(`Unknown option: ${key}`);
  }
  if (!values.skill) throw new Error("--skill is required");
  if (!Number.isSafeInteger(values.timeoutMs) || values.timeoutMs <= 0) throw new Error("--timeout-ms must be a positive integer");
  if (values.iteration !== undefined && (!Number.isSafeInteger(values.iteration) || values.iteration <= 0)) {
    throw new Error("--iteration must be a positive integer");
  }
  if (!['runtime', 'none'].includes(values.grader)) throw new Error("--grader must be runtime or none");
  return values;
}

async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function resolveSkill(input) {
  const direct = resolve(ROOT, input);
  const named = resolve(ROOT, "skills", input);
  return direct.endsWith("SKILL.md") ? dirname(direct) : (isAbsolute(input) || input.includes("/") ? direct : named);
}

async function loadManifest(skillPath) {
  const manifestPath = join(skillPath, "evals", "evals.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read ${manifestPath}: ${error.message}`);
  }
  if (!manifest || typeof manifest !== "object" || typeof manifest.skill_name !== "string" || !Array.isArray(manifest.evals)) {
    throw new Error(`${manifestPath} must contain skill_name and evals[]`);
  }
  if (manifest.skill_name !== basename(skillPath)) {
    throw new Error(`${manifestPath}: skill_name must match the skill directory`);
  }
  const ids = new Set();
  for (const test of manifest.evals) {
    if (!test || typeof test !== "object" || (typeof test.id !== "string" && typeof test.id !== "number") ||
      typeof test.prompt !== "string" || typeof test.expected_output !== "string") {
      throw new Error(`${manifestPath}: every eval needs id, prompt, and expected_output`);
    }
    if (ids.has(String(test.id))) throw new Error(`${manifestPath}: duplicate eval id ${test.id}`);
    ids.add(String(test.id));
    if (test.files !== undefined && (!Array.isArray(test.files) || !test.files.every((item) => typeof item === "string"))) {
      throw new Error(`${manifestPath}: eval ${test.id} files must be an array of strings`);
    }
    if (test.assertions !== undefined && !Array.isArray(test.assertions)) throw new Error(`${manifestPath}: eval ${test.id} assertions must be an array`);
    test.assertions = (test.assertions ?? []).map((assertion, assertionIndex) => normalizeAssertion(assertion, manifestPath, test.id, assertionIndex));
  }
  return manifest;
}

function normalizeAssertion(assertion, manifestPath, evalId, assertionIndex) {
  if (typeof assertion === "string") {
    return { criterion: assertion, threshold: 10, rubric: { "0": "Criterion is absent.", "10": "Criterion is fully satisfied with concrete evidence." } };
  }
  if (!assertion || typeof assertion !== "object" || typeof assertion.criterion !== "string" || assertion.criterion.length === 0 ||
    !Number.isSafeInteger(assertion.threshold) || assertion.threshold < 0 || assertion.threshold > 10 ||
    !assertion.rubric || typeof assertion.rubric !== "object" || Array.isArray(assertion.rubric)) {
    throw new Error(`${manifestPath}: eval ${evalId} assertion ${assertionIndex + 1} needs criterion, threshold (0-10), and rubric`);
  }
  for (const [score, description] of Object.entries(assertion.rubric)) {
    const numericScore = Number(score);
    if (!Number.isSafeInteger(numericScore) || numericScore < 0 || numericScore > 10 || typeof description !== "string" || description.length === 0) {
      throw new Error(`${manifestPath}: eval ${evalId} assertion ${assertionIndex + 1} has an invalid rubric anchor`);
    }
  }
  return { criterion: assertion.criterion, threshold: assertion.threshold, rubric: assertion.rubric };
}

async function nextIteration(workspace) {
  if (!(await fileExists(workspace))) return 1;
  const entries = await readdir(workspace, { withFileTypes: true });
  const numbers = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => /^iteration-(\d+)$/.exec(entry.name)?.[1])
    .filter(Boolean)
    .map(Number);
  return Math.max(0, ...numbers) + 1;
}

function safeId(id) {
  return String(id).replace(/[^a-zA-Z0-9._-]+/g, "-");
}

async function copyInputs(skillPath, test, target) {
  const copied = [];
  for (const source of test.files ?? []) {
    const sourcePath = resolve(skillPath, source);
    const insideSkill = relative(skillPath, sourcePath) && !relative(skillPath, sourcePath).startsWith("..");
    if (!insideSkill || !(await fileExists(sourcePath))) {
      throw new Error(`Eval ${test.id}: declared input does not exist inside skill: ${source}`);
    }
    const destination = join(target, source);
    await mkdir(dirname(destination), { recursive: true });
    await cp(sourcePath, destination, { recursive: true });
    copied.push(destination);
  }
  return copied;
}

function spawnProcess(command, args, options) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { cwd: options.cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, options.timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolvePromise({ code: null, stdout, stderr: `${stderr}${error.message}`, timedOut });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({ code, stdout, stderr, timedOut });
    });
  });
}

function asTokenCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function usageFromJsonl(stdout) {
  let usage = null;
  for (const line of stdout.split("\n")) {
    try {
      const event = JSON.parse(line);
      if (event.type === "turn.completed" && event.usage && typeof event.usage === "object") usage = event.usage;
    } catch {
      // Codex can emit non-JSON status text alongside its JSONL stream.
    }
  }
  const inputTokens = asTokenCount(usage?.input_tokens);
  const outputTokens = asTokenCount(usage?.output_tokens);
  return {
    input_tokens: inputTokens,
    cached_input_tokens: asTokenCount(usage?.cached_input_tokens),
    cache_write_input_tokens: asTokenCount(usage?.cache_write_input_tokens),
    output_tokens: outputTokens,
    reasoning_output_tokens: asTokenCount(usage?.reasoning_output_tokens),
    // output_tokens already includes reasoning tokens when the runtime reports both.
    total_tokens: inputTokens === null || outputTokens === null ? null : inputTokens + outputTokens
  };
}

async function runCodex({ config, cwd, skillPath, inputs, outputDir, prompt, label }) {
  await mkdir(outputDir, { recursive: true });
  const lastMessage = join(outputDir, "last-message.md");
  const args = ["exec", "--json", "--ephemeral", "--ignore-user-config", "--skip-git-repo-check", "--sandbox", "workspace-write", "--color", "never", "-C", cwd];
  if (skillPath) args.push("--add-dir", skillPath);
  if (inputs.length > 0) args.push("--add-dir", dirname(inputs[0]));
  if (config.model) args.push("--model", config.model);
  args.push("--output-last-message", lastMessage, prompt);
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const processResult = await spawnProcess(config.codexBin, args, { cwd, timeoutMs: config.timeoutMs });
  const durationMs = Math.round(performance.now() - started);
  await writeFile(join(outputDir, "stdout.log"), processResult.stdout);
  await writeFile(join(outputDir, "stderr.log"), processResult.stderr);
  const output = (await fileExists(lastMessage)) ? await readFile(lastMessage, "utf8") : "";
  const timing = { started_at: startedAt, duration_ms: durationMs, ...usageFromJsonl(processResult.stdout) };
  await writeFile(join(outputDir, "timing.json"), JSON.stringify(timing, null, 2));
  return { label, output, timing, code: processResult.code, timedOut: processResult.timedOut, stderr: processResult.stderr };
}

async function gradeWithCodex({ config, variantDir, test, run }) {
  const assertions = test.assertions ?? [];
  if (run.code !== 0 || run.timedOut) {
    return { results: failedGrades(assertions, run.timedOut ? "Codex execution timed out." : `Codex exited with ${run.code}.`), timing: null };
  }
  if (assertions.length === 0) return { results: [], timing: null };
  if (config.grader === "none") {
    return { results: assertions.map((assertion) => ({ criterion: assertion.criterion, threshold: assertion.threshold, score: null, passed: null, evidence: "Not graded: --grader none." })), timing: null };
  }

  const schemaPath = join(variantDir, "grading-schema.json");
  await writeFile(schemaPath, JSON.stringify({
    type: "object",
    additionalProperties: false,
    required: ["results"],
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["criterion", "score", "evidence"],
          properties: {
            criterion: { type: "string" },
            score: { type: "integer", minimum: 0, maximum: 10 },
            evidence: { type: "string" }
          }
        }
      }
    }
  }, null, 2));
  const gradeFile = join(variantDir, "grader-response.json");
  const graderPrompt = [
    "Grade an Agent Skills evaluation on an integer 0-10 scale. Judge only the listed criteria.",
    "Use each criterion's rubric anchors to decide the score. Return one result per criterion. The harness, not you, decides pass/fail from score >= threshold.",
    "Each evidence field must cite concrete output evidence or state why it is absent.",
    `Expected output: ${test.expected_output}`,
    `Assertions: ${JSON.stringify(assertions)}`,
    "Candidate output follows:",
    run.output
  ].join("\n\n");
  const args = ["exec", "--json", "--ephemeral", "--ignore-user-config", "--skip-git-repo-check", "--sandbox", "read-only", "--color", "never", "-C", variantDir];
  if (config.model) args.push("--model", config.model);
  args.push("--output-schema", schemaPath, "--output-last-message", gradeFile, graderPrompt);
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const result = await spawnProcess(config.codexBin, args, { cwd: variantDir, timeoutMs: config.timeoutMs });
  const timing = { started_at: startedAt, duration_ms: Math.round(performance.now() - started), ...usageFromJsonl(result.stdout) };
  await writeFile(join(variantDir, "grader-stdout.log"), result.stdout);
  await writeFile(join(variantDir, "grader-stderr.log"), result.stderr);
  if (result.code !== 0 || !(await fileExists(gradeFile))) {
    return { results: failedGrades(assertions, "Grader execution failed; see grader-stderr.log."), timing };
  }
  try {
    const graded = JSON.parse(await readFile(gradeFile, "utf8"));
    if (!Array.isArray(graded.results) || graded.results.length !== assertions.length) throw new Error("wrong result count");
    return { results: scoreGrades(assertions, graded.results), timing };
  } catch (error) {
    return { results: failedGrades(assertions, `Could not parse grader response: ${error.message}`), timing };
  }
}

function failedGrades(assertions, evidence) {
  return assertions.map((assertion) => ({ criterion: assertion.criterion, threshold: assertion.threshold, score: null, passed: false, evidence }));
}

function scoreGrades(assertions, results) {
  const byCriterion = new Map(results.map((result) => [result.criterion, result]));
  if (byCriterion.size !== results.length) throw new Error("duplicate grader criterion");
  return assertions.map((assertion) => {
    const result = byCriterion.get(assertion.criterion);
    if (!result || !Number.isSafeInteger(result.score) || result.score < 0 || result.score > 10 || typeof result.evidence !== "string") {
      throw new Error(`invalid grade for ${assertion.criterion}`);
    }
    return { criterion: assertion.criterion, threshold: assertion.threshold, score: result.score, passed: result.score >= assertion.threshold, evidence: result.evidence };
  });
}

function createRuntime(config) {
  if (config.runtime !== "codex") throw new Error(`Unsupported runtime: ${config.runtime}. Available runtime: codex.`);
  return {
    name: "codex",
    run: (options) => runCodex({ config, ...options }),
    grade: (options) => gradeWithCodex({ config, ...options })
  };
}

function candidatePassed(run, grading) {
  return run.code === 0 && !run.timedOut && run.output.trim().length > 0 && grading.every((item) => item.passed !== false);
}

function sumTokenUsage(timings) {
  const fields = ["input_tokens", "cached_input_tokens", "cache_write_input_tokens", "output_tokens", "reasoning_output_tokens", "total_tokens"];
  return Object.fromEntries(fields.map((field) => {
    const values = timings.map((timing) => timing?.[field]).filter((value) => value !== null && value !== undefined);
    return [field, values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0)];
  }));
}

function summarizeScores(runs) {
  const grades = runs.flatMap((run) => run.grading).filter((grade) => Number.isSafeInteger(grade.score));
  const total = grades.reduce((sum, grade) => sum + grade.score, 0);
  return {
    graded_criteria: grades.length,
    average_score: grades.length === 0 ? null : total / grades.length,
    thresholds_met: grades.filter((grade) => grade.passed).length,
    thresholds_total: grades.length
  };
}

async function evaluateVariant({ runtime, skillPath, iterationPath, test, variant, sourceSkill }) {
  const variantDir = join(iterationPath, `eval-${safeId(test.id)}`, variant);
  const outputs = join(variantDir, "outputs");
  const inputs = await copyInputs(skillPath, test, join(variantDir, "inputs"));
  const instruction = sourceSkill
    ? `Read and follow the Agent Skill at ${sourceSkill} before completing the task.`
    : "Complete the task without reading or using any Agent Skill.";
  const prompt = [
    "You are executing one isolated evaluation run.",
    instruction,
    `Task: ${test.prompt}`,
    `Input files: ${inputs.length ? inputs.join(", ") : "none"}`,
    `Save any produced files under: ${outputs}`,
    "Put the complete user-facing answer in the final message. Do not replace it with a link or a summary of a file saved under outputs."
  ].join("\n");
  const run = await runtime.run({ cwd: variantDir, skillPath: sourceSkill, inputs, outputDir: outputs, prompt, label: variant });
  const graded = await runtime.grade({ variantDir, test, run });
  const result = { variant, runtime: runtime.name, code: run.code, timed_out: run.timedOut, timing: run.timing, grader_timing: graded.timing, passed: candidatePassed(run, graded.results), grading: graded.results };
  await writeFile(join(variantDir, "grading.json"), JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  const config = parseArgs(process.argv.slice(2));
  if (config.help) {
    process.stdout.write(usage());
    return;
  }
  const skillPath = resolveSkill(config.skill);
  if (!(await fileExists(join(skillPath, "SKILL.md")))) throw new Error(`Not a skill directory: ${skillPath}`);
  if (config.previous && !(await fileExists(join(resolve(ROOT, config.previous), "SKILL.md")))) {
    throw new Error(`--previous is not a skill directory: ${config.previous}`);
  }
  const manifest = await loadManifest(skillPath);
  const runtime = createRuntime(config);
  const workspace = config.workspace ? resolve(ROOT, config.workspace) : join(ROOT, ".skill-evals", manifest.skill_name);
  const iteration = config.iteration ?? await nextIteration(workspace);
  const iterationPath = join(workspace, `iteration-${iteration}`);
  if (await fileExists(iterationPath)) throw new Error(`Iteration already exists: ${iterationPath}`);
  await mkdir(iterationPath, { recursive: true });
  const previousPath = config.previous ? resolve(ROOT, config.previous) : null;
  const variants = previousPath
    ? [["without_skill", null], ["old_skill", previousPath], ["with_skill", skillPath]]
    : [["without_skill", null], ["with_skill", skillPath]];
  const results = [];
  for (const test of manifest.evals) {
    for (const [variant, sourceSkill] of variants) {
      results.push({ eval_id: test.id, ...(await evaluateVariant({ runtime, skillPath, iterationPath, test, variant, sourceSkill })) });
    }
  }
  const benchmark = {
    skill_name: manifest.skill_name,
    iteration,
    generated_at: new Date().toISOString(),
    variants: variants.map(([variant]) => variant),
    results,
    summary: Object.fromEntries(variants.map(([variant]) => {
      const runs = results.filter((result) => result.variant === variant);
      return [variant, {
        passed: runs.filter((result) => result.passed).length,
        total: runs.length,
        score_summary: summarizeScores(runs),
        task_token_usage: sumTokenUsage(runs.map((result) => result.timing)),
        grader_token_usage: sumTokenUsage(runs.map((result) => result.grader_timing))
      }];
    }))
  };
  await writeFile(join(iterationPath, "benchmark.json"), JSON.stringify(benchmark, null, 2));
  const candidates = results.filter((result) => result.variant === "with_skill");
  const oldById = new Map(results.filter((result) => result.variant === "old_skill").map((result) => [String(result.eval_id), result]));
  const regressions = candidates.filter((candidate) => !candidate.passed || (oldById.get(String(candidate.eval_id))?.passed && !candidate.passed));
  for (const [variant, summary] of Object.entries(benchmark.summary)) {
    process.stdout.write(`${variant}: ${summary.passed}/${summary.total} passed\n`);
  }
  process.stdout.write(`Evidence: ${iterationPath}\n`);
  if (regressions.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`evaluate-skills: ${error.message}\n`);
  process.exitCode = 2;
});
