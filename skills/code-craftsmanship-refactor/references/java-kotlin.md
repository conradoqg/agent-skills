# Java and Kotlin adapter

Load this only for Java or Kotlin. Project/build/framework conventions override
equivalent generic style advice.

## Inspect first

- Gradle/Maven modules, Java/Kotlin/toolchain versions, source sets, and packages;
- formatter/linter/static-analysis config (Spotless, Checkstyle, ktlint, detekt,
  Error Prone, compiler warnings);
- JUnit/test conventions, generated sources, annotation processors, and API tools;
- framework component scanning, reflection, serialization, DI, persistence, and
  service-loader configuration.

## Naming and contracts

- Keep public binary/source compatibility unless separately authorized.
- Elevate names used by reflection, annotations, bean/property conventions,
  serializers, ORMs, dependency injection, JNI, service loaders, and config.
- Preserve Java overload resolution, generic bounds, checked exceptions, method
  references, and visibility.
- Preserve Kotlin nullability, default/named arguments, extension resolution,
  suspend behavior, inline/reified semantics, delegation, and JVM annotations.
- Fluent/query names must not conceal mutation or blocking I/O.

## Files and organization

- Java source filenames normally match the public top-level type.
- Kotlin may colocate semantically related declarations; do not split every type
  into a file. Name multi-declaration files for their cohesive concept.
- Preserve package-path conventions, module exports, source sets, and test layout.
- Kotlin file renames/moves can affect file facades and Java callers; inspect
  `@file:JvmName`, multifile classes, and generated JVM names.
- Do not edit generated sources or historical migrations directly.

## Cohesion

- Prefer cohesive classes/files over type-per-file or method-length metrics.
- Do not create interfaces for single implementations without a present public
  contract, substitution need, test seam, or coupling pressure.
- Preserve initialization order, synchronization/locking, resource lifetime,
  transaction boundaries, and coroutine/thread behavior.

## Documentation and directives

- Use local Javadoc/KDoc conventions for public/library APIs; cover behavioral
  contract, side effects, errors, nullability not obvious in types, and limitations.
- Preserve annotations and comments consumed by compilers, linters, codegen,
  coverage, or frameworks.

## Verification

Use the project's Gradle/Maven commands for focused tests, full tests, static
analysis, compilation, packaging, and API/binary compatibility where available.
Also inspect reflection/serialization fixtures and Java/Kotlin interop call sites.
