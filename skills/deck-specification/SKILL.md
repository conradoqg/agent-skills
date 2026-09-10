---
name: deck-specification
description: Create, enrich, update, and review format-neutral deck specifications from briefs, notes, source documents, or existing presentations. Use when the user needs a storyline, slide-level content, evidence, visual intent, speaker notes, accessibility requirements, or acceptance criteria before producing or manipulating HTML, PowerPoint, Google Slides, or another presentation format. Do not use for rendering, exporting, or editing the final presentation file.
license: MIT
metadata:
  author: conradoqg
  version: "1.0"
---

# Deck Specification

Create and maintain the desired-state editorial contract for a presentation.
Stop at an approved, format-neutral specification package: one deck-level `deck-spec.md` plus one `slides/SNN.slide.md` file per slide. Production is downstream.

**Failure pattern:** Presentation planning leaks renderer concepts into the
source of truth, while content, evidence, and authorial intent remain too vague
to reproduce in a different medium.

**Verified by:** Repository structural checks and clean-slate create/review
scenarios using both specification templates and the review rubric.

## Core boundary

The specification owns **what the presentation must communicate and how it
should be perceived**. A downstream adapter owns how that intent maps to a
particular presentation technology.

Include:

- audience, purpose, thesis, decision or action, and delivery context;
- narrative arc, sections, slide order, optional paths, and dependencies;
- exact projected content, separate speaker notes, and stable slide IDs;
- claims, sources, factual maturity, assumptions, and open decisions;
- composition intent, hierarchy, reading order, density, and asset needs;
- behavior intent, static fallback, accessibility, and acceptance criteria;
- approval and change policy where they constrain downstream changes.

Exclude:

- HTML elements, selectors, CSS, JavaScript, runtime, or build commands;
- PowerPoint masters, layout IDs, object IDs, transitions, or export settings;
- Google Slides object IDs, API operations, or theme implementation details;
- renderer component names, catalog variants, pixel geometry, and output paths;
- platform-specific verification such as overflow, file packaging, or playback;
- generated implementation traces, hashes, and target-object mappings.

Format-neutral does not mean visually vague. Describe relationships and outcomes,
for example “a dominant metric above three guardrails,” not implementation such
as “use component X in a two-column CSS grid.”

## Canonical package

```text
presentations/<deck-slug>/
├── deck-spec.md
└── slides/
    ├── S01.slide.md
    ├── S02.slide.md
    └── ...
```

`deck-spec.md` owns deck-level intent, sources, narrative architecture, the slide
map, global direction, open decisions, and deck acceptance. Each linked slide file
owns that slide's complete desired state. Keep the package internally consistent;
no slide may exist only as a row in the map.

## When to load supporting files

- Read `references/specification-contract.md` before creating or materially
  restructuring a specification. It defines required semantics and the boundary
  with downstream consumers.
- Copy `assets/deck-spec-template.md` for the deck-level specification and
  `assets/slide-spec-template.md` once per slide when creating or normalizing a
  package. Remove instructional comments from the result.
- Read `references/review-rubric.md` for every explicit review and before marking
  a specification `REVIEWED` or recommending `APPROVED`.

## Modes

Determine the mode from the request; do not ask the user to choose a label.

- **Create:** turn intent and available sources into a new desired-state spec.
- **Enrich:** add source-grounded content, evidence, notes, visual intent, or
  acceptance criteria without changing approved intent silently.
- **Update:** apply a requested change, map its narrative and factual impact, and
  preserve stable IDs and locked content.
- **Review:** report defects and proposed fixes without mutating the spec unless
  the user also asks for edits.
- **Extract:** describe an existing presentation as a neutral desired-state spec;
  inspect the source but do not modify it.

## Procedure

1. **Locate the source of truth.** Prefer an existing `deck-spec.md` and all
   slide files linked from its map. If none exist, inventory the brief, notes,
   sources, and any existing presentation. Treat rendered files as evidence of
   current state, not as the new specification format.
2. **Establish the decision context.** Determine audience, delivery mode, primary
   purpose, thesis, requested decision or action, available time, language, and
   source precedence. Ask at most three questions in a round, and only when an
   answer changes the architecture or prevents a consequential unsupported claim.
3. **Choose a narrative architecture.** Select one primary arc appropriate to the
   purpose, then define section entry/exit conditions and a slide map. Record
   assumptions instead of disguising them as facts.
4. **Specify slides completely.** Create one `slides/SNN.slide.md` from the
   slide template for every row in the deck map. Give it a stable `SNN` ID, one
   job in the story, one takeaway, exact projected content, evidence, composition
   intent, notes, and observable acceptance criteria. Use `Not applicable` rather
   than omitting conditional fields ambiguously.
5. **Keep claims traceable.** Register sources once, reference them from claim IDs,
   and include unit, period, population, and caveats when relevant. Mark unsupported
   consequential content `PROVISIONAL`; never invent evidence, quotations, brands,
   customers, metrics, or product behavior.
6. **Express visual and behavior intent semantically.** State focal point,
   hierarchy, relationships, reading order, density, asset purpose, default frame,
   optional behavior, and acceptable fallback. Do not select target-specific
   components or prescribe implementation mechanics.
7. **Apply mode-specific change discipline.**
   - For Enrich, preserve the thesis, requested decision, `LOCKED` text, and stable
     IDs unless the user explicitly changes them.
   - For Update, identify directly affected slides, dependent slides, repeated
     claims, source changes, notes, and the closing ask before editing.
   - For Review, use the rubric and return findings before patches.
8. **Validate the whole deck.** Check narrative continuity, evidence coverage,
   projected-content completeness, delivery-mode fit, accessibility, acceptance
   criteria, state consistency, and format neutrality. Fix defects within the
   requested edit scope; otherwise report them.
9. **Finish at the specification boundary.** Return or persist `deck-spec.md`
   with all linked `slides/SNN.slide.md` files, then summarize assumptions, open
   decisions, and approval state. Do not generate or manipulate the presentation
   unless the user starts a separate downstream task.

## State model

Keep these axes independent:

| Axis | Values | Meaning |
|---|---|---|
| `Maturity` | `TBD`, `PROVISIONAL`, `CONFIRMED` | Factual completeness and confidence. |
| `Change policy` | `EDITABLE`, `LOCKED` | Whether wording or intent may change without new approval. |
| `Approval` | `DRAFT`, `REVIEWED`, `APPROVED` | Human governance state. |

Only a named human or authority may make content `LOCKED` or `APPROVED`. Every
`LOCKED` deck, slide, or claim records its `Lock authority` separately from
`Approved by`; use `Not applicable` for `EDITABLE` content. Review by this skill
may support a recommendation, but it does not impersonate approval.

## Review output

For review-only requests, lead with findings in severity order:

```text
BLOCKER — [Spec ID or deck] Problem. Why it matters. Required correction.
MAJOR — [Spec ID or deck] Problem. Why it matters. Proposed correction.
MINOR — [Spec ID or deck] Problem. Concise improvement.
```

Then report the resulting recommendation: `DRAFT`, `REVIEWED`, or “ready for
human approval.” Never report `APPROVED` without explicit human authority.

## Definition of done

A specification is ready for downstream use when:

- the audience, thesis, purpose, and requested decision/action agree;
- every included slide has a stable ID, narrative job, takeaway, projected
  content, composition intent, and acceptance criteria;
- consequential claims are sourced or visibly `PROVISIONAL`;
- the slide sequence has no unexplained dependency gaps;
- notes and projected content are clearly separated;
- essential meaning survives without animation or interaction;
- accessibility and delivery-mode requirements are explicit;
- open decisions, assumptions, and locked content are visible;
- no target implementation identifiers or mechanics are required to understand
  the desired presentation.

## Gotchas

- A target file may be an input without becoming the specification model. Extract
  meaning from a PPTX, Google Slides deck, PDF, or HTML deck; do not copy its
  internal object model into `deck-spec.md`.
- Brand constraints are neutral; a master-slide ID or CSS token is not. Record
  the required brand behavior and source asset, leaving mapping downstream.
- “Use a chart” is too vague. Record the comparison, data, annotation, dominant
  conclusion, and uncertainty; leave the chart library or native object type out.
- Interaction may express authorial intent, but all essential content needs a
  comprehensible default frame and acceptable non-interactive fallback.
- `LOCKED` protects an approved decision or wording, not factual truth. Surface
  contradictory evidence rather than preserving a false claim silently.
- Updating one number requires checking repeated claims, calculations, notes,
  section conclusions, and the closing ask.

## What did not work

- A canonical template tied to one HTML template, runtime, CSS modules, catalog
  variants, standalone build, and DOM mappings could not serve PowerPoint or
  Google Slides without carrying irrelevant implementation debt.
- A single monolithic specification made slide-local review, ownership, and
  parallel enrichment unnecessarily conflict-prone. Keep global intent in
  `deck-spec.md` and each slide’s complete contract in its own stable file.
