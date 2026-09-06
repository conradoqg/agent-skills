# Comments and documentation

Read this when a task targets comments/docstrings, when many comments may be
removed, or when public contract documentation changes.

## Correction order

1. Improve the name.
2. Improve local structure.
3. Express the contract in types/signatures/assertions when appropriate.
4. Add or retain a comment only for information the code still cannot convey.

Do not force steps 1–3 when a concise comment is the clearest representation of
an external reason or non-obvious constraint.

## Keep or write comments that explain

- why a decision exists;
- an external constraint, protocol quirk, or compatibility workaround;
- an invariant or order dependency;
- a tradeoff and the risk of an apparent simplification;
- counterintuitive behavior that is nevertheless intentional;
- security, privacy, concurrency, or performance conditions not visible in code;
- a public contract detail types/signatures cannot express.

Make these comments concise, specific, current, and placed next to the decision.

## Remove or rewrite comments that

- narrate the next line or explain syntax;
- repeat a function/type/variable name;
- preserve change history better held by version control;
- compensate for a misleading name or tangled structure;
- speculate about future behavior without an active constraint;
- are stale, false, or refer to removed concepts;
- contain a TODO with no context, issue/owner, or completion condition.

Do not add a comment only to explain the refactor. The final report and version
control are the right places for change rationale unless future maintainers need
the reason at that exact code location.

## Never classify as ordinary narrative comments

- copyright/license notices;
- pragmas, lint/type suppressions, tool directives, and formatter controls;
- generated-code markers and codegen instructions;
- security markers or audit requirements;
- compatibility notes and protocol invariants;
- documentation consumed by a framework, compiler, generator, or runtime.

Investigate before changing or deleting these. A suppression may be removable,
but only after proving the underlying condition no longer exists.

## Public documentation

Document public modules, types, functions, and members according to the local
language/project convention. Focus on:

- purpose and behavioral contract;
- non-obvious inputs/outputs and units;
- side effects and state changes;
- relevant errors/failure modes;
- ordering, concurrency, or lifecycle constraints;
- limitations and compatibility obligations;
- examples only when they remove real ambiguity.

Do not restate every parameter already obvious from its name and type. Preserve
public signatures and documentation tooling syntax. After a rename/move, update
links, examples, navigation, and generated reference inputs.

## Report

Count comments as removed, rewritten, and added. For each addition, be able to
state what necessary information could not be expressed clearly in code/types.
