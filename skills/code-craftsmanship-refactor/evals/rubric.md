# Evaluation rubric

`evals/evals.json` is the executable repository manifest. Every assertion has a
named semantic criterion, an independently chosen 0–10 threshold, and anchored
scores. A case passes only when every criterion meets its threshold; averages
are diagnostic.

## Acceptance dimensions

1. **Trigger precision** — all positive prompts in `trigger-cases.json` should
   activate; all negative prompts should route to a more appropriate workflow.
2. **Behavior preservation** — outputs name affected observables, establish a
   before/after baseline, and never treat "tests pass" as universal proof.
3. **Risk/approval** — low-risk local work may proceed; dynamic/public contracts
   and difficult rollback require explicit approval.
4. **Craftsmanship judgment** — findings are grounded in code and local
   conventions, not line counts, compulsory abstractions, or style taste.
5. **Comment judgment** — narrative/stale comments are improved or removed while
   intent, compatibility, tool, legal, and security comments survive.
6. **Scope integrity** — unrelated work, generated/vendor files, feature work,
   bug fixes, optimization, and architecture redesign remain separate.
7. **Evidence report** — exact checks, baseline/final outcomes, residual risk,
   deliberate non-changes, and pending approvals are visible.

## Behavioral catalog

`behavior-cases.json` contains the 20 acceptance scenarios used to extend future
fixtures without bloating the runtime skill. These cases are ground truth based
on the consequence of each hazard—serialization breakage, dynamic lookup,
unobserved behavior, user-change loss—not on labels invented by the skill.

## Calibration policy

Thresholds are preregistered from the desired safety/quality standard. If a
threshold changes after observing candidates, record the reason in the commit;
do not present a fitted floor as proof of quality.

Review per-criterion evidence, task token use, grader token use, and failures in
the generated `evaluation.json`. Do not commit `.skill-evals/` artifacts.
