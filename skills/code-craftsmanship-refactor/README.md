# Code Craftsmanship Refactor

`code-craftsmanship-refactor` is a portable Agent Skill for polishing existing
working code while preserving behavior. It covers naming, call sites, cohesion,
components, file organization, comments, public documentation, local
conventions, and evidence-based verification. It intentionally excludes feature
work, bug fixing, architecture redesign, security-only review, and speculative
optimization.

The default mode reviews and applies conservative changes to an explicit scope
or the current diff. Review-only mode reports findings without editing. Broader
structural changes are gated by coverage and risk; public or dynamic contracts
require explicit approval.

## Install

From the public repository with the Agent Skills CLI:

```bash
npx skills add conradoqg/agent-skills --skill code-craftsmanship-refactor
```

Choose one or more supported agents explicitly when desired:

```bash
npx skills add conradoqg/agent-skills \
  --skill code-craftsmanship-refactor \
  -g -a codex -a claude-code -a cursor -y
```

For local development from this repository:

```bash
npx skills add . --skill code-craftsmanship-refactor -a codex -y
```

Manual installation is also possible by copying this complete directory into a
skill discovery location. Common project-level locations are:

- portable/Codex/Cursor: `.agents/skills/code-craftsmanship-refactor/`;
- Claude Code: `.claude/skills/code-craftsmanship-refactor/`;
- Cursor-native: `.cursor/skills/code-craftsmanship-refactor/`.

Keep `SKILL.md`, `references/`, and `assets/` together. `agents/openai.yaml` is
optional Codex presentation metadata; the skill does not depend on it.

## Example requests

```text
Make this diff look professionally reviewed without changing behavior.
Improve the names and comments in src/billing.
Review this module for craftsmanship, but do not edit anything.
Organize these components and preserve their props and behavior.
```

Natural-language options include:

- scope: `changed`, a path, a module, or explicitly `repository`;
- mode: `review-and-apply` (default) or `review-only`;
- strictness: `conservative` (default) or `standard`;
- language override and additional verification commands.

## Add a language adapter

Add one focused Markdown file under `references/` and link it from the reference
routing section of `SKILL.md`. Keep the core workflow language-neutral. An
adapter should contain only language-specific contract hazards, naming and file
rules, documentation conventions, and verification commands. Project-local
rules must still override equivalent external style preferences.

## Validate while developing

```bash
python tests/validate_skills.py
node scripts/evaluate-skills.ts --skill code-craftsmanship-refactor
```

Evaluation artifacts are written outside the skill package under
`.skill-evals/` and must not be committed.

## Status

Version `0.1.0` is intentionally conservative. Behavioral equivalence is
supported by characterization and project checks, not formally guaranteed.
Review the final diff and evidence before merge.

## License and attribution

Original content is MIT licensed. `REFERENCES.md` records the sources, licenses,
ideas adopted, limitations, and deliberately rejected patterns. External text
was synthesized and attributed rather than copied into the skill.
