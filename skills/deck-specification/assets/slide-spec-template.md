# Slide SNN Specification

> Desired-state contract for exactly one slide. Replace `SNN` and bracketed
> placeholders, remove instructional text, and keep the file name, internal
> `Spec ID`, and the deck slide-map entry identical. Write projected content and
> notes in the deck's declared language. Do not add presentation-platform mechanics.

<!-- slide-spec:core:start -->

## Identity

| Field | Specification |
|---|---|
| `Spec ID` | `SNN` |
| `Working title` | [Stable working title] |
| `Section` | [Narrative section from deck-spec.md] |
| `Inclusion` | [required / optional / appendix] |
| `Maturity` | [TBD / PROVISIONAL / CONFIRMED] |
| `Change policy` | [EDITABLE / LOCKED] |
| `Lock authority` | [Named human/authority, or Not applicable when EDITABLE] |
| `Approval` | [DRAFT / REVIEWED / APPROVED] |
| `Approved by` | [Named authority or Not applicable] |

## Narrative role

**Job in the story:**  
[The unique work this slide performs.]

**Audience question answered:**  
[Question answered by this slide.]

**Takeaway:**  
> [One complete statement that should survive without narration.]

**Input from previous slide:**  
[Required context, linked Spec ID, or Not applicable.]

**Output to next slide:**  
[Understanding established for the next slide, linked Spec ID, or Not applicable.]

## Projected content

**Eyebrow:** [Exact text or Not applicable]  
**Headline:** [Exact audience-visible headline]  
**Subtitle:** [Exact text or Not applicable]

[Write the exact visible copy, labels, values, categories, annotations, and call
to action. Use native Markdown tables or lists when they express the content.
Do not write production instructions here.]

## Evidence

| Claim ID | Claim | Maturity | Change policy | Lock authority | Source locator | Required context |
|---|---|---|---|---|---|---|
| `CLM-SNN-01` | [Exact claim] | [TBD / PROVISIONAL / CONFIRMED] | [EDITABLE / LOCKED] | [Named authority or Not applicable] | [SRC-ID + page/table/cell/query/interview, or No source] | [Unit, period, population, caveat, or calculation] |

Use `Not applicable` only when this slide intentionally makes no consequential
claim. Unsupported consequential content must remain visibly `PROVISIONAL`.

## Composition intent

**Visual form:**  
[Comparison, sequence, hierarchy, process, timeline, evidence stack, decision
field, hero, or another semantic form.]

**Relationship to communicate:**  
[What order, grouping, connection, scale, proximity, or contrast must mean.]

**Focal point:** [Dominant element.]  
**Hierarchy:** [Primary, supporting, and annotation hierarchy.]  
**Reading order:** [1 → 2 → 3.]  
**Density:** [Low / medium / high, with meaningful content limits.]  
**Brand/theme behavior:** [Required character and contrast.]  
**Adaptation tolerance:** [What may change across formats without changing intent.]

Describe communication semantics, not a target layout, component, master, CSS
class, coordinate system, or object model.

## Low-fidelity visual sketch

**Purpose:** [Ambiguity this sketch resolves, or Not applicable.]
**Status:** [Illustrative and non-binding, or Not applicable.]

```text
[Show approximate content regions, relative emphasis, and reading flow with a
simple text wireframe. Use short labels or exact projected content already stated
above; do not introduce new audience-visible copy here. Use Not applicable when
a sketch adds no clarity.]
```

- **Interpretation:** [Explain the intended grouping, dominance, and sequence, or Not applicable.]
- **Must preserve:** [Relationships that should survive adaptation, or Not applicable.]
- **May adapt:** [Placement, proportions, or silhouette that may change by format, or Not applicable.]

When used, the sketch supplements the normative `Projected content` and
`Composition intent`; if it conflicts with either, those sections take
precedence. Do not encode pixels, coordinates, slide-master regions, CSS grids,
renderer components, or target object types.

## Asset requirements

| Asset ID | Purpose | Source or creation brief | Policy | Constraints | Accessible description | Maturity |
|---|---|---|---|---|---|---|
| `AST-SNN-01` | [Narrative purpose] | [SRC-ID/path or format-neutral brief] | [essential / preferred / replaceable / decorative] | [Factual, brand, rights, crop, fidelity] | [Description or Not applicable] | [TBD / PROVISIONAL / CONFIRMED] |

For a chart or diagram, include the exact data, labels, relationships, intended
conclusion, and uncertainty here or in a registered source. Do not select a chart
library or native platform object.

For a generated image, preserve the approved creative brief and prohibited
content without requiring a particular generation model.

## Behavior intent

**Complete default frame:**  
[What must be visible and understandable before any action.]

**Optional audience behavior:**  
[Trigger and audience-visible response, or Not applicable.]

**Essential or complementary:** [essential / complementary / Not applicable]  
**Acceptable static fallback:** [Equivalent non-interactive state or Not applicable.]  
**Input, focus, and reduced-motion requirements:** [Requirements or Not applicable.]

Do not prescribe target transition names, event handlers, animation APIs, or
platform feature settings.

## Accessibility

[Slide-specific reading order, non-color cue, alternative description, data
summary, focus behavior, or `Inherit global contract`.]

## Speaker notes

[Oral explanation, emphasis, caveats, facilitation, timing, and transition. Use
`Not applicable` only when notes add no value. Notes must not repair missing
projected content for an asynchronous audience.]

## Slide acceptance criteria

- [Observable content or narrative criterion.]
- [Observable composition, evidence, behavior, or accessibility criterion.]

<!-- slide-spec:core:end -->
