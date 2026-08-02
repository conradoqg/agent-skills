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
const MAX_CONVERSATION_TURNS = 30;

function usage() {
  return `Usage: node scripts/evaluate-skills.ts --skill <name-or-path> [options]

Options:
  --previous <path>       Previous skill snapshot; adds the old_skill variant.
  --competitor <path>     Skill to compare directly; may be supplied more than once.
  --evals <path>          External evals.json suite; useful for comparing arbitrary skills.
  --workspace <path>      Root for generated evidence (default: .skill-evals/<skill>).
  --runtime <name>        Runtime adapter (default: codex).
  --codex-bin <path>      Codex executable when --runtime codex (default: codex).
  --model <name>          Optional model passed to Codex.
  --grader <runtime|none> Grade assertions with the selected runtime or only record runs (default: runtime).
  --timeout-ms <number>   Per runtime invocation timeout (default: ${DEFAULT_TIMEOUT_MS}).
  --max-repetitions <n>   Cap repetitions per eval for a fast pilot run.
  --max-turns <n>         Cap conversation turns per eval for a fast pilot run.
  --concurrency <n>       Concurrent isolated runs (default: 1).
  --iteration <number>    Explicit iteration number (default: next available).
  --help                  Print this message.
`;
}

function parseArgs(argv) {
  const values = { runtime: "codex", grader: "runtime", codexBin: "codex", timeoutMs: DEFAULT_TIMEOUT_MS, concurrency: 1, competitors: [] };
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
    else if (key === "--competitor") values.competitors.push(value);
    else if (key === "--evals") values.evals = value;
    else if (key === "--workspace") values.workspace = value;
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
  if (!values.skill) throw new Error("--skill is required");
  if (!Number.isSafeInteger(values.timeoutMs) || values.timeoutMs <= 0) throw new Error("--timeout-ms must be a positive integer");
  if (values.iteration !== undefined && (!Number.isSafeInteger(values.iteration) || values.iteration <= 0)) {
    throw new Error("--iteration must be a positive integer");
  }
  if (values.maxRepetitions !== undefined && (!Number.isSafeInteger(values.maxRepetitions) || values.maxRepetitions <= 0)) {
    throw new Error("--max-repetitions must be a positive integer");
  }
  if (values.maxTurns !== undefined && (!Number.isSafeInteger(values.maxTurns) || values.maxTurns < 2 || values.maxTurns > MAX_CONVERSATION_TURNS)) {
    throw new Error(`--max-turns must be an integer from 2 to ${MAX_CONVERSATION_TURNS}`);
  }
  if (!Number.isSafeInteger(values.concurrency) || values.concurrency <= 0) {
    throw new Error("--concurrency must be a positive integer");
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

async function loadManifest(skillPath, manifestOverride = null) {
  const manifestPath = manifestOverride ? resolve(ROOT, manifestOverride) : join(skillPath, "evals", "evals.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read ${manifestPath}: ${error.message}`);
  }
  if (!manifest || typeof manifest !== "object" || typeof manifest.skill_name !== "string" || !Array.isArray(manifest.evals)) {
    throw new Error(`${manifestPath} must contain skill_name and evals[]`);
  }
  if (!manifestOverride && manifest.skill_name !== basename(skillPath)) {
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
    if (test.repetitions !== undefined && (!Number.isSafeInteger(test.repetitions) || test.repetitions <= 0)) {
      throw new Error(`${manifestPath}: eval ${test.id} repetitions must be a positive integer`);
    }
    if (test.conversation !== undefined) test.conversation = normalizeConversation(test.conversation, manifestPath, test.id);
  }
  return manifest;
}

function normalizeConversation(conversation, manifestPath, evalId) {
  if (!conversation || typeof conversation !== "object" || Array.isArray(conversation)) {
    throw new Error(`${manifestPath}: eval ${evalId} conversation must be an object`);
  }
  const { persona, max_turns: maxTurns } = conversation;
  if (!persona || typeof persona !== "object" || Array.isArray(persona) || typeof persona.role !== "string" || persona.role.length === 0 ||
    typeof persona.goal !== "string" || persona.goal.length === 0 || typeof persona.style !== "string" || persona.style.length === 0) {
    throw new Error(`${manifestPath}: eval ${evalId} conversation.persona needs role, goal, and style`);
  }
  if (!Number.isSafeInteger(maxTurns) || maxTurns < 2 || maxTurns > MAX_CONVERSATION_TURNS) {
    throw new Error(`${manifestPath}: eval ${evalId} conversation.max_turns must be an integer from 2 to ${MAX_CONVERSATION_TURNS}`);
  }
  const publicFacts = persona.public_facts ?? [];
  if (!Array.isArray(publicFacts) || !publicFacts.every((fact) => typeof fact === "string" && fact.length > 0)) {
    throw new Error(`${manifestPath}: eval ${evalId} conversation.persona.public_facts must be an array of non-empty strings`);
  }
  const hiddenFacts = persona.hidden_facts ?? [];
  const factIds = new Set();
  if (!Array.isArray(hiddenFacts)) throw new Error(`${manifestPath}: eval ${evalId} conversation.persona.hidden_facts must be an array`);
  for (const fact of hiddenFacts) {
    if (!fact || typeof fact !== "object" || typeof fact.id !== "string" || fact.id.length === 0 || typeof fact.fact !== "string" || fact.fact.length === 0 ||
      typeof fact.reveal_when !== "string" || fact.reveal_when.length === 0 || (fact.weight !== undefined && (!Number.isSafeInteger(fact.weight) || fact.weight < 1 || fact.weight > 5)) || factIds.has(fact.id)) {
      throw new Error(`${manifestPath}: eval ${evalId} hidden facts need unique id, fact, and reveal_when`);
    }
    factIds.add(fact.id);
  }
  const requiredFactIds = conversation.required_hidden_fact_ids ?? [];
  if (!Array.isArray(requiredFactIds) || requiredFactIds.some((id) => typeof id !== "string" || !factIds.has(id)) || new Set(requiredFactIds).size !== requiredFactIds.length) {
    throw new Error(`${manifestPath}: eval ${evalId} required_hidden_fact_ids must contain unique hidden-fact ids`);
  }
  return {
    maxTurns,
    requiredFactIds,
    persona: { role: persona.role, goal: persona.goal, style: persona.style, publicFacts, hiddenFacts: hiddenFacts.map((fact) => ({ ...fact, weight: fact.weight ?? 1 })) }
  };
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

async function copyRuntimeSkill(sourceSkill, variantDir) {
  if (!sourceSkill) return null;
  const target = join(variantDir, "runtime-skill");
  await cp(sourceSkill, target, { recursive: true });
  // Evals can contain benchmark-only hidden facts. The candidate needs the
  // skill and its references, never the manifest that is evaluating it.
  await rm(join(target, "evals"), { recursive: true, force: true });
  return target;
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

async function runCodex({ config, cwd, skillPath, inputs, outputDir, prompt, label, outputSchema = null }) {
  await mkdir(outputDir, { recursive: true });
  const lastMessage = join(outputDir, "last-message.md");
  const args = ["exec", "--json", "--ephemeral", "--ignore-user-config", "--skip-git-repo-check", "--sandbox", "workspace-write", "--color", "never", "-C", cwd];
  if (skillPath) args.push("--add-dir", skillPath);
  if (inputs.length > 0) args.push("--add-dir", dirname(inputs[0]));
  if (config.model) args.push("--model", config.model);
  if (outputSchema) {
    const schemaPath = join(outputDir, "response-schema.json");
    await writeFile(schemaPath, JSON.stringify(outputSchema, null, 2));
    args.push("--output-schema", schemaPath);
  }
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
    run.conversation ? `Conversation transcript (the simulator's hidden facts are intentionally omitted): ${JSON.stringify(run.conversation.transcript)}` : null,
    "Candidate output follows:",
    run.output
  ].filter(Boolean).join("\n\n");
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
  const discoveryPassed = !run.conversation || run.conversation.discovery.required_hidden_fact_ids.every((id) => run.conversation.discovery.revealed_fact_ids.includes(id));
  return run.code === 0 && !run.timedOut && run.output.trim().length > 0 && discoveryPassed && grading.every((item) => item.passed !== false);
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

function structuredSchema(properties, required) {
  return {
    type: "object",
    additionalProperties: false,
    required,
    properties
  };
}

async function runStructured(runtime, options, schema, requiredKeys) {
  const run = await runtime.run({ ...options, outputSchema: schema });
  if (run.code !== 0 || run.timedOut) return { run, value: null, error: run.timedOut ? "runtime timed out" : `runtime exited with ${run.code}` };
  try {
    const value = JSON.parse(run.output);
    if (!value || typeof value !== "object" || Array.isArray(value) || requiredKeys.some((key) => typeof value[key] !== "string" || value[key].trim().length === 0)) {
      throw new Error("response does not satisfy the required fields");
    }
    return { run, value, error: null };
  } catch (error) {
    return { run, value: null, error: `could not parse structured response: ${error.message}` };
  }
}

function mergeTimings(timings) {
  const tokenUsage = sumTokenUsage(timings);
  return {
    started_at: timings[0]?.started_at ?? null,
    duration_ms: timings.reduce((sum, timing) => sum + (timing?.duration_ms ?? 0), 0),
    ...tokenUsage
  };
}

function transcriptText(transcript) {
  return transcript.map((message) => `${message.speaker.toUpperCase()}: ${message.content}`).join("\n\n");
}

async function runConversation({ runtime, variantDir, simulatorDir, inputs, test, sourceSkill, label }) {
  const { persona, maxTurns } = test.conversation;
  const transcript = [{ speaker: "user", content: test.prompt }];
  const revealedFactIds = [];
  const timings = [];
  const candidateSchema = structuredSchema({
    action: { type: "string", enum: ["question", "final"] },
    content: { type: "string" }
  }, ["action", "content"]);
  const simulatorSchema = structuredSchema({
    reply: { type: "string" },
    revealed_fact_ids: { type: "array", items: { type: "string" } }
  }, ["reply", "revealed_fact_ids"]);
  let finalOutput = "";
  let code = 0;
  let timedOut = false;
  let error = null;
  let stalledTurns = 0;
  await mkdir(simulatorDir, { recursive: true });

  for (let turn = 1; turn <= maxTurns; turn += 1) {
    const discoveryComplete = test.conversation.requiredFactIds.length > 0 &&
      test.conversation.requiredFactIds.every((id) => revealedFactIds.includes(id));
    const discoveryStalled = stalledTurns >= 2;
    const finalTurn = turn === maxTurns || discoveryComplete || discoveryStalled;
    const candidatePrompt = [
      "You are executing an isolated, multi-turn Agent Skill evaluation.",
      sourceSkill ? `Read and follow the Agent Skill at ${sourceSkill} before responding.` : "Complete the task without reading or using any Agent Skill.",
      "You are facilitating a brainstorm with a participant. Ask one focused question when more context would materially improve the result; otherwise produce the final response.",
      `Final turn: ${finalTurn}. Required discovery facts complete: ${discoveryComplete}. Discovery stalled: ${discoveryStalled}. ${finalTurn ? "You must return action=final and synthesize from the evidence already gathered." : "Return action=question or action=final."}`,
      `Conversation so far:\n${transcriptText(transcript)}`,
      `Input files: ${inputs.length ? inputs.join(", ") : "none"}`,
      "Return JSON only, matching the provided schema. The content field is the exact question or final user-facing answer."
    ].join("\n\n");
    const candidate = await runStructured(runtime, {
      cwd: variantDir,
      skillPath: sourceSkill,
      inputs,
      outputDir: join(variantDir, "outputs", `candidate-turn-${turn}`),
      prompt: candidatePrompt,
      label: `${label}-candidate-${turn}`
    }, candidateSchema, ["action", "content"]);
    timings.push(candidate.run.timing);
    if (candidate.error || !["question", "final"].includes(candidate.value?.action)) {
      code = candidate.run.code ?? 1;
      timedOut = candidate.run.timedOut;
      error = candidate.error ?? "candidate returned an invalid action";
      break;
    }
    if (finalTurn && candidate.value.action !== "final") {
      code = 1;
      error = "candidate did not produce a final answer on the last allowed turn";
      break;
    }
    if (candidate.value.action === "final") {
      finalOutput = candidate.value.content;
      transcript.push({ speaker: "assistant", content: finalOutput });
      break;
    }

    transcript.push({ speaker: "assistant", content: candidate.value.content });
    const simulatorPrompt = [
      "You simulate a human brainstorm participant. Respond naturally and concisely in the persona below.",
      "Use only the provided facts. Do not invent constraints, volunteer hidden facts before their reveal condition is materially addressed, suggest solutions, or mention this evaluation.",
      `Persona: role=${persona.role}; goal=${persona.goal}; response style=${persona.style}.`,
      `Public facts: ${JSON.stringify(persona.publicFacts)}.`,
      `Hidden facts: ${JSON.stringify(persona.hiddenFacts)}.`,
      `Already revealed hidden fact ids: ${JSON.stringify(revealedFactIds)}.`,
      "For revealed_fact_ids, list only hidden-fact ids newly revealed in this reply; use [] when none. Return JSON only, matching the provided schema.",
      `Conversation so far:\n${transcriptText(transcript)}`
    ].join("\n\n");
    const simulator = await runStructured(runtime, {
      cwd: simulatorDir,
      skillPath: null,
      inputs: [],
      outputDir: join(simulatorDir, `turn-${turn}`),
      prompt: simulatorPrompt,
      label: `${label}-simulator-${turn}`
    }, simulatorSchema, ["reply"]);
    timings.push(simulator.run.timing);
    const validIds = new Set(persona.hiddenFacts.map((fact) => fact.id));
    const newIds = simulator.value?.revealed_fact_ids;
    if (simulator.error || !Array.isArray(newIds) || newIds.some((id) => typeof id !== "string" || !validIds.has(id) || revealedFactIds.includes(id))) {
      code = simulator.run.code ?? 1;
      timedOut = simulator.run.timedOut;
      error = simulator.error ?? "simulator returned invalid revealed_fact_ids";
      break;
    }
    revealedFactIds.push(...newIds);
    stalledTurns = newIds.length === 0 ? stalledTurns + 1 : 0;
    transcript.push({ speaker: "user", content: simulator.value.reply });
  }
  if (!finalOutput && !error) {
    code = 1;
    error = "conversation ended without a final answer";
  }
  const conversation = {
    max_turns: maxTurns,
    candidate_turns: transcript.filter((message) => message.speaker === "assistant").length,
    transcript,
    discovery: {
      available_hidden_fact_ids: persona.hiddenFacts.map((fact) => fact.id),
      required_hidden_fact_ids: test.conversation.requiredFactIds,
      revealed_fact_ids: revealedFactIds,
      revealed_count: revealedFactIds.length,
      available_count: persona.hiddenFacts.length,
      revealed_weight: persona.hiddenFacts.filter((fact) => revealedFactIds.includes(fact.id)).reduce((sum, fact) => sum + fact.weight, 0),
      available_weight: persona.hiddenFacts.reduce((sum, fact) => sum + fact.weight, 0)
    }
  };
  await writeFile(join(variantDir, "transcript.json"), JSON.stringify(conversation, null, 2));
  return { label, output: finalOutput, timing: mergeTimings(timings), code, timedOut, stderr: error ?? "", conversation };
}

async function evaluateVariant({ runtime, skillPath, iterationPath, test, variant, sourceSkill, repetition, maxTurns }) {
  const evalDir = join(iterationPath, `eval-${safeId(test.id)}`);
  const variantDir = test.repetitions > 1 ? join(evalDir, `repetition-${repetition}`, variant) : join(evalDir, variant);
  const outputs = join(variantDir, "outputs");
  const inputs = await copyInputs(skillPath, test, join(variantDir, "inputs"));
  const runtimeSkillPath = await copyRuntimeSkill(sourceSkill, variantDir);
  const instruction = runtimeSkillPath
    ? `Read and follow the Agent Skill at ${runtimeSkillPath} before completing the task.`
    : "Complete the task without reading or using any Agent Skill.";
  const prompt = [
    "You are executing one isolated evaluation run.",
    instruction,
    `Task: ${test.prompt}`,
    `Input files: ${inputs.length ? inputs.join(", ") : "none"}`,
    `Save any produced files under: ${outputs}`,
    "Put the complete user-facing answer in the final message. Do not replace it with a link or a summary of a file saved under outputs."
  ].join("\n");
  const runTest = maxTurns && test.conversation
    ? { ...test, conversation: { ...test.conversation, maxTurns: Math.min(test.conversation.maxTurns, maxTurns) } }
    : test;
  const run = runTest.conversation
    ? await runConversation({
      runtime,
      variantDir,
      simulatorDir: join(iterationPath, "private-simulator", `eval-${safeId(test.id)}`, `repetition-${repetition}`, variant),
      inputs,
      test: runTest,
      sourceSkill: runtimeSkillPath,
      label: variant
    })
    : await runtime.run({ cwd: variantDir, skillPath: runtimeSkillPath, inputs, outputDir: outputs, prompt, label: variant });
  const graded = await runtime.grade({ variantDir, test, run });
  const result = {
    variant,
    repetition,
    runtime: runtime.name,
    code: run.code,
    timed_out: run.timedOut,
    timing: run.timing,
    grader_timing: graded.timing,
    passed: candidatePassed(run, graded.results),
    grading: graded.results,
    ...(run.conversation ? {
      conversation: run.conversation,
      transcript_path: relative(iterationPath, join(variantDir, "transcript.json"))
    } : {})
  };
  await writeFile(join(variantDir, "grading.json"), JSON.stringify(result, null, 2));
  return result;
}

function summarizeDiscovery(runs) {
  const conversations = runs.filter((run) => run.conversation);
  const revealed = conversations.reduce((sum, run) => sum + run.conversation.discovery.revealed_count, 0);
  const available = conversations.reduce((sum, run) => sum + run.conversation.discovery.available_count, 0);
  const revealedWeight = conversations.reduce((sum, run) => sum + run.conversation.discovery.revealed_weight, 0);
  const availableWeight = conversations.reduce((sum, run) => sum + run.conversation.discovery.available_weight, 0);
  return {
    conversation_runs: conversations.length,
    revealed_hidden_facts: revealed,
    available_hidden_facts: available,
    discovery_rate: available === 0 ? null : revealed / available,
    revealed_weight: revealedWeight,
    available_weight: availableWeight,
    weighted_discovery_rate: availableWeight === 0 ? null : revealedWeight / availableWeight
  };
}

function summarizeTurns(runs) {
  const conversations = runs.filter((run) => run.conversation);
  const total = conversations.reduce((sum, run) => sum + run.conversation.candidate_turns, 0);
  return { conversation_runs: conversations.length, candidate_turns: total, average_candidate_turns: conversations.length === 0 ? null : total / conversations.length };
}

async function writeFinalReport(iterationPath, benchmark) {
  const lines = [
    "# Skill benchmark report",
    "",
    `Generated: ${benchmark.generated_at}`,
    "",
    `Transcript bundle: [index](${benchmark.transcript_bundle ?? "transcripts/index.md"})`,
    "",
    "## Variant summary",
    "",
    "| Variant | Passed | Avg score | Facts | Weighted discovery | Candidate turns | Avg turns | Task tokens |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"
  ];
  for (const [variant, summary] of Object.entries(benchmark.summary)) {
    const discovery = summary.discovery_summary;
    const turns = summary.turn_summary;
    const score = summary.score_summary.average_score?.toFixed(2) ?? "n/a";
    const weighted = discovery.weighted_discovery_rate === null ? "n/a" : `${(discovery.weighted_discovery_rate * 100).toFixed(1)}%`;
    const averageTurns = turns.average_candidate_turns === null ? "n/a" : turns.average_candidate_turns.toFixed(2);
    lines.push(`| ${variant} | ${summary.passed}/${summary.total} | ${score} | ${discovery.revealed_hidden_facts}/${discovery.available_hidden_facts} | ${weighted} | ${turns.candidate_turns} | ${averageTurns} | ${summary.task_token_usage.total_tokens} |`);
  }
  lines.push("", "## Scenario results", "", "| Scenario | Variant | Passed | Facts | Turns | Scores |", "| --- | --- | --- | ---: | ---: | --- |");
  for (const result of benchmark.results) {
    const discovery = result.conversation?.discovery;
    lines.push(`| ${result.eval_id} | ${result.variant} | ${result.passed ? "yes" : "no"} | ${discovery ? `${discovery.revealed_count}/${discovery.available_count}` : "n/a"} | ${result.conversation?.candidate_turns ?? "n/a"} | ${result.grading.map((grade) => `${grade.criterion}: ${grade.score}`).join("; ")} |`);
  }
  await writeFile(join(iterationPath, "report.md"), `${lines.join("\n")}\n`);
  return "report.md";
}

async function writeTranscriptBundle(iterationPath, results) {
  const conversationalRuns = results.filter((result) => result.transcript_path);
  if (conversationalRuns.length === 0) return null;
  const bundleDir = join(iterationPath, "transcripts");
  const indexLines = [
    "# Conversation transcript bundle",
    "",
    "| Eval | Repetition | Variant | Transcript |",
    "| --- | ---: | --- | --- |"
  ];
  for (const result of conversationalRuns) {
    const target = join(bundleDir, safeId(result.eval_id), `repetition-${result.repetition}`, `${safeId(result.variant)}.json`);
    await mkdir(dirname(target), { recursive: true });
    await cp(join(iterationPath, result.transcript_path), target);
    result.transcript_bundle_path = relative(iterationPath, target);
    indexLines.push(`| ${result.eval_id} | ${result.repetition} | ${result.variant} | [JSON](${relative(bundleDir, target)}) |`);
  }
  await writeFile(join(bundleDir, "index.md"), `${indexLines.join("\n")}\n`);
  return relative(iterationPath, join(bundleDir, "index.md"));
}

async function mapWithConcurrency(items, concurrency, callback) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await callback(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
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
  const competitorPaths = config.competitors.map((competitor) => resolveSkill(competitor));
  for (const competitorPath of competitorPaths) {
    if (!(await fileExists(join(competitorPath, "SKILL.md")))) throw new Error(`--competitor is not a skill directory: ${competitorPath}`);
  }
  const manifest = await loadManifest(skillPath, config.evals);
  const runtime = createRuntime(config);
  const workspace = config.workspace ? resolve(ROOT, config.workspace) : join(ROOT, ".skill-evals", basename(skillPath));
  const iteration = config.iteration ?? await nextIteration(workspace);
  const iterationPath = join(workspace, `iteration-${iteration}`);
  if (await fileExists(iterationPath)) throw new Error(`Iteration already exists: ${iterationPath}`);
  await mkdir(iterationPath, { recursive: true });
  const previousPath = config.previous ? resolve(ROOT, config.previous) : null;
  const variants = previousPath
    ? [["without_skill", null], ["old_skill", previousPath], ["with_skill", skillPath]]
    : [["without_skill", null], ["with_skill", skillPath]];
  variants.push(...competitorPaths.map((competitorPath, index) => [`competitor-${safeId(basename(competitorPath))}-${index + 1}`, competitorPath]));
  const jobs = [];
  for (const test of manifest.evals) {
    const repetitions = Math.min(test.repetitions ?? 1, config.maxRepetitions ?? Infinity);
    for (let repetition = 1; repetition <= repetitions; repetition += 1) {
      for (const [variant, sourceSkill] of variants) {
        jobs.push({ test, repetitions, repetition, variant, sourceSkill });
      }
    }
  }
  const results = await mapWithConcurrency(jobs, config.concurrency, async (job) => {
    process.stdout.write(`Running ${job.test.id} repetition ${job.repetition}/${job.repetitions}: ${job.variant}\n`);
    return {
      eval_id: job.test.id,
      ...(await evaluateVariant({
        runtime,
        skillPath,
        iterationPath,
        test: job.test,
        variant: job.variant,
        sourceSkill: job.sourceSkill,
        repetition: job.repetition,
        maxTurns: config.maxTurns
      }))
    };
  });
  const transcriptBundle = await writeTranscriptBundle(iterationPath, results);
  const benchmark = {
    skill_name: manifest.skill_name,
    eval_suite: config.evals ? resolve(ROOT, config.evals) : join(skillPath, "evals", "evals.json"),
    iteration,
    generated_at: new Date().toISOString(),
    variants: variants.map(([variant]) => variant),
    transcript_bundle: transcriptBundle,
    results,
    summary: Object.fromEntries(variants.map(([variant]) => {
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
    }))
  };
  benchmark.report = await writeFinalReport(iterationPath, benchmark);
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
