# Code-review benchmark assets

`evals.json` is the shared suite. Only `totvs-local-code-review` remains under
`participants/`, so use `scripts/evaluate-skills.ts`, which compares
`without_skill` against `with_skill` for one skill; `scripts/benchmark-skills.ts`
still requires two or more peer participants. Candidate input is restricted to
each declared ZIP under `fixtures/`; `ground-truth/` is private evaluator
material and must not be added to an eval `files` array.

Each ZIP is a deterministic, complete local Git repository: extracting with
`unzip <fixture>.zip -d target` makes `target` itself the repository (including
`.git/`), with no wrapper directory. `main` is the review base and the checked
out `feature/*` branch is the review head. The review range is therefore
`main...HEAD`. Feature histories intentionally contain multiple commits (at
least three in `small` and `clean`, and several focused commits in `large`) so
reviewers can inspect both the range and its commit context. Archives use a
fixed entry order and ZIP timestamp for reproducible fixtures.

Fixtures are **static benchmark inputs**. The `large.zip` archive was built
once with a deterministic generator and human-reviewed ground truth, then
committed for unchanged reuse by every benchmark run. The generator is not a
runtime dependency and fixtures must never be regenerated during evaluation.

All scenarios require offline, read-only review of the unzipped repository and
Kiro runs must use a clean harness. The global `mcp.json`, steering documents,
and installed skills all leak into a default Kiro session: the MCP handshake grows
`kiro-cli` to roughly 29GB RSS until an OOM killer terminates the review before the
SARIF artifact is written, and global steering/skills would bias the candidate.
Pass the versioned agent profile and the runner builds an isolated Kiro HOME per run:

```bash
node scripts/evaluate-skills.ts \
  --skill benchmarks/code-review/participants/totvs-local-code-review \
  --evals benchmarks/code-review/evals.json \
  --eval large-multi-domain-review \
  --runtime kiro --kiro-bin kiro-cli \
  --kiro-agent-file benchmarks/code-review/agents/code-review-benchmark.json \
  --kiro-model claude-sonnet-5 --kiro-effort high --kiro-trust-all-tools \
  --workspace /tmp/code-review-totvs-eval --timeout-ms 900000
```

Verified locally: peak `kiro-cli` RSS dropped from ~29GB to ~0.14GB, and a probe in
the isolated HOME reported `STEERING: NONE`, `SKILLS: NONE`, and `MCP: NONE` while
authentication kept working.


run's `outputs/` directory.

## Scenarios

| ID | Purpose | Static scale |
| --- | --- | --- |
| `small-authz-regression` | Focused authorization regression | 3 feature commits; 1 canonical finding |
| `medium-boundary-and-egress` | Tenant boundary and webhook egress | 8 feature commits; 3 changed files; 2 canonical findings |
| `large-multi-domain-review` | Broad PR-review stress case | 60 feature commits; 290 changed files; 3,716 added lines; 35 canonical findings across seven domains |
| `clean-no-false-positive` | False-positive control | 3 feature commits; no canonical findings |

`large.zip` is a reviewed, static artifact. Its build process is intentionally not invoked by the runner; use the checked-in ZIP and its private `ground-truth/large.json` unchanged for comparable runs.
