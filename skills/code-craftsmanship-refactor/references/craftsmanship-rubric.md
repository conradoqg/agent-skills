# Craftsmanship rubric

Use this for broad audits or when several craftsmanship dimensions interact.
The questions are prompts for evidence, not a scorecard that forces changes.

## Finding quality

A material finding answers all of these:

1. Where is it?
2. What concrete presentation or maintenance problem exists?
3. How does it impair comprehension, discovery, change safety, or truthful use?
4. Which project convention or recognized principle supports the judgment?
5. What is the smallest useful behavior-preserving change?
6. What could that change break, and how will that be checked?
7. Is the value necessary, recommended, or merely opinionated?
8. Should it be applied, approved first, reported, or ignored?

Do not report formatter output, arbitrary taste, or a hypothetical future need
as a craftsmanship defect.

## 1. Intention and naming

- Does each name expose domain meaning and responsibility rather than a temporary
  mechanism?
- Do query-like names hide mutation, I/O, persistence, logging, or caching?
- Do verbs distinguish read, validate, calculate, create, mutate, and remove?
- Are booleans readable predicates? Are conceptual pairs symmetric?
- Does one concept use one vocabulary throughout the selected scope?
- Are abbreviations domain-recognized rather than author convenience?
- Can `data`, `item`, `helper`, `utils`, `manager`, `service`, `process`,
  `handle`, `load`, or `get` be replaced by a demonstrably more specific concept?
- Does the filename match its principal exported concept or responsibility?
- Would a proposed rename improve call sites and searchability, rather than swap
  equivalent synonyms?

Read `naming-and-call-sites.md` before applying non-local renames.

## 2. Cohesion and boundaries

- Does the unit have one coherent reason to change, even if it is large?
- Are unrelated policies, state transitions, presentation, or effects tangled?
- Is there a nameable concept whose extraction reduces caller knowledge?
- Is a wrapper or interface only forwarding calls without owning policy?
- Are related elements fragmented across files that change together?
- Does the proposed boundary reduce cognitive load after counting navigation,
  imports, public surface, and test seams?
- For UI, do markup, state, effects, props, and accessibility still form a
  coherent user-facing concept?

Read `cohesion-and-components.md` for extraction and consolidation tests.

## 3. Files, folders, and discovery

- Does the layout match the dominant project topology and documented ownership?
- Are code, tests, styles, stories, and fixtures colocated according to local practice?
- Do directories communicate domain/feature/ownership rather than `misc` or
  `common` accumulation?
- Does a one-file directory or mirrored hierarchy add meaning?
- Would moving a file shorten discovery without destabilizing imports, package
  identity, code generation, dynamic loading, or external paths?
- Can every consumer be found and updated, including configuration and docs?

Read `files-and-folders.md` before proposing moves or case-only renames.

## 4. Comments and documentation

- Does a comment explain intent, external constraint, invariant, tradeoff,
  compatibility, counterintuitive behavior, or regression risk?
- Is it narrating syntax, repeating a name, preserving history, or compensating
  for unclear code?
- Is a TODO actionable, contextual, and owned by a condition or issue?
- Does a public docstring explain the contract, side effects, relevant errors,
  and limitations that types/signatures do not expose?
- Is the documentation still true after the change?
- Is a special comment actually a pragma, legal notice, suppression, generator
  marker, tool instruction, or security control?

Read `comments-and-documentation.md` before bulk comment changes.

## 5. Consistency and cognitive load

- Compare import/export style, declarations, typing depth, error handling,
  tests, casing, placement, and domain terms with adjacent code.
- If the repository is inconsistent, identify the documented or majority pattern
  and normalize only the selected scope.
- Prefer an explicit familiar construct to a clever compressed one.
- Count concepts, state transitions, hidden dependencies, and navigation—not lines.
- Do not replace one consistent style with another equivalent style.
- Keep formatter-only churn separate from semantic craftsmanship changes.

## Value versus risk

Value and change risk are independent:

- A misleading public name may be **necessary** but **high risk**.
- Removing an obvious local narrative comment may be **recommended** and **low risk**.
- Restyling an equivalent declaration may be **opinionated** even if technically low risk.

Apply only when the value justifies the risk and verification cost.
