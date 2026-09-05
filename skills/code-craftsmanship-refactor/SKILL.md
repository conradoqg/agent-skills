---
name: code-craftsmanship-refactor
description: >
  Use this skill to review and refactor existing working code for professional clarity, intention-revealing naming, cohesive components, discoverable file organization, useful comments, and maintainability while preserving behavior and public contracts. Trigger for requests to polish, clean up, professionalize, reorganize, rename, document, standardize, or perform a craftsmanship pass, even when the user does not say "refactor." Do not use for feature development, bug fixes, architecture redesign, security-only review, performance optimization, dependency or framework selection, or formatting-only requests.
license: MIT
metadata:
  author: Conrado Quilles Gomes
  version: "0.1.0"
---

# Code Craftsmanship Refactor

Improve the internal presentation and maintainability of working code without
changing what its users, callers, integrations, or operators can observe.

The failure pattern this skill prevents is a cosmetic cleanup that creates
churn, speculative abstractions, hidden contract changes, or an unverified
regression. Treat preservation evidence as part of the refactor, not an
afterthought.

## Defaults

- `mode`: `review-and-apply`. Use `review-only` when requested; in that mode do
  not edit source, tests, configuration, or documentation.
- `strictness`: `conservative`. Use `standard` only when the user asks for a
  broader craftsmanship pass.
- `approval`: `risk-based`.
- `language`: detect from the scoped files unless the user overrides it.
- `verification`: infer existing project commands and add user-supplied checks.
- `scope`: use, in order, an explicit path/module, the current diff, or the
  smallest relevant module. If there is neither an explicit scope nor a diff,
  ask for one concise scope choice. Never infer repository-wide scope.

Repository-wide work requires an explicit request. Divide it by module and
finish one independently verifiable batch before starting the next.

## Non-negotiable boundaries

1. Preserve observable behavior, features, business rules, public contracts,
   side effects, error messages, logging, telemetry, accessibility, timing/order
   dependencies, and serialization unless the user separately authorizes a
   behavior change.
2. Do not combine a discovered bug fix with the refactor. Record the bug and
   preserve it; fixing it is a separate task.
3. Do not redesign application or infrastructure architecture, replace a
   framework/service/provider, change a schema or protocol, or introduce a
   named architecture. Approval inside this workflow does not bring those
   changes into scope. When a request mandates Clean Architecture or another
   named pattern without code-specific evidence, explicitly reject mechanical
   checklist enforcement. Do not offer to perform that migration as a follow-on
   inside this workflow; any later architecture task must be separately
   authorized and governed by local conventions and present complexity.
4. Preserve unrelated and pre-existing user changes. Never reset, overwrite,
   reformat, or "clean up" work outside the selected scope.
5. Do not edit generated code, vendored dependencies, historical migrations,
   lockfiles, or snapshots unless the requested refactor necessarily regenerates
   them through the project's established tool.
6. Do not remove apparently dead code from textual search alone. Reflection,
   serialization, dependency injection, templates, configuration, registries,
   and dynamic imports can make names and paths part of the contract.

If the request is actually a feature, bug fix, architecture decision, security
audit, performance optimization, or formatter run, say that this skill does not
govern the task and handle it as a separate workflow. Do not disguise that work
as craftsmanship.

## Workflow

### 1. Establish scope and conventions

- Read repository instructions (`AGENTS.md`, `CLAUDE.md`, contributing guides),
  formatter/linter configuration, package/build manifests, and relevant ADRs.
- Inspect version-control status and record pre-existing changes before editing.
- Identify the scoped files, their callers/consumers, adjacent tests, public
  exports, and generated/vendor exclusions.
- Sample neighboring code to learn the dominant naming, layout, import/export,
  error, typing, documentation, and test conventions. A project rule overrides
  an external style preference.
- Locate the smallest useful test, lint, typecheck, build, and smoke commands.

### 2. Capture the behavioral baseline

Before editing, run the smallest relevant existing checks and record commands,
exit status, and failures. Expand to broader checks only when proportional to
the change.

Map observables that tests may miss: exported names and signatures, routes,
serialized fields, error text, logs, files, ordering, events, state transitions,
DOM/accessibility, configuration keys, reflection and dynamic loading. Read
`references/behavior-preservation.md` before changing code with weak coverage,
dynamic consumers, or public contracts.

For interactive UI, name the concrete accessibility and interaction observables:
keyboard navigation, focus behavior, selection semantics, labels/descriptions,
event order, DOM/rendering order, formatting, and styling hooks. Pair every
material UI proposal with a focused interaction or accessibility check; when
runtime verification is unavailable, state that limitation without omitting the
expected observable.

Do not attribute baseline failures to the refactor. If the baseline is already
red, later evidence must distinguish unchanged failures from new ones.

### 3. Audit before editing

Examine the entire selected scope through five lenses:

1. intention and naming;
2. cohesion and component boundaries;
3. file/folder organization and discovery;
4. comments and public documentation;
5. local consistency and cognitive load.

For each material finding identify: location, observed problem, comprehension or
maintenance impact, applicable principle/local convention, smallest useful
change, risk, required validation, and disposition (`apply`, `ask`, `report`, or
`ignore`). Label the value of a change:

- **Necessary**: the current presentation is misleading or creates a concrete
  maintenance hazard.
- **Recommended**: evidence shows a meaningful clarity/cohesion gain.
- **Opinionated**: alternatives are roughly equivalent. Do not apply by default.

Read `references/craftsmanship-rubric.md` for a full audit. Load the focused
naming, cohesion, file, or comment reference only when that dimension is active.

### 4. Classify risk and present a short plan

Use `references/risk-classification.md` when a change crosses files, consumers,
or contract boundaries.

| Risk | Default action |
|---|---|
| Low | Show in the plan, then apply without another approval. |
| Medium | Apply only with adequate coverage and when the user's stated scope clearly includes the structural change; otherwise ask first. |
| High | Ask for explicit approval immediately before editing. |
| Architectural/out of scope | Report separately; do not apply in this workflow. |

Group the plan into small attributable batches: local names/comments, internal
control flow, cohesive extraction/consolidation, file moves, then affected docs.
Do not combine a rename, move, and decomposition when that would obscure which
change caused a failure.

For every proposed move show:

```text
source -> destination
reason | affected consumers | validation | risk
```

### 5. Add characterization only when needed

When existing tests do not observe the behavior a non-trivial refactor could
change, add focused characterization tests first. They must capture current
outputs, errors, side effects, and ordering at a stable seam—not assert internal
structure that the refactor intends to change. Run them against the original
code before proceeding.

If the behavior cannot be characterized reliably, restrict work to trivially
provable local changes or leave that finding unapplied. Never invent the desired
behavior.

### 6. Apply and verify one batch at a time

For each batch:

1. Make the smallest coherent change.
2. Update all static references and documentation affected by names or paths.
3. Search for stale names/paths and inspect dynamic-use hazards.
4. Run focused tests and relevant static checks.
5. Compare the affected observables with the baseline.
6. Revert or fix any regression before starting another batch.

Prefer language-aware rename/refactor tools when available, then confirm their
result with search and tests. A tool's successful exit does not prove that
runtime lookup, serialized names, or external consumers were preserved.

### 7. Verify the final state

Run the proportionate final set: focused tests, full suite, lint, typecheck,
build, import/export checks, snapshots, smoke tests, and `git diff --check`, as
available. Inspect the final diff for scope creep, accidental formatting,
changed contracts, and overwritten user work.

Compare before/after results explicitly. "Looks equivalent" is not evidence.
If a check cannot run, state why and reduce the completion status or confidence.

### 8. Report evidence

Use `assets/final-report-template.md` for non-trivial work. For review-only mode,
use `assets/audit-report-template.md`. Keep tiny results concise, but always state:

- what changed or was recommended and why;
- renamed/moved files and affected consumers;
- comments removed, rewritten, or added;
- exact checks and before/after outcomes;
- deliberately unchanged items and risk;
- pending approvals or unverified areas.

Use `concluded`, `partial`, or `blocked` honestly. Passing tests do not justify
`concluded` when the changed behavior was not observed.

## Reference routing

Load only what the current request needs:

- `references/craftsmanship-rubric.md` — full multi-lens audit and finding
  quality; use for broad or review-only passes.
- `references/naming-and-call-sites.md` — identifier, API, and call-site changes.
- `references/cohesion-and-components.md` — functions, classes, UI components,
  extraction, consolidation, and abstraction pressure.
- `references/files-and-folders.md` — file/directory names, moves, colocation,
  barrels, aliases, and case-only renames.
- `references/comments-and-documentation.md` — comment removal/preservation and
  public contract documentation.
- `references/behavior-preservation.md` — baseline, characterization tests,
  dynamic consumers, contract comparison, or weak coverage.
- `references/risk-classification.md` — medium/high-risk changes or approval
  decisions.
- `references/typescript-javascript.md`, `references/python.md`,
  `references/java-kotlin.md`, or `references/dotnet.md` — load only the adapter
  matching scoped code. Mixed-language changes may load more than one.

## Gotchas

- More files do not imply better componentization; every boundary adds navigation.
- Fewer lines do not imply clearer code; dense expressions can raise cognitive load.
- More comments do not imply better documentation; improve names and structure first.
- SOLID does not authorize speculative interfaces, factories, repositories, or DI.
- DRY does not authorize merging concepts that merely look alike today.
- Large code can be cohesive; small code can still mix responsibilities.
- Do not split functions or files to satisfy a line-count metric.
- A technically precise synonym can be worse than established domain vocabulary.
- Tests passing prove only what those tests observe.
- Preserve legal notices, pragmas, suppressions, tool directives, security markers,
  compatibility explanations, and generated-code markers.
- A case-only rename may require an intermediate name on case-insensitive filesystems.
- Keep UI props, state, accessibility, event/effect order, and rendering behavior stable.
- Do not reformat unrelated lines or let an autofixer widen the diff silently.
- Do not convert a craftsmanship pass into architecture cosplay.
- The Boy Scout Rule applies only inside the authorized scope.
- If the improvement is debatable and mainly creates churn, leave it alone.

## Deliberately rejected approaches

- Treating a generic simplification pass as a complete craftsmanship review.
- Applying a Clean Code checklist mechanically or treating one author's taste as law.
- Imposing Clean Architecture, DDD, hexagonal layers, or universal folder topology.
- Generating documentation for every function regardless of contract value.
- Rewriting the repository globally in one batch.
- Mixing feature work, bug fixes, optimization, and refactoring.
- Removing code because a single textual search found no caller.
