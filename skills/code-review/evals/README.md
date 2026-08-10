# Code-review evaluation history

This document is the durable handoff for future `code-review` improvement
iterations. Generated evidence under `.skill-evals/` is intentionally ignored by
Git; this file records what was tried, which measurements are comparable, what
failed, why the original development loop stopped at iteration 127, the
independent holdout result, and the later Luna-directed improvement through
iteration 144.

## Current result

The final repeated checks used `gpt-5.6-sol` and the final consequence-based
ground truth:

| Suite | Iteration | Repetitions | Root-cause recall | Strict recall | False positives |
| --- | ---: | ---: | ---: | ---: | ---: |
| Large polyglot | 122 | 2 | 26/26 (100%) | 26/26 (100%) | 0 |
| Large multi-domain | 127 | 2 | 44/44 (100%) | 43/44 (97.7%) | 0 |
| Combined | 122 + 127 | 4 | 70/70 (100%) | 69/70 (98.6%) | 0 |

Both iteration-127 repetitions performed two successful specialist spawns and
completed both agents. One large result was semantically correct but anchored
outside the accepted strict fix location, which explains the single strict miss.

The stopping decision was deliberate: no repeated root-cause miss or false
positive remained. More repetitions would primarily measure variance and cost
unless a new independent fixture or failure pattern is introduced.

### Luna comparison added after iteration 127

The unchanged final skill was subsequently evaluated with `gpt-5.6-luna` in a
full current-only suite (iteration 128) and a second repetition of both large
suites (iteration 129). The comparable two-repetition totals are:

| Model | Root-cause recall | Strict recall | False positives | Task tokens | Candidate duration sum |
| --- | ---: | ---: | ---: | ---: | ---: |
| Sol, iterations 122 + 127 | 70/70 (100%) | 69/70 (98.6%) | 0 | 6,533,236 | 30m 47s |
| Luna, iterations 128 + 129 | 68/70 (97.1%) | 67/70 (95.7%) | 3 | 7,302,948 | 30m 06s |

Luna passed every configured gate and found every polyglot root cause in both
runs. Its large-review precision was less stable: it reported the unwired
`debugEndpoints` decoy twice, reported the refuted naive-timezone case once,
and in its second multi-domain run missed the async guard and coverage-publish
no-op. Sol therefore remains the better-supported default for this skill on the
current fixtures: higher recall and precision with about 10.5% fewer task
tokens. The duration difference was small and favors neither model materially.

### Independent holdout v2: iterations 133–134

The development suites above had been observed repeatedly, so they could not
answer whether the final iteration gains generalized. A new suite was therefore
pre-registered and frozen before any scored participant run. It contains 226
changed files, 34 consequence-defined regressions (26 errors and 8 warnings),
17 unique controls, 180 generated files, 14 file formats, 3 commits, one
cancelled change, and one pre-existing defect. It spans Python, Go, TypeScript,
Scala, Swift, C++, OpenAPI, Avro, SQL, Docker, Nginx, shell, and CI.

The archive and answer key were generated deterministically in two directories.
A first independent Sol audit found six fixture/key weaknesses, which were
corrected before freezing. A second independent Luna audit then returned
`VALID`: no omitted real regression or false control. The frozen hashes were:

- archive: `47841daf12603e0c633378a22cb9b563606b5bf1ce6aaede3c13b1c2af2cec4b`;
- ground truth: `e3892a3aa7576426507460c859fe7205c21a06e2ada1f794c70d532b4491822b`;
- current skill: `21b312c60e2e829438babdcc47c1d37ecb0c7bc1fbe5ee07d31bf6e5a2f86336`;
- old skill: `05c197d774cc33b5590f895674e2c4d1a9b266669e330197f8a353e0edd810e9`.

Every scored run had MCP disabled and successfully used the
`codebase-memory-mcp` CLI to index the fixture and query its graph. CLI help or
availability output did not satisfy the gate.

| Variant/model | Runs passed | Mean root recall | Mean strict recall | Total FP | Task tokens |
| --- | ---: | ---: | ---: | ---: | ---: |
| No skill / Sol | 0/2 | 100.0% | 100.0% | 2 | 666,202 |
| Old skill / Sol | 2/2 | 98.53% | 98.53% | 4 | 1,546,711 |
| Current skill / Sol | 2/2 | 98.53% | 98.53% | 3 | 2,128,018 |
| Current skill / Luna | 0/2 | 86.76% | 86.76% | 1 | 4,348,447 |

The no-skill variant failed the delivery contract despite high SARIF recall.
Both skill variants passed every Sol run, and current improved total FP from 4
to 3, but current did not beat old recall at all. It therefore failed the
pre-registered generalization requirement of at least +5 percentage points.
Current also used 37.6% more task tokens than old.

Luna was bimodal: one run found 34/34 causes and the other found 25/34. Its mean
recall was 11.76 points below current-on-Sol, narrowly failing the pre-registered
10-point robustness tolerance. Both Luna runs completed two specialist agents,
passed the CLI gate, and stayed precise with one total FP. One Luna run failed
only the qualitative delivery threshold; the other failed the hard recall
floors.

The observed extras did not invalidate the key. The recurring ticker report is
false on the pinned Go 1.24 runtime because unreachable tickers are collectable;
the generated TypeScript `number` report had no reachable consumer or
serialization consequence. The deterministic export-path report in one Sol
run described the expected root cause through concurrent collision rather than
the keyed symlink consequence, so the matcher counted one miss and one extra;
the same effect occurred for old and current and does not alter their tie.

Conclusion: this is not evidence of catastrophic overfitting—the current skill
still achieved 98.53% held-out recall with Sol—but the claimed marginal
improvement over the old skill did not generalize. Treat the development suites
as saturated and the risk of benchmark-specific optimization as real. Further
prompt mutation should require a new failure hypothesis and another untouched
holdout, not more iterations against the existing fixtures.

### Luna-directed nine-pattern improvement: iterations 135–144

After iteration 134, holdout v2 was no longer untouched. It became a targeted
regression suite for the nine patterns missed by Luna's weaker repetition:

1. predictable temporary path;
2. untrusted regular-expression execution;
3. locale omitted from a cache key;
4. detached asynchronous `forEach`;
5. unchecked integer narrowing;
6. force-unwrapped deep-link parsing;
7. completion callback invoked twice;
8. dangling `string_view`;
9. removed sensitive-temporary-file cleanup.

Three candidate designs were tested. Iteration 135 added broad prompt/reference
material and expanded the mapper budget from 24 to 36 candidates. It was more
expensive and worse; one semantic-matcher failure also invalidated the recorded
0/34 result in its second repetition. Iterations 136–138 restored the mapper
budget but retained extra prompt/reference text. Targeted Luna recall rose, but
the direct full-suite comparison showed lower recall, more false positives, and
about 45% more task tokens than the snapshot. That design was discarded in
full.

The retained design changes only
[`../scripts/extract-risk-triggers.mjs`](../scripts/extract-risk-triggers.mjs)
and its deterministic tests. It recognizes removed/added line pairs inside one
hunk and emits them in a separate `paired-transitions` section. The original
priority list and the 24-candidate handoff budget remain unchanged. The section
is omitted when empty, so unrelated diffs receive no additional text.

| Iteration | Model/suite | Variant | Passed | Mean root recall | Total FP | Task tokens | Interpretation |
| ---: | --- | --- | ---: | ---: | ---: | ---: | --- |
| 135 | Luna / v2, 2 reps | old | 2/2 | 100.00% | 2 | 3,633,147 | Control for broad attempt |
| 135 | Luna / v2, 2 reps | broad candidate | 0/2 | invalid | invalid | 5,152,924 | Rejected; matcher failed on rep 2 |
| 136 | Luna / v2, 2 reps | slim candidate | 1/2 | 98.53% | 3 | 3,874,932 | Better target recall, still noisy |
| 137 | Sol / full suite | slim candidate | 5/5 | 99.09% | 2 | 4,655,914 | Passed baseline comparison |
| 138 | Sol / full suite | old | 5/5 | 100.00% | 0 | 3,253,916 | Direct control |
| 138 | Sol / full suite | slim candidate | 5/5 | 99.09% | 3 | 4,720,425 | Regression; prompt changes discarded |
| 139 | Luna / v2, 2 reps | final minimal | 1/2 | 97.06% raw | 3 raw | 3,816,298 | All nine patterns found in both reps |
| 143 | Sol / full suite | final minimal | 5/5 | 97.55% | 2 | 4,108,445 | Baseline was 0/5 |
| 144 | Sol / full suite | old | 5/5 | 100.00% | 1 | 4,012,888 | Direct stochastic control |
| 144 | Sol / full suite | final minimal | 5/5 | 96.92% | 2 | 2,867,550 | Same deterministic inputs after final cleanup |

Iteration 139 found all nine target mechanisms in both Luna repetitions
(18/18). Its raw aggregate was 66/68 causes because repetition 1 genuinely
missed an unrelated migration regression and repetition 2 described the
expected predictable-path defect one line earlier under an equivalent collision
rule ID. Counting that demonstrated equivalence gives 67/68 overall causes and
two genuine extras, both the already-refuted Go 1.24 ticker report. One run
failed only the qualitative local-delivery criterion.

The lower current score in iteration 144 is model variance, not evidence that
the retained detector displaced old leads. Before the final cleanup, old and
current polyglot `risk-triggers.txt` were already byte-identical. After omitting
the empty section, regenerated risk-trigger inputs are byte-identical to the old
snapshot in all five historical scenarios. The v2 risk-trigger input remains
byte-identical to iteration 139 and contains the nine paired-transition labels.
Thus the retained change is dormant on the saturated historical suites and
activates only when one of the new transition mechanisms is present.

Iterations 140 and 142 are invalid infrastructure runs: sandboxed Codex could
not open its model WebSocket (`Operation not permitted`), so every job exited
without tokens, response, or SARIF. They must not be counted as skill failures.

An earlier holdout v1 is inadmissible. After candidate observation, independent
review proved that two supposed controls introduced real consequences (an
unnamespaced ServiceAccount reference and an unused replica setting). Per the
pre-registered integrity rule, the entire v1 suite and its iterations 130–132
are diagnostic only and were replaced rather than patched.

## Evidence inventory and comparability

There are 63 preserved `evaluation.json` files across the main and external
suite workspaces:

- iterations 1–16;
- iterations 97–140, 142–144;
- no local artifacts for iterations 17–96.

The files live at:

```text
.skill-evals/code-review/iteration-<n>/evaluation.json
```

Do not version those generated directories. If they are removed, this document
is the retained summary.

Two metric eras exist:

1. Iterations 1–16 use the original location/severity matcher. Their `recall`
   should not be interpreted as modern root-cause recall.
2. Iterations 97 onward separate semantic `root_cause_recall` from
   `strict_recall`, which additionally checks path, line, and severity tolerance.

The ground truth also changed. Raw percentages across a boundary are not an
apples-to-apples trend:

- Polyglot initially contained 15 expected findings. Before iteration 103 it
  was corrected to 13 by removing expectations whose consequences were not
  reachable or not introduced by the diff.
- The large suite initially contained 21 expected findings, temporarily moved
  through 19/20 while disputed cases were audited, returned to 21, and ended at
  22.
- The final large set removes the unwired `debugEndpoints` expectation, retains
  the pre-existing exported lost-update contract, and adds two independently
  verified post-observation defects: a coverage publisher that performs no
  publication and a reindex job that targets indexes never provisioned.
- A separately observed adjustment-path tenant disclosure is evidence for the
  repository tenant-contract defect, not another expected finding: restoring
  that one contract necessarily removes both manifestations.

The post-observation decisions are recorded in
[`ground-truth/large.json`](ground-truth/large.json), not hidden by a rewritten
history.

## Full-suite comparisons

Iteration 118 ran the required current-versus-no-skill evaluation:

| Variant | Passed | Average criterion score | Task tokens |
| --- | ---: | ---: | ---: |
| Without skill | 0/5 | 6.000 | 727,607 |
| Current skill | 5/5 | 9.8125 | 3,968,791 |

Iteration 119 also included the preserved pre-change snapshot:

| Variant | Passed | Average criterion score | Task tokens |
| --- | ---: | ---: | ---: |
| Without skill | 0/5 | 6.200 | 1,263,578 |
| Old skill | 5/5 | 9.800 | 3,278,687 |
| Current skill | 5/5 | 9.875 | 4,515,443 |

The current skill consumed about 38% more task tokens than the old skill in
iteration 119. The gain was primarily precision and large-review coverage, not
the coarse 5/5 pass count. The bundled gates are intentionally floors, so pass
count alone is not evidence of high quality.

The iteration-119 large-suite comparison was:

| Suite | Variant | Root recall | Strict recall | FP |
| --- | --- | ---: | ---: | ---: |
| Large multi-domain (21 expected then) | Old | 19/21 | 19/21 | 0 |
| Large multi-domain (21 expected then) | Current | 20/21 | 20/21 | 0 |
| Large polyglot (13 expected) | Old | 13/13 | 13/13 | 4 |
| Large polyglot (13 expected) | Current | 12/13 | 11/13 | 1 |

These full-suite runs predate the final two large ground-truth additions. Use
iterations 122 and 127 for final targeted stability, and run a fresh full suite
before a future release if the skill changes materially again.

Iteration 128 supplied that fresh current-only full-suite check with Luna and
the final 22/13 answer keys:

| Variant/model | Passed | Average criterion score | Task tokens |
| --- | ---: | ---: | ---: |
| Current skill / Luna | 5/5 | 9.6875 | 4,909,548 |

Clean, small, and medium were exact with zero false positives. Multi-domain was
22/22 by root cause, 21/22 strict, with one `debugEndpoints` false positive;
polyglot was 13/13 strict with zero false positives.

## Historical measurements: original matcher

`R/FP` means original recall and false positives. These rows used 21 expected
large findings and 15 expected polyglot findings. Iterations 14 and 15 failed
before producing a valid SARIF measurement.

| Iteration | Model | Large R/FP | Polyglot R/FP | Task tokens, large/poly | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Luna | 66.7% / 3 | 93.3% / 4 | 1.476M / 1.340M | Initial retained comparison |
| 2 | Luna | 66.7% / 4 | 93.3% / 2 | 0.819M / 1.184M | High run-to-run variance |
| 3 | Luna | 66.7% / 3 | 100% / 2 | 2.337M / 1.486M | Perfect old recall still had FP |
| 4 | Luna | 85.7% / 2 | 80.0% / 3 | 2.039M / 0.871M | Recall moved in opposite directions |
| 5 | Luna | 71.4% / 2 | 80.0% / 8 | 1.314M / 1.000M | Polyglot precision collapse |
| 6 | Luna | 71.4% / 4 | 73.3% / 6 | 0.881M / 1.283M | — |
| 7 | Luna | 61.9% / 3 | 73.3% / 2 | 0.929M / 2.088M | Lowest retained large recall in this era |
| 8 | Luna | 66.7% / 6 | 93.3% / 1 | 2.030M / 2.525M | Precision/recall tradeoff |
| 9 | Luna | 71.4% / 4 | 73.3% / 3 | 3.130M / 1.134M | More tokens did not guarantee recall |
| 10 | Luna | 81.0% / 5 | 93.3% / 2 | 1.591M / 1.489M | — |
| 11 | Luna | 66.7% / 3 | 80.0% / 3 | 2.341M / 1.602M | — |
| 12 | Sol | 85.7% / 2 | 86.7% / 4 | 1.712M / 1.520M | First retained Sol pair |
| 13 | Sol | 85.7% / 1 | 93.3% / 1 | 1.814M / 1.844M | Best balanced result of original era |
| 14 | Sol | — | runtime failure | — | No valid SARIF measurement |
| 15 | Sol | — | runtime failure | — | No valid SARIF measurement |
| 16 | Luna | — | 66.7% / 2 | — / 1.566M | First retained successful 2-agent handoff |

The main lesson from this era is that location-based matching conflated reviewer
quality, anchoring choices, severity choices, and answer-key errors. It motivated
the semantic matcher used later.

## Historical measurements: semantic matcher

`Root/strict/FP` reports root-cause recall, strict recall, and semantic false
positives. Token counts are candidate task tokens. `2/2` in the handoff column
means two successful spawn calls and two completed agents.

| Iteration | Suite | Rep | Model | Expected | Root / strict / FP | Tokens | Handoff | Interpretation |
| ---: | --- | ---: | --- | ---: | ---: | ---: | ---: | --- |
| 97 | Large | 1 | Terra | 21 | 76.2% / 76.2% / 0 | 1.663M | 0 | Semantic baseline |
| 98 | Large | 1 | Terra | 21 | 81.0% / 76.2% / 0 | 1.892M | 0 | Root/anchor separation visible |
| 99 | Large | 1 | Terra | 21 | 76.2% / 71.4% / 0 | 1.775M | 0 | — |
| 100 | Poly | 1 | Terra | 15 | 80.0% / 80.0% / 1 | 1.046M | 0 | Last pre-investigation run |
| 101 | Poly | 1 | Terra | 15 | 86.7% / 80.0% / 0 | 1.390M | 0 | Investigation starts |
| 102 | Poly | 1 | Terra | 15 | 93.3% / 93.3% / 1 | 0.735M | 0 | — |
| 102 | Poly | 2 | Terra | 15 | 73.3% / 73.3% / 0 | 1.172M | 0 | Repetition exposed variance |
| 103 | Poly | 1 | Terra | 13 | 100% / 100% / 0 | 1.790M | 0 | Corrected polyglot truth |
| 103 | Poly | 2 | Terra | 13 | 84.6% / 84.6% / 0 | 1.069M | 0 | — |
| 104 | Poly | 1 | Sol | 13 | 92.3% / 92.3% / 2 | 2.374M | 0 | Model comparison |
| 104 | Poly | 2 | Sol | 13 | 100% / 100% / 1 | 1.008M | 0 | Recall improved, precision not yet stable |
| 105 | Poly | 1 | Sol | 13 | 100% / 100% / 1 | 1.393M | 0 | — |
| 106 | Poly | 1 | Sol | 13 | 100% / 100% / 0 | 1.333M | 0 | First clean Sol polyglot run |
| 107 | Poly | 1 | Terra | 13 | 92.3% / 92.3% / 0 | 0.960M | 0 | Failed another qualitative gate |
| 108 | Large | 1 | Sol | 20 | 100% / 100% / 0 | 0.819M | 0 | Spawn silently failed because coordinator was ephemeral |
| 109 | Large | 1 | Sol | 20 | 95.0% / 90.0% / 1 | 1.549M | 0 | Moving handoff earlier worsened result |
| 110 | Large | 1 | Sol | 20 | 95.0% / 90.0% / 0 | 1.238M | 0 | Hard gate exposed parser issue |
| 111 | Large | 1 | Default | 20 | 80.0% / 80.0% / 0 | 0.914M | 0 | Spawn rejected: coordinator thread absent |
| 112 | Large | 1 | Sol | 20 | 95.0% / 90.0% / 1 | 0.977M | 0 | Real spawns occurred but were not yet parsed |
| 113 | Large | 1 | Sol | 20 | 90.0% / 85.0% / 0 | 1.532M | 0 | Persisted-session parser under repair |
| 114 | Large | 1 | Sol | 19 | 100% / 100% / 1 | 0.972M | 2/2 | First correctly measured handoff; truth under audit |
| 115 | Large | 1 | Sol | 19 | 94.7% / 94.7% / 1 | 1.006M | 2/2 | Variance remained |
| 116 | Large | 1 | Sol | 19 | 68.4% / 68.4% / 0 | 1.962M | 2/2 | Over-broad reachability rule; reverted |
| 117 | Large | 1 | Sol | 20 | 100% / 100% / 1 | 1.753M | 2/2 | “FP” was a real coverage-publish no-op |
| 118 | Clean | 1 | Sol | 0 | 100% / 100% / 0 | 0.364M | 0 | Full-suite run |
| 118 | Small | 1 | Sol | 1 | 100% / 100% / 0 | 0.391M | 0 | Full-suite run |
| 118 | Medium | 1 | Sol | 2 | 100% / 100% / 0 | 0.317M | 0 | Full-suite run |
| 118 | Large | 1 | Sol | 21 | 85.7% / 85.7% / 1 | 1.446M | 2/2 | Full-suite variance |
| 118 | Poly | 1 | Sol | 13 | 76.9% / 69.2% / 0 | 1.451M | 0 | Full-suite variance |
| 119 | Clean | 1 | Sol | 0 | 100% / 100% / 0 | 0.325M | 0 | Full suite with old snapshot |
| 119 | Small | 1 | Sol | 1 | 100% / 100% / 0 | 0.358M | 0 | — |
| 119 | Medium | 1 | Sol | 2 | 100% / 100% / 0 | 0.568M | 0 | — |
| 119 | Large | 1 | Sol | 21 | 95.2% / 95.2% / 0 | 1.472M | 2/2 | Current beat old by one root cause |
| 119 | Poly | 1 | Sol | 13 | 92.3% / 84.6% / 1 | 1.793M | 0 | Current cut old FP from 4 to 1 |
| 120 | Poly | 1 | Sol | 13 | 92.3% / 92.3% / 0 | 1.096M | 0 | False constraint finding removed |
| 121 | Poly | 1 | Sol | 13 | 100% / 100% / 0 | 1.147M | 0 | Interface rule test |
| 121 | Poly | 2 | Sol | 13 | 92.3% / 92.3% / 0 | 1.179M | 0 | Repeated interface miss |
| 122 | Poly | 1 | Sol | 13 | 100% / 100% / 0 | 1.514M | 0 | Final stable polyglot check |
| 122 | Poly | 2 | Sol | 13 | 100% / 100% / 0 | 1.059M | 0 | Final stable polyglot check |
| 123 | Large | 1 | Sol | — | invalid | — | 0 | Sandbox network failure; exclude |
| 123 | Large | 2 | Sol | — | invalid | — | 0 | Sandbox network failure; exclude |
| 124 | Large | 1 | Sol | 21 | 95.2% / 95.2% / 1 | 1.152M | 2/2 | Extra tenant consequence audited |
| 124 | Large | 2 | Sol | 21 | 100% / 100% / 0 | 1.494M | 2/2 | — |
| 125 | Large | 1 | Sol | 22 | 95.5% / 95.5% / 0 | 0.994M | 2/2 | Adjustment initially counted separately |
| 125 | Large | 2 | Sol | 22 | 81.8% / 81.8% / 1 | 0.926M | 2/2 | “FP” exposed missing reindex truth |
| 126 | Large | 1 | Sol | 22 | 95.5% / 95.5% / 0 | 1.555M | 2/2 | Corrected truth; same reindex miss |
| 126 | Large | 2 | Sol | 22 | 95.5% / 95.5% / 0 | 1.779M | 2/2 | Handoff reachability stabilized |
| 127 | Large | 1 | Sol | 22 | 100% / 95.5% / 0 | 1.961M | 2/2 | All root causes found |
| 127 | Large | 2 | Sol | 22 | 100% / 100% / 0 | 2.000M | 2/2 | Final confirmation |
| 128 | Clean | 1 | Luna | 0 | 100% / 100% / 0 | 0.495M | 0 | Final-current full suite |
| 128 | Small | 1 | Luna | 1 | 100% / 100% / 0 | 0.312M | 0 | Final-current full suite |
| 128 | Medium | 1 | Luna | 2 | 100% / 100% / 0 | 0.590M | 0 | Final-current full suite |
| 128 | Large | 1 | Luna | 22 | 100% / 95.5% / 1 | 1.760M | 2/2 | Extra unwired debug-endpoint finding |
| 128 | Poly | 1 | Luna | 13 | 100% / 100% / 0 | 1.752M | 0 | Exact polyglot run |
| 129 | Large | 1 | Luna | 22 | 90.9% / 90.9% / 1 | 2.191M | 2/2 | Missed async guard and coverage no-op; repeated debug FP |
| 129 | Poly | 1 | Luna | 13 | 100% / 100% / 1 | 1.599M | 0 | Added refuted naive-timezone finding |

## What changed and why

### Evaluation harness

[`../../../scripts/evaluate-skills.ts`](../../../scripts/evaluate-skills.ts) now:

- matches expected and actual SARIF findings by defect mechanism and consequence;
- measures root-cause recall separately from strict path/line/severity recall;
- retries unmatched semantic pairs in a reduced context;
- accepts explicitly registered alternate valid fix lines;
- rejects conflicting many-to-one semantic assignments;
- records repetitions, execution metadata, model, tokens, and collaboration;
- exposes an explicitly attested `codebase-memory-mcp` CLI to candidates;
- enables Codex multi-agent support only for skills carrying the collaboration
  reference;
- preserves the coordinator session for multi-agent runs instead of using
  `--ephemeral`;
- reconstructs successful spawns and completions from persisted Codex sessions;
- interprets MCP preflight JSON instead of mistaking `"enabled": false` for an
  enabled server.

The grader receives neutral consequences, never the skill's own defect taxonomy.
Rule ID, path, line, and severity are excluded from root-cause matching and are
scored independently afterward.

### Review skill

[`../SKILL.md`](../SKILL.md) now uses five bounded phases:

1. deterministic inventory and impact leads;
2. complete changed-block enumeration;
3. targeted impact closure and disproof;
4. source verification, fix-site anchoring, and SARIF validation;
5. root-cause reconciliation and local/CI delivery.

The main promoted checks cover:

- tenant/cache hits that return before ownership validation;
- changed and unchanged callers when a scope parameter is removed;
- pre-existing interface implementors found through an older sibling member;
- claimed CI/release side effects whose scripts only log success;
- dynamically constructed resource names with no matching provisioning;
- timezone callers, existing-row migration evidence, materialization/buffering,
  optimistic concurrency, queue acknowledgement, and test-oracle weakening.

[`../scripts/extract-risk-triggers.mjs`](../scripts/extract-risk-triggers.mjs)
provides bounded changed-line leads. For more than 100 files it emits only
compact high-signal transitions. The Luna-directed follow-up added paired-hunk
transitions for the nine mechanisms above without replacing the original
priority leads; the extra section is absent when there is no match.

[`../scripts/validate-review-sarif.mjs`](../scripts/validate-review-sarif.mjs)
rejects malformed results, unchanged fix anchors, invalid levels, and exact
duplicates before delivery.

### Specialist handoff

[`../references/codex-subagents.md`](../references/codex-subagents.md) applies
only above 100 changed files:

1. `change_mapper` inventories changed blocks and returns at most 24 candidates;
2. `risk_verifier` receives the mapper's actual output, challenges it, reopens
   high-risk cleared leads, and identifies gaps;
3. the primary agent verifies surviving candidates, deduplicates, writes SARIF,
   and delivers.

The agents run sequentially to preserve an actual handoff and fit the available
agent slots. A pre-existing exported operation is not cleared solely because no
in-repository caller is found; a newly added unwired export does not receive that
presumption.

## Failed approaches worth remembering

- Moving the handoff before deterministic inventory worsened coverage.
- Merely narrating a handoff is not collaboration; actual spawn attempts must be
  measured.
- Codex `exec --ephemeral` cannot own attached subagents; it produced `no thread
  with id` router failures.
- Counting only public JSONL collaboration events missed successful agents;
  isolated persisted sessions were needed as evidence.
- A general “no caller means clear” rule removed valid regressions in
  pre-existing exported operations.
- The inverse “every new export without a caller is a finding” rule caused a
  large recall regression and was removed.
- Raising or moving broad instructions can reduce attention to other defect
  classes; iteration 116 fell to 68.4% despite using more tokens.
- A globally unique ID disproves cache collisions, not disclosure when a shared
  cache hit bypasses ownership validation.
- Candidate extras must be independently audited before being labeled false
  positives. Two final expected defects were discovered this way.
- One candidate manifestation must not become two expected findings when the
  same minimal fix necessarily removes both.

## Procedure for future improvement iterations

1. Preserve the current skill outside the repository:

   ```bash
   cp -R skills/code-review /tmp/code-review-previous
   ```

2. Read this history and the current ground-truth `audit_note` before changing
   either the skill or the answer key.
3. Pre-register the hypothesis, target suite, expected direction, and stopping
   rule. Do not choose a threshold after seeing the candidate score without
   recording that fact.
4. Use the `codebase-memory-mcp` CLI for candidate graph discovery when
   available, but verify leads in source. Its fast index may exclude scripts or
   fail during persistence; targeted source search is the documented fallback.
5. Run one targeted iteration to reject harmful changes cheaply.
6. When it improves, run at least two repetitions. Compare root recall, strict
   recall, FP, exact severity, tokens, and collaboration—not only pass/fail.
7. Audit every new extra and miss by consequence. Update ground truth only when
   source independently proves the answer key wrong, and record a post-observation
   explanation in the JSON.
8. Re-run both required full evaluations before handoff:

   ```bash
   node scripts/evaluate-skills.ts --skill code-review
   node scripts/evaluate-skills.ts --skill code-review --previous /tmp/code-review-previous
   ```

9. Stop when two independent repetitions have no repeated root-cause miss and no
   false positive, unless a new fixture or failure hypothesis is introduced.

## Local validation

The final state passed:

```bash
node tests/test_code_review_skill.mjs
node tests/test_evaluate_skills.mjs
node tests/test_extract_risk_triggers.mjs
node tests/test_validate_review_sarif.mjs
bash tests/test_impact_map.sh
python3 tests/validate_skills.py
git diff --check
```

The documentation follows the repository's evaluation-integrity policy:
consequences define expected defects, thresholds remain floors rather than proof
of quality, and post-observation answer-key changes stay visible.
