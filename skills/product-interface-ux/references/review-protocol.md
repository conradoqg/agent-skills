# Review protocol

Use for focused component/flow review or a broad product-interface review. A
review is evidence collection and adjudication, not checklist completion.

## Scope automatically

- **Focused request:** review the named component/journey and only dependencies
  that can change its observable contract. Do not report unrelated page style.
- **General request:** map critical tasks, flows, surfaces, states, inputs, and
  available environments. Cover relevant domains without forcing every recipe.
- **Static-only target:** continue, but label runtime claims `inferred` or `not
  verified` and list the exact dynamic checks still needed.

Do not ask the user to choose a mode. Ask only for a missing target, access, or
critical product rule that prevents responsible progress.

## 1. Build a compact coverage map

For each material task, record:

```text
actor/task -> entry -> action -> pending -> result -> recovery -> evidence layer
```

Inventory only applicable surfaces: navigation/search, forms/settings, data
views, overlays, feedback, destructive operations, direct manipulation, and
motion. Note platform/input, frequency, reversibility, latency, risk, design
system, and permissions. Separate documented facts from assumptions.

For a broad app, prioritize critical/high-frequency/high-risk flows rather than
claiming exhaustive coverage. A screen inventory alone is not a task map.

## 2. Inspect by evidence layer

### Static

Can establish markup/semantic intent, labels/relationships, DOM order, tokens,
state branches, error/rollback code, URL state, responsive/reduced-motion rules,
and obvious platform misuse. It cannot prove rendered contrast, announcements,
focus behavior, touch, smoothness, latency, or comprehension.

### Browser

When available, operate rather than inspect only:

- complete the main path and plausible recovery;
- traverse keyboard forward/back and verify visible, unobscured focus;
- open/close overlays, Escape, trap/return focus;
- use pointer/touch equivalents and non-drag alternatives;
- test narrow viewport, zoom/reflow, long content, themes as relevant;
- emulate reduced motion and repeat/interrupt transitions;
- exercise pending, success, error, retry, offline/conflict where safely
  reproducible;
- capture console/network/performance evidence only when it supports a user
  consequence.

A tool/transport failure is not product friction. Retry once only when state is
known unchanged, then mark inconclusive.

### Product/research

Hierarchy comprehension, wording effectiveness, conversion, satisfaction, and
workflow fit may remain hypotheses. Do not call an agent walkthrough user
research or infer prevalence. State what observation or research would decide.

## 3. Generate and refute candidates

For each candidate:

1. name the observable mismatch;
2. locate evidence;
3. describe a reachable consequence;
4. identify applicable rule and conditions;
5. search for native behavior, equivalent path, guard, recovery, or design-system
   decision that disproves it;
6. compare the minimum correction with preserving current behavior;
7. define a check that would fail before and pass after.

Discard style preference, missing optional delight, unexercised speculation, and
valid alternative patterns. Record the refutation result: equivalent path or
guard found (discard), none found (retain), or missing evidence (limit confidence).
For a destructive client path, explicitly check undo, trash, grace period, and
other reachable recovery; unknown server persistence is a limit, not proof that
the visible recovery gap is harmless. Merge candidates when one minimal fix
removes all consequences. Keep strengths and clean paths that constrain the fix.

## 4. Classify independently

Evidence state:

- `observed`: directly read/rendered/operated;
- `inferred`: mechanism seen, consequence not exercised;
- `not verified`: required environment/state unavailable.

Confidence: high/medium/low based on completeness and reproducibility.

Severity by consequence:

- **Blocker:** critical task cannot be completed safely.
- **High:** wrong/destructive outcome, exclusion, data loss, or recovery failure.
- **Medium:** material confusion, delay, repeated work, or difficult recovery.
- **Low:** localized, recoverable friction with a concrete task consequence.

Standards level, confidence, and severity are separate axes. An AAA miss is not
automatically High; a high-impact product invariant does not need a WCAG number.

## 5. Deliver findings first

Start with scope, evidence layers used, and the highest consequence or a clean
outcome. Do not assign a numeric UX score.

Use stable IDs and this template:

```markdown
### [High] UX-01 — Users can delete the project without a recoverable decision

- **Evidence:** Observed at `path:line`; activation immediately removes the item.
- **Confidence:** High — observed statically and reproduced in browser.
- **Affected task:** Project owners can lose work after one accidental action.
- **Principle:** High-blast irreversible actions need review, confirmation, or
  reversibility; a generic modal alone is not protection.
- **Correction:** Name the destructive action and add the smallest viable review
  or recovery path consistent with the backend.
- **Verify:** Trigger by keyboard and pointer; cancel without mutation; confirm
  once; verify final state and recovery/grace policy.
- **Limits:** Permanent purge behavior was not available in the test environment.
```

Then include:

- strengths/behavior to preserve;
- `not verified` states that could change conclusions;
- coverage limits and next checks.

Do not fill a severity quota. If no material finding is supported, say so and
list the tested boundary. “No findings” does not mean exhaustive or user-validated.

## Focused review prompts

For a modal, form, table, motion, or other named component:

- load only evidence plus applicable domain references;
- verify its complete task contract, not every pattern in the catalog;
- cite exact code/state where possible;
- do not use neighboring visual design as filler findings.

## General review prompts

A natural “review this app/interface” is sufficient. Internally:

1. identify critical tasks and representative states;
2. inspect design-system conventions;
3. cover accessibility plus relevant interaction, form/navigation/data, visual,
   and motion domains;
4. use browser evidence where available;
5. reconcile root causes and rank by consequence;
6. disclose untested roles, permissions, data, viewports, states, and research.

Do not call a static page scan a complete UX audit. Do not recommend a global
redesign when local contract fixes remove the consequences.

## Final quality check

- Opening states tested scope, main consequence/clean outcome, and decisive limit.
- Every finding has evidence, consequence, minimum correction, and verification.
- Observed, inferred, and not verified are used accurately.
- Severity follows task impact; confidence follows evidence.
- Correct behavior and design-system constraints are preserved.
- No aesthetic preference, exact timing, recipe substitution, or user-research
  claim was promoted to a defect.
