# CI delivery (Azure DevOps)

Use this reference when mode detection resolved to **CI mode**. This is the
behavior the pipeline has today: publish PR metadata, exactly one PR comment,
the audit, SARIF findings, and the launcher outcome.

Publishing order, after the review is reconciled:

1. `report_review_audit` (exactly once)
2. `ado_format_file_links` for every file reference that will appear in the description and comment
3. `ado_update_pr_title`, then `ado_update_pr_description`
4. exactly one `ado_post_pr_comment`
5. `report_sarif_finding` for every finding/note in the comment
6. `report_outcome`

Diagnostics mode is controlled by `${AI_DIAGNOSTICS}`.

## Azure DevOps links

Before publishing the PR description or comment, batch all repository file
references through `ado_format_file_links` and reuse the returned Markdown links
exactly. Use `ado_format_file_link` only for a late single reference or if
batching is unavailable.

Use precise ranges when reliable: include `lineEnd`, `startColumn`, and
`endColumn`. When only the file is relevant (no specific line), omit `line` to
generate a file-level link. If link formatting fails or PR metadata is
unavailable, use plain `path` or `path:line` and do not invent URLs.

## PR metadata

Always generate PR metadata independently of the review result.

- Call `ado_update_pr_title` with an emoji/icon plus concise English conventional-commit style title, max 120 characters.
- Emoji examples: `✨` feat, `🐛` fix, `♻️` refactor, `🧪` test, `📝` docs, `🔧` chore, `📦` dependency/build, `🚀` deploy/release/performance.
- Call `ado_update_pr_description` with structured Markdown, about 3000 characters and never more than 4000 (the Azure DevOps hard limit). Before sending, count the characters: if it exceeds 4000, cut sections until it fits — the tool truncates at 4000, which drops the end of your description (often the conclusion), so never rely on truncation. Tighten wording and drop the lowest-value detail instead.
- Use `append: true` only when preserving an existing human-written description is safer than replacing it.
- Build the description from name-status/stat/numstat/commit log plus targeted inspection, not only raw diff output. Cover every major changed area from the inventory, including when there are no blocking findings. Omit empty sections, do not invent placeholders, and avoid repeating the same information.
- Write the PR title and description in English. Use Azure DevOps Markdown links for all file references, with or without line numbers. Every file path in the description must be a formatted link from `ado_format_file_links`; do not emit plain paths when the link tool is available.

PR description shape:

```markdown
<concise summary>

**✨ Behavior Changes**
- <user/runtime/API/worker/bot/UI/validation/persistence/contract changes>

**🛠️ Infrastructure / Tooling**
- <CI/CD, scripts, AI, config, Docker, build, developer tooling, or pipeline permission changes>

**📦 Dependencies**
- <dependencies, lockfiles, runtime/toolchain, build packages, or vulnerability updates>

**📚 Documentation**
- <README, runbook, examples, ADR, operational docs, or in-repo guidance>

**🚀 Deployment / Rollout**
- <env vars, secrets, Azure DevOps permissions, migrations, feature flags, rollout/rollback notes, compatibility>

**🔎 Observability**
- <logs, metrics, traces, alerts, audit trail, diagnostics, or error messages>

**⚠️ Risks**
- <real residual risks, pending permissions, compatibility impact, fallback limitations, or data concerns>
```

## PR review comment

Post exactly one PR comment after title and description updates.

- Use `status: "active"` when any `CRITICAL` or `HIGH` finding exists.
- Use `status: "closed"` when there are only `MEDIUM`/`LOW` notes or no findings.
- Include every candidate decided as `reported`. Do not expose dropped candidates or internal reasoning in the PR comment.

FAIL format:

```markdown
**🚨 AI Review: FAIL**

**Summary**

Reviewed `<comparison label>`. Blocking findings need to be resolved before merge.

**🔍 Blocking Findings**

1. 🔴 CRITICAL - [apps/example.ts:42](<azure-devops-file-url>): Description, impact, and minimal remediation.
2. 🟠 HIGH - apps/other.ts:10: Description, impact, and minimal remediation.

**💡 Non-Blocking Notes**

1. 🟡 MEDIUM - [apps/foo.ts:20](<azure-devops-file-url>): Optional improvement, impact, and suggested direction.
2. 🔵 LOW - apps/bar.ts:8: Minor note and suggested direction.

**🛠️ Next Steps**

- Fix the blocking findings above.
- Re-run the PR pipeline.
```

PASS format:

```markdown
**✅ AI Review: PASS**

**Summary**

Reviewed `<comparison label>`. No blocking findings were found.

**🔍 Findings**

No blocking findings.

**💡 Non-Blocking Notes**

1. 🟡 MEDIUM - [apps/foo.ts:20](<azure-devops-file-url>): Optional improvement, impact, and suggested direction.
2. 🔵 LOW - apps/bar.ts:8: Minor note and suggested direction.
```

Omit `**💡 Non-Blocking Notes**` when empty. Omit `**🛠️ Next Steps**` for PASS comments.

## Audit, SARIF, and outcome

The `report_review_audit` payload must include:

- `coverage`: every changed file with status such as `reviewed-runtime`, `reviewed-contract`, `reviewed-test`, `reviewed-docs`, `mechanical-low-risk`, `generated-or-lockfile`, `deleted-file`, `binary-or-unreadable`, or `blocked-by-timeout`.
- `blocks`: every behavior-affecting changed-block label.
- `candidates`: exactly one `reported` or `dropped` decision for each block label.
- `reportedFindings`: every candidate with `decision: "reported"`.

Before `report_outcome`, call `report_sarif_finding` once for every `CRITICAL`, `HIGH`, `MEDIUM`, and `LOW` finding/note in the PR comment.

- SARIF levels: `error` for `CRITICAL`/`HIGH`, `warning` for `MEDIUM`, `note` for `LOW`.
- Use stable rule IDs: `AI_CRITICAL_REVIEW`, `AI_HIGH_REVIEW`, `AI_MEDIUM_REVIEW`, `AI_LOW_REVIEW`.
- Include repository-relative `file` and `startLine` when known. Do not invent locations.
- SARIF messages must match the concise finding text without Markdown links or emoji.

Call `report_outcome` with `status: "fail"` when blocking findings exist; otherwise use `status: "pass"` with `blockingFindings: 0`. This controls the launcher exit policy; do not use shell or plugin errors to fail the run.

## Diagnostics

- If Azure DevOps tools report missing PR context, treat the run as local: follow `local-report.md` and note that ADO publishing was skipped.
- When diagnostics mode is disabled, do not include diagnostics, audit details, dropped candidates, fallback explanations, or internal reasoning in stdout, title, description, or PR comment.
- When diagnostics mode is enabled, diagnostics may appear only in final stdout, never in PR title, description, or PR comment.
- In diagnostics mode, include a short `Diagnostics` section only when a file link fell back to plain text or bash was used instead of `read` for repository file content; explain the reason concisely.
- In diagnostics mode, include a concise `Review Audit` section with one entry per changed-block label: `Block: <stable label> | File: <path> | Decision: reported|dropped | Severity: CRITICAL|HIGH|MEDIUM|LOW|none | Reason: <concise reason>`.
