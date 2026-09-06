# Python adapter

Load this only when Python is in scope. Project configuration and established
style take precedence over PEP defaults when they do not conflict with behavior.

## Inspect first

- `pyproject.toml`, setup/config files, supported Python versions, and package layout;
- Ruff/Black/isort/mypy/pyright/pylint settings;
- pytest/unittest conventions, fixtures, snapshots, and public package exports;
- framework discovery, dependency injection, ORM models, migrations, and codegen.

## Runtime contract hazards

Python names are frequently data. Elevate renames involving:

- `__all__`, public imports, entry points, plugin registries, decorators;
- `getattr`/`setattr`, metaclasses, descriptors, dataclasses, named tuples;
- pickle, JSON/model aliases, ORM fields, CLI options, config keys, templates;
- monkeypatch strings, mock patch targets, module import strings, dynamic loaders;
- magic/dunder methods and framework naming conventions.

Do not trust static reference search alone.

## Naming and cohesion

- Follow local casing and domain vocabulary; PEP 8 explicitly allows project-
  specific consistency to win.
- Public names should reflect usage rather than implementation.
- Keep Python's simple data/function/module idioms; do not add Java-style classes,
  interfaces, or factories to create artificial structure.
- Avoid extracting a helper that merely obscures a direct readable expression.
- Preserve sync/async behavior, generator laziness, context-manager lifetime,
  exception type/message, evaluation order, and mutation semantics.

## Files and imports

- Check relative/absolute imports, namespace packages, `__init__.py` exports,
  circular-import risk, import-time side effects, and packaging manifests.
- A module move can change `__module__`, pickling, plugin entry points, resource
  lookup, and tracebacks even when tests import successfully.
- Do not edit migrations or generated clients/models directly.

## Comments and docstrings

- Use the project's docstring convention; otherwise use PEP 257 as a fallback.
- Document public contracts, side effects, errors, and non-obvious constraints;
  do not restate a clear signature line by line.
- Preserve `# type: ignore`, `# noqa`, coverage directives, encoding/shebang,
  tool pragmas, and generated markers until proven unnecessary.

## Verification

Use configured project commands, commonly:

```text
pytest/unittest | ruff/pylint | mypy/pyright | build/package import smoke
```

Also compare public imports, signatures where relevant, serialized samples,
exception behavior, and import-time/runtime discovery.
