# Naming and call sites

Read this when renaming identifiers/files, changing internal signatures, or when
a call hides effects or domain intent.

## Decision test

A rename is useful when it improves at least one of these without degrading the
others:

- domain meaning;
- observable effect;
- responsibility/ownership;
- call-site readability;
- searchability and navigation;
- symmetry with related operations;
- accuracy after likely implementation changes.

Do not rename solely because another synonym is fashionable, longer, shorter,
or preferred by an external style guide.

## Read call sites first

The declaration is not the main proof. Inspect representative callers, tests,
error output, templates, configuration, serialized data, logs, and public docs.
A good call usually reads as a truthful phrase:

```text
invoiceValidator.validate(invoice)
```

Generic names (`execute`, `process`, `handle`, `manage`) are acceptable only
when the receiver or local domain supplies the missing meaning. Query-like names
must not conceal meaningful mutation or I/O.

## Vocabulary

- Prefer the project's established domain term over a technically elegant synonym.
- Use one term per concept and distinct terms for distinct concepts.
- Choose verbs that match effects: `find`/`read` for lookup, `validate` for
  checking, `calculate` for derivation, `save`/`publish` for effects—subject to
  local conventions.
- Name booleans as predicates that read naturally at use sites.
- Keep pairs symmetric: `start/stop`, `encode/decode`, `subscribe/unsubscribe`.
- Avoid implementation leakage when the mechanism can change without changing
  the concept (`redisUserCache` may be worse than `userLookupCache`).
- Keep recognized domain abbreviations; expand private author shorthand.

## Signature refinement

Improve internal signatures only when call sites become materially clearer.

- Replace an opaque boolean with a named option only when the option represents
  a stable concept and does not create unnecessary ceremony.
- Address long runs of same-typed positional arguments when order errors are
  plausible; do not introduce builders/options objects without present pressure.
- Keep reading and mutation names truthful. Splitting them is valid only when the
  same observable sequence and failure behavior remain intact.
- Do not add factories or fluent APIs merely to make a single call look elegant.

## Contract hazards

Treat the spelling or location as medium/high risk when used by:

- exported/public APIs or external imports;
- JSON/XML/database serialization and configuration binding;
- reflection, decorators/annotations, dependency injection, registries;
- template property lookup, routes, CSS selectors, test snapshots;
- dynamic imports, plugin discovery, code generation, CLI flags;
- logs, metrics, error messages, or operator runbooks.

Search is necessary but insufficient. Inspect framework conventions and runtime
registration. Preserve aliases or compatibility shims only when authorized and
when they do not conceal an architecture migration.

## Rename procedure

1. List declaration, static references, non-code references, and dynamic hazards.
2. Classify public/persisted names before editing.
3. Prefer a language-aware rename tool when available.
4. Update focused tests/docs and run them immediately.
5. Search for both old and new names; explain intentional remaining old uses.
6. Compare exports, serialized output, errors/logs, or runtime registration as relevant.

For case-only file renames on case-insensitive filesystems, use a verified
intermediate filename so version control records the change. Do not improvise a
destructive move command.
