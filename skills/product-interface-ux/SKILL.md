---
name: product-interface-ux
description: >
  Use this skill when creating, changing, explaining, or reviewing a web product
  interface for usable behavior: forms, settings, dashboards, navigation, data
  tables, search, feedback, errors, loading, destructive actions, accessibility,
  interaction, or motion. Also use for broad requests such as "review this app",
  "improve this UI", "audit the UX", or "make this flow clearer", even when the
  user does not name UX. Apply objective, evidence-backed behavior and preserve
  the product's visual direction. Do not use for backend-only work, native-only
  interfaces, brand exploration, or purely subjective restyling.
license: MIT
metadata:
  author: Conrado Quilles Gomes
  version: "1.0.0"
---

# Product Interface UX

Create and review web product interfaces using behavior that helps a user
understand, act, recover, and finish. Route the request internally; never ask the
user to choose an apply/review mode.

**Failure pattern:** interface advice becomes a style checklist, a static audit
claims behavior it did not exercise, or contextual recipes become universal
rules.
**Verified by:** the bundled eval suite plus repository validation; rerun them
after changing triggering, procedure, references, or outputs.

## Resolve the request

Choose the narrowest branch without announcing a mode:

- **Create or change:** inspect the existing product and design system, implement
  only applicable behavior, then validate it.
- **Focused review:** inspect the named component or journey plus dependencies
  that can change its behavior. Do not widen into a whole-product audit.
- **General review:** inventory critical tasks, flows, components, and states;
  combine static evidence with browser operation when available.
- **Explain or advise:** answer the decision, conditions, trade-offs, and check;
  do not force implementation.
- **Aesthetic request:** preserve or clarify the requested visual direction, but
  never call a preference a UX requirement. Ask for a visual brief only when the
  work cannot proceed without one.

If the target is not operable, continue with a bounded static review and label
runtime behavior `inferred` or `not verified`. Do not claim usability research.

## Load only what changes the work

Always read `references/evidence-ledger.md` before a material recommendation or
review. Then load the smallest applicable set:

| Need | Reference |
|---|---|
| Keyboard, focus, semantics, contrast, input modality, responsive accessibility | `references/accessibility.md` |
| Async states, feedback, errors, destructive actions, overlays, gestures | `references/interaction-and-state.md` |
| Forms, settings, search, navigation, pagination, tables, charts | `references/forms-navigation-and-data.md` |
| Hierarchy, proximity, tokens, readable/responsive presentation | `references/visual-system.md` |
| Whether or how something should animate | `references/motion.md` |
| Focused or general audit and finding format | `references/review-protocol.md` |

For a named pattern or a task that needs implementation detail, open only the
matching `### Pattern name` section in the smallest applicable deep reference:

| Trigger present | Deep reference |
|---|---|
| Interaction, state, gesture, overlay, or destructive action | `references/patterns/interaction-state-overlays.md` |
| Feedback, latency, content journey, empty/error/loading | `references/patterns/feedback-content-journeys.md` |
| Form, settings, validation, or input control | `references/patterns/forms-settings-input.md` |
| Navigation, search, filter, pagination, table, or data action | `references/patterns/navigation-search-data.md` |
| Visual-system decision with an operational consequence | `references/patterns/visual-system-decisions.md` |
| A specific animation or motion decision | `references/patterns/motion-patterns.md` |

Do not load quarantined aesthetic or psychological hypotheses during normal
creation or review. For an explicit visual brief or research hypothesis, follow
the opt-in route in `references/evidence-ledger.md`. Carry each loaded entry's
`Force` into the answer. When asked for exact defaults, provide a number only
when an applicable standard, validated product constraint, or existing system
token supplies it; otherwise name the decision variable and observable test. For
a request naming multiple patterns or components, repeat the applicable
condition, native baseline, interaction contract, reachable failure/recovery,
and specific verification for each instead of collapsing one into shared advice.

For a specific task, do not load unrelated recipes. For a general review, use the
review protocol to select coverage; do not paste every reference into the report.

## Procedure

1. **Establish context.** Identify the user's task, platform/input methods,
   frequency, reversibility, risk, latency, data density, existing design system,
   and available evidence. Inspect before prescribing.
2. **State the observable contract.** Describe what the user must perceive or be
   able to do, including loading, empty, partial, success, error, offline,
   conflict, and recovery states that can occur. Do not add impossible states.
3. **Apply source precedence.** Product requirements and validated user evidence
   lead; standards and platform contracts constrain; the existing design system
   provides local consistency; heuristics remain contextual.
4. **Choose the minimum behavior.** Prefer native elements and existing
   components. Add custom interaction, motion, dependency, or abstraction only
   when it solves a named consequence that simpler behavior does not.
5. **Implement or review.** For implementation, preserve visual language and
   unrelated behavior. Pending work must prevent duplicates without ejecting the
   active control from focus, expose busy state, and announce the specific final
   outcome. For review, record how each candidate was challenged, then group
   manifestations under one root cause.
6. **Validate at the right layer.** Static checks can establish markup, tokens,
   state branches, and names. Browser checks establish focus, keyboard, pointer,
   viewport, reduced motion, and live states. Product research establishes
   comprehension or outcome hypotheses. Never substitute one layer for another.
7. **Report proportionally.** Lead with task outcome or highest consequence.
   Include strengths worth preserving and why they fit the task; for example,
   submit-time validation avoids interrupting entry and URL pagination preserves
   refresh/share/back behavior. If no material issue is supported, say so instead
   of manufacturing findings.

## Motion gate

Before recommending motion, answer all of these:

1. What feedback, state change, spatial relationship, or continuity does it make
   easier to understand?
2. How often is it seen, and does repetition make it feel like waiting?
3. Can the next action occur immediately? Must the transition be interruptible?
4. What removes, reduces, or replaces it under reduced motion?
5. Could it flash, trigger vestibular discomfort, shift layout, or drop frames?
6. How will the behavior be checked on representative hardware?

If the first answer is only “delight”, “premium”, or “polish”, motion is optional
visual direction, not a UX finding.

## Review findings

A finding exists only when evidence supports a mechanism and a user consequence.
Use this compact shape; expand only when needed:

```text
[Severity] Consequence-led title
Evidence: observed location/state and reproduction.
Confidence: high | medium | low; observed | inferred | not verified.
Affected task: who cannot decide, complete, or recover, and how.
Principle: applicable rule and why it exists.
Correction: minimum change that removes the cause.
Verify: observable test that should pass afterward.
Limits: evidence gaps that could change priority or conclusion.
```

Severity follows consequence, not standards labels or confidence:

- **Blocker:** a critical task cannot be completed safely.
- **High:** wrong/destructive outcome, exclusion, data loss, or recovery failure.
- **Medium:** material confusion, delay, or recovery work.
- **Low:** localized friction with a concrete, recoverable consequence.

Preferences receive no defect severity. Keep low-confidence high-impact risks
separate from verified lower-impact defects.

## Completion check

- The selected behavior solves a named user consequence.
- Required, strong-default, and contextual guidance are not conflated.
- Existing design language and correct behavior are preserved.
- Every reachable state has honest feedback and a recovery path where possible.
- Keyboard, focus, pointer/touch, reflow, and reduced motion were exercised or
  explicitly marked unverified.
- Findings contain evidence, correction, and a reproducible check.
- No score, conversion claim, aesthetic rule, or usability claim was invented.

## Gotchas

- `44px` is an enhanced target, not the universal WCAG 2.2 AA minimum; read the
  spacing and exception rules before reporting a failure.
- Keyboard operation is not necessarily the single-pointer alternative required
  for drag functionality.
- Validation on blur is not universal. Submit, blur, and live validation depend
  on task cost and product evidence.
- A disabled, unavailable, and busy control are different contracts. Do not
  mechanically replace one with another.
- `prefers-reduced-motion` means remove, reduce, or replace non-essential motion;
  it does not require breaking essential state feedback.
- `z-index` applies to positioned elements and flex/grid items; inspect stacking
  contexts rather than prescribing escalating numbers or `position: relative`.
- Intrinsic-size interpolation exists but remains support-dependent. Verify the
  target browsers instead of saying `height: auto` can never animate.

## What did not work

- Copying catalog Do/Don't text made contextual heuristics sound normative and
  obscured the stronger product, standards, and platform evidence.
- One fixed duration, layout, validation trigger, or loading cutoff failed across
  frequency, latency, risk, and platform contexts.
- Static-only audits overstated keyboard, focus, motion, and responsive behavior.
- A monolithic pattern dump made focused tasks load unrelated guidance.
