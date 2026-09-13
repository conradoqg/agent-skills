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
Executor statements are claims; only independently inspected evidence advances
verified progress. This skill requests real delegation for execution and auditing.

## Choose the phase

1. **Plan:** inspect available context, then read [planning](references/planning.md).
   Discuss requirements and acceptance, obtain approval, save the contract when
   writing is permitted, and ask whether the launch prompt should use Goal or normal
   execution. Deliver that prompt and stop. Choosing a mode is not launching it.
2. **Execute/resume:** require an execution instruction and an identified approved
   plan. Read [execution](references/execution.md), [state](references/state.md),
   and, on Codex, [Codex delegation](references/codex-subagents.md).
   Use fresh executor and auditor contexts sequentially, one unit per round.
3. **Status:** read the selected work's records and report verified progress,
   unresolved work, blockers and next step. A status request alone does not launch
   execution or certify that old evidence still matches the environment.

Use `.long-horizon/<id>/` in the project for records. Never guess between multiple
work items. Do not install software, commit, publish, or start recurring automation
merely to enable this procedure. Obey the host's permissions and planning mode;
when writes are prohibited, present the plan and explicitly defer saving it.

## Responsibilities

- **Manager (parent):** owns the approved contract and persistent state, delegates
  bounded units, stores returned reports and chooses the next step. During execution,
  environment facts come from audits; bookkeeping reads/writes are its responsibility.
- **Executor (fresh child):** performs the unit and returns an execution report;
  may change only authorized work artifacts. Cannot rewrite the plan or state.
- **Auditor (different fresh child):** follows [auditing](references/auditing.md),
  inspects the actual result without repairing it and returns a criterion-level
  verdict. The manager persists this report; the auditor does not write it itself.

If independent contexts are unavailable, save/present the plan and report execution
blocked. Do not simulate separate roles in the parent. If read-only authority is
instructional rather than enforced by the runtime, disclose that limitation.

## Completion rules

- Freeze requirements, exclusions and acceptance in the approved plan revision.
  Reordering/splitting work is allowed; reducing scope or weakening acceptance needs
  user authorization unless already explicitly granted.
- For exhaustive work, discover and audit the inventory before claiming coverage.
  Record discovery method, exclusions and unresolved boundaries. Sampling cannot
  substitute for full coverage. Define what substantive examination means per unit.
- Keep hypotheses and execution claims separate from audited facts. A failed or
  blocked audit never verifies a unit. Corrections get a new numbered round.
- Recheck evidence against current artifacts on resume and before completion.
  Invalidate affected verification after changes, including dependent conclusions.
- Conclude only after every required item is verified and a final independent audit
  checks the integrated result against the original outcome.
- Checkpoint on interruption, an explicitly set limit, or inability to advance.
  Never treat spent time/tokens, repetition or a full checklist as proof of success.

After each round report verified units/total, gaps, blockers and next step. Derive
`report.md` from the current state; do not maintain a second competing checklist.
Run `python <skill-dir>/scripts/validate-state.py <work-dir>/state.json` before
handoff, after state updates and before declaring completion. It checks records,
not truth, evidence freshness, isolation or audit quality.

## Example

“Review error handling throughout this application with tracked execution” starts
with a discussion of scope and depth. An approved plan first inventories entry
points and background jobs, then assigns bounded examinations. Each review result
is checked by a fresh auditor; clean findings still require examination evidence.
An inaccessible job remains a visible gap, never a silently excluded success.

## Basis

Original implementation inspired by the Manage–Execute–Audit method in
[LongHorizon-Harness (2026)](https://arxiv.org/abs/2608.01964).
Conversational planning, skill composition and explicit coverage tracking are local
extensions. This is an instructional skill with helpers, not that paper's runtime
or a guarantee of its benchmark results.
