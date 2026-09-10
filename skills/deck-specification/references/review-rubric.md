# Deck specification review rubric

Use this rubric for explicit reviews and before recommending that a specification
is ready for human approval. Review the desired presentation, not a rendered
output.

## Severity

- **BLOCKER:** prevents reliable downstream production or could cause a materially
  false, incoherent, inaccessible, or unauthorized presentation.
- **MAJOR:** substantially weakens the decision, narrative, evidence, or ability to
  realize the deck consistently across formats.
- **MINOR:** localized clarity, consistency, or completeness improvement that does
  not change the core argument.

## Review procedure

1. Read `deck-spec.md`, its source registry, and every linked slide file before
   judging slides in isolation. Report missing, orphaned, duplicated, or mismatched
   slide files.
2. Restate the audience, thesis, purpose, requested decision/action, and narrative
   arc in one sentence each. If the spec does not support this, report a blocker.
3. Trace the narrative from opening contract to closing contract. Check every
   section and slide dependency.
4. Trace consequential claims to sources and inspect maturity, context, caveats,
   and contradictions.
5. Inspect every `slides/SNN.slide.md` for exact projected content, one primary
   takeaway, composition intent, notes separation, accessibility, and acceptance
   criteria.
6. Test format neutrality: imagine independent HTML, PowerPoint, and Google Slides
   producers. They should understand the same desired result without carrying
   another target's implementation model.
7. Check state and authority. Every `LOCKED` deck, slide, and claim must name
   its lock authority separately from approval. Do not upgrade approval or lock
   content without a named human decision.
8. Report findings in severity order. Do not mutate the specification during a
   review-only request.

## Deck-level checks

### Decision and audience

- Is the primary audience specific enough to guide language, evidence, and depth?
- Is the purpose distinguishable from the topic?
- Is the requested decision or action observable and owned?
- Does delivery mode account for live explanation versus asynchronous reading?
- Are prior knowledge, likely resistance, and accessibility needs represented?

### Thesis and scope

- Is the thesis one debatable, supportable statement rather than a category label?
- Does every major section advance or test that thesis?
- Are out-of-scope decisions visible?
- Are assumptions distinguished from confirmed facts?

### Narrative

- Does the opening establish relevance and the deck's contract quickly?
- Does each section have a clear entry and exit condition?
- Does every slide perform a unique job?
- Are setup, evidence, implication, and action connected without logical jumps?
- Are optional paths truly optional, with the main narrative complete without them?
- Does the closing synthesize the argument and request the declared action?
- Can the intended duration accommodate the density and number of slides?

### Evidence

- Does every consequential claim have a source or visible `PROVISIONAL` status?
- Do numbers include unit, period, population/denominator, and caveat where needed?
- Are derived claims reproducible from registered inputs?
- Are source conflicts and precedence explicit?
- Are quotations, logos, customer names, screenshots, and product claims authorized?
- Does `LOCKED` wording avoid masquerading as factual confirmation?

### Global presentation direction

- Does the specified character fit the audience and decision?
- Are hierarchy, density, repetition, and variation intentional?
- Do visual requirements communicate relationships rather than decorate topics?
- Are brand constraints linked to authoritative sources?
- Do data-visualization requirements avoid misleading encodings?
- Can essential meaning survive without animation or interaction?

### Accessibility and delivery

- Is visible content understandable without relying only on color, motion, or
  interaction?
- Do required assets have meaningful accessible descriptions?
- Are reading order and keyboard/focus expectations stated where behavior exists?
- Is reduced-motion or static fallback defined for behavior-dependent slides?
- Are speaker notes prevented from carrying essential asynchronous content?

### Format neutrality

Report a finding when understanding the desired presentation requires:

- DOM elements, selectors, CSS modules, JavaScript, runtime, or build knowledge;
- PowerPoint master/layout IDs, native transition names, or object identifiers;
- Google Slides object IDs, API calls, or implementation coordinates;
- renderer catalog variants or component identifiers;
- platform output paths, hashes, packaging, or post-render QA state.

Do not report normal source provenance or an optional downstream preference as a
leak unless it constrains the canonical semantic model.

## Slide-level checks

For each slide, verify:

1. **Identity:** stable unique ID and internally consistent state.
2. **Narrative job:** one clear role and audience question.
3. **Takeaway:** one complete statement, not merely a topic or production note.
4. **Projected content:** exact audience-visible copy, labels, values, categories,
   annotations, and calls to action needed to author the slide.
5. **Evidence:** claim IDs, source locators, maturity, and required context.
6. **Composition intent:** visual form, focal point, hierarchy, relationship,
   reading order, and density without target mechanics. When a visual sketch is
   applicable, verify that it is legible, illustrative, non-binding, faithful to
   projected content and composition intent, and free of target geometry or
   components; accept `Not applicable` when prose is sufficient.
7. **Assets:** purpose, source/brief, fidelity constraints, status, and accessible
   description.
8. **Behavior:** complete default frame, optional response, and acceptable fallback.
9. **Notes:** oral guidance and transitions separated from projected content.
10. **Acceptance:** observable, slide-specific criteria rather than “looks good.”

## Update review

When reviewing a change, also verify:

- every slide-map entry links to one matching file and no slide file is orphaned;

- the change reached every repeated claim and dependent slide;
- the narrative still supports the closing action;
- source and calculation changes propagated to labels, notes, and caveats;
- stable IDs were preserved through reordering;
- deleted slides did not leave broken dependencies or source references;
- locked content and prior approvals were not bypassed;
- newly provisional content is visibly marked.

## Finding format

Use one finding per line:

```text
BLOCKER — [S04] The 37% adoption claim has no source locator or denominator. Add the dataset/table locator and population, or mark the claim PROVISIONAL.
MAJOR — [Deck] The declared decision is pilot approval, but the closing asks only for feedback. Align the closing contract and final slide with the declared decision.
MINOR — [S07] The takeaway repeats the headline. Rewrite it as the implication the audience should retain.
```

After findings, include:

```text
Recommendation: DRAFT | REVIEWED | Ready for human approval
Open decisions: [IDs or None]
Scope checked: [whole deck or exact subset]
Not checked: [unavailable sources or excluded areas]
```

Use `REVIEWED` only when no blockers remain and the performed review scope is
explicit. Use “Ready for human approval” instead of assigning `APPROVED`.

## No-finding result

If no findings remain, state that the reviewed scope satisfies this rubric, list
unavailable evidence or excluded areas, and recommend the next human approval
step. Do not infer approval from silence.
