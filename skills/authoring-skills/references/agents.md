# How each agent handles skills

Skills follow one open format ([agentskills.io](https://agentskills.io)), but
each tool discovers, triggers, and stores them differently. Read this when a
skill targets a specific tool or ships to several. Write the portable core once;
add tool-specific detail only where it actually differs.

## Contents

- The portable core (identical everywhere)
- Where skills live (directories & scope)
- Discovery & triggering
- Tool-specific frontmatter & config
- What is portable vs tool-specific
- Validation

## The portable core (identical everywhere)

Every tool that implements the spec agrees on this much:

- A skill is a directory with a `SKILL.md` at its root. Only the root
  `SKILL.md` is parsed; frontmatter in `references/`/`assets/` files is inert.
- Frontmatter needs `name` (≤64 chars, lowercase `a-z0-9-`, no leading/trailing
  or doubled hyphen, **must equal the directory name**) and `description`
  (≤1024 chars, what + when). Optional: `license`, `compatibility` (≤500),
  `metadata` (string→string map), `allowed-tools` (experimental).
- **Progressive disclosure:** only `name` + `description` are preloaded for all
  skills. The body loads when the skill activates; `references/`/`assets/`/
  `scripts/` load only when the body points to them. Keep `SKILL.md` under ~500
  lines / ~5000 tokens; references one level deep, relative paths.

If you only care about portability, stop here. The rest is per-tool.

## Where skills live (directories & scope)

| Tool | Global / user | Project / repo | Conflict rule |
|------|---------------|----------------|---------------|
| **Kiro** | `~/.kiro/skills/` | `.kiro/skills/` | Workspace wins over global. |
| **Codex** | `$HOME/.agents/skills/` | `$CWD/.agents/skills`, parent dirs, up to `$REPO_ROOT/.agents/skills` | No merge — same-name skills all appear in the selector. Also: ADMIN `/etc/codex/skills`, SYSTEM (bundled). |
| **Claude Code** | `~/.claude/skills/` | `.claude/skills/` | Project over personal. |

- **Codex follows symlinks** when scanning these locations, so a skill authored
  once can be symlinked into a Codex path. Kiro loads its own `.kiro/skills`
  entries directly (a symlinked skill dir works too, but a plain local dir is
  simplest).
- To serve one skill to several tools, keep one real directory and symlink it
  into each tool's path — but then references must resolve from the *real*
  location, so prefer true siblings over cross-root links.

## Discovery & triggering

| Tool | Automatic (implicit) | Explicit | Arguments |
|------|----------------------|----------|-----------|
| **Kiro** | Matches request against `description`. | Slash: `/skill-name`. `/context show` lists loaded skills. | `$ARGUMENTS` / `${N}` placeholders in the body; trailing text is passed as extra context even with no placeholder. |
| **Codex** | Matches `description`, subject to a context budget (below). | `$skill-name` mention, or `/skills`. | Passed as surrounding prompt; `default_prompt` in `openai.yaml` can frame it. |
| **Claude Code** | Matches `description`; loads progressively. | Invoked by name in conversation. | Passed as prompt context. |

- **Codex context budget:** the initial skills list uses at most **2% of the
  model's context window, or 8000 characters** when the window is unknown. If
  many skills are installed, Codex shortens descriptions first and may omit some
  skills (with a warning). **Front-load the key use case and trigger words** so
  the skill still matches when its description is truncated. The full `SKILL.md`
  is still read once the skill is selected.
- Across all three, the `description` carries the entire triggering burden.
  This is why the rubric forbids leaking the workflow into it: a description that
  summarizes the steps becomes a shortcut the agent follows instead of reading
  the body.

## Tool-specific frontmatter & config

**Codex** — optional `agents/openai.yaml` in the skill dir:

```yaml
interface:
  display_name: "User-facing name"
  short_description: "User-facing description"
  icon_small: "./assets/small-logo.svg"
  brand_color: "#3B82F6"
  default_prompt: "Optional prompt to frame the skill"
policy:
  allow_implicit_invocation: false   # default true; false = explicit $skill only
dependencies:
  tools:
    - type: "mcp"
      value: "someServer"
      transport: "streamable_http"
      url: "https://example.com/mcp"
```

Disable without deleting via `~/.codex/config.toml`:

```toml
[[skills.config]]
path = "/path/to/skill/SKILL.md"
enabled = false
```

Codex also ships authoring helpers: `$skill-creator`, Record & Replay,
`$skill-installer <name>`; reusable distribution is via **plugins**.

**Kiro** — the default agent auto-loads `~/.kiro/skills` and `.kiro/skills`.
**Custom agents load no skills by default** — add them to the agent's
`resources` field with the `skill://` URI scheme:

```json
{ "name": "my-agent",
  "resources": ["skill://.kiro/skills/*/SKILL.md", "skill://~/.kiro/skills/*/SKILL.md"] }
```

**Claude Code** — no extra manifest; relies on the standard frontmatter.
Anthropic-specific authoring notes: MCP tools must be fully qualified
(`ServerName:tool_name`), and reference files over ~100 lines should start with
a table of contents (the agent may preview with a partial read).

## What is portable vs tool-specific

- **Portable:** the `SKILL.md` body, the rubric, `references/`/`assets/`/
  `scripts/`, and the frontmatter core (`name`, `description`, `license`,
  `metadata`).
- **Tool-specific:** install location, `openai.yaml` (Codex), `skill://`
  resources for custom agents (Kiro), context-budget tuning (Codex), and any
  slash/`$`/`@` invocation syntax you mention in prose.

When a step differs by tool, write the generic version first and mark the
tool-specific bit as an example — never assume one tool's paths or syntax are
universal.

## Validation

The spec ships a checker (`skills-ref validate ./my-skill`) that verifies
frontmatter and naming. It does not test triggering or body quality — for that,
run the skill with a fresh agent on a real task and watch whether it fires and
succeeds (evaluation-driven authoring).
