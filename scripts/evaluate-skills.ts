#!/usr/bin/env node
/**
 * Evaluate one Agent Skill with isolated runtime runs.
 *
 * The test contract is the official Agent Skills evals/evals.json format.
 * The workflow is runtime-agnostic; Codex CLI and Kiro CLI are supported adapters.
 * Generated evidence always stays outside the skill package.
 */

import { appendFile, cp, mkdir, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

const ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_TIMEOUT_MS = 300_000;
const MAX_CONVERSATION_TURNS = 30;

function usage() {
  return `Usage: node scripts/evaluate-skills.ts --skill <name-or-path> [options]

Options:
  --previous <path>       Previous skill snapshot; adds the old_skill variant.
  --evals <path>          External evals.json suite for this skill evaluation.
  --eval <id>             Run only this eval ID; repeat to select multiple IDs.
  --variants <names>      Comma-separated variants to run (without_skill, with_skill,
                          old_skill). Default: every available variant.
  --workspace <path>      Root for generated evidence (default: .skill-evals/<skill>).
  --runtime <name>        Runtime adapter: codex or kiro (default: codex).
  --codex-bin <path>      Codex executable when --runtime codex (default: codex).
  --kiro-bin <path>       Kiro executable when --runtime kiro (default: kiro-cli).
  --kiro-agent <name>     Optional agent passed to Kiro.
  --kiro-agent-file <path>
                         Agent JSON used in an isolated Kiro HOME: no global skills,
                         steering, or mcp.json are loaded for the run.
  --kiro-effort <level>   Optional effort passed to Kiro.
  --kiro-model <name>     Kiro model (default: claude-sonnet-5).
  --kiro-trust-tools <names>
                         Explicit Kiro trusted tool names (required for --runtime kiro).
  --kiro-trust-all-tools  Explicitly trust all Kiro tools (required alternative for --runtime kiro).
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
  const values = { runtime: "codex", grader: "runtime", codexBin: "codex", kiroBin: "kiro-cli", kiroModel: "claude-sonnet-5", timeoutMs: DEFAULT_TIMEOUT_MS, concurrency: 1, evalIds: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--help") return { help: true };
    if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
    if (key === "--kiro-trust-all-tools") {
      values.kiroTrustAllTools = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${key}`);
    index += 1;
    if (key === "--skill") values.skill = value;
    else if (key === "--runtime") values.runtime = value;
    else if (key === "--previous") values.previous = value;
    else if (key === "--evals") values.evals = value;
    else if (key === "--eval") values.evalIds.push(value);
    else if (key === "--variants") values.variants = value.split(",").map((name) => name.trim()).filter(Boolean);
    else if (key === "--workspace") values.workspace = value;
    else if (key === "--codex-bin") values.codexBin = value;
    else if (key === "--kiro-bin") values.kiroBin = value;
    else if (key === "--kiro-agent") values.kiroAgent = value;
    else if (key === "--kiro-agent-file") values.kiroAgentFile = value;
    else if (key === "--kiro-effort") values.kiroEffort = value;
    else if (key === "--kiro-model") values.kiroModel = value;
    else if (key === "--kiro-trust-tools") values.kiroTrustTools = value;
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
  if (values.runtime === "kiro") {
    if (values.kiroTrustAllTools && values.kiroTrustTools !== undefined) throw new Error("Use exactly one of --kiro-trust-tools or --kiro-trust-all-tools");
    if (!values.kiroTrustAllTools && values.kiroTrustTools === undefined) throw new Error("--runtime kiro requires --kiro-trust-tools or --kiro-trust-all-tools");
  }
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
  if (!manifest || typeof manifest !== "object" || typeof manifest.skill_name !== "string" || !Array.isArray(manifest.evals) || !safeProfileReference(manifest.runtime_profile)) {
    throw new Error(`${manifestPath} must contain skill_name, runtime_profile, and evals[]`);
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
    if (test.workspace_zip !== undefined && !safeRelativePath(test.workspace_zip)) throw new Error(`${manifestPath}: eval ${test.id} workspace_zip must be a safe relative path`);
    if (test.sarif !== undefined) {
      test.sarif = normalizeSarif(test.sarif, manifestPath, test.id);
      if ((test.files ?? []).includes(test.sarif.groundTruth)) throw new Error(`${manifestPath}: eval ${test.id} SARIF ground_truth must stay out of runtime inputs`);
    }
    if (test.assertions !== undefined && !Array.isArray(test.assertions)) throw new Error(`${manifestPath}: eval ${test.id} assertions must be an array`);
    test.assertions = (test.assertions ?? []).map((assertion, assertionIndex) => normalizeAssertion(assertion, manifestPath, test.id, assertionIndex));
    if (test.repetitions !== undefined && (!Number.isSafeInteger(test.repetitions) || test.repetitions <= 0)) {
      throw new Error(`${manifestPath}: eval ${test.id} repetitions must be a positive integer`);
    }
    if (test.conversation !== undefined) test.conversation = normalizeConversation(test.conversation, manifestPath, test.id);
  }
  return { ...manifest, runtime_profile: resolve(dirname(manifestPath), manifest.runtime_profile), manifest_path: manifestPath };
}

function safeProfileReference(value) {
  return typeof value === "string" && value.length > 0 && !isAbsolute(value) && !/^[A-Za-z]:[\\/]/.test(value);
}

async function loadRuntimeProfile(manifest) {
  const path = manifest.runtime_profile;
  if (!(await fileExists(path))) throw new Error(`${manifest.manifest_path}: runtime_profile does not exist: ${path}`);
  let profile;
  try { profile = JSON.parse(await readFile(path, "utf8")); } catch (error) { throw new Error(`${path}: runtime profile is not valid JSON: ${error.message}`); }
  if (!profile || typeof profile !== "object" || Array.isArray(profile) || profile.version !== 1 || typeof profile.name !== "string" || profile.name.length === 0 ||
    profile.fixture_instructions !== "allow-and-fingerprint" || !profile.candidate || !profile.grader) {
    throw new Error(`${path}: runtime profile needs version 1, name, fixture_instructions=allow-and-fingerprint, candidate, and grader`);
  }
  for (const [role, policy] of Object.entries({ candidate: profile.candidate, grader: profile.grader })) {
    if (!policy || typeof policy !== "object" || policy.mcp !== "disabled" || policy.network !== "disabled" || !["workspace-write", "read-only"].includes(policy.filesystem)) {
      throw new Error(`${path}: ${role} must declare mcp/network disabled and filesystem workspace-write or read-only`);
    }
  }
  if (profile.candidate.filesystem !== "workspace-write" || profile.grader.filesystem !== "read-only") {
    throw new Error(`${path}: candidate must be workspace-write and grader must be read-only`);
  }
  return { ...profile, path, sha256: createHash("sha256").update(await readFile(path)).digest("hex") };
}

function selectEvals(manifest, requestedIds = []) {
  if (requestedIds.length === 0) return manifest;
  const availableIds = new Set(manifest.evals.map((test) => String(test.id)));
  const missingIds = [...new Set(requestedIds.filter((id) => !availableIds.has(id)))];
  if (missingIds.length > 0) throw new Error(`Requested --eval ID(s) not found: ${missingIds.join(", ")}`);
  const selected = new Set(requestedIds);
  const evals = manifest.evals.filter((test) => selected.has(String(test.id)));
  if (evals.length === 0) throw new Error("--eval selected no evals");
  return { ...manifest, evals };
}

function safeRelativePath(value) {
  return typeof value === "string" && value.length > 0 && !isAbsolute(value) && !/^[A-Za-z]:[\\/]/.test(value) &&
    !value.replace(/\\/g, "/").split("/").some((part) => part === ".." || part === "");
}

function normalizeSarif(sarif, manifestPath, evalId) {
  if (!sarif || typeof sarif !== "object" || Array.isArray(sarif) || !safeRelativePath(sarif.artifact) || !safeRelativePath(sarif.ground_truth)) {
    throw new Error(`${manifestPath}: eval ${evalId} sarif needs relative artifact and ground_truth paths`);
  }
  return { artifact: sarif.artifact, groundTruth: sarif.ground_truth, gates: normalizeSarifGates(sarif.gates, manifestPath, evalId) };
}

function normalizeSarifGates(gates, manifestPath, evalId) {
  if (gates === undefined) return null;
  if (!gates || typeof gates !== "object" || Array.isArray(gates)) throw new Error(`${manifestPath}: eval ${evalId} sarif.gates must be an object`);
  const validThreshold = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
  if (gates.min_recall !== undefined && !validThreshold(gates.min_recall)) throw new Error(`${manifestPath}: eval ${evalId} sarif.gates.min_recall must be from 0 to 1`);
  const byLevel = gates.min_recall_by_level ?? {};
  if (!byLevel || typeof byLevel !== "object" || Array.isArray(byLevel) || Object.entries(byLevel).some(([level, threshold]) => !["error", "warning", "note", "none"].includes(level) || !validThreshold(threshold))) {
    throw new Error(`${manifestPath}: eval ${evalId} sarif.gates.min_recall_by_level must contain error, warning, note, or none thresholds from 0 to 1`);
  }
  if (gates.max_false_positives !== undefined && (!Number.isSafeInteger(gates.max_false_positives) || gates.max_false_positives < 0)) {
    throw new Error(`${manifestPath}: eval ${evalId} sarif.gates.max_false_positives must be a non-negative integer`);
  }
  return {
    ...(gates.min_recall === undefined ? {} : { min_recall: gates.min_recall }),
    ...(Object.keys(byLevel).length === 0 ? {} : { min_recall_by_level: { ...byLevel } }),
    ...(gates.max_false_positives === undefined ? {} : { max_false_positives: gates.max_false_positives })
  };
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

async function copyInputs(inputRoot, test, target) {
  const copied = [];
  for (const source of test.files ?? []) {
    const sourcePath = resolve(inputRoot, source);
    const insideInputRoot = relative(inputRoot, sourcePath) && !relative(inputRoot, sourcePath).startsWith("..");
    if (!insideInputRoot || !(await fileExists(sourcePath))) {
      throw new Error(`Eval ${test.id}: declared input does not exist inside the eval input root: ${source}`);
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

async function fingerprintFixtureInstructions(workspace) {
  const candidates = [join(workspace, "AGENTS.md"), join(workspace, ".codex", "config.toml")];
  const found = [];
  for (const path of candidates) {
    if (await fileExists(path)) found.push({ path: relative(workspace, path), sha256: createHash("sha256").update(await readFile(path)).digest("hex") });
  }
  return found;
}

function spawnProcess(command, args, options) {
  return new Promise((resolvePromise) => {
    const startedAt = new Date().toISOString();
    const child = spawn(command, args, { cwd: options.cwd, env: { ...process.env, ...(options.env ?? {}) }, stdio: ["ignore", "pipe", "pipe"] });
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
      resolvePromise({ code: null, signal: null, stdout, stderr: `${stderr}${error.message}`, timedOut, pid: child.pid ?? null, started_at: startedAt, ended_at: new Date().toISOString(), spawn_error: error.message });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolvePromise({ code, signal: signal ?? null, stdout, stderr, timedOut, pid: child.pid ?? null, started_at: startedAt, ended_at: new Date().toISOString() });
    });
  });
}

async function writeRuntimeEvent(outputDir, phase, details = {}) {
  await mkdir(outputDir, { recursive: true });
  await appendFile(join(outputDir, "runtime-events.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), phase, ...details })}\n`);
}

function asTokenCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function usageFromJsonl(stdout) {
  const terminalEvents = [];
  for (const line of stdout.split("\n")) {
    try {
      const event = JSON.parse(line);
      if (event.type === "turn.completed" && event.usage && typeof event.usage === "object") terminalEvents.push(event);
    } catch {
      // Codex can emit non-JSON status text alongside its JSONL stream.
    }
  }
  const eventId = (event) => event.id ?? event.turn_id ?? event.turn?.id ?? event.response_id ?? event.response?.id ?? null;
  const identified = terminalEvents.filter((event) => typeof eventId(event) === "string" || Number.isSafeInteger(eventId(event)));
  const selected = identified.length === terminalEvents.length && identified.length > 0
    ? [...new Map(identified.map((event) => [String(eventId(event)), event])).values()]
    : terminalEvents.length > 0 ? [terminalEvents.at(-1)] : [];
  const usage = (field) => {
    const values = selected.map((event) => asTokenCount(event.usage[field]));
    return values.length === 0 || values.some((value) => value === null) ? null : values.reduce((sum, value) => sum + value, 0);
  };
  const inputTokens = usage("input_tokens");
  const outputTokens = usage("output_tokens");
  return {
    input_tokens: inputTokens,
    cached_input_tokens: usage("cached_input_tokens"),
    cache_write_input_tokens: usage("cache_write_input_tokens"),
    output_tokens: outputTokens,
    reasoning_output_tokens: usage("reasoning_output_tokens"),
    total_tokens: inputTokens === null || outputTokens === null ? null : inputTokens + outputTokens,
    token_usage_scope: selected.length === 0 ? "unavailable" : identified.length === terminalEvents.length ? "unique_terminal_events" : "last_terminal_event"
  };
}

async function unzipWorkspace(inputRoot, workspaceZip, target, evalId) {
  const archive = resolve(inputRoot, workspaceZip);
  if (!safeRelativePath(workspaceZip) || !relative(inputRoot, archive) || relative(inputRoot, archive).startsWith("..") || !(await fileExists(archive))) {
    throw new Error(`Eval ${evalId}: workspace_zip does not exist inside the eval suite: ${workspaceZip}`);
  }
  const listing = await spawnProcess("unzip", ["-Z1", archive], { cwd: inputRoot, timeoutMs: DEFAULT_TIMEOUT_MS });
  if (listing.code !== 0) throw new Error(`Eval ${evalId}: cannot list workspace_zip: ${workspaceZip}`);
  for (const entry of listing.stdout.split(/\r?\n/).filter(Boolean)) {
    if (!safeRelativePath(entry.replace(/\/$/, ""))) throw new Error(`Eval ${evalId}: unsafe workspace_zip entry: ${entry}`);
  }
  await mkdir(target, { recursive: true });
  const extracted = await spawnProcess("unzip", ["-qq", archive, "-d", target], { cwd: inputRoot, timeoutMs: DEFAULT_TIMEOUT_MS });
  if (extracted.code !== 0) throw new Error(`Eval ${evalId}: cannot extract workspace_zip: ${workspaceZip}`);
}

function sarifDiagnostic(finding) {
  return { path: finding.path, line: finding.line, rule_id: finding.rule_id, level: finding.level };
}

async function validateSarif({ test, outputDir, inputRoot }) {
  if (!test.sarif) return null;
  const artifact = resolve(outputDir, test.sarif.artifact);
  if (!safeRelativePath(test.sarif.artifact) || !relative(outputDir, artifact) || relative(outputDir, artifact).startsWith("..") || !(await fileExists(artifact))) {
    return { passed: false, evidence: `Required SARIF artifact is missing: outputs/${test.sarif.artifact}` };
  }
  let document;
  try { document = JSON.parse(await readFile(artifact, "utf8")); } catch (error) { return { passed: false, evidence: `Required SARIF artifact is invalid JSON: ${error.message}` }; }
  if (document?.version !== "2.1.0" || !Array.isArray(document.runs)) return { passed: false, evidence: "Required SARIF artifact must declare version 2.1.0 and runs[]." };
  const findings = [];
  for (const run of document.runs) {
    if (!Array.isArray(run?.results)) return { passed: false, evidence: "Every SARIF run must contain results[]." };
    for (const result of run.results) {
      const location = result?.locations?.[0]?.physicalLocation;
      const path = location?.artifactLocation?.uri?.replace(/\\/g, "/");
      const line = location?.region?.startLine;
      if (typeof result?.ruleId !== "string" || result.ruleId.trim().length === 0 || typeof result?.message?.text !== "string" || result.message.text.trim().length === 0 || !["none", "note", "warning", "error"].includes(result.level) || !safeRelativePath(path) || !Number.isSafeInteger(line) || line < 1) {
        return { passed: false, evidence: "Each SARIF result needs safe relative location, positive line, non-empty ruleId and message, and accepted level." };
      }
      findings.push({ path, line, rule_id: result.ruleId, level: result.level });
    }
  }
  const truthPath = resolve(inputRoot, test.sarif.groundTruth);
  if (!safeRelativePath(test.sarif.groundTruth) || !relative(inputRoot, truthPath) || relative(inputRoot, truthPath).startsWith("..") || !(await fileExists(truthPath))) return { passed: false, evidence: `Private SARIF ground truth is missing: ${test.sarif.groundTruth}` };
  let truth;
  try { truth = JSON.parse(await readFile(truthPath, "utf8")); } catch (error) { return { passed: false, evidence: `Private SARIF ground truth is invalid JSON: ${error.message}` }; }
  if (!Array.isArray(truth?.findings)) return { passed: false, evidence: "Private SARIF ground truth needs findings[]." };
  const lineTolerance = truth.line_tolerance ?? 1;
  if (!Number.isSafeInteger(lineTolerance) || lineTolerance < 0) return { passed: false, evidence: "Private SARIF ground truth line_tolerance must be a non-negative integer." };
  const expected = truth.findings.map((finding) => ({ path: finding.path?.replace(/\\/g, "/"), line: finding.line, rule_id: finding.rule_id, level: finding.level }));
  if (!expected.every((finding) => safeRelativePath(finding.path) && Number.isSafeInteger(finding.line) && finding.line > 0 && typeof finding.rule_id === "string" && typeof finding.level === "string")) return { passed: false, evidence: "Private SARIF ground truth has invalid finding fields." };
  const actualRemaining = new Set(findings.map((_, index) => index));
  const matchedExpected = new Set();
  const matches = [];
  const expectedIndexed = expected.map((finding, index) => ({ finding, index }));
  for (const { finding: expectedFinding, index: expectedIndex } of expectedIndexed.sort((left, right) => left.finding.path.localeCompare(right.finding.path) || left.finding.level.localeCompare(right.finding.level) || left.finding.line - right.finding.line || left.finding.rule_id.localeCompare(right.finding.rule_id) || left.index - right.index)) {
    const actualIndex = [...actualRemaining]
      .filter((index) => findings[index].path === expectedFinding.path && findings[index].level === expectedFinding.level && Math.abs(findings[index].line - expectedFinding.line) <= lineTolerance)
      .sort((left, right) => findings[left].line - findings[right].line || findings[left].rule_id.localeCompare(findings[right].rule_id) || left - right)[0];
    if (actualIndex !== undefined) {
      actualRemaining.delete(actualIndex);
      matchedExpected.add(expectedIndex);
      matches.push({ expected: sarifDiagnostic(expectedFinding), actual: sarifDiagnostic(findings[actualIndex]) });
    }
  }
  const unmatchedExpected = expected.filter((_, index) => !matchedExpected.has(index));
  const unmatchedActual = [...actualRemaining].map((index) => findings[index]);
  const levels = ["error", "warning", "note", "none"];
  const recallFor = (level = null) => {
    const levelExpected = level === null ? expected : expected.filter((finding) => finding.level === level);
    const levelMatched = level === null ? matches : matches.filter((match) => match.expected.level === level);
    return levelExpected.length === 0 ? 1 : levelMatched.length / levelExpected.length;
  };
  const metrics = {
    recall: recallFor(),
    recall_by_level: Object.fromEntries(levels.map((level) => [level, recallFor(level)])),
    false_positives: unmatchedActual.length
  };
  const gates = test.sarif.gates;
  const gateFailures = gates ? [
    ...(gates.min_recall !== undefined && metrics.recall < gates.min_recall ? [`min_recall ${metrics.recall.toFixed(3)} is below ${gates.min_recall}`] : []),
    ...Object.entries(gates.min_recall_by_level ?? {}).filter(([level, threshold]) => metrics.recall_by_level[level] < threshold).map(([level, threshold]) => `min_recall_by_level.${level} ${metrics.recall_by_level[level].toFixed(3)} is below ${threshold}`),
    ...(gates.max_false_positives !== undefined && metrics.false_positives > gates.max_false_positives ? [`max_false_positives ${metrics.false_positives} exceeds ${gates.max_false_positives}`] : [])
  ] : [];
  const passed = gates ? gateFailures.length === 0 : unmatchedExpected.length === 0 && unmatchedActual.length === 0;
  const evidence = gates
    ? (passed ? `SARIF gates passed: recall ${metrics.recall.toFixed(3)}, false positives ${metrics.false_positives}.` : `SARIF gate failure: ${gateFailures.join("; ")}.`)
    : (passed
      ? `SARIF matched ${matches.length} ground-truth finding(s) by path and level within ${lineTolerance} line(s); rule IDs are diagnostic only.`
      : `SARIF ground-truth mismatch: ${unmatchedExpected.length} expected and ${unmatchedActual.length} actual finding(s) unmatched (path/level must match; line tolerance ${lineTolerance}).`);
  return {
    passed,
    artifact: relative(outputDir, artifact),
    line_tolerance: lineTolerance,
    expected_count: expected.length,
    actual_count: findings.length,
    matched_count: matches.length,
    unmatched_expected_count: unmatchedExpected.length,
    unmatched_actual_count: unmatchedActual.length,
    metrics,
    ...(gates ? { gates, gate_failures: gateFailures } : {}),
    matches,
    unmatched_expected: unmatchedExpected.map(sarifDiagnostic),
    unmatched_actual: unmatchedActual.map(sarifDiagnostic),
    evidence
  };
}

async function prepareCodexHome(outputDir) {
  const home = join(dirname(outputDir), "codex-home");
  await mkdir(home, { recursive: true });
  // Codex authentication is intentionally the only state carried into the clean home.
  const sourceHome = process.env.CODEX_HOME ?? join(homedir(), ".codex");
  const auth = join(sourceHome, "auth.json");
  if (await fileExists(auth)) await symlink(auth, join(home, "auth.json")).catch(() => {});
  return home;
}

async function assertCodexMcpDisabled(config, cwd, env) {
  const result = await spawnProcess(config.codexBin, ["mcp", "list"], { cwd, timeoutMs: config.timeoutMs, env });
  if (result.code !== 0) throw new Error(`Codex MCP preflight failed: ${result.stderr.trim() || `exit ${result.code}`}`);
  if (/\benabled\b/i.test(result.stdout)) throw new Error("Codex MCP preflight found an enabled MCP server in an isolated evaluation run");
}

async function runCodex({ config, cwd, skillPath, inputs, outputDir, prompt, label, outputSchema = null, env, role = "candidate" }) {
  await mkdir(outputDir, { recursive: true });
  await writeRuntimeEvent(outputDir, "run_started", { runtime: "codex", role, cwd, sandbox: config.runtimeProfile[role].filesystem });
  const lastMessage = join(outputDir, "last-message.md");
  const policy = config.runtimeProfile[role];
  const home = await prepareCodexHome(outputDir);
  const isolatedEnv = { ...(env ?? {}), CODEX_HOME: home };
  await writeRuntimeEvent(outputDir, "isolated_home_ready", { home: relative(dirname(outputDir), home) });
  await assertCodexMcpDisabled(config, cwd, isolatedEnv);
  await writeRuntimeEvent(outputDir, "mcp_preflight_passed");
  const args = ["exec", "--json", "--ephemeral", "--ignore-user-config", "--disable", "mcp_2026_07_28", "--disable", "enable_mcp_apps", "--skip-git-repo-check", "--sandbox", policy.filesystem, "--color", "never", "-C", cwd];
  if (skillPath) args.push("--add-dir", skillPath);
  if (inputs.length > 0) args.push("--add-dir", dirname(inputs[0]));
  if (config.model) args.push("--model", config.model);
  if (outputSchema) {
    const schemaPath = join(outputDir, "response-schema.json");
    await writeFile(schemaPath, JSON.stringify(outputSchema, null, 2));
    args.push("--output-schema", schemaPath);
  }
  args.push("--output-last-message", lastMessage, prompt);
  await writeRuntimeEvent(outputDir, "subprocess_starting", { executable: config.codexBin, argument_count: args.length });
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const processResult = await spawnProcess(config.codexBin, args, { cwd, timeoutMs: config.timeoutMs, env: isolatedEnv });
  await writeRuntimeEvent(outputDir, "subprocess_finished", { code: processResult.code, signal: processResult.signal, timed_out: processResult.timedOut, pid: processResult.pid, spawn_error: processResult.spawn_error ?? null });
  const durationMs = Math.round(performance.now() - started);
  await writeFile(join(outputDir, "stdout.log"), processResult.stdout);
  await writeFile(join(outputDir, "stderr.log"), processResult.stderr);
  const output = (await fileExists(lastMessage)) ? await readFile(lastMessage, "utf8") : "";
  const timing = { started_at: startedAt, duration_ms: durationMs, ...usageFromJsonl(processResult.stdout) };
  await writeFile(join(outputDir, "timing.json"), JSON.stringify(timing, null, 2));
  return { label, output, timing, code: processResult.code, timedOut: processResult.timedOut, stderr: processResult.stderr, environment: { home: relative(dirname(outputDir), home), mcp: "disabled", network: policy.network, filesystem: policy.filesystem } };
}

function unavailableTokenUsage() {
  return {
    input_tokens: null,
    cached_input_tokens: null,
    cache_write_input_tokens: null,
    output_tokens: null,
    reasoning_output_tokens: null,
    total_tokens: null,
    token_usage_scope: "unavailable"
  };
}

async function prepareKiroHome(config, baseDir) {
  // A clean benchmark harness: the isolated HOME exposes only the supplied agent.
  // Global skills, steering documents, and mcp.json stay out of every candidate run.
  const agentFile = config.kiroAgentFile ? resolve(ROOT, config.kiroAgentFile) : null;
  let agent = { name: "kiro-isolated", mcpServers: {}, tools: ["*"], allowedTools: ["*"], resources: [], includeMcpJson: false };
  if (agentFile) {
    if (!(await fileExists(agentFile))) throw new Error(`Cannot find --kiro-agent-file: ${agentFile}`);
    try { agent = JSON.parse(await readFile(agentFile, "utf8")); } catch (error) { throw new Error(`--kiro-agent-file is not valid JSON: ${error.message}`); }
  }
  if (typeof agent?.name !== "string" || agent.name.trim().length === 0) throw new Error(`Kiro isolated agent needs a non-empty name${agentFile ? `: ${agentFile}` : ""}`);
  agent = { ...agent, mcpServers: {}, includeMcpJson: false, resources: [] };
  const home = join(baseDir, "kiro-home");
  await mkdir(join(home, ".kiro", "agents"), { recursive: true });
  await mkdir(join(home, ".kiro", "settings"), { recursive: true });
  await writeFile(join(home, ".kiro", "agents", `${agent.name}.json`), JSON.stringify(agent, null, 2));
  // Authentication state lives in the XDG data directory, so link it instead of copying secrets.
  const share = join(homedir(), ".local", "share", "kiro-cli");
  if (await fileExists(share)) {
    await mkdir(join(home, ".local", "share"), { recursive: true });
    await symlink(share, join(home, ".local", "share", "kiro-cli")).catch(() => {});
  }
  return { home, agentName: agent.name };
}

async function runKiro({ config, cwd, skillPath, inputs, outputDir, prompt, label, env, role = "candidate" }) {
  await mkdir(outputDir, { recursive: true });
  await writeRuntimeEvent(outputDir, "run_started", { runtime: "kiro", role, cwd });
  const isolated = await prepareKiroHome(config, dirname(outputDir));
  await writeRuntimeEvent(outputDir, "isolated_home_ready", { home: relative(dirname(outputDir), isolated.home) });
  const agentName = isolated.agentName;
  const args = ["chat", "--no-interactive", "--wrap", "never", "--model", config.kiroModel];
  if (agentName) args.push("--agent", agentName);
  if (config.kiroEffort) args.push("--effort", config.kiroEffort);
  if (config.kiroTrustAllTools) args.push("--trust-all-tools");
  else args.push(`--trust-tools=${config.kiroTrustTools}`);
  args.push(prompt);
  await writeRuntimeEvent(outputDir, "subprocess_starting", { executable: config.kiroBin, argument_count: args.length });
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const runEnv = isolated ? { ...(env ?? {}), HOME: isolated.home } : env;
  const processResult = await spawnProcess(config.kiroBin, args, { cwd, timeoutMs: config.timeoutMs, env: runEnv });
  await writeRuntimeEvent(outputDir, "subprocess_finished", { code: processResult.code, signal: processResult.signal, timed_out: processResult.timedOut, pid: processResult.pid, spawn_error: processResult.spawn_error ?? null });
  const timing = {
    started_at: startedAt,
    duration_ms: Math.round(performance.now() - started),
    process_code: processResult.code,
    process_signal: processResult.signal ?? null,
    timed_out: processResult.timedOut,
    ...unavailableTokenUsage()
  };
  await writeFile(join(outputDir, "stdout.log"), processResult.stdout);
  await writeFile(join(outputDir, "stderr.log"), processResult.stderr);
  await writeFile(join(outputDir, "timing.json"), JSON.stringify(timing, null, 2));
  const policy = config.runtimeProfile[role];
  return { label, output: processResult.stdout, timing, code: processResult.code, timedOut: processResult.timedOut, stderr: processResult.stderr, environment: { home: relative(dirname(outputDir), isolated.home), mcp: "disabled", network: policy.network, filesystem: policy.filesystem } };
}

function graderPrompt(test, run) {
  return [
    "Grade an Agent Skills evaluation on an integer 0-10 scale. Judge only the listed criteria.",
    "Use each criterion's rubric anchors to decide the score. Return one result per criterion. The harness, not you, decides pass/fail from score >= threshold.",
    "Each evidence field must cite concrete output evidence or state why it is absent.",
    `Expected output: ${test.expected_output}`,
    `Assertions: ${JSON.stringify(test.assertions ?? [])}`,
    run.conversation ? `Conversation transcript (the simulator's hidden facts are intentionally omitted): ${JSON.stringify(run.conversation.transcript)}` : null,
    "Candidate output follows:",
    run.output
  ].filter(Boolean).join("\n\n");
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
  const prompt = graderPrompt(test, run);
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const home = await prepareCodexHome(variantDir);
  const env = { CODEX_HOME: home };
  await writeRuntimeEvent(variantDir, "grader_isolated_home_ready", { home: relative(variantDir, home) });
  await assertCodexMcpDisabled(config, variantDir, env);
  await writeRuntimeEvent(variantDir, "grader_mcp_preflight_passed");
  const graderArgs = ["exec", "--json", "--ephemeral", "--ignore-user-config", "--disable", "mcp_2026_07_28", "--disable", "enable_mcp_apps", "--skip-git-repo-check", "--sandbox", config.runtimeProfile.grader.filesystem, "--color", "never", "-C", variantDir];
  if (config.model) graderArgs.push("--model", config.model);
  graderArgs.push("--output-schema", schemaPath, "--output-last-message", gradeFile, prompt);
  await writeRuntimeEvent(variantDir, "grader_subprocess_starting", { executable: config.codexBin, argument_count: graderArgs.length });
  const result = await spawnProcess(config.codexBin, graderArgs, { cwd: variantDir, timeoutMs: config.timeoutMs, env });
  await writeRuntimeEvent(variantDir, "grader_subprocess_finished", { code: result.code, signal: result.signal, timed_out: result.timedOut, pid: result.pid, spawn_error: result.spawn_error ?? null });
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

async function gradeWithKiro({ config, variantDir, test, run }) {
  const assertions = test.assertions ?? [];
  if (run.code !== 0 || run.timedOut) {
    return { results: failedGrades(assertions, run.timedOut ? "Kiro execution timed out." : `Kiro exited with ${run.code}.`), timing: null };
  }
  if (assertions.length === 0) return { results: [], timing: null };
  if (config.grader === "none") {
    return { results: assertions.map((assertion) => ({ criterion: assertion.criterion, threshold: assertion.threshold, score: null, passed: null, evidence: "Not graded: --grader none." })), timing: null };
  }
  const graderOutput = join(variantDir, "grader-output");
  await mkdir(graderOutput, { recursive: true });
  const graderContext = join(graderOutput, "grader-prompt.md");
  await writeFile(graderContext, graderPrompt(test, run));
  const grade = await runKiro({
    config,
    cwd: variantDir,
    skillPath: null,
    inputs: [],
    outputDir: graderOutput,
    prompt: [
      "Read the complete grading context from the absolute file path below.",
      "Write only a JSON object with a results array matching the grading schema in that context to the exact absolute response path below; do not use Markdown fences or add commentary.",
      `Grading context: ${graderContext}`,
      `Response path: ${join(graderOutput, "grader-response.json")}`
    ].join("\n"),
    label: "grader",
    role: "grader"
  });
  await writeFile(join(variantDir, "grader-stdout.log"), grade.output);
  await writeFile(join(variantDir, "grader-stderr.log"), grade.stderr);
  const gradeFile = join(graderOutput, "grader-response.json");
  if (!(await fileExists(gradeFile))) return { results: failedGrades(assertions, "Grader did not write grader-response.json; see grader logs."), timing: grade.timing };
  try {
    const graded = JSON.parse(await readFile(gradeFile, "utf8"));
    if (!Array.isArray(graded.results) || graded.results.length !== assertions.length) throw new Error("wrong result count");
    return { results: scoreGrades(assertions, graded.results), timing: grade.timing };
  } catch (error) {
    return { results: failedGrades(assertions, `Could not parse grader response: ${error.message}`), timing: grade.timing };
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
  if (config.runtime === "codex") {
    return {
      name: "codex",
      profile: config.runtimeProfile,
      model: config.model ?? null,
      run: (options) => runCodex({ config, ...options }),
      grade: (options) => gradeWithCodex({ config, ...options })
    };
  }
  if (config.runtime === "kiro") {
    return {
      name: "kiro",
      profile: config.runtimeProfile,
      model: config.kiroModel,
      run: (options) => runKiro({ config, ...options }),
      grade: (options) => gradeWithKiro({ config, ...options })
    };
  }
  throw new Error(`Unsupported runtime: ${config.runtime}. Available runtimes: codex, kiro.`);
}

function runtimeConcurrency(config) {
  // Kiro CLI persists shared session state and has proven unstable with parallel candidates.
  return config.runtime === "kiro" ? 1 : config.concurrency;
}

export function warnKiroMcpExposure(config, write = (line) => process.stdout.write(line)) {
  // A global mcp.json is loaded unless the selected agent opts out. Observed locally:
  // the handshake grows kiro-cli to ~29GB RSS and an OOM killer SIGTERMs the run
  // mid-review, before required artifacts are written.
  if (config.runtime !== "kiro" || config.kiroAgent) return false;
  write("Warning: --runtime kiro without --kiro-agent loads every global MCP server; use an agent with mcpServers {} and includeMcpJson false to avoid out-of-memory termination.\n");
  return true;
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

function summarizeSarif(runs) {
  const sarifRuns = runs.filter((run) => run.sarif);
  const expected = sarifRuns.reduce((sum, run) => sum + (run.sarif.expected_count ?? 0), 0);
  const matched = sarifRuns.reduce((sum, run) => sum + (run.sarif.matched_count ?? 0), 0);
  return {
    evaluated_runs: sarifRuns.length,
    passed_runs: sarifRuns.filter((run) => run.sarif.passed).length,
    recall: expected === 0 ? (sarifRuns.length === 0 ? null : 1) : matched / expected,
    false_positives: sarifRuns.reduce((sum, run) => sum + (run.sarif.metrics?.false_positives ?? 0), 0)
  };
}

function standardVariantResult(variant, runs) {
  const environment = runs[0]?.runtime_environment ?? null;
  const score = summarizeScores(runs);
  const taskTokens = sumTokenUsage(runs.map((run) => run.timing)).total_tokens;
  const graderTokens = sumTokenUsage(runs.map((run) => run.grader_timing)).total_tokens;
  return {
    variant,
    status: runs.length > 0 && runs.every((run) => run.passed) ? "passed" : "failed",
    runtime: environment ? { name: runs[0].runtime, model: environment.model } : { name: runs[0]?.runtime ?? null, model: null },
    profile: environment?.profile ?? null,
    metrics: {
      passed: runs.filter((run) => run.passed).length,
      total: runs.length,
      pass_rate: runs.length === 0 ? null : runs.filter((run) => run.passed).length / runs.length,
      average_score: score.average_score,
      sarif: summarizeSarif(runs),
      tokens: { task: taskTokens, grader: graderTokens },
      duration_ms: runs.reduce((sum, run) => sum + (run.timing?.duration_ms ?? 0), 0)
    },
    artifacts: runs.map((run) => ({ eval_id: run.eval_id, repetition: run.repetition, ...run.artifacts }))
  };
}

function delta(current, baseline) {
  return current === null || baseline === null ? null : current - baseline;
}

function standardizedOutput(variants, results) {
  const variant_results = Object.fromEntries(variants.map(([variant]) => [variant, standardVariantResult(variant, results.filter((result) => result.variant === variant))]));
  const baseline_variant = variant_results.without_skill ? "without_skill" : (variant_results.old_skill ? "old_skill" : null);
  const baseline = baseline_variant ? variant_results[baseline_variant].metrics : null;
  const comparison = {
    baseline_variant,
    variants: baseline ? Object.fromEntries(Object.entries(variant_results).filter(([variant]) => variant !== baseline_variant).map(([variant, summary]) => [variant, {
      against: baseline_variant,
      pass_rate: delta(summary.metrics.pass_rate, baseline.pass_rate),
      average_score: delta(summary.metrics.average_score, baseline.average_score),
      sarif_recall: delta(summary.metrics.sarif.recall, baseline.sarif.recall),
      sarif_false_positives: delta(summary.metrics.sarif.false_positives, baseline.sarif.false_positives),
      task_tokens: delta(summary.metrics.tokens.task, baseline.tokens.task),
      duration_ms: delta(summary.metrics.duration_ms, baseline.duration_ms)
    }])) : {}
  };
  return { schema_version: 1, variant_results, comparison };
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
    ...tokenUsage,
    ...(timings.length > 0 && timings.every((timing) => timing?.token_usage_scope === "unavailable") ? { token_usage_scope: "unavailable" } : {})
  };
}

function transcriptText(transcript) {
  return transcript.map((message) => `${message.speaker.toUpperCase()}: ${message.content}`).join("\n\n");
}

async function runConversation({ runtime, variantDir, runtimeCwd = variantDir, simulatorDir, inputs, test, sourceSkill, label }) {
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
      sourceSkill ? `Read and follow the Agent Skill at ${join(sourceSkill, "SKILL.md")} before responding.` : "Complete the task without reading or using any Agent Skill.",
      "You are facilitating a brainstorm with a participant. Ask one focused question when more context would materially improve the result; otherwise produce the final response.",
      `Final turn: ${finalTurn}. Required discovery facts complete: ${discoveryComplete}. Discovery stalled: ${discoveryStalled}. ${finalTurn ? "You must return action=final and synthesize from the evidence already gathered." : "Return action=question or action=final."}`,
      `Conversation so far:\n${transcriptText(transcript)}`,
      `Input files: ${inputs.length ? inputs.join(", ") : "none"}`,
      "Return JSON only, matching the provided schema. The content field is the exact question or final user-facing answer."
    ].join("\n\n");
    const candidate = await runStructured(runtime, {
      cwd: runtimeCwd,
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

export async function evaluateVariant({ runtime, inputRoot, iterationPath, test, variant, sourceSkill, repetition, maxTurns }) {
  const evalDir = join(iterationPath, `eval-${safeId(test.id)}`);
  const variantDir = test.repetitions > 1 ? join(evalDir, `repetition-${repetition}`, variant) : join(evalDir, variant);
  const outputs = join(variantDir, "outputs");
  const inputsRoot = join(variantDir, "inputs");
  const inputs = await copyInputs(inputRoot, test, inputsRoot);
  const runtimeWorkspace = test.workspace_zip ? join(inputsRoot, "workspace") : variantDir;
  if (test.workspace_zip) await unzipWorkspace(inputRoot, test.workspace_zip, runtimeWorkspace, test.id);
  // Candidate sandboxes may write only inside the fixture workspace. Keep its
  // evidence there during the run, then copy it to the harness-owned outputs.
  const candidateOutput = join(runtimeWorkspace, ".agent-eval-output");
  await mkdir(candidateOutput, { recursive: true });
  const fixtureInstructions = await fingerprintFixtureInstructions(runtimeWorkspace);
  const runtimeSkillPath = await copyRuntimeSkill(sourceSkill, variantDir);
  const instruction = runtimeSkillPath
    ? `Read and follow the Agent Skill at ${join(runtimeSkillPath, "SKILL.md")} before completing the task.`
    : "Complete the task without reading or using any Agent Skill.";
  const prompt = [
    "You are executing one isolated evaluation run.",
    instruction,
    "Task: Review the committed branch change from main to HEAD as a pull request.",
    `Additional evaluation request: ${test.prompt}`,
    `Input files: ${inputs.length ? inputs.join(", ") : "none"}`,
    `Save any produced files under: ${candidateOutput}`,
    ...(test.sarif ? [
      `Required SARIF artifact path: ${join(candidateOutput, test.sarif.artifact)}.`,
      "Write a SARIF 2.1.0 JSON document there (and nowhere else in the reviewed workspace). Every result must include ruleId, level, message.text, a repository-relative locations[0].physicalLocation.artifactLocation.uri, and locations[0].physicalLocation.region.startLine. Use results: [] when the review is clean.",
      "Completion safety: write the SARIF artifact before the final response. A command with no matches or a nonzero exit is review evidence, not a reason to stop; recover, continue with available evidence, and still write a valid artifact (use partial findings or results: [] if necessary).",
      "Runtime compatibility: use only tools available in this Kiro session. Do not invoke the subagent tool in this batch runtime: if a skill requests independent subagents, perform those analysis passes sequentially in this session, keep their contexts separate, and continue the review."
    ] : []),
    "Put the complete user-facing answer in the final message. Do not replace it with a link or a summary of a file saved under outputs."
  ].join("\n");
  const runTest = maxTurns && test.conversation
    ? { ...test, conversation: { ...test.conversation, maxTurns: Math.min(test.conversation.maxTurns, maxTurns) } }
    : test;
  const run = runTest.conversation
    ? await runConversation({
      runtime,
      variantDir,
      runtimeCwd: runtimeWorkspace,
      simulatorDir: join(iterationPath, "private-simulator", `eval-${safeId(test.id)}`, `repetition-${repetition}`, variant),
      inputs,
      test: runTest,
      sourceSkill: runtimeSkillPath,
      label: variant
    })
    : await runtime.run({
      cwd: runtimeWorkspace,
      skillPath: runtimeSkillPath,
      inputs,
      outputDir: outputs,
      prompt,
      label: variant,
      env: { AI_OUTPUT_DIR: candidateOutput, ...(runtimeSkillPath ? { OPENCODE_CONFIG_DIR: runtimeSkillPath } : {}) }
    });
  await cp(candidateOutput, outputs, { recursive: true, force: true });
  const sarif = await validateSarif({ test, outputDir: outputs, inputRoot });
  // Kiro can return 1 after it has emitted a final response and a valid artifact.
  // Preserve that diagnostic code, but do not discard completed work during grading.
  const recoveredKiroExit = runtime.name === "kiro" && run.code === 1 && !run.timedOut && run.output.trim().length > 0 && Boolean(sarif?.artifact);
  const gradeRun = recoveredKiroExit ? { ...run, code: 0 } : run;
  const graded = await runtime.grade({ variantDir, test, run: gradeRun });
  if (sarif) graded.results.push({ criterion: "Required SARIF artifact and ground-truth match", threshold: 10, score: sarif.passed ? 10 : 0, passed: sarif.passed, evidence: sarif.evidence });
  const result = {
    variant,
    repetition,
    runtime: runtime.name,
    runtime_environment: {
      profile: { name: runtime.profile.name, version: runtime.profile.version, sha256: runtime.profile.sha256 },
      model: runtime.model ? { requested: runtime.model, effective: null, provenance: "requested_not_attested" } : { requested: null, effective: null, provenance: "cli_default_unattested" },
      fixture_instructions: fixtureInstructions,
      candidate: run.environment ?? null,
      grader: { mcp: "disabled", network: runtime.profile.grader.network, filesystem: runtime.profile.grader.filesystem }
    },
    code: run.code,
    timed_out: run.timedOut,
    timing: run.timing,
    ...(recoveredKiroExit ? { recovered_runtime_exit: true } : {}),
    grader_timing: graded.timing,
    artifacts: {
      output_dir: relative(iterationPath, outputs),
      candidate_output: relative(iterationPath, join(outputs, runtime.name === "codex" ? "last-message.md" : "stdout.log")),
      ...(sarif?.artifact ? { sarif: relative(iterationPath, join(outputs, test.sarif.artifact)) } : {})
    },
    passed: candidatePassed(gradeRun, graded.results),
    grading: graded.results,
    ...(sarif ? { sarif } : {}),
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

export async function writeFinalReport(iterationPath, benchmark) {
  const participantLabel = benchmark.kind === "benchmark" ? "Participant" : "Variant";
  const lines = [
    benchmark.kind === "benchmark" ? "# Skill competition report" : "# Skill evaluation report",
    "",
    `Generated: ${benchmark.generated_at}`,
    `Runtime profile: ${benchmark.runtime_profile ? `${benchmark.runtime_profile.name} v${benchmark.runtime_profile.version} (${benchmark.runtime_profile.sha256.slice(0, 12)})` : "not recorded"}`,
    "",
    `Transcript bundle: [index](${benchmark.transcript_bundle ?? "transcripts/index.md"})`,
    "",
    `## ${participantLabel} summary`,
    "",
    `| ${participantLabel} | Passed | Avg score | Facts | Weighted discovery | Candidate turns | Avg turns | Task tokens |`,
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
  lines.push("", "## Scenario results", "", `| Scenario | ${participantLabel} | Passed | SARIF | SARIF metrics / gates | SARIF evidence | Facts | Turns | Scores |`, "| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: |");
  for (const result of benchmark.results) {
    const discovery = result.conversation?.discovery;
    const sarifMetrics = result.sarif ? `recall ${result.sarif.metrics?.recall ?? "n/a"}; false positives ${result.sarif.metrics?.false_positives ?? "n/a"}${result.sarif.gate_failures?.length ? `; failures: ${result.sarif.gate_failures.join(", ")}` : ""}` : "n/a";
    lines.push(`| ${result.eval_id} | ${result.variant} | ${result.passed ? "yes" : "no"} | ${result.sarif ? (result.sarif.passed ? "matched" : "failed") : "n/a"} | ${sarifMetrics.replace(/\|/g, "\\|")} | ${result.sarif?.evidence?.replace(/\|/g, "\\|") ?? "n/a"} | ${discovery ? `${discovery.revealed_count}/${discovery.available_count}` : "n/a"} | ${result.conversation?.candidate_turns ?? "n/a"} | ${result.grading.map((grade) => `${grade.criterion}: ${grade.score}`).join("; ")} |`);
  }
  lines.push("", "## Runtime environment", "", "| Scenario | Variant | Requested model | Model provenance | Fixture instructions |", "| --- | --- | --- | --- | --- |");
  for (const result of benchmark.results) {
    const environment = result.runtime_environment;
    lines.push(`| ${result.eval_id} | ${result.variant} | ${environment?.model?.requested ?? "CLI default"} | ${environment?.model?.provenance ?? "n/a"} | ${(environment?.fixture_instructions ?? []).map((item) => `${item.path}@${item.sha256.slice(0, 12)}`).join(", ") || "none"} |`);
  }
  await writeFile(join(iterationPath, "report.md"), `${lines.join("\n")}\n`);
  return "report.md";
}

export async function writeTranscriptBundle(iterationPath, results) {
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

export async function mapWithConcurrency(items, concurrency, callback) {
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

export async function main() {
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
  const manifest = selectEvals(await loadManifest(skillPath, config.evals), config.evalIds);
  const runtimeProfile = await loadRuntimeProfile(manifest);
  const runtime = createRuntime({ ...config, runtimeProfile });
  const workspace = config.workspace ? resolve(ROOT, config.workspace) : join(ROOT, ".skill-evals", basename(skillPath));
  const iteration = config.iteration ?? await nextIteration(workspace);
  const iterationPath = join(workspace, `iteration-${iteration}`);
  if (await fileExists(iterationPath)) throw new Error(`Iteration already exists: ${iterationPath}`);
  await mkdir(iterationPath, { recursive: true });
  const previousPath = config.previous ? resolve(ROOT, config.previous) : null;
  const allVariants = previousPath
    ? [["without_skill", null], ["old_skill", previousPath], ["with_skill", skillPath]]
    : [["without_skill", null], ["with_skill", skillPath]];
  const variants = config.variants
    ? config.variants.map((name) => {
      const found = allVariants.find(([variant]) => variant === name);
      if (!found) throw new Error(`--variants: unknown or unavailable variant '${name}' (available: ${allVariants.map(([variant]) => variant).join(", ")})`);
      return found;
    })
    : allVariants;
  const jobs = [];
  for (const test of manifest.evals) {
    const repetitions = Math.min(test.repetitions ?? 1, config.maxRepetitions ?? Infinity);
    for (let repetition = 1; repetition <= repetitions; repetition += 1) {
      for (const [variant, sourceSkill] of variants) {
        jobs.push({ test, repetitions, repetition, variant, sourceSkill });
      }
    }
  }
  const concurrency = runtimeConcurrency(config);
  if (concurrency !== config.concurrency) process.stdout.write("Kiro candidate runs are serialized to avoid shared-session instability.\n");
  const results = await mapWithConcurrency(jobs, concurrency, async (job) => {
    process.stdout.write(`Running ${job.test.id} repetition ${job.repetition}/${job.repetitions}: ${job.variant}\n`);
    return {
      eval_id: job.test.id,
      ...(await evaluateVariant({
        runtime,
        inputRoot: config.evals ? dirname(resolve(ROOT, config.evals)) : skillPath,
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
    kind: "evaluation",
    skill_name: manifest.skill_name,
    runtime_profile: { name: runtimeProfile.name, version: runtimeProfile.version, sha256: runtimeProfile.sha256 },
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
    })),
    standardized_output: standardizedOutput(variants, results)
  };
  benchmark.report = await writeFinalReport(iterationPath, benchmark);
  await writeFile(join(iterationPath, "evaluation.json"), JSON.stringify(benchmark, null, 2));
  const candidates = results.filter((result) => result.variant === "with_skill");
  const oldById = new Map(results.filter((result) => result.variant === "old_skill").map((result) => [String(result.eval_id), result]));
  const regressions = candidates.filter((candidate) => !candidate.passed || (oldById.get(String(candidate.eval_id))?.passed && !candidate.passed));
  for (const [variant, summary] of Object.entries(benchmark.summary)) {
    process.stdout.write(`${variant}: ${summary.passed}/${summary.total} passed\n`);
  }
  process.stdout.write(`Evidence: ${iterationPath}\n`);
  if (regressions.length > 0) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    process.stderr.write(`evaluate-skills: ${error.message}\n`);
    process.exitCode = 2;
  });
}

export { DEFAULT_TIMEOUT_MS, runtimeConcurrency, safeRelativePath, usageFromJsonl, MAX_CONVERSATION_TURNS, ROOT, createRuntime, fileExists, loadManifest, loadRuntimeProfile, nextIteration, resolveSkill, safeId, selectEvals, standardVariantResult, standardizedOutput, summarizeDiscovery, summarizeScores, summarizeTurns, sumTokenUsage };
