#!/usr/bin/env node
/** Offline integration test for the runtime boundary and Codex JSONL accounting. */

import assert from "node:assert/strict";
import { chmod, mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;
const { runtimeConcurrency } = await import(new URL("../scripts/evaluate-skills.ts", import.meta.url));
assert.equal(runtimeConcurrency({ runtime: "kiro", concurrency: 3 }), 1);
assert.equal(runtimeConcurrency({ runtime: "codex", concurrency: 3 }), 3);

function run(command, args, cwd = ROOT) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

const temp = await mkdtemp(join(tmpdir(), "evaluate-skills-test-"));
const skill = join(temp, "sample-skill");
const previous = join(temp, "sample-skill-previous");
const conversationSkill = join(temp, "conversation-skill");
const fakeCodex = join(temp, "fake-codex.sh");
const fakeKiro = join(temp, "fake-kiro.sh");
const kiroLog = join(temp, "fake-kiro.log");
const codexLog = join(temp, "fake-codex.log");
const workspace = join(temp, "workspace");
await mkdir(join(skill, "evals"), { recursive: true });
await mkdir(previous, { recursive: true });
await mkdir(join(conversationSkill, "evals"), { recursive: true });
await writeFile(join(skill, "SKILL.md"), "---\nname: sample-skill\ndescription: Test fixture skill for the evaluation harness.\n---\n");
await writeFile(join(previous, "SKILL.md"), "---\nname: sample-skill\ndescription: Previous fixture skill for the evaluation harness.\n---\n");
await writeFile(join(conversationSkill, "SKILL.md"), "---\nname: conversation-skill\ndescription: Conversation fixture skill for the evaluation harness.\n---\n");
await writeFile(join(skill, "evals", "evals.json"), JSON.stringify({
  skill_name: "sample-skill",
  evals: [{
    id: "one",
    prompt: "Produce the expected result.",
    expected_output: "A result.",
    assertions: [{
      criterion: "The result is present.",
      threshold: 8,
      rubric: { "0": "The result is absent.", "8": "The result is present.", "10": "The result is present with evidence." }
    }]
  }]
}, null, 2));
await writeFile(fakeCodex, `#!/bin/sh
output=""
schema=""
skill_dir=""
all_args="$*"
printf 'argv=%s AI_OUTPUT_DIR=%s OPENCODE_CONFIG_DIR=%s\n' "$all_args" "\${AI_OUTPUT_DIR:-}" "\${OPENCODE_CONFIG_DIR:-}" >> "$FAKE_CODEX_LOG"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --output-last-message) output="$2"; shift 2 ;;
    --output-schema) schema="$2"; shift 2 ;;
    --add-dir) skill_dir="$2"; shift 2 ;;
    *) shift ;;
  esac
done
mkdir -p "$(dirname "$output")"
if [ -n "$schema" ] && grep -q '"action"' "$schema"; then
  case "$all_args" in
    *"Final turn: true"*) printf '%s' '{"action":"final","content":"A grounded final brainstorm."}' > "$output" ;;
    *) printf '%s' '{"action":"question","content":"What constraint matters most?"}' > "$output" ;;
  esac
  printf '%s\\n' 'status text' '{"type":"turn.completed","usage":{"input_tokens":100,"cached_input_tokens":40,"cache_write_input_tokens":3,"output_tokens":15,"reasoning_output_tokens":7}}'
elif [ -n "$schema" ] && grep -q '"reply"' "$schema"; then
  printf '%s' '{"reply":"The migration must finish in three weeks.","revealed_fact_ids":["migration-window"]}' > "$output"
  printf '%s\\n' 'status text' '{"type":"turn.completed","usage":{"input_tokens":100,"cached_input_tokens":40,"cache_write_input_tokens":3,"output_tokens":15,"reasoning_output_tokens":7}}'
elif [ -n "$schema" ]; then
  case "$all_args" in
    *old-result*) printf '%s' '{"results":[{"criterion":"The result is present.","score":4,"evidence":"old result"}]}' > "$output" ;;
    *) printf '%s' '{"results":[{"criterion":"The result is present.","score":9,"evidence":"result"}]}' > "$output" ;;
  esac
  printf '%s\\n' 'status text' '{"type":"turn.completed","usage":{"input_tokens":20,"cached_input_tokens":4,"cache_write_input_tokens":1,"output_tokens":5,"reasoning_output_tokens":2}}'
else
  if [ -n "\${OPENCODE_CONFIG_DIR:-}" ] && [ -f "$OPENCODE_CONFIG_DIR/scripts/collect-pr-context.sh" ]; then
    sh "$OPENCODE_CONFIG_DIR/scripts/collect-pr-context.sh"
    printf '%s' 'result' > "$output"
  elif [ -f marker.txt ] && [ "$(cat marker.txt)" = "workspace fixture" ]; then
    printf '%s' 'workspace-result' > "$output"
    cat > "$(dirname "$output")/review.sarif" <<'JSON'
{"version":"2.1.0","runs":[{"results":[{"ruleId":"TEST-WORKSPACE","level":"error","message":{"text":"fixture"},"locations":[{"physicalLocation":{"artifactLocation":{"uri":"src/example.js"},"region":{"startLine":7}}}]}]}]}
JSON
  elif grep -q 'Previous fixture' "$skill_dir/SKILL.md"; then printf '%s' 'old-result' > "$output"; else printf '%s' 'result' > "$output"; fi
  printf '%s\n' 'status text' '{"type":"turn.completed","id":"task-one","usage":{"input_tokens":100,"cached_input_tokens":40,"cache_write_input_tokens":3,"output_tokens":15,"reasoning_output_tokens":7}}' '{"type":"turn.completed","id":"task-two","usage":{"input_tokens":10,"cached_input_tokens":4,"cache_write_input_tokens":1,"output_tokens":1,"reasoning_output_tokens":0}}'
fi
`);
await chmod(fakeCodex, 0o755);
await writeFile(fakeKiro, `#!/bin/sh
argv_bytes=0
prompt=""
for arg in "$@"; do
  argv_bytes=$((argv_bytes + \${#arg}))
  prompt="$arg"
done
printf 'argv_bytes=%s HOME=%s %s\\n' "$argv_bytes" "$HOME" "$*" >> "$FAKE_KIRO_LOG"
case "$prompt" in
  *"Read the complete grading context from the absolute file path below."*)
    context=$(printf '%s\\n' "$prompt" | sed -n 's/^Grading context: //p')
    response=$(printf '%s\\n' "$prompt" | sed -n 's/^Response path: //p')
    [ -f "$context" ] && [ -n "$response" ] || exit 3
    printf 'grader_context=%s argv_bytes=%s\\n' "$context" "$argv_bytes" >> "$FAKE_KIRO_LOG"
    printf '%s\\n' 'Reading file...' 'Writing grader response...'
    mkdir -p "$(dirname "$response")"
    if [ "$FAKE_KIRO_MISSING_GRADE" = "1" ]; then :
    elif [ "$FAKE_KIRO_INVALID_GRADE" = "1" ]; then printf '%s' 'not-json' > "$response"
    else printf '%s' '{"results":[{"criterion":"The result is present.","score":9,"evidence":"kiro result"}]}' > "$response"
    fi
    if [ "$FAKE_KIRO_EXIT_1" = "1" ]; then printf '%s\\n' 'grader exited after writing response' >&2; exit 1; fi ;;
  *"Produce a large result."*) head -c 327680 /dev/zero | tr '\\000' x ;;
  *) printf '%s' 'kiro-result' ;;
esac
`);
await chmod(fakeKiro, 0o755);
process.env.FAKE_KIRO_LOG = kiroLog;
process.env.FAKE_CODEX_LOG = codexLog;

const first = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--workspace", workspace, "--codex-bin", fakeCodex, "--iteration", "1"]);
assert.equal(first.code, 0, first.stderr);
const benchmark = JSON.parse(await readFile(join(workspace, "iteration-1", "evaluation.json"), "utf8"));
assert.equal(benchmark.summary.with_skill.passed, 1);
assert.deepEqual(benchmark.summary.with_skill.task_token_usage, {
  input_tokens: 110,
  cached_input_tokens: 44,
  cache_write_input_tokens: 4,
  output_tokens: 16,
  reasoning_output_tokens: 7,
  total_tokens: 126
});
assert.equal(benchmark.summary.with_skill.grader_token_usage.total_tokens, 25);
assert.equal(benchmark.summary.with_skill.score_summary.average_score, 9);
const taskTiming = JSON.parse(await readFile(join(workspace, "iteration-1", "eval-one", "with_skill", "outputs", "timing.json"), "utf8"));
assert.equal(taskTiming.total_tokens, 126);
assert.equal(taskTiming.token_usage_scope, "unique_terminal_events");

const second = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--previous", previous, "--workspace", workspace, "--codex-bin", fakeCodex, "--iteration", "2"]);
assert.equal(second.code, 0, second.stderr);
const previousBenchmark = JSON.parse(await readFile(join(workspace, "iteration-2", "evaluation.json"), "utf8"));
assert.deepEqual(previousBenchmark.variants, ["without_skill", "old_skill", "with_skill"]);

const selected = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--variants", "with_skill", "--workspace", workspace, "--codex-bin", fakeCodex, "--iteration", "7"]);
assert.equal(selected.code, 0, selected.stderr);
const selectedBenchmark = JSON.parse(await readFile(join(workspace, "iteration-7", "evaluation.json"), "utf8"));
assert.deepEqual(selectedBenchmark.variants, ["with_skill"]);
assert.equal(selectedBenchmark.results.every((result) => result.variant === "with_skill"), true);
const unavailableVariant = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--variants", "old_skill", "--workspace", workspace, "--codex-bin", fakeCodex, "--iteration", "8"]);
assert.notEqual(unavailableVariant.code, 0);
assert.match(unavailableVariant.stderr, /unknown or unavailable variant/);

assert.equal(previousBenchmark.summary.old_skill.task_token_usage.total_tokens, 126);
assert.equal(previousBenchmark.summary.old_skill.passed, 0);
assert.equal(previousBenchmark.summary.with_skill.passed, 1);
assert.equal(previousBenchmark.results.find((result) => result.variant === "old_skill").grading[0].score, 4);

await writeFile(join(conversationSkill, "evals", "evals.json"), JSON.stringify({
  skill_name: "conversation-skill",
  evals: [{
    id: "discovery",
    prompt: "Help me brainstorm a safer onboarding migration.",
    expected_output: "A grounded final brainstorm.",
    repetitions: 2,
    conversation: {
      max_turns: 2,
      persona: {
        role: "technical stakeholder",
        goal: "avoid migration risk",
        style: "brief and cautious",
        public_facts: ["The team has a small migration."],
        hidden_facts: [{ id: "migration-window", fact: "The migration must finish in three weeks.", reveal_when: "asked about timeline or migration constraints" }]
      },
      required_hidden_fact_ids: ["migration-window"]
    }
  }]
}, null, 2));
const conversationWorkspace = join(temp, "conversation-workspace");
const conversationSuite = join(temp, "conversation-suite", "evals.json");
await mkdir(dirname(conversationSuite), { recursive: true });
await writeFile(conversationSuite, await readFile(join(conversationSkill, "evals", "evals.json"), "utf8"));
const conversationRun = await run("node", ["scripts/benchmark-skills.ts", "--participant", conversationSkill, "--participant", skill, "--evals", conversationSuite, "--workspace", conversationWorkspace, "--codex-bin", fakeCodex, "--grader", "none", "--concurrency", "2"]);
assert.equal(conversationRun.code, 0, conversationRun.stderr);
const conversationBenchmark = JSON.parse(await readFile(join(conversationWorkspace, "iteration-1", "benchmark.json"), "utf8"));
assert.equal(conversationBenchmark.kind, "benchmark");
assert.deepEqual(conversationBenchmark.variants, ["participant-conversation-skill-1", "participant-sample-skill-2"]);
assert.equal(conversationBenchmark.summary["participant-conversation-skill-1"].total, 2);
assert.equal(conversationBenchmark.summary["participant-sample-skill-2"].total, 2);
assert.deepEqual(conversationBenchmark.summary["participant-conversation-skill-1"].discovery_summary, {
  conversation_runs: 2,
  revealed_hidden_facts: 2,
  available_hidden_facts: 2,
  discovery_rate: 1,
  revealed_weight: 2,
  available_weight: 2,
  weighted_discovery_rate: 1
});
assert.deepEqual(conversationBenchmark.summary["participant-conversation-skill-1"].turn_summary, { conversation_runs: 2, candidate_turns: 4, average_candidate_turns: 2 });
assert.equal(conversationBenchmark.report, "report.md");
assert.match(await readFile(join(conversationWorkspace, "iteration-1", "report.md"), "utf8"), /Candidate turns/);
const conversationResult = conversationBenchmark.results.find((result) => result.variant === "participant-conversation-skill-1" && result.repetition === 1);
assert.equal(conversationResult.timing.total_tokens, 345);
assert.equal(conversationResult.conversation.candidate_turns, 2);
assert.deepEqual(conversationResult.conversation.discovery.revealed_fact_ids, ["migration-window"]);
assert.equal(conversationResult.conversation.transcript.at(-1).content, "A grounded final brainstorm.");
assert.equal(conversationBenchmark.transcript_bundle, "transcripts/index.md");
assert.equal(conversationResult.transcript_bundle_path, "transcripts/discovery/repetition-1/participant-conversation-skill-1.json");
assert.equal(await readFile(join(conversationWorkspace, "iteration-1", conversationResult.transcript_bundle_path), "utf8"), await readFile(join(conversationWorkspace, "iteration-1", conversationResult.transcript_path), "utf8"));
assert.match(await readFile(join(conversationWorkspace, "iteration-1", "transcripts", "index.md"), "utf8"), /participant-sample-skill-2/);
await assert.rejects(readFile(join(conversationWorkspace, "iteration-1", "eval-discovery", "repetition-1", "participant-conversation-skill-1", "runtime-skill", "evals", "evals.json")));
await assert.rejects(readFile(join(conversationWorkspace, "iteration-1", "eval-discovery", "repetition-1", "participant-conversation-skill-1", "outputs", "simulator-turn-1", "last-message.md")));
assert.equal(await readFile(join(conversationWorkspace, "iteration-1", "private-simulator", "eval-discovery", "repetition-1", "participant-conversation-skill-1", "turn-1", "last-message.md"), "utf8"), '{"reply":"The migration must finish in three weeks.","revealed_fact_ids":["migration-window"]}');

const externalEvals = join(temp, "external-evals.json");
await writeFile(externalEvals, JSON.stringify({
  skill_name: "external-brainstorm-suite",
  evals: [
    { id: "external", prompt: "Produce a concise result.", expected_output: "A result." },
    { id: "external-second", prompt: "Produce another concise result.", expected_output: "A result." }
  ]
}, null, 2));
const externalWorkspace = join(temp, "external-workspace");
const externalRun = await run("node", ["scripts/evaluate-skills.ts", "--skill", conversationSkill, "--evals", externalEvals, "--eval", "external", "--workspace", externalWorkspace, "--codex-bin", fakeCodex, "--grader", "none", "--max-turns", "30"]);
assert.equal(externalRun.code, 0, externalRun.stderr);
const externalBenchmark = JSON.parse(await readFile(join(externalWorkspace, "iteration-1", "evaluation.json"), "utf8"));
assert.equal(externalBenchmark.skill_name, "external-brainstorm-suite");
assert.equal(externalBenchmark.eval_suite, externalEvals);
assert.equal(externalBenchmark.summary.with_skill.passed, 1);
assert.deepEqual(externalBenchmark.results.map((result) => result.eval_id), ["external", "external"]);

const filteredBenchmarkWorkspace = join(temp, "filtered-benchmark-workspace");
const filteredBenchmarkRun = await run("node", [
  "scripts/benchmark-skills.ts", "--participant", skill, "--participant", previous, "--evals", externalEvals,
  "--eval", "external-second", "--workspace", filteredBenchmarkWorkspace, "--codex-bin", fakeCodex, "--grader", "none"
]);
assert.equal(filteredBenchmarkRun.code, 0, filteredBenchmarkRun.stderr);
const filteredBenchmark = JSON.parse(await readFile(join(filteredBenchmarkWorkspace, "iteration-1", "benchmark.json"), "utf8"));
assert.deepEqual(filteredBenchmark.results.map((result) => result.eval_id), ["external-second", "external-second"]);
assert.equal(filteredBenchmark.summary["participant-sample-skill-1"].total, 1);
assert.equal(filteredBenchmark.summary["participant-sample-skill-previous-2"].total, 1);
const missingBenchmarkEval = await run("node", [
  "scripts/benchmark-skills.ts", "--participant", skill, "--participant", previous, "--evals", externalEvals, "--eval", "absent"
]);
assert.equal(missingBenchmarkEval.code, 2);
assert.match(missingBenchmarkEval.stderr, /Requested --eval ID\(s\) not found: absent/);

const workspaceSkill = join(temp, "workspace-skill");
const workspaceSuite = join(temp, "workspace-suite");
const workspaceFixture = join(temp, "workspace-fixture");
await mkdir(join(workspaceSkill, "evals"), { recursive: true });
await mkdir(join(workspaceSuite, "fixtures"), { recursive: true });
await mkdir(join(workspaceFixture, "src"), { recursive: true });
await writeFile(join(workspaceSkill, "SKILL.md"), "---\nname: workspace-skill\ndescription: Workspace fixture skill.\n---\n");
await writeFile(join(workspaceFixture, "marker.txt"), "workspace fixture");
await writeFile(join(workspaceFixture, "src", "example.js"), "export const example = true;\n");
const workspaceZip = join(workspaceSuite, "fixtures", "workspace.zip");
const zipRun = await run("zip", ["-q", "-r", workspaceZip, "."], workspaceFixture);
assert.equal(zipRun.code, 0, zipRun.stderr);
await writeFile(join(workspaceSuite, "ground-truth.json"), JSON.stringify({ findings: [{ path: "src/example.js", line: 7, rule_id: "TEST-WORKSPACE", level: "error" }] }));
await writeFile(join(workspaceSuite, "evals.json"), JSON.stringify({
  skill_name: "workspace-suite",
  evals: [{ id: "workspace-sarif", prompt: "Inspect the workspace and produce SARIF.", expected_output: "workspace-result", workspace_zip: "fixtures/workspace.zip", sarif: { artifact: "review.sarif", ground_truth: "ground-truth.json" } }]
}, null, 2));
const workspaceRun = await run("node", ["scripts/evaluate-skills.ts", "--skill", workspaceSkill, "--evals", join(workspaceSuite, "evals.json"), "--workspace", join(temp, "workspace-sarif-evidence"), "--codex-bin", fakeCodex, "--grader", "none"]);
assert.equal(workspaceRun.code, 0, workspaceRun.stderr);
const workspaceBenchmark = JSON.parse(await readFile(join(temp, "workspace-sarif-evidence", "iteration-1", "evaluation.json"), "utf8"));
const workspaceResult = workspaceBenchmark.results.find((result) => result.variant === "with_skill");
assert.equal(workspaceResult.sarif.passed, true);
assert.equal(workspaceResult.grading.at(-1).criterion, "Required SARIF artifact and ground-truth match");
assert.equal(await readFile(join(temp, "workspace-sarif-evidence", "iteration-1", "eval-workspace-sarif", "with_skill", "inputs", "workspace", "marker.txt"), "utf8"), "workspace fixture");
const sarifPromptLog = await readFile(codexLog, "utf8");
assert.match(sarifPromptLog, /Task: Review the committed branch change from main to HEAD as a pull request\./);
assert.match(sarifPromptLog, /Required SARIF artifact path: .*review\.sarif/);
assert.match(sarifPromptLog, /Every result must include ruleId, level, message\.text, a repository-relative/);
assert.match(sarifPromptLog, /Completion safety: write the SARIF artifact before the final response\./);
assert.match(sarifPromptLog, /Runtime compatibility: use only tools available in this Kiro session\. Do not invoke the subagent tool in this batch runtime/);
await assert.rejects(readFile(join(temp, "workspace-sarif-evidence", "iteration-1", "eval-workspace-sarif", "with_skill", "inputs", "ground-truth.json")));

const kiroWorkspace = join(temp, "kiro-workspace");
const kiroEval = await run("node", [
  "scripts/evaluate-skills.ts", "--skill", skill, "--workspace", kiroWorkspace, "--runtime", "kiro",
  "--kiro-bin", fakeKiro, "--kiro-agent", "kiro_default", "--kiro-effort", "high",
  "--kiro-trust-tools", "fs_read,fs_write"
]);
assert.equal(kiroEval.code, 0, kiroEval.stderr);
const kiroEvaluation = JSON.parse(await readFile(join(kiroWorkspace, "iteration-1", "evaluation.json"), "utf8"));
const kiroResult = kiroEvaluation.results.find((result) => result.variant === "with_skill");
assert.equal(kiroResult.runtime, "kiro");
assert.equal(kiroResult.grading[0].score, 9);
assert.equal(await readFile(join(kiroWorkspace, "iteration-1", "eval-one", "with_skill", "grader-output", "grader-response.json"), "utf8"), '{"results":[{"criterion":"The result is present.","score":9,"evidence":"kiro result"}]}');
assert.equal(await readFile(join(kiroWorkspace, "iteration-1", "eval-one", "with_skill", "grader-stdout.log"), "utf8"), "Reading file...\nWriting grader response...\n");
assert.deepEqual(kiroResult.timing, {
  started_at: kiroResult.timing.started_at,
  duration_ms: kiroResult.timing.duration_ms,
  process_code: 0,
  process_signal: null,
  timed_out: false,
  input_tokens: null,
  cached_input_tokens: null,
  cache_write_input_tokens: null,
  output_tokens: null,
  reasoning_output_tokens: null,
  total_tokens: null,
  token_usage_scope: "unavailable"
});
assert.equal(await readFile(join(kiroWorkspace, "iteration-1", "eval-one", "with_skill", "outputs", "stdout.log"), "utf8"), "kiro-result");
assert.match(await readFile(kiroLog, "utf8"), /chat --no-interactive --wrap never --model claude-sonnet-5 --agent kiro_default --effort high --trust-tools=fs_read,fs_write/);
assert.match(await readFile(kiroLog, "utf8"), /--model claude-sonnet-5/);
const kiroOverrideWorkspace = join(temp, "kiro-override-workspace");
const kiroOverride = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--workspace", kiroOverrideWorkspace, "--runtime", "kiro", "--kiro-bin", fakeKiro, "--kiro-model", "custom-model", "--kiro-trust-tools", "fs_read", "--grader", "none"]);
assert.equal(kiroOverride.code, 0, kiroOverride.stderr);
assert.match(await readFile(kiroLog, "utf8"), /--model custom-model/);

const benchAgentFile = join(temp, "bench-agent.json");
await writeFile(benchAgentFile, JSON.stringify({ name: "bench-agent", mcpServers: {}, tools: ["*"], resources: [], includeMcpJson: false }, null, 2));
const cleanHomeWorkspace = join(temp, "kiro-clean-home-workspace");
const cleanHomeRun = await run("node", [
  "scripts/evaluate-skills.ts", "--skill", skill, "--workspace", cleanHomeWorkspace, "--runtime", "kiro",
  "--kiro-bin", fakeKiro, "--kiro-agent-file", benchAgentFile, "--kiro-trust-all-tools", "--grader", "none"
]);
assert.equal(cleanHomeRun.code, 0, cleanHomeRun.stderr);
const isolatedHome = join(cleanHomeWorkspace, "iteration-1", "eval-one", "with_skill", "kiro-home");
assert.deepEqual(await readdir(join(isolatedHome, ".kiro")), ["agents", "settings"]);
assert.deepEqual(await readdir(join(isolatedHome, ".kiro", "agents")), ["bench-agent.json"]);
await assert.rejects(readdir(join(isolatedHome, ".kiro", "skills")));
await assert.rejects(readdir(join(isolatedHome, ".kiro", "steering")));
await assert.rejects(readFile(join(isolatedHome, ".kiro", "settings", "mcp.json")));
const cleanHomeLog = (await readFile(kiroLog, "utf8")).split("\n").filter((line) => line.includes("--agent bench-agent"));
assert.equal(cleanHomeLog.length, 2, cleanHomeLog.join("\n"));
assert.ok(cleanHomeLog.some((line) => line.includes(`HOME=${isolatedHome}`)), cleanHomeLog.join("\n"));
assert.ok(cleanHomeLog.every((line) => /HOME=\S+\/kiro-home /.test(line)), cleanHomeLog.join("\n"));
assert.equal(new Set(cleanHomeLog.map((line) => /HOME=(\S+)/.exec(line)[1])).size, 2, "each variant needs its own isolated HOME");


assert.match(await readFile(kiroLog, "utf8"), /runtime-skill\/SKILL\.md/);

process.env.FAKE_KIRO_EXIT_1 = "1";
const exitOneKiroWorkspace = join(temp, "exit-one-kiro-workspace");
const exitOneKiroGrade = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--workspace", exitOneKiroWorkspace, "--runtime", "kiro", "--kiro-bin", fakeKiro, "--kiro-trust-tools", "fs_read"]);
assert.equal(exitOneKiroGrade.code, 0, exitOneKiroGrade.stderr);
const exitOneKiroEvaluation = JSON.parse(await readFile(join(exitOneKiroWorkspace, "iteration-1", "evaluation.json"), "utf8"));
const exitOneKiroResult = exitOneKiroEvaluation.results.find((result) => result.variant === "with_skill");
assert.equal(exitOneKiroResult.grading[0].score, 9);
assert.equal(exitOneKiroResult.grader_timing.process_code, 1);
assert.equal(exitOneKiroResult.grader_timing.timed_out, false);
assert.match(await readFile(join(exitOneKiroWorkspace, "iteration-1", "eval-one", "with_skill", "grader-stderr.log"), "utf8"), /grader exited after writing response/);
delete process.env.FAKE_KIRO_EXIT_1;

await writeFile(join(skill, "evals", "evals.json"), JSON.stringify({
  skill_name: "sample-skill",
  evals: [{
    id: "large-kiro-output",
    prompt: "Produce a large result.",
    expected_output: "A large result.",
    assertions: [{
      criterion: "The result is present.",
      threshold: 8,
      rubric: { "0": "The result is absent.", "8": "The result is present.", "10": "The result is present with evidence." }
    }]
  }]
}, null, 2));
const largeKiroWorkspace = join(temp, "large-kiro-workspace");
const largeKiroEval = await run("node", [
  "scripts/evaluate-skills.ts", "--skill", skill, "--workspace", largeKiroWorkspace, "--runtime", "kiro",
  "--kiro-bin", fakeKiro, "--kiro-trust-tools", "fs_read"
]);
assert.equal(largeKiroEval.code, 0, largeKiroEval.stderr);
const largeKiroEvaluation = JSON.parse(await readFile(join(largeKiroWorkspace, "iteration-1", "evaluation.json"), "utf8"));
const largeKiroResult = largeKiroEvaluation.results.find((result) => result.variant === "with_skill");
assert.equal(largeKiroResult.grading[0].score, 9);
const largeKiroOutput = await readFile(join(largeKiroWorkspace, "iteration-1", "eval-large-kiro-output", "with_skill", "outputs", "stdout.log"), "utf8");
assert.equal(largeKiroOutput.length, 327_680);
const graderContext = await readFile(join(largeKiroWorkspace, "iteration-1", "eval-large-kiro-output", "with_skill", "grader-output", "grader-prompt.md"), "utf8");
assert.ok(graderContext.length > 300_000);
assert.match(graderContext, /Candidate output follows:/);
const largeGraderLog = (await readFile(kiroLog, "utf8")).split("\n").find((line) => line.includes("grader_context=") && line.includes("large-kiro-workspace"));
assert.ok(largeGraderLog, "expected a Kiro grader invocation");
assert.ok(Number(/argv_bytes=(\d+)/.exec(largeGraderLog)?.[1]) < 10_000, largeGraderLog);
process.env.FAKE_KIRO_INVALID_GRADE = "1";
const invalidKiroWorkspace = join(temp, "invalid-kiro-workspace");
const invalidKiroGrade = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--workspace", invalidKiroWorkspace, "--runtime", "kiro", "--kiro-bin", fakeKiro, "--kiro-trust-tools", "fs_read"]);
assert.equal(invalidKiroGrade.code, 1, invalidKiroGrade.stderr);
const invalidKiroEvaluation = JSON.parse(await readFile(join(invalidKiroWorkspace, "iteration-1", "evaluation.json"), "utf8"));
assert.equal(invalidKiroEvaluation.results.find((result) => result.variant === "with_skill").grading[0].passed, false);
delete process.env.FAKE_KIRO_INVALID_GRADE;

process.env.FAKE_KIRO_MISSING_GRADE = "1";
const missingKiroGradeWorkspace = join(temp, "missing-kiro-grade-workspace");
const missingKiroGrade = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--workspace", missingKiroGradeWorkspace, "--runtime", "kiro", "--kiro-bin", fakeKiro, "--kiro-trust-tools", "fs_read"]);
assert.equal(missingKiroGrade.code, 1, missingKiroGrade.stderr);
const missingKiroEvaluation = JSON.parse(await readFile(join(missingKiroGradeWorkspace, "iteration-1", "evaluation.json"), "utf8"));
assert.equal(missingKiroEvaluation.results.find((result) => result.variant === "with_skill").grading[0].passed, false);
delete process.env.FAKE_KIRO_MISSING_GRADE;

const kiroBenchmarkWorkspace = join(temp, "kiro-benchmark-workspace");
const kiroBenchmarkRun = await run("node", [
  "scripts/benchmark-skills.ts", "--participant", skill, "--participant", previous, "--evals", externalEvals,
  "--workspace", kiroBenchmarkWorkspace, "--runtime", "kiro", "--kiro-bin", fakeKiro,
  "--kiro-trust-all-tools", "--grader", "none"
]);
assert.equal(kiroBenchmarkRun.code, 0, kiroBenchmarkRun.stderr);
const kiroBenchmark = JSON.parse(await readFile(join(kiroBenchmarkWorkspace, "iteration-1", "benchmark.json"), "utf8"));
assert.equal(kiroBenchmark.results[0].runtime, "kiro");
assert.equal(kiroBenchmark.summary["participant-sample-skill-1"].task_token_usage.total_tokens, null);
assert.match(await readFile(kiroLog, "utf8"), /chat --no-interactive --wrap never --model claude-sonnet-5 --trust-all-tools/);

const missingKiroTrust = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--runtime", "kiro", "--kiro-bin", fakeKiro]);
assert.equal(missingKiroTrust.code, 2);
assert.match(missingKiroTrust.stderr, /requires --kiro-trust-tools or --kiro-trust-all-tools/);
const conflictingKiroTrust = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--runtime", "kiro", "--kiro-bin", fakeKiro, "--kiro-trust-tools", "fs_read", "--kiro-trust-all-tools"]);
assert.equal(conflictingKiroTrust.code, 2);
assert.match(conflictingKiroTrust.stderr, /Use exactly one/);

const totvsStyleSkill = join(temp, "totvs-style-skill");
await mkdir(join(totvsStyleSkill, "scripts"), { recursive: true });
await writeFile(join(totvsStyleSkill, "SKILL.md"), "---\nname: totvs-style\ndescription: context fixture\n---\n");
await writeFile(join(totvsStyleSkill, "scripts", "collect-pr-context.sh"), "#!/bin/sh\n: \"${AI_OUTPUT_DIR:?}\"\n: \"${OPENCODE_CONFIG_DIR:?}\"\nmkdir -p \"$AI_OUTPUT_DIR/pr-context\"\nprintf '%s' \"$OPENCODE_CONFIG_DIR\" > \"$AI_OUTPUT_DIR/pr-context/context.txt\"\n");
await chmod(join(totvsStyleSkill, "scripts", "collect-pr-context.sh"), 0o755);
const totvsEnvWorkspace = join(temp, "totvs-env-workspace");
const totvsEnvRun = await run("node", ["scripts/evaluate-skills.ts", "--skill", totvsStyleSkill, "--evals", externalEvals, "--workspace", totvsEnvWorkspace, "--codex-bin", fakeCodex, "--grader", "none"]);
assert.equal(totvsEnvRun.code, 0, totvsEnvRun.stderr);
const totvsOutputs = join(totvsEnvWorkspace, "iteration-1", "eval-external", "with_skill", "outputs");
const contextScript = join(totvsEnvWorkspace, "iteration-1", "eval-external", "with_skill", "runtime-skill", "scripts", "collect-pr-context.sh");
assert.equal((await readFile(join(totvsOutputs, "pr-context", "context.txt"), "utf8")), join(totvsEnvWorkspace, "iteration-1", "eval-external", "with_skill", "runtime-skill"));
assert.match(await readFile(codexLog, "utf8"), new RegExp(`AI_OUTPUT_DIR=${totvsOutputs} OPENCODE_CONFIG_DIR=${contextScript.replace(/\/scripts\/collect-pr-context\.sh$/, "")}`));

const fakeSarifCodex = join(temp, "fake-sarif-codex.sh");
await writeFile(fakeSarifCodex, `#!/bin/sh
output=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --output-last-message) output="$2"; shift 2 ;;
    *) shift ;;
  esac
done
mkdir -p "$(dirname "$output")"
printf '%s' 'sarif-result' > "$output"
case "$(cat marker.txt)" in
  tolerant) results='[{"ruleId":"CUSTOM-RULE","level":"error","message":{"text":"equivalent finding"},"locations":[{"physicalLocation":{"artifactLocation":{"uri":"src/example.js"},"region":{"startLine":8}}}]}]' ;;
  wrong-level) results='[{"ruleId":"CUSTOM-RULE","level":"warning","message":{"text":"wrong level"},"locations":[{"physicalLocation":{"artifactLocation":{"uri":"src/example.js"},"region":{"startLine":8}}}]}]' ;;
  wrong-path) results='[{"ruleId":"CUSTOM-RULE","level":"error","message":{"text":"wrong path"},"locations":[{"physicalLocation":{"artifactLocation":{"uri":"src/other.js"},"region":{"startLine":8}}}]}]' ;;
  extra) results='[{"ruleId":"CUSTOM-RULE","level":"error","message":{"text":"equivalent finding"},"locations":[{"physicalLocation":{"artifactLocation":{"uri":"src/example.js"},"region":{"startLine":8}}}]},{"ruleId":"EXTRA-RULE","level":"error","message":{"text":"extra finding"},"locations":[{"physicalLocation":{"artifactLocation":{"uri":"src/example.js"},"region":{"startLine":20}}}]}]' ;;
  gated-pass|gated-recall) results='[{"ruleId":"CUSTOM-RULE","level":"error","message":{"text":"equivalent finding"},"locations":[{"physicalLocation":{"artifactLocation":{"uri":"src/example.js"},"region":{"startLine":7}}}]}]' ;;
  gated-level) results='[{"ruleId":"CUSTOM-RULE","level":"error","message":{"text":"equivalent finding"},"locations":[{"physicalLocation":{"artifactLocation":{"uri":"src/example.js"},"region":{"startLine":7}}}]},{"ruleId":"CUSTOM-RULE","level":"warning","message":{"text":"equivalent finding"},"locations":[{"physicalLocation":{"artifactLocation":{"uri":"src/example.js"},"region":{"startLine":9}}}]}]' ;;
  gated-fp) results='[{"ruleId":"CUSTOM-RULE","level":"error","message":{"text":"equivalent finding"},"locations":[{"physicalLocation":{"artifactLocation":{"uri":"src/example.js"},"region":{"startLine":7}}}]},{"ruleId":"EXTRA-RULE","level":"error","message":{"text":"extra finding"},"locations":[{"physicalLocation":{"artifactLocation":{"uri":"src/example.js"},"region":{"startLine":20}}}]}]' ;;
esac
printf '{"version":"2.1.0","runs":[{"results":%s}]}' "$results" > "$(dirname "$output")/review.sarif"
`);
await chmod(fakeSarifCodex, 0o755);

async function runSarifCase(id, marker, { findings = [{ path: "src/example.js", line: 7, rule_id: "EXPECTED-RULE", level: "error" }], gates = null } = {}) {
  const suite = join(temp, `${id}-suite`);
  const fixture = join(temp, `${id}-fixture`);
  await mkdir(join(fixture, "src"), { recursive: true });
  await writeFile(join(fixture, "marker.txt"), marker);
  await writeFile(join(fixture, "src", "example.js"), "export const example = true;\n");
  const archive = join(suite, "fixture.zip");
  await mkdir(suite, { recursive: true });
  const zipped = await run("zip", ["-q", "-r", archive, "."], fixture);
  assert.equal(zipped.code, 0, zipped.stderr);
  await writeFile(join(suite, "ground-truth.json"), JSON.stringify({ findings }));
  await writeFile(join(suite, "evals.json"), JSON.stringify({
    skill_name: id,
    evals: [{ id, prompt: "Produce SARIF.", expected_output: "sarif-result", workspace_zip: "fixture.zip", sarif: { artifact: "review.sarif", ground_truth: "ground-truth.json", ...(gates ? { gates } : {}) } }]
  }));
  const evidence = join(temp, `${id}-evidence`);
  const result = await run("node", ["scripts/evaluate-skills.ts", "--skill", workspaceSkill, "--evals", join(suite, "evals.json"), "--workspace", evidence, "--codex-bin", fakeSarifCodex, "--grader", "none"]);
  const evaluation = JSON.parse(await readFile(join(evidence, "iteration-1", "evaluation.json"), "utf8"));
  return { result, sarif: evaluation.results.find((entry) => entry.variant === "with_skill").sarif };
}

const tolerantSarif = await runSarifCase("sarif-tolerant", "tolerant");
assert.equal(tolerantSarif.result.code, 0, tolerantSarif.result.stderr);
assert.equal(tolerantSarif.sarif.passed, true);
assert.equal(tolerantSarif.sarif.line_tolerance, 1);
assert.equal(tolerantSarif.sarif.matched_count, 1);
assert.deepEqual(tolerantSarif.sarif.matches[0], {
  expected: { path: "src/example.js", line: 7, rule_id: "EXPECTED-RULE", level: "error" },
  actual: { path: "src/example.js", line: 8, rule_id: "CUSTOM-RULE", level: "error" }
});
for (const marker of ["wrong-level", "wrong-path", "extra"]) {
  const sarifCase = await runSarifCase(`sarif-${marker}`, marker);
  assert.equal(sarifCase.result.code, 1, sarifCase.result.stderr);
  assert.equal(sarifCase.sarif.passed, false);
  assert.equal(sarifCase.sarif.unmatched_expected_count, marker === "extra" ? 0 : 1);
  assert.equal(sarifCase.sarif.unmatched_actual_count, 1);
}

const gateFindings = [
  { path: "src/example.js", line: 7, rule_id: "EXPECTED-ERROR", level: "error" },
  { path: "src/example.js", line: 9, rule_id: "EXPECTED-WARNING", level: "warning" }
];
const gatedPass = await runSarifCase("sarif-gated-pass", "gated-pass", { findings: gateFindings, gates: { min_recall: 0.5, min_recall_by_level: { error: 1 }, max_false_positives: 0 } });
assert.equal(gatedPass.result.code, 0, gatedPass.result.stderr);
assert.equal(gatedPass.sarif.passed, true);
assert.equal(gatedPass.sarif.unmatched_expected_count, 1);
assert.deepEqual(gatedPass.sarif.metrics, { recall: 0.5, recall_by_level: { error: 1, warning: 0, note: 1, none: 1 }, false_positives: 0 });
assert.deepEqual(gatedPass.sarif.gate_failures, []);

const gatedRecall = await runSarifCase("sarif-gated-recall", "gated-recall", { findings: gateFindings, gates: { min_recall: 0.75 } });
assert.equal(gatedRecall.result.code, 1, gatedRecall.result.stderr);
assert.match(gatedRecall.sarif.gate_failures.join(" "), /min_recall/);

const gatedLevel = await runSarifCase("sarif-gated-level", "gated-level", { findings: [...gateFindings, { path: "src/example.js", line: 8, rule_id: "EXPECTED-ERROR-2", level: "error" }], gates: { min_recall: 0.6, min_recall_by_level: { error: 0.8 } } });
assert.equal(gatedLevel.result.code, 1, gatedLevel.result.stderr);
assert.match(gatedLevel.sarif.gate_failures.join(" "), /min_recall_by_level.error/);

const gatedFalsePositive = await runSarifCase("sarif-gated-fp", "gated-fp", { gates: { max_false_positives: 0 } });
assert.equal(gatedFalsePositive.result.code, 1, gatedFalsePositive.result.stderr);
assert.match(gatedFalsePositive.sarif.gate_failures.join(" "), /max_false_positives/);

console.log("evaluate-skills checks passed");
