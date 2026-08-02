#!/usr/bin/env node
/** Offline integration test for the runtime boundary and Codex JSONL accounting. */

import assert from "node:assert/strict";
import { chmod, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
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
  if grep -q 'Previous fixture' "$skill_dir/SKILL.md"; then printf '%s' 'old-result' > "$output"; else printf '%s' 'result' > "$output"; fi
  printf '%s\\n' 'status text' '{"type":"turn.completed","usage":{"input_tokens":100,"cached_input_tokens":40,"cache_write_input_tokens":3,"output_tokens":15,"reasoning_output_tokens":7}}'
fi
`);
await chmod(fakeCodex, 0o755);

const first = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--workspace", workspace, "--codex-bin", fakeCodex, "--iteration", "1"]);
assert.equal(first.code, 0, first.stderr);
const benchmark = JSON.parse(await readFile(join(workspace, "iteration-1", "benchmark.json"), "utf8"));
assert.equal(benchmark.summary.with_skill.passed, 1);
assert.deepEqual(benchmark.summary.with_skill.task_token_usage, {
  input_tokens: 100,
  cached_input_tokens: 40,
  cache_write_input_tokens: 3,
  output_tokens: 15,
  reasoning_output_tokens: 7,
  total_tokens: 115
});
assert.equal(benchmark.summary.with_skill.grader_token_usage.total_tokens, 25);
assert.equal(benchmark.summary.with_skill.score_summary.average_score, 9);
const taskTiming = JSON.parse(await readFile(join(workspace, "iteration-1", "eval-one", "with_skill", "outputs", "timing.json"), "utf8"));
assert.equal(taskTiming.total_tokens, 115);

const second = await run("node", ["scripts/evaluate-skills.ts", "--skill", skill, "--previous", previous, "--workspace", workspace, "--codex-bin", fakeCodex, "--iteration", "2"]);
assert.equal(second.code, 0, second.stderr);
const previousBenchmark = JSON.parse(await readFile(join(workspace, "iteration-2", "benchmark.json"), "utf8"));
assert.deepEqual(previousBenchmark.variants, ["without_skill", "old_skill", "with_skill"]);
assert.equal(previousBenchmark.summary.old_skill.task_token_usage.total_tokens, 115);
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
const conversationRun = await run("node", ["scripts/evaluate-skills.ts", "--skill", conversationSkill, "--workspace", conversationWorkspace, "--codex-bin", fakeCodex, "--grader", "none", "--competitor", skill, "--concurrency", "2"]);
assert.equal(conversationRun.code, 0, conversationRun.stderr);
const conversationBenchmark = JSON.parse(await readFile(join(conversationWorkspace, "iteration-1", "benchmark.json"), "utf8"));
assert.deepEqual(conversationBenchmark.variants, ["without_skill", "with_skill", "competitor-sample-skill-1"]);
assert.equal(conversationBenchmark.summary.with_skill.total, 2);
assert.equal(conversationBenchmark.summary["competitor-sample-skill-1"].total, 2);
assert.deepEqual(conversationBenchmark.summary.with_skill.discovery_summary, {
  conversation_runs: 2,
  revealed_hidden_facts: 2,
  available_hidden_facts: 2,
  discovery_rate: 1,
  revealed_weight: 2,
  available_weight: 2,
  weighted_discovery_rate: 1
});
assert.deepEqual(conversationBenchmark.summary.with_skill.turn_summary, { conversation_runs: 2, candidate_turns: 4, average_candidate_turns: 2 });
assert.equal(conversationBenchmark.report, "report.md");
assert.match(await readFile(join(conversationWorkspace, "iteration-1", "report.md"), "utf8"), /Candidate turns/);
const conversationResult = conversationBenchmark.results.find((result) => result.variant === "with_skill" && result.repetition === 1);
assert.equal(conversationResult.timing.total_tokens, 345);
assert.equal(conversationResult.conversation.candidate_turns, 2);
assert.deepEqual(conversationResult.conversation.discovery.revealed_fact_ids, ["migration-window"]);
assert.equal(conversationResult.conversation.transcript.at(-1).content, "A grounded final brainstorm.");
assert.equal(conversationBenchmark.transcript_bundle, "transcripts/index.md");
assert.equal(conversationResult.transcript_bundle_path, "transcripts/discovery/repetition-1/with_skill.json");
assert.equal(await readFile(join(conversationWorkspace, "iteration-1", conversationResult.transcript_bundle_path), "utf8"), await readFile(join(conversationWorkspace, "iteration-1", conversationResult.transcript_path), "utf8"));
assert.match(await readFile(join(conversationWorkspace, "iteration-1", "transcripts", "index.md"), "utf8"), /competitor-sample-skill-1/);
await assert.rejects(readFile(join(conversationWorkspace, "iteration-1", "eval-discovery", "repetition-1", "with_skill", "runtime-skill", "evals", "evals.json")));
await assert.rejects(readFile(join(conversationWorkspace, "iteration-1", "eval-discovery", "repetition-1", "with_skill", "outputs", "simulator-turn-1", "last-message.md")));
assert.equal(await readFile(join(conversationWorkspace, "iteration-1", "private-simulator", "eval-discovery", "repetition-1", "with_skill", "turn-1", "last-message.md"), "utf8"), '{"reply":"The migration must finish in three weeks.","revealed_fact_ids":["migration-window"]}');

const externalEvals = join(temp, "external-evals.json");
await writeFile(externalEvals, JSON.stringify({
  skill_name: "external-brainstorm-suite",
  evals: [{ id: "external", prompt: "Produce a concise result.", expected_output: "A result." }]
}, null, 2));
const externalWorkspace = join(temp, "external-workspace");
const externalRun = await run("node", ["scripts/evaluate-skills.ts", "--skill", conversationSkill, "--evals", externalEvals, "--workspace", externalWorkspace, "--codex-bin", fakeCodex, "--grader", "none", "--max-turns", "30"]);
assert.equal(externalRun.code, 0, externalRun.stderr);
const externalBenchmark = JSON.parse(await readFile(join(externalWorkspace, "iteration-1", "benchmark.json"), "utf8"));
assert.equal(externalBenchmark.skill_name, "external-brainstorm-suite");
assert.equal(externalBenchmark.eval_suite, externalEvals);
assert.equal(externalBenchmark.summary.with_skill.passed, 1);

console.log("evaluate-skills checks passed");
