# Evidence policy and pattern ledger

Read this before using any domain reference. It controls whether guidance can
become a requirement, recommendation, contextual option, or review finding.

## Source precedence

Use the highest applicable source; lower tiers may fill gaps but cannot override
higher tiers without explicit product evidence.

1. User/product requirements, real constraints, and validated product research.
2. Normative standards and platform contracts: WCAG, HTML, ARIA and relevant
   browser behavior.
3. The product's existing design system and documented interaction conventions.
4. Observed product evidence: browser operation, support data, analytics or
   usability research with known scope.
5. Reputable research and established cross-system heuristics.
6. Editorial pattern catalogs, including Design Motion HQ.
7. Aesthetic preference or analogy.

A source tier is not severity. A violated AA criterion can be Low in a narrow
non-critical surface; a product invariant can be High without a WCAG citation.

## Admission test

Admit a rule only when at least one foundation is present:

- a testable requirement;
- a logical invariant between action, state, result, and recovery;
- a platform convention necessary for predictable operation;
- a repeatable consequence for a user task;
- product evidence that establishes a local need.

Then require all fields:

```yaml
principle: durable behavior, not a component recipe
strength: required | strong-default | contextual
applies_when: observable preconditions
user_consequence: what becomes impossible, wrong, unclear, or costly
expected_behavior: observable outcome
exceptions: when the guidance does not hold
verification: static, browser, performance, or research check
sources: links or local product evidence
last_verified: YYYY-MM-DD for external/volatile claims
```

Reject or demote claims whose only support is “premium”, “engaging”, “modern”,
a universal conversion percentage, an arbitrary exact value, manipulation, or a
technical assumption not checked against current platform support.

## Strength, evidence, and confidence

- **required:** a verified standard/product contract applies. Name its scope,
  level, and exceptions; do not use “required” for a common convention.
- **strong-default:** the behavior usually prevents a clear failure and should be
  used unless context supplies a better solution.
- **contextual:** a viable recipe whose value depends on frequency, risk,
  latency, platform, content, or user evidence. State the deciding condition.

Evidence labels:

- **observed:** directly present in source, rendered output, tool capture, or
  reproducible interaction.
- **inferred:** a mechanism is visible but its runtime consequence was not
  exercised.
- **not verified:** the relevant state or environment was unavailable.

Confidence reflects evidence completeness, not impact. Never raise severity to
compensate for weak proof.

## Candidate refutation

Before retaining a finding, ask:

1. Does native/platform behavior already provide the guarantee?
2. Is an equivalent path available and discoverable?
3. Is the suspicious behavior unreachable or intentionally constrained?
4. Is this a local design-system decision with no adverse consequence?
5. Does the recommendation merely replace one valid pattern with another?
6. Would the same minimal fix remove another candidate? If so, merge them.

Absence of a preferred recipe is not evidence of a defect.

## Design Motion HQ corpus disposition

Design Motion HQ was reviewed as a 73-pattern public editorial catalog on
2026-09-06. It supplies problem discovery and examples, not normative authority.
The wording below is an original classification rather than a reproduction of
the site's card text.

Operational details live under [`patterns/`](patterns/) and remain subordinate
to this ledger and the stronger domain policies. Each title has one domain home;
a focused task opens only its named section. The eight non-rules are isolated in
[`patterns/hypotheses-only.md`](patterns/hypotheses-only.md) and may be loaded
only for an explicit visual brief or research hypothesis. A mismatch between the
inventory below and those 73 headings is a validation failure.

### Transversal principles — extract the durable rule (20)

Hover Trap; Behind the Button; Destructive Actions; Drag and Drop; Modal
Hierarchy; Form Field States; Password Field UX; Animation Timing; Easing
Curves; Charts That Lie; Proximity Rule; Visual Hierarchy; Design Tokens; Color
Accessibility; Error States; Loading States System; Undo UX; Empty States;
Microcopy; Focus States.

### Conditional references — apply only when the condition exists (25)

Disabled Buttons; Tooltip Design; Swipe Actions; Accordion Disclosure; Autosave;
Input Masking; Toggle Anatomy; Form Validation Timing; Scroll-Driven Animations;
Design System Kit; Grid System; Shadow Elevation; Z-Index Mastery; Icon Design
Rules; Gestalt Laws; Dark Mode; Doherty Threshold; Notification System; Toast
Notifications; Optimistic UI; Skeleton Loading; Serial Position; Navigation
Patterns; Tabs System; Pagination.

### Recipes — load only for the named component or journey (20)

Bulk Actions; Inline Editing; Live Cursors; Context Menu; Search Experience
System; Star Rating; Bottom Sheets; Color Picker UX; Command Palette; Filter
Chips; Data Table; Settings System; Date Pickers; Range Sliders; Stepper Wizard;
File Upload UX; OTP Input; Card Hover Anatomy; Landing Page Skeleton; Dropdown
Design.

Recipes may still contain required subclaims. For example, a custom date picker
needs keyboard operation, but it does not follow that every product needs a
custom picker or two visible months.

### Never use as automatic quality gates (8)

Peak-End Rule; Golden Ratio; Gradient Design; Border Radius; Von Restorff
Effect; Perfect Card; Depth Layers; Zeigarnik Effect.

They may be explicit visual-direction or research hypotheses. Their absence is
not a UX defect; manipulative use can itself harm users.

## Source ledger

| Source | Role | Last checked |
|---|---|---|
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Normative accessibility success criteria and levels | 2026-09-06 |
| [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/) | Widget semantics and keyboard patterns; guidance, not a substitute for testing | 2026-09-06 |
| [HTML Living Standard](https://html.spec.whatwg.org/) | Native element and form contracts | 2026-09-06 |
| [MDN Web Docs](https://developer.mozilla.org/) | Platform behavior and compatibility; recheck volatile APIs | 2026-09-06 |
| [GOV.UK validation](https://design-system.service.gov.uk/patterns/validation/) | Evidence-backed form recovery default; contextual outside its service model | 2026-09-06 |
| [Design Motion HQ](https://designmotionhq.com/patterns) | Public editorial discovery catalog; attributed synthesis, not normative authority | 2026-09-06 |
| [Nielsen Norman Group](https://www.nngroup.com/) | Research/heuristics for response, progress, and motion; verify article scope | 2026-09-06 |
| [Atlassian motion](https://atlassian.design/foundations/motion/) | Calibrated system example, not universal timing law | 2026-09-06 |
| [Carbon motion](https://carbondesignsystem.com/elements/motion/overview/) | Tokenized motion example, not universal timing law | 2026-09-06 |

When a claim can age—browser support, performance cost, API behavior, or design
system documentation—recheck it before prescribing implementation.
