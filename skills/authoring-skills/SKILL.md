---
name: authoring-skills
description: >
  Craft and review Agent Skills (SKILL.md) against the consolidated best
  practices (Anthropic, OpenAI/Codex, and the open agentskills.io spec). Use
  when the user wants to create, write, author, improve, or review a skill —
  "make a skill for this", "is this skill any good?", "review this SKILL.md",
  "why won't my skill trigger?", "skill-review" — and when the self-learning
  skill harvests a golden path and needs to write it up. Covers frontmatter and
  description rules, progressive disclosure, degrees of freedom, secrets safety,
  and the per-tool differences across Codex, Claude Code, and Kiro.
license: MIT
source: https://github.com/kulaxyz/self-learning-skills
metadata:
  author: kulaxyz
  version: "1.0"
---

# Authoring Skills

The reference for writing and reviewing Agent Skills *well*. It owns the shared
rubric; two modes apply it:

- **Authoring** — create or improve a skill (also invoked by `self-learning`
  when it delegates a write).
- **Review** — audit an existing skill and list what to fix.

Both are the *craft* of skills — how a skill triggers, is structured, and stays
safe. They are tool-neutral; per-tool specifics live in `references/agents.md`.

## Files (load on demand — don't read all upfront)

- `references/skill-authoring.md` — the full rubric: frontmatter, the
  description field, body shape, progressive disclosure, secrets safety, and a
  self-validation checklist. **Read it before writing**, or in review when you
  need the exact rule behind a finding.
- `references/agents.md` — how each tool (Codex, Claude Code, Kiro) discovers,
  triggers, and stores skills, plus tool-specific frontmatter. **Read it when
  the skill targets a specific tool**, or when a cross-tool question comes up.
- `assets/SKILL.template.md` — fill-in starting point for a new skill.

## Authoring mode

Triggers: the user asks to create/write/author/improve a skill, or
`self-learning` delegates the write of a harvested golden path.

1. Read `references/skill-authoring.md` (the rubric).
2. Start from `assets/SKILL.template.md`.
3. If the skill is tool-specific (or ships to several tools), consult
   `references/agents.md` for that tool's directories, triggers, and frontmatter.
4. Self-validate against the checklist at the end of the rubric before finishing.

The single most important thing: the `description` decides whether the skill ever
fires. State capability + triggers, and do NOT bake the step-by-step workflow
into it — the agent follows that summary as a shortcut and skips the body.

## Review mode

Triggers: "review this skill", "is this skill good?", "why won't it trigger?",
"skill-review", or an author wanting a second pass before shipping.

Audit a `SKILL.md` (or a whole skills directory) against the rubric. **One
finding per line, ranked most-impactful first. List findings only — never
rewrite the skill here** (that's authoring mode, and only when asked).

Format: `<tag>: <problem>. <fix>.  [path:line]`

Tags:
- `trigger:` description is vague, first-person, keyword-poor, or leaks the
  workflow (agent follows the shortcut and skips the body). This is the highest-
  value tag — a skill that never fires is dead weight.
- `verbose:` tokens spent on what the agent already knows, or SKILL.md over
  ~500 lines / ~5000 tokens. Cut it.
- `disclosure:` heavy/long content sitting inline that belongs in `references/`,
  `assets/`, or `scripts/`.
- `freedom:` prescriptiveness mismatched to fragility — exact steps missing for
  a destructive/ordered op, or a rigid menu where judgment fits. Give a default,
  not a menu.
- `name:` breaks the rule — not lowercase `a-z0-9-`, leading/trailing/doubled
  hyphen, or `name` ≠ directory name.
- `secret:` a secret *value* written into the file instead of a pointer to where
  it lives. Non-negotiable — skills get committed.
- `structure:` a high-value section is missing — gotchas, a checklist for a
  multi-step workflow, an output template, or "what didn't work".
- `ref:` a broken or deeply nested reference, or a bare "see references/" that
  never says *when* to load the file.

End with a verdict: `net: <N> findings — biggest win: <one line>.` If it is
already good, say `Solid skill. Ship.` and stop.

## Boundaries

Reviews skill *craft* — discovery, structure, safety — not the correctness of
the domain procedure the skill teaches (that's a normal review pass). Lists
findings; applies nothing unless the user switches to authoring mode.
"stop authoring-skills" or "normal mode" reverts to ordinary behavior.
