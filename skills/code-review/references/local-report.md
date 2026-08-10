# Local delivery

Use this reference when mode detection resolved to **Local mode**.

The review work is identical to CI. Only delivery changes: you render the same
three artifacts the pipeline would publish, and you publish nothing.

## Rules

- Do not call `ado_*`, `report_outcome`, `report_review_audit`, or `report_sarif_finding`. They are unavailable or out of scope locally.
- Read back the canonical SARIF before rendering. The findings below contain all
  and only its results. Within blocking and non-blocking sections, keep the
  severity order but group adjacent entries by repository file.
- Print the artifacts in the final response, in the order below. Do not save them to a file instead, and do not replace them with a summary or a link.
- Use plain repository-relative `path:line` references. There is no PR URL locally, so never invent Azure DevOps links.
- Keep the CI wording, structure, emoji, and severity icons so the output is a faithful preview of the published result.
- State the resolved mode and comparison in the first line, then the artifacts.

## Output shape

Start with one status line:

```markdown
Mode: local (no Azure DevOps publishing). Comparison: `<compareRange>`.
```

### 1. PR title

The title the pipeline would set, as a single line: an emoji plus a concise
English conventional-commit style summary, max 120 characters.

```markdown
## Proposed PR title

✨ feat: add tenant-scoped invoice export
```

Emoji examples: `✨` feat, `🐛` fix, `♻️` refactor, `🧪` test, `📝` docs,
`🔧` chore, `📦` dependency/build, `🚀` deploy/release/performance.

### 2. PR description

The description the pipeline would set: structured Markdown, about 3000
characters and never more than 4000. Build it from name-status/stat/numstat and
the commit log plus targeted inspection, covering every major changed area even
when there are no blocking findings. Omit empty sections and do not invent
placeholders.

```markdown
## Proposed PR description

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
- <env vars, secrets, permissions, migrations, feature flags, rollout/rollback notes, compatibility>

**🔎 Observability**
- <logs, metrics, traces, alerts, audit trail, diagnostics, or error messages>

**⚠️ Risks**
- <real residual risks, pending permissions, compatibility impact, fallback limitations, or data concerns>
```

### 3. Review findings

The single PR comment the pipeline would post, using the same FAIL/PASS shapes.
Include every candidate decided as `reported`; never expose dropped candidates or
internal reasoning.

Use the FAIL shape when any `CRITICAL` or `HIGH` finding exists:

```markdown
## Review result

**🚨 AI Review: FAIL**

**Summary**

Reviewed `<compareRange>`. Blocking findings need to be resolved before merge.

**🔍 Blocking Findings**

1. 🔴 CRITICAL - apps/example.ts:42: Description, impact, and minimal remediation.
2. 🟠 HIGH - apps/other.ts:10: Description, impact, and minimal remediation.

**💡 Non-Blocking Notes**

1. 🟡 MEDIUM - apps/foo.ts:20: Optional improvement, impact, and suggested direction.
2. 🔵 LOW - apps/bar.ts:8: Minor note and suggested direction.

**🛠️ Next Steps**

- Fix the blocking findings above.
- Re-run the PR pipeline.
```

Use the PASS shape when there are only `MEDIUM`/`LOW` notes or no findings:

```markdown
## Review result

**✅ AI Review: PASS**

**Summary**

Reviewed `<compareRange>`. No blocking findings were found.

**🔍 Findings**

No blocking findings.

**💡 Non-Blocking Notes**

1. 🟡 MEDIUM - apps/foo.ts:20: Optional improvement, impact, and suggested direction.
2. 🔵 LOW - apps/bar.ts:8: Minor note and suggested direction.
```

Omit `**💡 Non-Blocking Notes**` when empty. Omit `**🛠️ Next Steps**` for PASS.
For a clean change, PASS with no findings is the correct result: say so plainly
and do not manufacture a note to look thorough.
