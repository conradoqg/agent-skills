# Behavior preservation

Read this before non-trivial edits with weak coverage, public/dynamic contracts,
side effects, UI lifecycle, serialization, or pre-existing test failures.

## Define the observable surface

Behavior includes more than return values:

- exported/public names, signatures, types, defaults, and import paths;
- exceptions, error text/codes, validation order, and retry behavior;
- persistence, serialized fields/order where relevant, config keys, and schemas;
- files, stdout/stderr, logs, metrics, traces, network calls, and events;
- mutation, caching, transactions, time, random values, and concurrency ordering;
- UI DOM/accessibility, focus, state, emitted events, and effect order;
- reflection, decorators/annotations, DI, registries, templates, dynamic imports,
  plugins, codegen, and framework naming/path conventions.

Write down only observables relevant to the proposed change, but do not assume
the test suite covers them.

## Baseline record

Before editing, capture:

```text
scope:
pre-existing user changes:
command | exit | relevant output/failures:
public/dynamic contracts inspected:
runtime samples/snapshots:
known gaps:
```

Use the project's normal environment. Do not "fix" baseline setup or failures in
a way that changes the requested scope. If a check is expensive, start focused
and explain why broader verification is deferred.

## Characterization tests

Add characterization when a proposed change could affect behavior that existing
tests do not observe.

1. Choose the nearest stable public seam available without production changes.
2. Exercise current success, relevant errors, side effects, and ordering.
3. Derive assertions from actual current results, not desired behavior.
4. Name the test after the observed behavior.
5. Avoid private method calls, exact internal collaborator counts, or structure
   that the refactor intends to change.
6. Run the test against original code and record that it passes.

If no stable seam exists, a small dependency-breaking change may itself be risky.
Ask before it when it crosses the user's structural scope. Otherwise limit the
refactor to trivial changes or report the blocker.

## Contract comparison

Choose checks proportional to the hazard:

- API/export snapshot or compiler-generated API report;
- serialized golden sample or schema diff;
- representative CLI/HTTP/UI smoke test;
- log/event/side-effect capture;
- old-name/path search plus dynamic registration inspection;
- build/package output and consumer compilation.

Compare before and after, not just after against an assumption.

## Existing failures and flaky checks

- Record failures before editing with enough identity to compare later.
- A final run may match the same failures, but confirm no new failure or changed
  failure signature was introduced.
- Retry only when project policy supports it; do not hide a deterministic failure
  as flaky.
- State uncertainty when nondeterminism prevents a reliable comparison.

## Completion rule

`Concluded` requires evidence for every materially affected observable. Use
`partial` when safe changes landed but a broader check or contract comparison is
missing. Use `blocked` only when no safe in-scope progress remains.
