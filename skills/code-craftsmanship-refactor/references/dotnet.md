# C# and .NET adapter

Load this only for C#/.NET. Prefer solution `.editorconfig`, analyzers, framework
conventions, and neighboring code over an external naming preference.

## Inspect first

- solution/project files, target frameworks, nullable/implicit-usings settings;
- `.editorconfig`, analyzers, StyleCop/Roslyn rules, formatting configuration;
- test projects, public API baselines, source generators, and generated files;
- ASP.NET routing/binding, dependency injection, configuration, logging, EF,
  serializers, reflection, trimming, and AOT constraints.

## Naming and public contracts

- Apply .NET casing and naming only when consistent with project policy; clarity
  and domain meaning remain the goal.
- Preserve public member/type/namespace names, signatures, optional defaults,
  overload resolution, generic constraints, nullability, and assembly identity.
- Elevate names used by reflection, attributes, DI, configuration binding,
  model binding, JSON/XML serializers, EF mappings, XAML, Razor, and source generators.
- Changing exception type/message, log template, event id, metric name, or route is
  observable and outside a normal internal rename.

## Structure and files

- Respect namespace/file-scoped namespace conventions, project folders, partial
  types, linked files, and generated counterparts.
- A file usually benefits from matching its principal type, but partial types,
  grouped internal declarations, and generated patterns can justify exceptions.
- Do not split a cohesive class to satisfy line count or create interfaces for
  one implementation without current substitution/test/coupling pressure.
- Preserve disposal/async lifetime, cancellation, synchronization, transaction,
  and enumeration/laziness behavior.

## Comments and XML documentation

- Follow project rules for XML docs on public APIs. Document contract, side
  effects, exceptions, cancellation, nullability/units not clear from types, and
  compatibility constraints.
- Do not add parameter boilerplate that repeats clear names and types.
- Preserve `#pragma`, nullable directives, analyzer suppressions, generated-code
  markers, ReSharper/Roslyn comments, and linker/trimming annotations until proven
  unnecessary.

## Verification

Use solution-defined commands, commonly:

```text
dotnet test | dotnet format --verify-no-changes | dotnet build | API compatibility checks
```

Also compare public API baselines, serialized/bound models, routes, logs, and
reflection/source-generator behavior relevant to the change.
