#!/usr/bin/env node
/** Offline integration test for the runtime boundary and Codex JSONL accounting. */

import assert from "node:assert/strict";
import { chmod, mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;
const { codexPersistedSessions, collaborationFromJsonl, collaborationRequirementGrade, runtimeConcurrency, scoreSarifSemanticMatches, semanticRetryContext } = await import(new URL("../scripts/evaluate-skills.ts", import.meta.url));
assert.equal(runtimeConcurrency({ runtime: "kiro", concurrency: 3 }), 1);
assert.equal(runtimeConcurrency({ runtime: "codex", concurrency: 3 }), 3);
const collaborationTrace = [
  { type: "item.started", item: { id: "spawn-ok", type: "collab_tool_call", tool: "spawn_agent", status: "in_progress" } },
  { type: "item.completed", item: { id: "spawn-ok", type: "collab_tool_call", tool: "spawn_agent", sender_thread_id: "root", status: "completed", receiver_thread_ids: ["child"], prompt: "ROLE: change_mapper", agents_states: { child: { status: "pending_init" } } } },
  { type: "item.completed", item: { id: "spawn-ok", type: "collab_tool_call", tool: "spawn_agent", sender_thread_id: "root", status: "completed", receiver_thread_ids: ["child"], prompt: "ROLE: change_mapper", agents_states: { child: { status: "pending_init" } } } },
  { type: "item.completed", item: { id: "spawn-failed", type: "collab_tool_call", tool: "spawn_agent", sender_thread_id: "root", status: "failed", receiver_thread_ids: [], agents_states: {} } },
  { type: "item.completed", item: { id: "wait-empty", type: "collab_tool_call", tool: "wait", sender_thread_id: "root", status: "completed", receiver_thread_ids: [], agents_states: {} } },
  { type: "item.completed", item: { id: "wait-done", type: "collab_tool_call", tool: "wait", sender_thread_id: "root", status: "completed", receiver_thread_ids: ["child"], agents_states: { child: { status: "completed", message: "done" } } } },
  { type: "item.completed", item: { id: "close", type: "collab_tool_call", tool: "close_agent", sender_thread_id: "root", status: "completed", receiver_thread_ids: ["child"], agents_states: { child: { status: "running" } } } }
].map(JSON.stringify).join("\n");
assert.deepEqual(collaborationFromJsonl(`status text\n${collaborationTrace}\n{invalid`), {
  spawn_attempts: 2,
  successful_spawn_calls: 1,
  failed_spawn_calls: 1,
  anomalous_spawn_calls: 0,
  nested_spawn_calls: 0,
  spawned_agents: 1,
  completed_agents: 1,
  unfinished_agents: 0,
  failed_agents: 0,
  wait_calls: 2,
  empty_wait_calls: 1,
  send_input_calls: 0,
  close_agent_calls: 1,
  role_prompts: { change_mapper: true, risk_verifier: false }
});
assert.deepEqual(
  collaborationFromJsonl(
    '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":1}}',
    "ERROR collab spawn failed: no thread with id: root\nERROR collab spawn failed: no thread with id: root\n"
  ),
  {
    spawn_attempts: 2,
    successful_spawn_calls: 0,
    failed_spawn_calls: 2,
    anomalous_spawn_calls: 0,
    nested_spawn_calls: 0,
    spawned_agents: 0,
    completed_agents: 0,
    unfinished_agents: 0,
    failed_agents: 0,
    wait_calls: 0,
    empty_wait_calls: 0,
    send_input_calls: 0,
    close_agent_calls: 0,
    role_prompts: { change_mapper: false, risk_verifier: false }
  }
);
assert.equal(
  collaborationFromJsonl(
    JSON.stringify({ type: "item.completed", item: { id: "failed", type: "collab_tool_call", tool: "spawn_agent", status: "failed" } }),
    "ERROR collab spawn failed: no thread with id: root\n"
  ).spawn_attempts,
  1
);
assert.deepEqual(
  collaborationFromJsonl("", "", [
    { thread_id: "root", parent_thread_id: null, agent_path: null, completed: true, status: "completed" },
    { thread_id: "mapper", parent_thread_id: "root", agent_path: "/root/change_mapper", completed: true, status: "completed" },
    { thread_id: "verifier", parent_thread_id: "root", agent_path: "/root/risk_verifier", completed: true, status: "completed" }
  ]),
  {
    spawn_attempts: 2,
    successful_spawn_calls: 2,
    failed_spawn_calls: 0,
    anomalous_spawn_calls: 0,
    nested_spawn_calls: 0,
    spawned_agents: 2,
    completed_agents: 2,
    unfinished_agents: 0,
    failed_agents: 0,
    wait_calls: 0,
    empty_wait_calls: 0,
    send_input_calls: 0,
    close_agent_calls: 0,
    role_prompts: { change_mapper: true, risk_verifier: true }
  }
);
assert.equal(collaborationRequirementGrade({}, {}, true), null);
assert.equal(collaborationRequirementGrade({ collaboration: { require_spawn_attempt_when_enabled: true } }, {}, false), null);
assert.deepEqual(
  collaborationRequirementGrade(
    { collaboration: { require_spawn_attempt_when_enabled: true } },
    { collaboration: { spawn_attempts: 0 } },
    true
  ),
  {
    criterion: "Required collaboration attempt",
    threshold: 10,
    score: 0,
    passed: false,
    evidence: "Collaboration gate failed: runtime multi-agent support was enabled and this eval required a spawn attempt, but the candidate made 0."
  }
);
assert.equal(
  collaborationRequirementGrade(
    { collaboration: { require_spawn_attempt_when_enabled: true } },
    { collaboration: { spawn_attempts: 2, successful_spawn_calls: 1, completed_agents: 1 } },
    true
  ).passed,
  true
);

const semanticContext = {
  artifact: "review.sarif",
  lineTolerance: 1,
  gates: null,
  expected: [{ expected_id: "expected-1", path: "src/example.js", line: 7, rule_id: "EXPECTED", level: "error" }],
  actual: [{ path: "src/example.js", line: 8, rule_id: "CUSTOM", level: "warning", message: "same defect and consequence" }]
};
assert.deepEqual(semanticRetryContext(semanticContext, [])?.actual.map(({ actual_index }) => actual_index), [0]);
assert.equal(semanticRetryContext(semanticContext, [{ expected_id: "expected-1", actual_index: 0, evidence: "same root cause" }]), null);
assert.equal(semanticRetryContext({ ...semanticContext, actual: [] }, []), null);
assert.equal(scoreSarifSemanticMatches({
  ...semanticContext,
  expected: [{ ...semanticContext.expected[0], line: 6, acceptable_lines: [6, 18] }],
  actual: [{ ...semanticContext.actual[0], line: 18, level: "error" }]
}, [{ expected_id: "expected-1", actual_index: 0, evidence: "same root cause" }]).metrics.strict_recall, 1);
const partialRetry = semanticRetryContext({
  ...semanticContext,
  expected: [...semanticContext.expected, { ...semanticContext.expected[0], expected_id: "expected-2" }],
  actual: [...semanticContext.actual, { ...semanticContext.actual[0], message: "second defect" }]
}, [{ expected_id: "expected-1", actual_index: 0, evidence: "same root cause" }]);
assert.deepEqual(partialRetry.expected.map(({ expected_id }) => expected_id), ["expected-2"]);
assert.deepEqual(partialRetry.actual.map(({ actual_index }) => actual_index), [1]);
const adjacentSeverity = scoreSarifSemanticMatches(semanticContext, [{ expected_id: "expected-1", actual_index: 0, evidence: "same mechanism and consequence" }]);
assert.equal(adjacentSeverity.metrics.root_cause_recall, 1);
assert.equal(adjacentSeverity.metrics.strict_recall, 1);
assert.equal(adjacentSeverity.metrics.exact_severity_rate, 0);
assert.equal(adjacentSeverity.passed, true);
const wrongLocation = scoreSarifSemanticMatches({ ...semanticContext, actual: [{ ...semanticContext.actual[0], path: "src/other.js" }] }, [{ expected_id: "expected-1", actual_index: 0, evidence: "same mechanism and consequence" }]);
assert.equal(wrongLocation.metrics.root_cause_recall, 1);
assert.equal(wrongLocation.metrics.strict_recall, 0);
assert.equal(wrongLocation.metrics.false_positives, 0);
const differentRootCause = scoreSarifSemanticMatches(semanticContext, []);
assert.equal(differentRootCause.metrics.root_cause_recall, 0);
assert.equal(differentRootCause.metrics.strict_recall, 0);
assert.equal(differentRootCause.metrics.false_positives, 1);
const duplicateSemanticPair = scoreSarifSemanticMatches(semanticContext, [
  { expected_id: "expected-1", actual_index: 0, evidence: "first" },
  { expected_id: "expected-1", actual_index: 0, evidence: "duplicate" }
]);
assert.equal(duplicateSemanticPair.semantic_matching_error, undefined);
assert.match(duplicateSemanticPair.semantic_matching_warnings[0], /discarded 2 conflicting/);
assert.equal(duplicateSemanticPair.metrics.root_cause_recall, 0);
assert.equal(duplicateSemanticPair.metrics.false_positives, 1);
assert.equal(duplicateSemanticPair.passed, false);

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
const sessionHome = join(temp, "session-home");
await mkdir(join(sessionHome, "sessions", "2026", "08", "09"), { recursive: true });
await writeFile(join(sessionHome, "sessions", "2026", "08", "09", "child.jsonl"), [
  JSON.stringify({ type: "session_meta", payload: { id: "child", source: { subagent: { thread_spawn: { parent_thread_id: "root", agent_path: "/root/change_mapper" } } } } }),
  JSON.stringify({ type: "session_meta", payload: { id: "root", source: "exec" } }),
  JSON.stringify({ type: "event_msg", payload: { type: "task_complete" } })
].join("\n"));
assert.deepEqual(await codexPersistedSessions(sessionHome), [{
  thread_id: "child",
  parent_thread_id: "root",
  agent_path: "/root/change_mapper",
  completed: true,
  status: "completed"
}]);
const skill = join(temp, "sample-skill");
const previous = join(temp, "sample-skill-previous");
const conversationSkill = join(temp, "conversation-skill");
const fakeCodex = join(temp, "fake-codex.sh");
const fakeKiro = join(temp, "fake-kiro.sh");
const fakeCodebaseMemoryCli = join(temp, "fake-codebase-memory-mcp");
const fakeAstGrepCli = join(temp, "fake-ast-grep");
const kiroLog = join(temp, "fake-kiro.log");
const codexLog = join(temp, "fake-codex.log");
const workspace = join(temp, "workspace");
await mkdir(join(skill, "evals"), { recursive: true });
await mkdir(join(skill, "references"), { recursive: true });
await mkdir(previous, { recursive: true });
await mkdir(join(conversationSkill, "evals"), { recursive: true });
await writeFile(join(temp, "runtime-profile.json"), JSON.stringify({ version: 1, name: "test-local-v1", fixture_instructions: "allow-and-fingerprint", candidate: { filesystem: "workspace-write", mcp: "disabled", network: "disabled" }, grader: { filesystem: "read-only", mcp: "disabled", network: "disabled" } }, null, 2));
await writeFile(join(skill, "SKILL.md"), "---\nname: sample-skill\ndescription: Test fixture skill for the evaluation harness.\n---\n");
await writeFile(join(skill, "references", "codex-subagents.md"), "# Test collaboration capability\n");
await writeFile(join(previous, "SKILL.md"), "---\nname: sample-skill\ndescription: Previous fixture skill for the evaluation harness.\n---\n");
await writeFile(join(conversationSkill, "SKILL.md"), "---\nname: conversation-skill\ndescription: Conversation fixture skill for the evaluation harness.\n---\n");
await writeFile(join(skill, "evals", "evals.json"), JSON.stringify({
  skill_name: "sample-skill",
  runtime_profile: "../../runtime-profile.json",
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
case "$all_args" in
  *"mcp_servers.codebase_memory.command"*"mcp list --json"*)
    printf '[{"name":"codebase_memory","enabled":true,"transport":{"type":"stdio","command":"%s","args":[]}}]' "$FAKE_MCP_BIN"
    exit 0 ;;
esac
if [ "$1" = "mcp" ] && [ "$2" = "list" ]; then
  printf 'HOME=%s CODEX_HOME=%s mcp_preflight\n' "\${HOME:-}" "\${CODEX_HOME:-}" >> "$FAKE_CODEX_LOG"
  printf '%s' '[{"name":"configured_but_disabled","enabled":false}]'
  exit 0
fi
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
elif [ -n "$schema" ] && grep -q '"sarif_matches"' "$schema"; then
  printf '%s' '{"results":[],"sarif_matches":[{"expected_id":"expected-1","actual_index":0,"evidence":"same fixture defect and consequence"}]}' > "$output"
  printf '%s\\n' 'status text' '{"type":"turn.completed","usage":{"input_tokens":20,"cached_input_tokens":4,"cache_write_input_tokens":1,"output_tokens":5,"reasoning_output_tokens":2}}'
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
  case "$all_args" in
    *"--enable multi_agent"*) printf '%s\n' \
      '{"type":"item.completed","item":{"id":"spawn-1","type":"collab_tool_call","tool":"spawn_agent","status":"completed","receiver_thread_ids":["scout-1"],"prompt":"Role: change_mapper, read-only change mapper","agents_states":{"scout-1":{"status":"pending"}}}}' \
      '{"type":"item.completed","item":{"id":"spawn-2","type":"collab_tool_call","tool":"spawn_agent","status":"completed","receiver_thread_ids":["explorer-1"],"prompt":"Role: risk_verifier, read-only risk verifier","agents_states":{"explorer-1":{"status":"pending"}}}}' \
      '{"type":"item.completed","item":{"id":"wait-1","type":"collab_tool_call","tool":"wait","status":"completed","receiver_thread_ids":["scout-1","explorer-1"],"agents_states":{"scout-1":{"status":"completed"},"explorer-1":{"status":"completed"}}}}' ;;
  esac
  printf '%s\n' 'status text' \
    '{"type":"turn.completed","id":"task-one","usage":{"input_tokens":100,"cached_input_tokens":40,"cache_write_input_tokens":3,"output_tokens":15,"reasoning_output_tokens":7}}' \
    '{"type":"turn.completed","id":"task-two","usage":{"input_tokens":10,"cached_input_tokens":4,"cache_write_input_tokens":1,"output_tokens":1,"reasoning_output_tokens":0}}'
fi
`);
await chmod(fakeCodex, 0o755);
await writeFile(fakeCodebaseMemoryCli, `#!/bin/sh
if [ "$1" = "--version" ]; then printf '%s\\n' 'codebase-memory-mcp 0.9.0'; exit 0; fi
exit 2
`);
await chmod(fakeCodebaseMemoryCli, 0o755);
await writeFile(fakeAstGrepCli, `#!/bin/sh
if [ "$1" = "--version" ]; then printf '%s\\n' 'ast-grep 0.45.1'; exit 0; fi
exit 2
`);
await chmod(fakeAstGrepCli, 0o755);
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
process.env.FAKE_MCP_BIN = join(temp, "fake-codebase-memory-mcp");

const first = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--workspace", workspace, "--codex-bin", fakeCodex, "--iteration", "1"]);
assert.equal(first.code, 0, first.stderr);
const benchmark = JSON.parse(await readFile(join(workspace, "iteration-1", "evaluation.json"), "utf8"));
assert.equal(benchmark.summary.with_skill.passed, 1);
assert.equal(benchmark.runtime_profile.name, "test-local-v1");
assert.deepEqual(benchmark.execution, {
  runtime: "codex",
  model: null,
  timeout_ms: 300000,
  requested_concurrency: 1,
  effective_concurrency: 1,
  jobs: 2,
  eval_ids: ["one"],
  repetitions: { one: 1 }
});
assert.match(await readFile(join(workspace, "iteration-1", "report.md"), "utf8"), /Execution: codex; model CLI default; timeout 300000 ms; concurrency 1\/1; jobs 2/);
assert.equal(benchmark.results[0].runtime_environment.model.provenance, "cli_default_unattested");
assert.equal(benchmark.results[0].runtime_environment.candidate.mcp, "disabled");
assert.equal(benchmark.results.find((result) => result.variant === "without_skill").runtime_environment.candidate.multi_agent, "disabled");
assert.equal(benchmark.results.find((result) => result.variant === "without_skill").collaboration.spawned_agents, 0);
const withSkillResult = benchmark.results.find((result) => result.variant === "with_skill");
assert.equal(withSkillResult.runtime_environment.candidate.multi_agent, "enabled");
assert.deepEqual(withSkillResult.collaboration, {
  spawn_attempts: 2,
  successful_spawn_calls: 2,
  failed_spawn_calls: 0,
  anomalous_spawn_calls: 0,
  nested_spawn_calls: 0,
  spawned_agents: 2,
  completed_agents: 2,
  unfinished_agents: 0,
  failed_agents: 0,
  wait_calls: 1,
  empty_wait_calls: 0,
  send_input_calls: 0,
  close_agent_calls: 0,
  role_prompts: { change_mapper: true, risk_verifier: true }
});
const isolatedCodexLog = await readFile(codexLog, "utf8");
assert.match(isolatedCodexLog, /HOME=(\S+\/codex-home) CODEX_HOME=\1 mcp_preflight/);
assert.match(isolatedCodexLog, /exec --json[^\n]*--enable multi_agent/);
assert.doesNotMatch(isolatedCodexLog.split("\n").find((line) => line.includes("--enable multi_agent")), /--ephemeral/);
assert.equal(isolatedCodexLog.split("\n").filter((line) => line.includes("--enable multi_agent")).length, 1);
assert.match(await readFile(join(workspace, "iteration-1", "eval-one", "with_skill", "outputs", "runtime-events.jsonl"), "utf8"), /subprocess_finished/);
assert.equal(benchmark.standardized_output.schema_version, 1);
assert.equal(benchmark.standardized_output.variant_results.with_skill.status, "passed");
assert.equal(benchmark.standardized_output.comparison.baseline_variant, "without_skill");
assert.equal(benchmark.standardized_output.variant_results.with_skill.artifacts[0].candidate_output, "eval-one/with_skill/outputs/last-message.md");
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

const mcpWorkspace = join(temp, "mcp-workspace");
const mcpRun = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--variants", "with_skill", "--workspace", mcpWorkspace, "--codex-bin", fakeCodex, "--candidate-mcp", "codebase-memory", "--candidate-mcp-bin", process.env.FAKE_MCP_BIN]);
assert.equal(mcpRun.code, 0, mcpRun.stderr);
const mcpEvaluation = JSON.parse(await readFile(join(mcpWorkspace, "iteration-1", "evaluation.json"), "utf8"));
assert.equal(mcpEvaluation.results[0].runtime_environment.candidate.mcp, "codebase-memory");
assert.match(await readFile(codexLog, "utf8"), /mcp_servers\.codebase_memory\.required=true/);
const cliWorkspace = join(temp, "cli-workspace");
const cliRun = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--variants", "with_skill", "--workspace", cliWorkspace, "--codex-bin", fakeCodex, "--candidate-codebase-memory-cli", fakeCodebaseMemoryCli]);
assert.equal(cliRun.code, 0, cliRun.stderr);
const cliEvaluation = JSON.parse(await readFile(join(cliWorkspace, "iteration-1", "evaluation.json"), "utf8"));
assert.deepEqual(cliEvaluation.results[0].runtime_environment.candidate.codebase_memory_cli, {
  mode: "enabled",
  path: fakeCodebaseMemoryCli,
  version: "codebase-memory-mcp 0.9.0"
});
const astGrepWorkspace = join(temp, "ast-grep-workspace");
const astGrepRun = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--variants", "with_skill", "--workspace", astGrepWorkspace, "--codex-bin", fakeCodex, "--candidate-ast-grep-cli", fakeAstGrepCli]);
assert.equal(astGrepRun.code, 0, astGrepRun.stderr);
const astGrepEvaluation = JSON.parse(await readFile(join(astGrepWorkspace, "iteration-1", "evaluation.json"), "utf8"));
assert.deepEqual(astGrepEvaluation.results[0].runtime_environment.candidate.ast_grep_cli, {
  mode: "enabled",
  path: fakeAstGrepCli,
  version: "ast-grep 0.45.1"
});
const taskTiming = JSON.parse(await readFile(join(workspace, "iteration-1", "eval-one", "with_skill", "outputs", "timing.json"), "utf8"));
assert.equal(taskTiming.total_tokens, 126);
assert.equal(taskTiming.token_usage_scope, "unique_terminal_events");

const second = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--previous", previous, "--workspace", workspace, "--codex-bin", fakeCodex, "--iteration", "2"]);
assert.equal(second.code, 0, second.stderr);
const previousBenchmark = JSON.parse(await readFile(join(workspace, "iteration-2", "evaluation.json"), "utf8"));
assert.deepEqual(previousBenchmark.variants, ["without_skill", "old_skill", "with_skill"]);

const selected = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--variants", "with_skill", "--workspace", workspace, "--codex-bin", fakeCodex, "--model", "gpt-5.6-luna", "--iteration", "7"]);
assert.equal(selected.code, 0, selected.stderr);
assert.match(await readFile(codexLog, "utf8"), /agents\.default_subagent_model=\\?"gpt-5\.6-luna\\?"/);
const selectedBenchmark = JSON.parse(await readFile(join(workspace, "iteration-7", "evaluation.json"), "utf8"));
assert.deepEqual(selectedBenchmark.variants, ["with_skill"]);
assert.equal(selectedBenchmark.results.every((result) => result.variant === "with_skill"), true);
const unavailableVariant = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--variants", "old_skill", "--workspace", workspace, "--codex-bin", fakeCodex, "--iteration", "8"]);
assert.notEqual(unavailableVariant.code, 0);
const repeated = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--variants", "with_skill", "--workspace", workspace, "--codex-bin", fakeCodex, "--iteration", "9", "--repetitions", "2"]);
assert.equal(repeated.code, 0, repeated.stderr);
const repeatedBenchmark = JSON.parse(await readFile(join(workspace, "iteration-9", "evaluation.json"), "utf8"));
assert.equal(repeatedBenchmark.results.length, 2);
assert.equal(await readFile(join(workspace, "iteration-9", "eval-one", "repetition-2", "with_skill", "outputs", "last-message.md"), "utf8"), "result");

assert.equal(previousBenchmark.summary.old_skill.task_token_usage.total_tokens, 126);
assert.equal(previousBenchmark.summary.old_skill.passed, 0);
assert.equal(previousBenchmark.summary.with_skill.passed, 1);
assert.equal(previousBenchmark.results.find((result) => result.variant === "old_skill").grading[0].score, 4);

await writeFile(join(conversationSkill, "evals", "evals.json"), JSON.stringify({
  skill_name: "conversation-skill",
  runtime_profile: "../../runtime-profile.json",
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
const conversationManifest = JSON.parse(await readFile(join(conversationSkill, "evals", "evals.json"), "utf8"));
conversationManifest.runtime_profile = "../runtime-profile.json";
await writeFile(conversationSuite, JSON.stringify(conversationManifest, null, 2));
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
  runtime_profile: "runtime-profile.json",
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
await writeFile(join(workspaceSuite, "ground-truth.json"), JSON.stringify({ findings: [{ path: "src/example.js", line: 7, rule_id: "TEST-WORKSPACE", level: "error", title: "Workspace fixture defect", impact: "The fixture behavior is incorrect." }] }));
await writeFile(join(workspaceSuite, "evals.json"), JSON.stringify({
  skill_name: "workspace-suite",
  runtime_profile: "../runtime-profile.json",
  evals: [{ id: "workspace-sarif", prompt: "Inspect the workspace and produce SARIF.", expected_output: "workspace-result", workspace_zip: "fixtures/workspace.zip", sarif: { artifact: "review.sarif", ground_truth: "ground-truth.json" } }]
}, null, 2));
const workspaceRun = await run("node", ["scripts/evaluate-skills.ts", "--skill", workspaceSkill, "--evals", join(workspaceSuite, "evals.json"), "--workspace", join(temp, "workspace-sarif-evidence"), "--codex-bin", fakeCodex]);
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
assert.match(sarifPromptLog, /Runtime compatibility: Codex multi-agent tools are not enabled for this candidate run\. Use the skill's sequential workflow/);
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
assert.match(await readFile(kiroLog, "utf8"), /chat --no-interactive --wrap never --model claude-sonnet-5 --agent kiro-isolated --effort high --trust-tools=fs_read,fs_write/);
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
  runtime_profile: "../../runtime-profile.json",
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
assert.match(await readFile(kiroLog, "utf8"), /chat --no-interactive --wrap never --model claude-sonnet-5 --agent kiro-isolated --trust-all-tools/);

const missingKiroTrust = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--runtime", "kiro", "--kiro-bin", fakeKiro]);
assert.equal(missingKiroTrust.code, 2);
const conflictingKiroTrust = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--runtime", "kiro", "--kiro-bin", fakeKiro, "--kiro-trust-tools", "fs_read", "--kiro-trust-all-tools"]);
assert.equal(conflictingKiroTrust.code, 2);

const totvsStyleSkill = join(temp, "totvs-style-skill");
await mkdir(join(totvsStyleSkill, "scripts"), { recursive: true });
await writeFile(join(totvsStyleSkill, "SKILL.md"), "---\nname: totvs-style\ndescription: context fixture\n---\n");
await writeFile(join(totvsStyleSkill, "scripts", "collect-pr-context.sh"), "#!/bin/sh\n: \"${AI_OUTPUT_DIR:?}\"\n: \"${OPENCODE_CONFIG_DIR:?}\"\nmkdir -p \"$AI_OUTPUT_DIR/pr-context\"\nprintf '%s' \"$OPENCODE_CONFIG_DIR\" > \"$AI_OUTPUT_DIR/pr-context/context.txt\"\n");
await chmod(join(totvsStyleSkill, "scripts", "collect-pr-context.sh"), 0o755);
const totvsEnvWorkspace = join(temp, "totvs-env-workspace");
const totvsEnvRun = await run("node", ["scripts/evaluate-skills.ts", "--skill", totvsStyleSkill, "--evals", externalEvals, "--workspace", totvsEnvWorkspace, "--codex-bin", fakeCodex, "--grader", "none"]);
assert.equal(totvsEnvRun.code, 0, totvsEnvRun.stderr);
const totvsOutputs = join(totvsEnvWorkspace, "iteration-1", "eval-external", "with_skill", "outputs");
const totvsCandidateOutput = join(totvsEnvWorkspace, "iteration-1", "eval-external", "with_skill", ".agent-eval-output");
const contextScript = join(totvsEnvWorkspace, "iteration-1", "eval-external", "with_skill", "runtime-skill", "scripts", "collect-pr-context.sh");
assert.equal((await readFile(join(totvsOutputs, "pr-context", "context.txt"), "utf8")), join(totvsEnvWorkspace, "iteration-1", "eval-external", "with_skill", "runtime-skill"));
assert.match(await readFile(codexLog, "utf8"), new RegExp(`AI_OUTPUT_DIR=${totvsCandidateOutput} OPENCODE_CONFIG_DIR=${contextScript.replace(/\/scripts\/collect-pr-context\.sh$/, "")}`));

const fakeSarifCodex = join(temp, "fake-sarif-codex.sh");
await writeFile(fakeSarifCodex, `#!/bin/sh
output=""
schema=""
all_args="$*"
if [ "$1" = "mcp" ] && [ "$2" = "list" ]; then exit 0; fi
while [ "$#" -gt 0 ]; do
  case "$1" in
    --output-last-message) output="$2"; shift 2 ;;
    --output-schema) schema="$2"; shift 2 ;;
    *) shift ;;
  esac
done
mkdir -p "$(dirname "$output")"
if [ -n "$schema" ]; then
  case "$all_args" in
    *"wrong root cause"*) matches='[]' ;;
    *"equivalent finding"*"extra finding"*) matches='[{"expected_id":"expected-1","actual_index":0,"evidence":"same mechanism and consequence"}]' ;;
    *"Expected root causes:"*"expected-3"*) matches='[{"expected_id":"expected-1","actual_index":0,"evidence":"same first mechanism"},{"expected_id":"expected-2","actual_index":1,"evidence":"same second mechanism"}]' ;;
    *"Expected root causes:"*) matches='[{"expected_id":"expected-1","actual_index":0,"evidence":"same mechanism and consequence"}]' ;;
  esac
  printf '{"results":[],"sarif_matches":%s}' "$matches" > "$output"
  printf '%s\\n' '{"type":"turn.completed","usage":{"input_tokens":20,"output_tokens":5}}'
  exit 0
fi
printf '%s' 'sarif-result' > "$output"
case "$(cat marker.txt)" in
  tolerant) results='[{"ruleId":"CUSTOM-RULE","level":"error","message":{"text":"equivalent finding"},"locations":[{"physicalLocation":{"artifactLocation":{"uri":"src/example.js"},"region":{"startLine":8}}}]}]' ;;
  wrong-level) results='[{"ruleId":"CUSTOM-RULE","level":"warning","message":{"text":"wrong level"},"locations":[{"physicalLocation":{"artifactLocation":{"uri":"src/example.js"},"region":{"startLine":8}}}]}]' ;;
  wrong-path) results='[{"ruleId":"CUSTOM-RULE","level":"error","message":{"text":"wrong path"},"locations":[{"physicalLocation":{"artifactLocation":{"uri":"src/other.js"},"region":{"startLine":8}}}]}]' ;;
  wrong-root) results='[{"ruleId":"CUSTOM-RULE","level":"error","message":{"text":"wrong root cause"},"locations":[{"physicalLocation":{"artifactLocation":{"uri":"src/example.js"},"region":{"startLine":7}}}]}]' ;;
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
  const semanticFindings = findings.map((finding, index) => ({ title: `Expected defect ${index + 1}`, impact: `Expected consequence ${index + 1}`, ...finding }));
  await writeFile(join(suite, "ground-truth.json"), JSON.stringify({ findings: semanticFindings }));
  await writeFile(join(suite, "evals.json"), JSON.stringify({
    skill_name: id,
    runtime_profile: "../runtime-profile.json",
    evals: [{ id, prompt: "Produce SARIF.", expected_output: "sarif-result", workspace_zip: "fixture.zip", sarif: { artifact: "review.sarif", ground_truth: "ground-truth.json", ...(gates ? { gates } : {}) } }]
  }));
  const evidence = join(temp, `${id}-evidence`);
  const result = await run("node", ["scripts/evaluate-skills.ts", "--skill", workspaceSkill, "--evals", join(suite, "evals.json"), "--workspace", evidence, "--codex-bin", fakeSarifCodex]);
  const evaluation = JSON.parse(await readFile(join(evidence, "iteration-1", "evaluation.json"), "utf8"));
  return { result, sarif: evaluation.results.find((entry) => entry.variant === "with_skill").sarif };
}

const tolerantSarif = await runSarifCase("sarif-tolerant", "tolerant");
assert.equal(tolerantSarif.result.code, 0, tolerantSarif.result.stderr);
assert.equal(tolerantSarif.sarif.passed, true);
assert.equal(tolerantSarif.sarif.line_tolerance, 1);
assert.equal(tolerantSarif.sarif.matched_count, 1);
assert.equal(tolerantSarif.sarif.matches[0].root_cause_match, true);
assert.equal(tolerantSarif.sarif.matches[0].strict_match, true);
assert.equal(tolerantSarif.sarif.matches[0].expected.path, "src/example.js");
assert.equal(tolerantSarif.sarif.matches[0].actual.message, "equivalent finding");

const wrongLevelSarif = await runSarifCase("sarif-wrong-level", "wrong-level");
assert.equal(wrongLevelSarif.result.code, 0, wrongLevelSarif.result.stderr);
assert.equal(wrongLevelSarif.sarif.metrics.root_cause_recall, 1);
assert.equal(wrongLevelSarif.sarif.metrics.strict_recall, 1);
assert.equal(wrongLevelSarif.sarif.metrics.exact_severity_rate, 0);

for (const marker of ["wrong-path", "extra", "wrong-root"]) {
  const sarifCase = await runSarifCase(`sarif-${marker}`, marker);
  assert.equal(sarifCase.result.code, 1, sarifCase.result.stderr);
  assert.equal(sarifCase.sarif.passed, false);
  assert.equal(sarifCase.sarif.unmatched_expected_count, marker === "extra" ? 0 : 1);
  assert.equal(sarifCase.sarif.unmatched_actual_count, marker === "wrong-path" ? 0 : 1);
  if (marker === "wrong-path") assert.equal(sarifCase.sarif.metrics.root_cause_recall, 1);
  if (marker === "wrong-root") assert.equal(sarifCase.sarif.metrics.root_cause_recall, 0);
}

const gateFindings = [
  { path: "src/example.js", line: 7, rule_id: "EXPECTED-ERROR", level: "error" },
  { path: "src/example.js", line: 9, rule_id: "EXPECTED-WARNING", level: "warning" }
];
const gatedPass = await runSarifCase("sarif-gated-pass", "gated-pass", { findings: gateFindings, gates: { min_recall: 0.5, min_recall_by_level: { error: 1 }, max_false_positives: 0 } });
assert.equal(gatedPass.result.code, 0, gatedPass.result.stderr);
assert.equal(gatedPass.sarif.passed, true);
assert.equal(gatedPass.sarif.unmatched_expected_count, 1);
assert.equal(gatedPass.sarif.metrics.root_cause_recall, 0.5);
assert.equal(gatedPass.sarif.metrics.strict_recall, 0.5);
assert.deepEqual(gatedPass.sarif.metrics.strict_recall_by_level, { error: 1, warning: 0, note: 1, none: 1 });
assert.equal(gatedPass.sarif.metrics.false_positives, 0);
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
