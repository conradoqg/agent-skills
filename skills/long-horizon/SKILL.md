---
name: long-horizon
description: >
  Orchestrate long tasks with persistent progress and independently audited completion.
  Use when the user names long-horizon or requests sustained, tracked execution,
  resumable work, or orchestration with a durable plan. Complexity alone, an ordinary
  review, or a factual question does not trigger this workflow.
---

# Long Horizon

Keep the approved outcome stable while adapting the work needed to reach it.
Use a small number of outcome-sized milestones and stable workstreams. Independent
inspection, not an executor's claim, advances verified progress. Delegation helps
when substantial workstreams are independent; it is not a required wrapper around
every step. For a small task, the manager may do the work and request one final
audit. Add intermediate audits only when they unlock a dependent decision or
prevent material rework.

## Choose the phase

1. **Plan:** inspect available context, then read [planning](references/planning.md).
   Discuss requirements and acceptance, obtain approval, save the contract when
   writing is permitted, and ask whether the launch prompt should use Goal or normal
   execution. Deliver that prompt and stop. Choosing a mode is not launching it.
2. **Execute/resume:** require an execution instruction and an identified approved
   plan. Read [execution](references/execution.md), [state](references/state.md),
   and, on Codex, [Codex delegation](references/codex-subagents.md). The execution
   guide defines when to stop a blocked line of work and how to checkpoint it.
   Assign stable workstreams and reuse available agents. Prefer one independent
   final audit; add a milestone audit only at a consequential boundary.
3. **Status:** read the selected work's records and report verified progress,
   unresolved work, blockers and next step. A status request alone does not launch
   execution or certify that old evidence still matches the environment.

Use `.long-horizon/<id>/` in the project for records. Never guess between multiple
work items. Do not install software, commit, publish, or start recurring automation
merely to enable this procedure. Obey the host's permissions and planning mode;
when writes are prohibited, present the plan and explicitly defer saving it.

## Responsibilities

- **Manager (parent):** owns the approved contract, state and integration. It may
  implement directly, but marks its own results unverified until independent review.
  It assigns nonoverlapping workstreams and keeps the progress report current.
- **Domain worker (optional, stable child):** owns a named source, data or UI
  workstream across multiple bounded assignments. It may change only authorized
  artifacts and cannot approve its own work or rewrite control records.
- **Auditor (separate stable child):** follows [auditing](references/auditing.md),
  inspects milestone results without repairing them and returns criterion-level
  verdicts. It never serves as an executor for the same work item.

Use at most two domain workers and one auditor at a time, including on hosts with
more capacity. The manager works without domain workers when delegation setup
would cost as much as the task. If no independent context is available, useful execution may continue,
but completion remains unverified until an actual separate auditor can inspect it.
Never simulate an auditor in the parent. Disclose when read-only authority is only
instructional.

## Completion rules

- Freeze requirements, exclusions and acceptance in the approved plan revision.
  Reordering/splitting work is allowed; reducing scope or weakening acceptance needs
  user authorization unless already explicitly granted.
- Before recording a material plan revision, tell the user which criteria and
  verification units change and which existing checks remain applicable. Preserve
  unaffected verification only when its acceptance text and evidence are still
  current; invalidate changed checks and their dependent conclusions.
- For exhaustive work, discover and audit the inventory before claiming coverage.
  Record discovery method, exclusions and unresolved boundaries. Sampling cannot
  substitute for full coverage. Store item-level detail in evidence, not as a new
  state unit or audit round for each file. Define substantive examination per
  milestone and allow independent implementation where dependencies permit.
- Keep hypotheses and execution claims separate from audited facts. A failed or
  blocked audit never verifies a milestone. One clean integrated audit may verify
  several milestones when it directly checks each criterion. Group related
  corrections, then re-audit affected checks; do not create a new round for every
  small correction.
- Recheck evidence against current artifacts on resume and before completion.
  Invalidate affected verification after changes, including dependent conclusions.
- Conclude only after every required item is verified and a final independent audit
  checks the integrated result against the original outcome.
- Checkpoint on interruption, an explicitly set limit, or inability to advance.
  Never treat spent time/tokens, repetition or a full checklist as proof of success.

Every user-facing update after a milestone, interruption, blocker or resume must stand
on its own. Assume the user may have missed the execution and cannot see internal
reasoning. Anchor the message to the approved outcome; state the current phase and
status; explain what changed and what the evidence means; give completed and
independently verified milestones out of the total; identify what remains and why; state what action or access is
needed from the user, if any; and say what happens next. Read
[the progress template](assets/progress-template.md) when composing these updates.
Explain technical terms and IDs in ordinary language before relying on them. Never
use “as above,” a bare status label, or a generic “did you understand?” in place of
the context. Ask a direct question only when a user action or decision is needed;
explain its consequence first. If independent work can continue without input, say
so and continue it. Translate host-internal terms such as “Goal” and “checkpoint”
into user-facing language such as “the tracked task” and “the saved point to resume
from,” unless the user already uses those terms.

If the user explicitly asks whether an explanation was clear, summarize the relevant
result and define necessary terms before asking about clarity. Do not turn that
request into a quiz about facts unless the user explicitly asks for a comprehension
test.

Derive a concise `report.md` from the current state and evidence. Do not maintain
a second competing checklist or use audit/round counts as a measure of progress.
Run `python <skill-dir>/scripts/validate-state.py <work-dir>/state.json` before
handoff, after state updates and before declaring completion. It checks records,
not truth, evidence freshness, isolation or audit quality.

## Example

“Review error handling throughout this application with tracked execution” starts
with a discussion of scope and depth. An approved plan first inventories entry
points and background jobs, then groups them into a few domain milestones. Two
workers may examine independent API and job paths while the manager handles the
interface; a separate auditor checks completed milestones and the integrated
result. An inaccessible job remains a visible gap, never a silently excluded success.

## Basis

Original implementation inspired by the Manage–Execute–Audit method in
[LongHorizon-Harness (2026)](https://arxiv.org/abs/2608.01964).
Conversational planning, skill composition and explicit coverage tracking are local
extensions. This is an instructional skill with helpers, not that paper's runtime
or a guarantee of its benchmark results.
