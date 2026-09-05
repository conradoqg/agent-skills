# Agent workflow for skills

## Create or materially update a skill

Treat a change as material when it changes a skill's behavior, description or
triggering, procedure, scripts, references, assets, or required tools.

Before editing an existing skill, preserve a snapshot outside the repository:

```bash
cp -R skills/<skill-name> /tmp/<skill-name>-previous
```

For a new skill, add `evals/evals.json` alongside `SKILL.md`. For a material
update, keep the existing evals current. Each eval set must contain at least:

- two realistic user tasks;
- one boundary case, including a case that should not produce a false positive
  when that is relevant;
- criteria with `criterion`, a 0-10 `threshold`, and a `rubric` describing
  what the score anchors mean.

Use objective criteria where possible. Use scoring criteria for semantic
quality. A case passes only when every criterion reaches its own threshold;
the average score is diagnostic, not a substitute for a required criterion.

Two integrity rules for hard gates such as SARIF matching. Write the ground
truth from the consequence of each defect, never by citing the rubric of the
skill under test: an answer key that argues from a participant's own taxonomy
cannot falsify that participant, and it silently grades every competitor against
one participant's judgment. And treat a threshold calibrated from observed
candidate scores as what it is — a floor that documents current behavior, not
evidence of quality. Prefer pre-registering a threshold from the standard you
want to demand, record when you moved one after seeing results, and keep the
reason in the commit that moves it.

Run the evaluation locally before handoff:

```bash
node scripts/evaluate-skills.ts --skill <skill-name>
node scripts/evaluate-skills.ts --skill <skill-name> --previous /tmp/<skill-name>-previous
```

On a managed Codex host that blocks candidate reads of the staged skill or
fixtures, append `--approve-for-me`. The evaluator then routes eligible child
approvals through auto-review while retaining the workspace-write sandbox.

The first command compares `without_skill` and `with_skill`. The second also
compares `old_skill`. Review per-criterion evidence, threshold results, task
token usage, and grader token usage in the generated `evaluation.json`.

## Benchmark multiple skills

Use the separate benchmark runner only for a neutral comparison between two or
more peer skills. It requires an independent shared suite; do not use any
participant's bundled `evals/evals.json` as the benchmark suite:

```bash
node scripts/benchmark-skills.ts \
  --participant /path/to/skill-a \
  --participant /path/to/skill-b \
  --evals /path/to/shared-evals.json
```

Benchmark fixtures are resolved relative to the shared suite. Review the
generated `benchmark.json` and `report.md`; pass/fail and token metrics inform
the comparison, while only runtime failures make the command fail.

Do not version `.skill-evals/`, `.skill-benchmarks/`, outputs, traces, timing
files, benchmarks, or snapshots. They can be large, ephemeral, or sensitive.

## When an evaluation is not required

Do not create or rerun evals for a purely editorial change that cannot alter a
skill's behavior, triggering, required resources, or output. Still run the
repository's normal validation commands when they apply.

## CI policy

Do not add this LLM-based evaluation to CI yet. Run it locally for new and
materially updated skills. Add CI only after the repository has stable rubrics,
a deliberate token budget, and a policy for handling score variance.
