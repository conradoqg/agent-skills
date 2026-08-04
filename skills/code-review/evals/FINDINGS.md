# What measurement showed about this skill

Evaluator notes, kept next to the evals so the experiments below are not repeated
blind. Every number comes from runs of the two large fixtures with the SARIF
artifact scored against the private ground truth; run evidence lives outside this
repository.

## The noise floor, measured

The same version, unchanged, was measured twice in separate batches:

| Fixture | Batch A | Batch B |
| --- | ---: | ---: |
| large | detect 0.865 (n=6) | detect 0.829 (n=5) |
| polyglot | detect 0.956 (n=6) | detect 0.911 (n=6) |

**Run-to-run spread for an identical version is about 4pp of detection at n=6**,
with a per-run standard deviation near 0.045. Any comparison of two versions with
fewer than about ten runs each, or with a difference under roughly 5pp, is
uninterpretable. Several conclusions earlier in this project's history were drawn
from n=3 and did not survive a larger sample. Use at least ten runs per version,
report the standard deviation, and prefer a per-finding sign test to a difference
of means.

## Where the coverage actually goes

Two diagnostics matter more than any single score.

**Missed findings are mostly not missed.** Across 15 runs, 33 ground-truth
findings were absent from their own file. 29 of them (88%) were described inside
another finding's text, and only 4 were absent from the review entirely. The
reviewer finds the defect and folds it into a neighbour, where an author cannot
act on it.

**Loss concentrates in dense areas, not late in the diff.** Detection correlates
*positively* with position in the diff (r = +0.37): the second half scores 0.962
against 0.829 for the first. What predicts a miss is how many findings share one
directory. On the TypeScript fixture 10 of 21 findings sit in `apps/api/src`, and
that is where every variant loses coverage; the polyglot fixture spreads findings
about one per directory and every variant, including no skill at all, detects
0.94+ there.

That is why passes 1 and 2 run per area against `impact/areas.txt`. It is the only
change measured in this project that moved the number of findings a review
produces.

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

| Fixture | Variant | n | detect | anchor | near-sev | decoys/run |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| large | no skill | 8 | 0.810 | 0.792 | 0.792 | 0.62 |
| large | this skill | 11 | 0.874 | 0.857 | 0.857 | 0.55 |
| polyglot | no skill | 9 | 0.948 | 0.933 | 0.896 | 0.67 |
| polyglot | this skill | 12 | 0.944 | 0.933 | 0.911 | 0.50 |

Against the previous flat-review version at the same sample size, per-area review
raises anchoring on the dense fixture by 4.8pp (Welch t = 2.47) and detection by
2.6pp (t = 1.34, 9 findings better and 3 worse), and is never worse on the spread
fixture. Detection against no skill at all remains inside the noise floor on both
fixtures: the reproducible contributions are the delivery contract (the graded
criterion scores 0–3 without the skill and 10 with it), anchoring, and decoy
resistance.

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
| Four independent domain lenses over the whole diff instead of one checklist sweep | detect 0.825 on large, 0.933 on polyglot over three runs each |
| Stating the one-finding-per-fix-site rule, replacing one-per-root-cause | detect 0.848 large / 0.922 polyglot; reported count unchanged at about 19, so the rule did not change behavior |
| A pre-delivery checker that flags findings whose text names another file | ran in 12 of 12 runs and flagged up to 29 items per run; the reviewer resolved them as evidence rather than splitting, reported count still about 19, detect fell to 0.802 large / 0.867 polyglot |
| Ordering areas by edited files first instead of by size | unproven, not shipped: detect 0.857 large / 0.933 polyglot at n=5, below per-area-by-size and inside the noise floor. The quota ran out before a larger sample; the mechanical argument is sound and it is three lines of awk, so it is worth retesting |
| Adding rules to the verification pass, generally | every attempt cost recall; the pass is saturated |

The output count is the striking constant: about 19 findings on the TypeScript
fixture and 15 on the polyglot one, across guidance rewrites, an explicit
granularity rule, a tool that listed the folded findings by name, and a semantic
index. Only splitting the *input* into areas moved it (to 19.8 and 15.3). If a
future change is meant to raise coverage, check whether it changes that number at
all before believing any score.

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

## Running the measurement

Cost is per-run latency, not local resources: a review of one large fixture takes
about 7 minutes (median over 40 runs, range 3.8–14.6), while a 16-core machine sits
at load 1.2 with twelve concurrent runs and 7GB of 31GB used.

**Twelve concurrent runs is the ceiling, and it is the API request quota, not the
machine.** At twenty-four, runs fail with `Kiro rate limit reached: Request quota
exceeded`, which then surfaces as a misleading `Tool approval required but
--no-interactive was specified`. Worse, the survivors are the fast runs, so the
sample is biased toward whatever finished early — a failed batch must be discarded,
not scored. Sustained measurement also depletes a daily quota: after roughly 200
reviews in one day, batches begin failing regardless of concurrency.

Plan a comparison accordingly: two versions at ten runs on two fixtures is 40
reviews, or about four batches and an hour of wall time, and it is the minimum that
can distinguish a 5pp effect.

## Before changing this skill

1. Snapshot the current version outside the repository.
2. Measure on **both** large fixtures, at least ten repetitions each, against the
   same version of the ground truth. Six is not enough: the identical version
   moved 4pp between two batches of six.
3. Compare per finding, not only on averages, and prefer a sign test over a
   difference of means.
4. Expect additions to the verification pass to cost recall. Prefer a mechanism in
   a script over a sentence in the workflow — and prefer changing what the reviewer
   is asked to look at over changing what it is told about what it sees, because
   that is the only lever that has moved the output.
