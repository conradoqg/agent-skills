---
name: git-user-activity-summary
description: >
  Summarize a user's Git author or committer activity across every repository under a folder, grouped by
  repository, in the user's language, and wrapped in a fenced Markdown block.
  Use when the user asks what they did in Git, for a commit/activity summary,
  weekly work report, or repository-by-repository changelog from a directory,
  even when they do not explicitly mention Git commands or a reporting format.
license: MIT
metadata:
  author: conradoqg
  version: "1.0"
---

# Git User Activity Summary

Produce a concise, evidence-based summary of the user's Git activity across
repositories in a folder tree.

## Workflow

Use the bundled collector as the primary source of facts. It emits deterministic
JSON and does not modify repositories:

```bash
python3 scripts/collect_git_activity.py --root <folder> [identity options] [--since YYYY-MM-DD] [--until YYYY-MM-DD | --days N]
```

Use `--identity-email EMAIL` when an email is known and
`--identity-name NAME` otherwise. The collector includes the root itself,
recursively discovers nested repositories, and sorts repositories and commits
deterministically.

Resolve the identity before summarizing. An explicit name or email takes
precedence. Without one, use the global Git identity when available, even if it
has no matching commit in the tree. Otherwise use a single unambiguous configured
identity that matches identities found in either the `author` or `committer`
fields. If no identity can be discovered or more than one local identity is
plausible, ask the user for the Git name or email and rerun the collector. Never
silently include every identity.

Honor an explicit inclusive date range or number of calendar days. If omitted,
use the last 7 calendar days including today. Honor the requested Markdown
flavor, defaulting to GitHub-flavored Markdown (`gfm`).

Summarize only the returned commits, grouped by repository. The collector uses
only commits reachable from local or remote `main` or `master` refs and keeps
one repository for each Git origin, choosing deterministically among duplicates.
Use subjects as the
minimum factual basis and use bodies or changed paths when they support a more
useful theme. Translate into the user's language without adding intent, impact,
or completion claims that the evidence does not support. Mention uncertainty
when the commit data is insufficient. When a returned commit has `web_url`, link
its short hash to that URL; do not construct links from assumptions or external
lookups.

Return exactly one fenced Markdown block in the requested flavor. Include the
covered folder and period, repository sections, and short commit hashes. Omit
repositories without matching commits; if none match, say so inside the block.
When linking a commit hash, use the form `[<short hash>](<web_url>)`.

## Output shape

Use this compact structure unless the user requests another one:

```markdown
# Git activity summary

Period: <period>  
Folder: `<folder>`

## <repository>

- <theme or completed change> (`<short hash>`)
```

## Gotchas

- A `.git` file is valid for linked worktrees; treat it as a repository marker,
  not only a `.git` directory.
- A commit matches when the identity appears in either its `author` or
  `committer` fields; do not require both fields to match.
- Use only commits reachable from `main` or `master`; do not infer activity
  from the current branch alone.
- Repositories with the same canonical `remote.origin.url` are duplicates; only
  the deterministically selected repository is processed.
- Do not traverse inside `.git` metadata directories, and do not report a
  repository merely because it exists: it needs at least one matching commit.
- The collector is local-only. Do not fetch, pull, push, or alter Git config.
