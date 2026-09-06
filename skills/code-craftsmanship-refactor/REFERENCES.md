# References and synthesis record

Research checked on 2026-09-04. This file records provenance; the runtime skill
has no operational dependency on these sources. The skill uses original,
task-specific formulations rather than copied checklists or extended excerpts.

License notes describe the source as published and are not legal advice. Books
and articles without an open-content license were used only for ideas and
attribution.

## Principle matrix

| Principle in this skill | Primary basis | Adopted formulation | Important limitation |
|---|---|---|---|
| Refactoring preserves observable behavior | Martin Fowler, *Refactoring* and [refactoring.com](https://refactoring.com/) | Establish observables, make small internal changes, and compare before/after evidence. | Tests do not prove equivalence outside what they observe. |
| Clear code is judged in its context | [Google Engineering Practices](https://google.github.io/eng-practices/review/reviewer/looking-for.html) and language guides | Follow explicit project rules and dominant neighboring conventions before external taste. | Local consistency cannot excuse a known defect or contract violation. |
| Small batches reduce review and rollback risk | [Google Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html) | Separate attributable rename, control-flow, structural, and movement batches. | Change size is contextual; line count is not a universal gate. |
| Names should reveal domain intent at call sites | Robert C. Martin, *Clean Code* and [naming article](https://www.informit.com/articles/article.aspx?p=1323426) | Judge a name by the sentence formed where it is used; prefer domain/effect over mechanism. | The book's style claims are a school of thought, not mechanical laws. |
| Modules should hide decisions and reduce exposed complexity | David Parnas, [“On the Criteria To Be Used in Decomposing Systems into Modules”](https://dl.acm.org/doi/10.1145/361598.361623), and John Ousterhout, [*A Philosophy of Software Design*](https://web.stanford.edu/~ouster/cgi-bin/book.php) | Extract only around a nameable responsibility or hidden decision that reduces caller burden. | “Deep module” and short-function advice can conflict; evidence in the current code decides. |
| Comments should preserve information code cannot express | Google review guidance, PEP 8, language documentation conventions, Martin, and Ousterhout | Improve name, structure, and types first; keep comments for intent, constraints, invariants, tradeoffs, and public contracts. | Some language ecosystems require public API docs even when types are descriptive. |
| Characterization captures actual legacy behavior | Michael Feathers, [“Characterization Testing”](https://michaelfeathers.silvrback.com/characterization-testing) | Add stable-seam tests against current outputs and effects before risky change; do not encode a wished-for fix. | Characterization can preserve a bug and still miss unobserved behavior. |
| Unknown purpose is a stop signal | G. K. Chesterton, *The Thing* (“The Drift from Domesticity”), commonly called Chesterton's Fence | Understand consumers and reasons before removing or reorganizing code. | This is a caution heuristic, not a ban on deletion after evidence. |
| Leave code better only within scope | Robert C. Martin's presentation of the Boy Scout Rule in *Clean Code* | Improve touched code when it supports the requested refactor and keeps the diff focused. | It never authorizes unrelated cleanup. |

## Conceptual and official sources

### Martin Fowler — *Refactoring* and the refactoring catalog

- URL: [refactoring.com](https://refactoring.com/) and the [online catalog](https://refactoring.com/catalog/).
- Author/organization: Martin Fowler; book published by Addison-Wesley/Pearson.
- License: copyrighted publication/site; no open-content license relied on.
- Principle used: refactoring as disciplined internal restructuring without an
  externally observable behavior change; small named transformations.
- Our formulation: preserve an explicit observable baseline and apply the
  smallest coherent change in an attributable batch.
- Limitation: a catalog operation is not automatically safe in a codebase with
  dynamic lookup, external consumers, or insufficient tests.
- Decision: incorporated as the central invariant; rejected any assumption that
  a named refactoring mechanically proves safety.

### Robert C. Martin — *Clean Code*

- URL: [publisher overview/sample](https://www.informit.com/store/clean-code-a-handbook-of-agile-software-craftsmanship-9780132350884) and [naming article](https://www.informit.com/articles/article.aspx?p=1323426).
- Author/organization: Robert C. Martin; Pearson/Addison-Wesley.
- License: copyrighted book and articles; all rights reserved by their publishers.
- Principles used: intention-revealing names, cohesive functions, expressive
  call sites, restrained comments, and the Boy Scout Rule.
- Our formulation: use these as questions whose value must be visible in the
  current code and its local conventions.
- Limitations: the material intentionally presents strong stylistic opinions;
  short functions and comment rules can be misapplied as numeric or absolute gates.
- Decision: adapted the intent and guardrails; rejected mechanical Clean Code,
  universal size limits, and speculative SOLID abstractions.

### John Ousterhout — *A Philosophy of Software Design*, second edition

- URL: [author's book page](https://web.stanford.edu/~ouster/cgi-bin/book.php) and [Stanford CS 190 topics](https://web.stanford.edu/~ouster/cs190-winter22/).
- Author/organization: John Ousterhout; Yaknyam Press / Stanford University.
- License: copyrighted book; no open-content license relied on.
- Principles used: cognitive complexity, deep modules, information hiding,
  obvious code, and reducing accidental interface surface.
- Our formulation: a boundary earns its cost when it hides a real decision and
  makes callers understand less, not merely because a unit is long.
- Limitation: general-purpose or deeper modules are not universally preferable;
  the project's change patterns and contracts remain decisive.
- Decision: incorporated as a counterweight to indiscriminate extraction and
  fragmentation.

### David L. Parnas — information hiding

- URL: [ACM DOI](https://dl.acm.org/doi/10.1145/361598.361623).
- Author/organization: David L. Parnas; *Communications of the ACM* (1972).
- License: copyrighted ACM publication.
- Principle used: decompose around design decisions likely to change, hiding
  them behind limited interfaces.
- Our formulation: prefer boundaries that contain change and reduce knowledge
  shared by consumers.
- Limitation: the paper is not a folder-layout recipe and does not justify new
  layers for every implementation detail.
- Decision: incorporated for cohesion/file decisions; rejected architecture
  inference from the principle alone.

### Google Engineering Practices

- URL: [review standard](https://google.github.io/eng-practices/review/reviewer/standard.html), [what to look for](https://google.github.io/eng-practices/review/reviewer/looking-for.html), and [small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html).
- Author/organization: Google.
- License: [CC BY 3.0](https://github.com/google/eng-practices/blob/master/LICENSE).
- Principles used: improve code health, explain review reasoning, distinguish
  nits, reject speculative complexity, require meaningful tests, and keep
  changes reviewable.
- Our formulation: necessary/recommended/opinionated labels plus small verified
  batches and evidence-bearing reports.
- Limitation: Google's internal review context and CL process are not universal.
- Decision: adapted the reasoning and change-size discipline, not organization-
  specific process rules.

### Google language style guides

- URL: [style guide index](https://google.github.io/styleguide/), [TypeScript](https://google.github.io/styleguide/tsguide.html), [JavaScript](https://google.github.io/styleguide/jsguide.html), and [Java](https://google.github.io/styleguide/javaguide.html).
- Author/organization: Google.
- License: [CC BY 3.0](https://github.com/google/styleguide/blob/gh-pages/LICENSE).
- Principles used: consistent naming/organization, useful documentation, simple
  language constructs, and awareness of tool-enforced style.
- Our formulation: use the adapter as a fallback only after repository rules
  and dominant local conventions.
- Limitation: these guides define Google style, not universal style; many rules
  are formatting concerns better left to project tools.
- Decision: selectively adapted semantic and contract hazards; rejected
  wholesale style migration.

### Python PEP 8 and PEP 257

- URL: [PEP 8](https://peps.python.org/pep-0008/) and [PEP 257](https://peps.python.org/pep-0257/).
- Authors/organization: Guido van Rossum, Barry Warsaw, Alyssa Coghlan, and David
  Goodger; Python community.
- License: both PEPs state that the documents are placed in the public domain.
- Principles used: project-specific style precedence, public names based on
  usage, sparing non-obvious comments, and public docstring conventions.
- Our formulation: preserve Python's runtime-visible names and public contracts;
  use docstrings where they communicate a public behavioral contract.
- Limitation: PEP 8 targets the standard library and is not a mandate to restyle
  an established third-party project.
- Decision: incorporated into the Python adapter with local-precedence guardrails.

### Kotlin coding conventions

- URL: [official coding conventions](https://kotlinlang.org/docs/coding-conventions.html) and [KDoc](https://kotlinlang.org/docs/kotlin-doc.html).
- Author/organization: JetBrains / Kotlin Foundation contributors.
- License: Kotlin website sources are [Apache-2.0](https://github.com/JetBrains/kotlin-web-site/blob/master/LICENSE).
- Principles used: semantic file names, colocating related declarations,
  package-aligned layout, explicit library API types/visibility, and KDoc.
- Our formulation: keep related declarations together and preserve JVM-facing
  names, file facades, and multiplatform source-set conventions.
- Limitation: Java interoperability, Android frameworks, and multiplatform
  compilation add project-specific contracts not exhausted by the style guide.
- Decision: incorporated into the Java/Kotlin adapter without forcing reformatting.

### Microsoft .NET documentation and design guidelines

- URL: [C# identifier conventions](https://learn.microsoft.com/dotnet/csharp/fundamentals/coding-style/identifier-names) and [.NET design guidelines](https://learn.microsoft.com/dotnet/standard/design-guidelines/).
- Author/organization: Microsoft and .NET contributors.
- License: documentation is [CC BY 4.0](https://github.com/dotnet/docs/blob/main/LICENSE); code samples may have separate repository terms.
- Principles used: clarity over brevity, public API naming, predictable pairs,
  namespaces, and framework conventions.
- Our formulation: prefer repository `.editorconfig` and API compatibility;
  elevate reflection, attributes, configuration binding, and serializers as risks.
- Limitation: framework design guidelines target reusable libraries more than
  every application-internal identifier.
- Decision: adapted for public/API-facing .NET code; rejected blanket API renames.

### Michael Feathers — characterization testing

- URL: [“Characterization Testing”](https://michaelfeathers.silvrback.com/characterization-testing) and *Working Effectively with Legacy Code* (Prentice Hall/Pearson).
- Author/organization: Michael Feathers.
- License: copyrighted article and book; no open-content license relied on.
- Principle used: learn and pin actual behavior before changing insufficiently
  understood legacy code.
- Our formulation: characterize current outcomes at stable seams, including
  errors and side effects, without asserting the internal shape being refactored.
- Limitation: characterization is partial evidence and can preserve undesirable
  behavior; it is not a correctness oracle.
- Decision: incorporated as a conditional safety technique, not mandatory test
  generation for trivial local renames.

### Chesterton's Fence

- URL: G. K. Chesterton, [*The Thing*, “The Drift from Domesticity”](https://books.google.com/books?id=3qnPAAAAMAAJ).
- Author/organization: G. K. Chesterton; Sheed & Ward (1929); Google Books
  bibliographic record/preview.
- License: the underlying 1929 work is public domain in the United States as of
  2025; Google Books terms apply to its record and preview, and status may differ
  by jurisdiction.
- Principle used: do not remove a structure before understanding why it exists.
- Our formulation: unexplained code or organization triggers consumer/history
  investigation and a conservative disposition.
- Limitation: understanding a historical reason may support removal rather than
  permanent preservation.
- Decision: incorporated as a stop-and-investigate guardrail.

## Comparative Agent Skills

### `addyosmani/agent-skills@code-simplification`

- URL: [source skill](https://github.com/addyosmani/agent-skills/blob/main/skills/code-simplification/SKILL.md).
- Author/organization: Addy Osmani and contributors.
- License: [MIT](https://github.com/addyosmani/agent-skills/blob/main/LICENSE).
- Principle used: exact behavior preservation, scope control, clarity over line
  reduction, local standards, and removal of obvious narrative comments.
- Our formulation: a broader craftsmanship audit with explicit contracts,
  risk-based approval, characterization, file organization, and evidence.
- Limitations found: simplification alone does not systematically cover public
  documentation, movement hazards, or a complete audit taxonomy.
- Decision: incorporated its strongest guardrails; rejected using it alone as
  the complete workflow.

### `pproenca/dot-skills@refactor`

- URL: [source skill](https://github.com/pproenca/dot-skills/tree/master/skills/.curated/refactor).
- Author/organization: Pedro Proença and contributors.
- License: [MIT](https://github.com/pproenca/dot-skills/blob/master/LICENSE).
- Principle used: a structured vocabulary of recognizable refactoring
  operations and explicit code-smell prompts.
- Our formulation: use named operations as options after establishing a local
  finding and safety evidence.
- Limitations found: a large catalog can tempt checklist-driven changes or
  elevate one style school's heuristics into universal rules.
- Decision: adapted the catalog orientation; rejected mechanical rule application.

### Anthropic `code-simplifier`

- URL: [agent definition](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/code-simplifier/agents/code-simplifier.md).
- Author/organization: Anthropic.
- License: plugin-specific [Apache-2.0](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/code-simplifier/LICENSE).
- Principle used: preserve functionality, prefer explicit readability, apply
  project standards, and focus on recently changed code.
- Our formulation: the current diff is a safe default only when no explicit
  scope exists; verification and dynamic-contract checks remain mandatory.
- Limitations found: the agent definition is tied to Claude conventions and is
  less explicit about characterization, approval levels, and file moves.
- Decision: adapted the portable intent; rejected proactive out-of-request
  cleanup and tool-specific assumptions.

### `reviewing-code-modularity-skill`

- URL: [repository](https://github.com/tyshkovskii/reviewing-code-modularity-skill) and [SKILL.md](https://github.com/tyshkovskii/reviewing-code-modularity-skill/blob/main/SKILL.md).
- Author/organization: Oleksandr Tyshkovskyi.
- License: [MIT](https://github.com/tyshkovskii/reviewing-code-modularity-skill/blob/main/LICENSE).
- Principle used: reduce real complexity without architecture cosplay; judge
  boundaries by ownership, public surface, information hiding, and change cost.
- Our formulation: extract/split only for a nameable responsibility or hidden
  decision; explicitly preserve cohesive large units.
- Limitations found: its scope intentionally emphasizes modularity and design,
  while this skill also covers naming, comments, documentation, and finish.
- Decision: incorporated anti-overengineering and cohesion tests; kept
  architectural redesign outside this skill.

### `addyosmani/agent-skills@code-review-and-quality`

- URL: [source skill](https://github.com/addyosmani/agent-skills/blob/main/skills/code-review-and-quality/SKILL.md).
- Author/organization: Addy Osmani and contributors.
- License: [MIT](https://github.com/addyosmani/agent-skills/blob/main/LICENSE).
- Principle used: findings need priority/severity, reasoning, verification, and
  a review standard based on improving code health rather than perfection.
- Our formulation: necessary/recommended/opinionated value labels are separate
  from low/medium/high change risk, preventing style preference from masquerading
  as safety severity.
- Limitations found: its five-axis review includes correctness, architecture,
  security, and performance beyond this skill's narrow craftsmanship scope.
- Decision: adapted report discipline; rejected the broader review scope.

## Deliberate synthesis decisions

- No source is treated as an executable dependency or universal authority.
- Principles with genuine disagreement—especially function size, comments, and
  abstraction depth—are expressed as context-sensitive decision tests.
- Formatting rules are delegated to existing project tools; this skill focuses
  on choices a formatter cannot make.
- Metrics such as line count, file count, or function count are diagnostic at
  most and never targets.
- Community reports informed guardrails (AI comment verbosity, wrapper growth,
  global rewrites), but no anonymous anecdote became a rule by itself.
- The skill's MIT license covers only original wording and organization; it does
  not relicense cited works.
