# Deck Specification

> Canonical deck-level desired-state specification. Replace bracketed
> placeholders and remove instructional text before review. Keep headings and
> stable IDs in English; write audience-visible content in the declared deck
> language. Create one linked `slides/SNN.slide.md` file per slide from
> `slide-spec-template.md`. This package contains no presentation-platform mechanics.

<!-- deck-spec:core:start -->

## Deck identity

| Field | Specification |
|---|---|
| `Specification format version` | `1.0` |
| `Deck title` | [Complete title] |
| `Deck slug` | [kebab-case-slug] |
| `Content language` | [Locale, for example pt-BR] |
| `Specification owner` | [Person or team] |
| `Delivery mode` | [live / async / hybrid / workshop] |
| `Audience size and setting` | [Expected setting] |
| `Target duration` | [Duration or reading time] |
| `Maturity` | [TBD / PROVISIONAL / CONFIRMED] |
| `Change policy` | [EDITABLE / LOCKED] |
| `Lock authority` | [Named human/authority, or Not applicable when EDITABLE] |
| `Approval` | [DRAFT / REVIEWED / APPROVED] |
| `Approved by` | [Named authority or Not applicable] |

## Narrative brief

| Question | Answer |
|---|---|
| `Primary audience` | [Who must decide, understand, or act] |
| `Purpose` | [Inform / align / persuade / decide / teach / sell / report] |
| `Current tension` | [Problem or opportunity perceived now] |
| `Central thesis` | [One debatable, supportable sentence] |
| `Decision or action requested` | [Observable outcome] |
| `Why now` | [Consequence of acting or not acting now] |
| `Success` | [What will be understood, decided, or initiated] |

## Decision authority

| Role | Person or group | Authority |
|---|---|---|
| `Recommendation owner` | [Name/team] | [What they may propose] |
| `Decision authority` | [Name/forum] | [What they may approve] |
| `Veto holders` | [Name/team or None] | [Scope of veto] |
| `Next-action owner` | [Name/team] | [Action after the deck] |

## Audience and delivery context

### Primary audience

[Role, context, relationship to the topic, and expected decision.]

### Secondary audience

[People who may receive or reuse the presentation later, or Not applicable.]

### Prior knowledge

[What may be assumed and what must be explained.]

### Motivations and resistance

[What matters to the audience, likely objections, and risks they will avoid.]

### Accessibility and language needs

[Language, terminology, remote-reading, contrast, captioning, cognitive-load, or
other needs.]

### Delivery conditions

[Live facilitation, asynchronous reading, room/remote constraints, discussion,
timeboxing, or other content-relevant conditions.]

## Scope boundaries

### In scope

- [Question, argument, or decision this deck will address.]

### Out of scope

- [Question or decision assigned to another forum.]

## Source registry

List only available sources. Use `PROVISIONAL` for consequential content without
a source.

| ID | Source | Type | Location | Authority | Intended use |
|---|---|---|---|---|---|
| `SRC-01` | [Name] | [primary / secondary / interview / dataset / existing presentation / brand] | [Path, URL, or human locator] | [Owner/date/status] | [Claims or slides] |

### Source precedence and conflicts

1. [Highest-authority source and scope.]
2. [Next source and scope.]

[Describe known conflicts. Do not choose silently between equally authoritative
sources.]

## Content and evidence rules

- Write headlines as useful statements, not only topic labels.
- Give each content slide one primary takeaway.
- Separate exact projected content from speaker notes.
- Do not invent metrics, quotations, customers, logos, screenshots, product
  behavior, or evidence.
- Keep `PROVISIONAL` status visible next to affected content.
- Give quantitative claims a unit, period, population/denominator, source, and
  caveat when available.
- Preserve `LOCKED` wording literally until the named authority changes it.
- [Deck-specific terminology, confidentiality, or editorial rule.]

## Narrative architecture

### Narrative arc

[One-line progression, for example context → tension → evidence → choice → action.]

### Opening contract

[What the audience should understand or feel within the opening moments.]

### Closing contract

[How the thesis will be synthesized and what action will be requested.]

### Sections

| Section | Narrative function | Entry condition | Exit condition |
|---|---|---|---|
| [Name] | [orient / frame / explain / compare / demonstrate / evidence / decide / govern / act / close] | [What is already understood] | [What must be clear before advancing] |

### Slide map

Stable IDs do not change when slides are reordered.

| Order | Spec ID | Specification file | Working title | Section | Role in the argument | Maturity | Inclusion |
|---:|---|---|---|---|---|---|---|
| 1 | `S01` | [`slides/S01.slide.md`](slides/S01.slide.md) | [Title] | [Section] | [Unique narrative job] | [TBD / PROVISIONAL / CONFIRMED] | [required / optional / appendix] |

### Narrative dependencies

- [S04 depends on S03 because...]
- [S08 may be omitted in a shorter version because...]

### Optional paths and appendices

[Optional drill-downs, audience-specific paths, or Not applicable. The primary
narrative must remain complete without optional material.]

## Global presentation direction

### Editorial character

[For example: executive, direct, technically credible, low on jargon.]

### Visual hierarchy

[What should dominate across the deck: thesis, evidence, product, process,
decision, or another element.]

### Density and rhythm

[Alternation between dense and sparse slides, content limits, and pacing.]

### Visual language

[Preferred forms such as photography, diagrams, screenshots, charts, editorial
type, or restrained illustration. Describe semantics, not platform components.]

### Brand and typography constraints

[Authoritative guidelines and must-use assets. Do not include target-specific
theme tokens, master IDs, or CSS names.]

### Data visualization direction

[Comparisons, baselines, scales, uncertainty, annotations, and prohibited
misleading treatments.]

### Repetition and variation

[Elements that create coherence and where silhouette or form should change.]

### Behavior intent

[Whether the deck benefits from optional exploration, staged facilitation, media,
or other behavior. Essential meaning must remain available in a complete default
and static frame.]

## Global accessibility contract

- Projected content has a meaningful reading order.
- Informative images have useful alternative descriptions.
- Charts and diagrams have textual meaning and an acceptable static fallback.
- Essential content does not depend only on color, motion, audio, or interaction.
- Optional behavior is keyboard-operable and restores focus when applicable.
- Non-essential motion can be reduced or removed.
- Speaker notes do not carry essential content for asynchronous audiences.
- [Additional deck-specific requirement.]

## Slide specification files

Create one file from `slide-spec-template.md` for every slide-map row:

```text
slides/S01.slide.md
slides/S02.slide.md
...
```

Rules:

- File name, internal `Spec ID`, and slide-map ID must match.
- A slide file contains the complete desired state of exactly one slide.
- Reordering changes the map order, not stable IDs or file names.
- A slide file must not contain target object IDs or implementation mechanics.
- Add a new file for a new slide. Remove a file only after repairing map entries,
  dependencies, source usage, and open decisions.

## Open decisions and provisional content

| ID | Slide | Maturity | Decision or content | Owner | Authority | Agent may resolve | Next evidence/action |
|---|---|---|---|---|---|---|---|
| `OPEN-01` | [SNN or deck] | [TBD / PROVISIONAL] | [Description] | [Owner] | [Who decides] | [yes / no] | [Next action] |

## Deck acceptance criteria

- [ ] Audience, thesis, purpose, and requested decision/action agree.
- [ ] Every required slide has a stable ID and unique narrative job.
- [ ] Every content slide has one takeaway and exact projected content.
- [ ] Consequential claims are sourced or visibly `PROVISIONAL`.
- [ ] Narrative dependencies and optional paths are explicit.
- [ ] Visual intent describes communication semantics rather than target mechanics.
- [ ] Assets have purpose, provenance/brief, constraints, and accessibility needs.
- [ ] Essential meaning survives without animation or interaction.
- [ ] Speaker notes and projected content are clearly separated.
- [ ] Accessibility and delivery-mode requirements are explicit.
- [ ] Open decisions, assumptions, locked content, and authority are visible.
- [ ] No target-specific implementation identifier is required to understand the
      desired presentation.
- [ ] The specification is ready to be consumed by independent downstream
      adapters without changing approved intent.

<!-- deck-spec:core:end -->
