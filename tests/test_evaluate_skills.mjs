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
const fakeCodex = join(temp, "fake-codex.sh");
const workspace = join(temp, "workspace");
await mkdir(join(skill, "evals"), { recursive: true });
await mkdir(previous, { recursive: true });
await writeFile(join(skill, "SKILL.md"), "---\nname: sample-skill\ndescription: Test fixture skill for the evaluation harness.\n---\n");
await writeFile(join(previous, "SKILL.md"), "---\nname: sample-skill\ndescription: Previous fixture skill for the evaluation harness.\n---\n");
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
grader=0
all_args="$*"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --output-last-message) output="$2"; shift 2 ;;
    --output-schema) grader=1; shift 2 ;;
    *) shift ;;
  esac
done
mkdir -p "$(dirname "$output")"
if [ "$grader" -eq 1 ]; then
  case "$all_args" in
    *old-result*) printf '%s' '{"results":[{"criterion":"The result is present.","score":4,"evidence":"old result"}]}' > "$output" ;;
    *) printf '%s' '{"results":[{"criterion":"The result is present.","score":9,"evidence":"result"}]}' > "$output" ;;
  esac
  printf '%s\\n' 'status text' '{"type":"turn.completed","usage":{"input_tokens":20,"cached_input_tokens":4,"cache_write_input_tokens":1,"output_tokens":5,"reasoning_output_tokens":2}}'
else
  case "$all_args" in
    *sample-skill-previous*) printf '%s' 'old-result' > "$output" ;;
    *) printf '%s' 'result' > "$output" ;;
  esac
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

console.log("evaluate-skills checks passed");
