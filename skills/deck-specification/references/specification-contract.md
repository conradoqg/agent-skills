# Format-neutral deck specification contract

## Purpose

A deck specification is the desired-state editorial contract for a presentation.
It must be precise enough that independent downstream producers can create
semantically equivalent presentations in different technologies without asking
the author to reconstruct intent.

The specification is not a renderer handoff, implementation plan, source file for
a particular platform, or record of generated objects.

## Layer boundary

| Layer | Owns | Does not own |
|---|---|---|
| Deck specification | Meaning, narrative, projected content, evidence, visual/behavior intent, notes, accessibility, acceptance | Target APIs, object models, build/export, render QA |
| Target adapter | Mapping stable spec IDs and semantic intent to a chosen platform or template | Rewriting approved thesis, evidence, or locked content |
| Producer/manipulator | Creating or editing the actual presentation and validating its output | Treating target limitations as silent permission to change intent |

A downstream limitation creates a reported conflict. It does not silently mutate
the specification.

## Canonical artifact

Use a Markdown package with one deck-level file and one file per slide:

```text
presentations/<deck-slug>/
├── deck-spec.md
└── slides/
    ├── S01.slide.md
    ├── S02.slide.md
    └── ...
```

`deck-spec.md` owns identity, decision context, sources, narrative architecture,
global direction, the ordered slide map, open decisions, and deck acceptance.
Each `slides/SNN.slide.md` owns the complete desired state of exactly one slide.
The slide map links to every slide file; file name and internal `Spec ID` must agree.

Markdown keeps the package human-readable, diffable, independently reviewable,
and presentation-platform neutral. Use English headings, field names, IDs, and
enum values. Write audience-visible content and speaker notes in the deck's
declared language.

## Source-of-truth rules

- `deck-spec.md` and its linked slide files jointly describe the desired presentation.
- Briefs, source documents, datasets, and existing presentations provide evidence
  and constraints; they do not replace the specification.
- A rendered or editable presentation is a downstream realization. Differences
  from the specification must be surfaced rather than reconciled silently.
- Stable `SNN` IDs identify authored slides independently of physical order or
  target object IDs.
- Target mappings belong to adapter-owned sidecars or implementation state.
- Git may provide revision history; do not require an in-document process log.

## Required deck semantics

A usable specification states:

1. **Identity:** title, language, owner, maturity, change policy, and approval.
2. **Decision context:** audience, purpose, thesis, requested decision/action,
   delivery mode, duration, prior knowledge, motivations, and resistance.
3. **Scope:** what the deck will and will not resolve.
4. **Evidence:** source registry, precedence, assumptions, claim maturity, and
   unresolved conflicts.
5. **Narrative:** arc, opening and closing contracts, sections, slide map,
   dependencies, and optional paths.
6. **Presentation direction:** editorial character, hierarchy, density, visual
   language, data communication, asset policy, behavior intent, and accessibility.
7. **Slide files:** one linked, complete desired-state file for every included slide.
8. **Open decisions:** unresolved content or decisions with owner and next action.
9. **Acceptance:** observable conditions for the deck and each slide.

## Required slide semantics

Every slide record must answer:

- What stable slide is this?
- What job does it perform in the story?
- What audience question does it answer?
- What single takeaway must survive?
- What exact content is projected?
- Which claims require evidence and where does it come from?
- What visual relationship must the audience understand?
- What should dominate and in what reading order?
- Which assets are required and why?
- What, if anything, belongs in speaker notes rather than on screen?
- What behavior is desirable, and what complete default/static state is required?
- What slide-specific accessibility constraints apply?
- How can a reviewer observe that the slide is correct?

A cover, divider, navigation slide, or deliberate pause may use `Not applicable`
for evidence or takeaway when its narrative role makes that explicit.

## Exact projected content

Projected content is desired audience-visible content, not a topic summary or
production instruction. It must be exact enough to author without inventing the
message during production.

Good:

```text
Headline: Adoption increased from 18% to 37% between January and March.
Annotation: The largest increase followed the onboarding change in February.
```

Too vague:

```text
Show adoption growth and make it compelling.
```

Speaker notes hold oral explanation, transitions, caveats, and facilitation
prompts that should not appear on the canvas. Never rely on notes to repair
missing projected content in an asynchronous deck.

## Evidence model

Register each source once with a stable `SRC-NN` ID. Use claim IDs such as
`CLM-S04-01` within slide records.

A consequential quantitative claim should include, when available:

- value and unit;
- period or point in time;
- population, sample, or denominator;
- source locator such as page, section, table, cell, query, or interview;
- caveat, uncertainty, or calculation method.

`No source` is allowed only when paired with `PROVISIONAL`. An approved sentence
can still be factually provisional; approval and maturity are independent.

## Visual intent model

Specify communication semantics rather than a target layout implementation:

- **Visual form:** comparison, sequence, hierarchy, process, timeline, map,
  architecture, evidence stack, decision field, hero, or another meaningful form.
- **Relationship:** what proximity, order, scale, connection, grouping, or contrast
  must communicate.
- **Hierarchy:** dominant element, supporting elements, and annotation priority.
- **Reading order:** intended progression through the visible content.
- **Density:** low, medium, or high, plus meaningful content limits.
- **Theme/brand behavior:** required character, contrast, logo use, typography,
  and source guidelines without target identifiers.
- **Data behavior:** comparison baseline, scale, uncertainty, annotations, and
  truthful visual encoding.

Do not encode target-specific component names, class names, master/layout IDs,
object IDs, fixed pixel coordinates, or animation APIs.

## Asset model

An asset requirement records:

- stable asset ID;
- purpose in the argument;
- existing source or creation brief;
- factual and brand constraints;
- whether it is essential, preferred, replaceable, or decorative;
- required accessible description;
- maturity and approval.

For charts and diagrams, preserve source data, labels, relationships, and the
intended conclusion. A downstream producer chooses native objects, SVG, images,
or another implementation.

For generated images, preserve an approved creation brief and prohibited content.
Do not require a particular image model or platform in the canonical record.

## Behavior intent

Behavior belongs in the specification only when it changes audience experience
or narrative control. Record:

- complete default frame;
- optional trigger and audience-visible response;
- whether the behavior is essential or complementary;
- acceptable static or unsupported-platform fallback;
- keyboard, focus, reduced-motion, or facilitation requirements when relevant.

Do not prescribe transition names, JavaScript events, animation APIs, or target
feature settings. If essential meaning cannot survive the fallback, the slide is
not format-neutral and the conflict must be explicit.

## State and authority

Use independent axes:

| Axis | Values |
|---|---|
| `Maturity` | `TBD`, `PROVISIONAL`, `CONFIRMED` |
| `Change policy` | `EDITABLE`, `LOCKED` |
| `Approval` | `DRAFT`, `REVIEWED`, `APPROVED` |

Rules:

- `LOCKED` requires a named human or authority in the same deck, slide, or
  claim record; lock authority is not inferred from approval.
- `EDITABLE` records `Lock authority` as `Not applicable`.
- `APPROVED` requires explicit human approval recorded separately.
- A `PROVISIONAL` claim may be `LOCKED`; preserve its wording while keeping its
  uncertainty visible.
- Contradictory evidence always creates an open decision, even for locked text.
- An agent may resolve a `TBD` only when permitted and supported by evidence.

## Update semantics

Before changing an existing specification package, create an impact map covering:

- directly affected slides;
- dependent setup and conclusion slides;
- repeated claims, figures, and terminology;
- source precedence or calculation changes;
- speaker notes and optional paths;
- the requested decision/action and closing contract;
- locked content and approvals that need renewal.

Preserve stable slide IDs and file names when reordering; update only the deck
map order and affected dependencies. Create a new file and ID for a genuinely new
slide. Delete a slide file only after removing its map entry and repairing all
references.

## Neutrality examples

| Keep in the specification | Move downstream |
|---|---|
| “One dominant metric with three guardrails” | CSS grid, PowerPoint layout, Google Slides coordinates |
| “Optional drill-down; default frame remains complete” | Click handler, Morph transition, Apps Script action |
| “Use the approved brand mark from SRC-04” | File embedding, image relationship ID, CDN path |
| “Chart compares monthly adoption and annotates February” | ECharts config, native chart object, SVG implementation |
| “Stable slide ID S06” | DOM ID, PPTX slide index, Google object ID |
| “Readable in light and dark contexts” | Theme token names or platform theme operations |

Mentioning a target in source provenance or user context is not itself a leak.
Requiring its internal mechanics to understand the desired presentation is.

## Downstream consumer contract

A downstream adapter may:

- map stable IDs to target objects;
- select templates, layouts, components, and supported behavior;
- report target limitations and propose compatible alternatives;
- validate the realized presentation;
- maintain implementation-specific state outside `deck-spec.md`.

It may not silently:

- change the thesis, requested action, slide takeaway, evidence, or source status;
- rewrite `LOCKED` content;
- hide `PROVISIONAL` status;
- drop essential content because a target feature is unavailable;
- reinterpret a visual relationship solely to fit a convenient layout.
