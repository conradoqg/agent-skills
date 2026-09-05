# TypeScript and JavaScript adapter

Load this only when TypeScript, JavaScript, JSX, or TSX is in scope. Repository
configuration and nearby conventions take precedence over generic preferences.

## Inspect first

- `package.json` scripts and workspace/package boundaries;
- `tsconfig*.json`, module mode/resolution, path aliases, and project references;
- ESLint/Biome/Prettier configuration and framework conventions;
- package `exports`, barrels, side-effect imports, tests, stories, and codegen;
- React/Vue/Svelte/Angular routing, lifecycle, hook, and file naming conventions.

## Naming and types

- Preserve property names consumed by JSON, templates, forms, CSS selectors,
  runtime schemas, decorators, and reflection-like metadata.
- Distinguish type-only and runtime imports; a rename/move can change emitted
  loading or side effects even when typecheck passes.
- Prefer existing domain types and straightforward inference. Do not introduce
  mapped/conditional/generic machinery merely to remove repetition.
- Avoid opaque booleans and same-typed positional sequences when they create a
  real call-site error risk; do not automatically create option objects/builders.
- Preserve declaration merging, ambient names, global augmentation, overload
  order, and public `.d.ts` output.

## Modules and files

- Check static and dynamic imports, glob imports, route-by-file conventions,
  package entry points, barrels, test mocks, snapshots, and aliases.
- A default/named export conversion is a contract change unless the package and
  all consumers are demonstrably internal.
- Preserve side-effect import ordering and module initialization semantics.
- For case-only renames, use an intermediate path and verify version-control state.

## UI components

- Preserve props/defaults, keys, refs, events, accessibility, DOM/focus behavior,
  state ownership, memoization semantics, and effect/hook order.
- Do not extract one-use JSX just because a component is long; require a user-
  facing concept, independent behavior, or proven reuse/test value.
- Do not change controlled/uncontrolled behavior or server/client boundaries.

## Comments and documentation

- Use the project's JSDoc/TSDoc policy for public contracts.
- Preserve `@ts-*`, ESLint/Biome/coverage suppressions, bundler directives,
  framework pragmas, and generated markers until their necessity is disproved.
- Do not add JSDoc that repeats an already-obvious signature.

## Verification

Use the project's scripts, typically the smallest relevant subset of:

```text
test | lint | typecheck/tsc --noEmit | build | package/API extractor
```

Also search old symbols/paths, inspect emitted/package exports when public, and
exercise representative UI behavior when components change.
