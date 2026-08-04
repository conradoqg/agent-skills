# What measurement showed about this skill

Evaluator notes, kept next to the evals so the experiments below are not repeated
blind. Every number comes from runs of the two large fixtures with the SARIF
artifact scored against the private ground truth; run evidence lives outside this
repository. `n` is repetitions of the same version on the same fixture, which
matters because a single run cannot separate an improvement from model variance:
one version measured 0.762 at n=3 and 0.706 at n=6 on the same fixture.

## Metrics

| Metric | Definition |
| --- | --- |
| detect | a finding is reported somewhere in its file |
| anchor | reported within the line tolerance of the annotated fix site |
| near-sev | anchored and within one SARIF level of the annotated level |
| strict | anchored and at exactly the annotated level |
| decoys/run | findings reported in a file the ground truth lists as a non-finding |

`detect` is the review-capability signal. `strict` mixes capability with severity
taxonomy agreement, which is a genuinely contested axis: disagreements run in both
directions and do not respond to sharper rules.

## What holds

| Fixture | Variant | n | detect | near-sev | strict | decoys/run |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| large (TypeScript) | no skill | 8 | 0.810 | 0.792 | 0.720 | 0.62 |
| large | this skill | 6 | 0.865 | 0.817 | 0.722 | 0.67 |
| polyglot (Python/Go/SQL/shell) | no skill | 9 | 0.948 | 0.896 | 0.622 | 0.67 |
| polyglot | this skill | 6 | 0.956 | 0.922 | 0.722 | 0.33 |

The skill's reproducible contributions are the delivery contract (the graded
criterion scores 0–3 without it and 10 with it), exact severity agreement on the
unseen fixture, and decoy resistance. **Detection improvements do not reach
significance**: a sign test over per-finding detection rates gives 4 better / 8
worse on large and 2 better / 3 worse on polyglot. Detection here is bounded by
the model, not by the guidance.

## What was tried and did not work

Each was measured against the shipped version on at least one fixture and is
archived outside the repository. None is in the skill.

| Change | Result |
| --- | --- |
| Excluding latency from "silently drops", plus a mechanical anchor check | strict 0.659, error-recall 0.667 over six runs; worse than shipping without them |
| The mechanical anchor check alone | strict 0.714, error-recall 0.740 over six runs |
| Requiring every verified candidate to reach the output | no change in reported count; strict 0.746 |
| Walking every map artifact entry by entry instead of reading a ranked list | strict 0.690–0.714; over-supplied context dilutes attention |
| Replacing the impact map with a semantic symbol index | detect 0.778 on large over three runs, no gain on polyglot |
| Four independent domain lenses instead of one checklist sweep | detect 0.825 on large, 0.933 on polyglot over three runs each |
| Adding rules to the verification pass, generally | every attempt cost recall; the pass is saturated |

Two behavioral findings worth more than the numbers:

- **An optional capability is not used.** The step asking the reviewer to probe for
  a code-intelligence tool executed zero times across 15 runs, and still only once
  in six when the exact commands were named in `SKILL.md`. Moving the same
  capability into `impact-map.sh` made it run in six of six — mechanism beats
  instruction. It was then removed anyway, because six runs per fixture showed no
  detection gain for roughly eight seconds and an external dependency.
- **Guidance written from a fixture measures the fixture.** An earlier version
  scored 0.788 strict on large partly because its false-positive examples were that
  fixture's decoys transcribed. Removing them cost about 6pp on that fixture and
  is why the polyglot fixture exists: a change that helps only one fixture is
  fitted to it.

## Before changing this skill

1. Snapshot the current version outside the repository.
2. Measure on **both** large fixtures, at least six repetitions each, against the
   same version of the ground truth.
3. Compare per finding, not only on averages, and prefer a sign test over a
   difference of means.
4. Expect additions to the verification pass to cost recall. Prefer a mechanism in
   a script over a sentence in the workflow.
