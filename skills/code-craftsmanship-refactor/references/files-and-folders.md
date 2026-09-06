# Files and folders

Read this before moving/renaming files, reorganizing directories, changing
barrels/aliases, or consolidating fragmented modules.

## Discover the project's topology

Do not impose a universal feature-, layer-, or domain-first layout. Sample more
than one neighboring area and inspect project instructions, package boundaries,
test/story/style placement, ownership files, code generation, aliases, and build
configuration.

When the repository is inconsistent:

1. prefer an explicit documented convention;
2. otherwise identify the pattern dominant in comparable maintained modules;
3. normalize only the authorized scope;
4. report broader inconsistency without silently migrating it.

## Naming and placement tests

- A filename should describe its principal exported concept/responsibility.
- A directory should communicate ownership, domain, feature, or a meaningful
  technical boundary—not become a generic `misc`, `common`, or `utils` bucket.
- Keep files that change together near each other according to local practice.
- Avoid a one-file directory when it adds no scope, ownership, or discovery value.
- Avoid mirrored or repeated directory segments that do not narrow meaning.
- Preserve project conventions for colocated tests, stories, styles, fixtures,
  and index/barrel files.

## Move risk inventory

Before moving, find:

- static imports/re-exports and package entry points;
- aliases, barrel files, side-effect imports, and tree-shaking expectations;
- dynamic imports, glob loaders, plugin discovery, reflection, and framework
  file-routing conventions;
- build, test, lint, codegen, deployment, and packaging configuration;
- templates, docs, runbooks, scripts, snapshots, and external consumers;
- filesystem casing and platform-sensitive paths.

Record every move in this form:

```text
source -> destination
reason:
affected consumers:
validation:
risk:
```

## Apply safely

1. Move one coherent concept at a time.
2. Update static consumers and affected navigation docs.
3. Rebuild/re-run generators through established commands when required; do not
   hand-edit generated output.
4. Search for stale paths and old casing.
5. Run import/module-resolution checks, focused tests, and build/typecheck.
6. Inspect the version-control diff to confirm a move rather than delete/add
   content loss and to catch accidental line-ending/format churn.

Case-only renames may require an intermediate filename on Windows/macOS. Resolve
and verify the exact target before any move; preserve unrelated uncommitted work.

## Stop or escalate

Ask before changing a public import path, package entry point, route-by-file,
plugin discovery location, generated source root, or cross-module topology. If a
move effectively redraws architecture, report it as a separate task instead.
