# Risk classification and approval

Read this when a change crosses files, consumers, module boundaries, framework
conventions, or any public/dynamic contract.

Risk measures regression/rollback exposure, not the value of the improvement.
Classify the highest applicable hazard; several low-risk edits combined into a
broad diff may become medium/high risk.

## Low risk — plan, then apply

Typical examples:

- a local variable/parameter rename with language-aware references and no runtime lookup;
- removal of an obviously narrative comment;
- a local control-flow simplification with focused tests;
- extraction of a private cohesive helper in the same file;
- inlining a private pass-through wrapper with no semantic role;
- internal naming normalization that follows an unambiguous local convention.

Required evidence: inspect local callers, run a focused check, and review the diff.

## Medium risk — coverage and scope gate

Typical examples:

- splitting a component/class or consolidating files;
- moving files inside a package/module;
- changing internal exports or several consumers;
- renames used by tests, configuration, decorators, or dependency injection;
- new characterization seams or changes affecting lifecycle/effect ordering.

Apply when all are true:

1. the user's stated scope clearly includes the structural change;
2. affected behavior has adequate existing or newly proven characterization;
3. every known consumer can be updated and checked;
4. rollback is local and understandable.

Otherwise ask for approval with the missing evidence and smaller alternative.

## High risk — explicit approval immediately before editing

- public API or externally imported path rename;
- serialized/persisted/configuration key change;
- names/paths used by reflection, framework convention, templates, registries,
  dynamic imports, plugin discovery, or code generation;
- cross-module reorganization or a broad, hard-to-review diff;
- deletion whose inactivity cannot be proven;
- change with difficult rollback or unknown external consumers.

Approval request must state: exact proposed change, affected consumers/contracts,
why lower-risk alternatives are insufficient, verification plan, rollback, and
remaining uncertainty. Do not bundle several decisions into one vague approval.

## Out of scope regardless of approval in this run

- feature addition/removal or business-rule changes;
- bug fixes discovered during refactoring;
- application/infrastructure architecture redesign;
- framework, database, service, provider, schema, or protocol replacement;
- speculative performance work;
- introducing DDD, Clean Architecture, hexagonal/ports-adapters, or new layers as
  an objective.

Offer these as a separate task. A user can explicitly open that separate scope,
but then this craftsmanship workflow no longer supplies the governing process.

## Approval record

```text
change:
risk and trigger:
contracts/consumers:
evidence already available:
verification still required:
rollback:
user decision:
```
