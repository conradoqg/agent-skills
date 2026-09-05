# Cohesion and components

Read this when splitting, extracting, consolidating, or inlining functions,
classes, modules, or UI components.

## Cohesion test

Ask what the unit owns and why its parts change. A unit can be long and cohesive
when all parts implement one policy or state transition. A short unit can be
incoherent when it mixes unrelated effects.

Evidence of mixed responsibility includes:

- separate domain reasons cause independent edits to the same unit;
- one block interprets policy while another performs unrelated presentation or I/O;
- state/effect ordering is difficult to state as one contract;
- tests must boot unrelated dependencies to reach one behavior;
- callers need to understand internal representation or orchestration details.

## Extract when

- the extracted code has a stable, nameable concept;
- it owns an independent responsibility, policy, invariant, or test seam;
- the caller becomes a clearer high-level narrative;
- the boundary hides information and reduces knowledge shared with consumers;
- reuse or co-change evidence exists now, not only hypothetically.

## Keep together when

- extraction creates a pass-through wrapper or one-use fragment without a concept;
- the new name merely repeats the implementation;
- understanding requires jumping between more files than before;
- the pieces share one invariant and always change together;
- the motive is a line/function/file-count threshold;
- the proposed interface, factory, repository, adapter, or DI layer serves one
  implementation without a real seam/coupling need.

## Consolidate or inline when

- a layer forwards every operation and owns no policy, validation, lifecycle,
  translation, or stable boundary;
- artificial fragmentation splits one concept across several tiny files;
- the abstraction exposes as much complexity as it hides;
- two names represent the same domain concept and co-evolve for the same reason.

Do not consolidate duplicate-looking logic whose business meanings may diverge.
Similarity of syntax is weaker evidence than shared ownership and evolution.

## UI components

Preserve props, emitted events, state ownership, accessibility semantics, DOM
order when observable, focus behavior, effect order, suspense/error boundaries,
and styling hooks.

Extract a UI component when it represents a meaningful user/interface concept,
owns coherent behavior, or has proven reuse/test value. Do not fragment simple
markup into one-use wrapper components. Keep elements together when they change
together to express one interaction.

## Structural change checklist

1. State the current unit's responsibility in one sentence.
2. State each candidate unit's ownership and hidden decision.
3. Compare public surface and navigation before/after.
4. Identify state/effect ordering and framework lifecycle hazards.
5. Decide whether the boundary reduces total cognitive load.
6. Characterize observable behavior before editing when coverage is weak.
7. Apply one structural change, update consumers, and verify before more cleanup.
