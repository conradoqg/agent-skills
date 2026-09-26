# State and artifact layout

Copy assets/state-template.json when opening a work item. Field names and enums
stay in English; user-facing prose follows the user's language. Records belong to
one work directory, with IDs stable across rounds. Never reuse an ID for a different
requirement. The manager is the only writer of control records.

Use this layout for new work items:

```text
.long-horizon/<id>/
  plan.md                  current approved contract
  state.json               machine-readable milestone state
  report.md                short human progress view
  workstreams/<id>.md      one running note per stable domain, if used
  evidence/<milestone>.md  concise observations and links to source/results
  audits/<milestone>-NN.md immutable independent verdicts
  history/                 earlier approved plans, only when revised
```

Do not invent other top-level summaries or one directory per file, search or
attempt. Large raw outputs may live under `evidence/<milestone>/` only when they
are necessary to reproduce a check; link them from the concise evidence note.
The current plan remains `plan.md`; save the prior approved text in `history/`
before a revision. For existing work, keep all historical paths and evidence
valid; adopt the layout for new records without moving or renaming referenced
files. New state files declare `layout: "milestones-v1"`; legacy files without
that field remain valid.

- Top level: version=1, layout (for new work), id, plan (local relative file), plan_revision (positive
  integer), approved (boolean), status, requirements, units, evidence, audits,
  facts, hypotheses, final_audit (audit ID or null), next_step.
- Work status: planning, ready, running, paused, blocked, completed.
- Requirement: id, criterion, required (boolean). Requirements are the approved
  acceptance criteria; keep their text synchronized with the numbered plan revision.
- Unit: one outcome-sized milestone with id, goal, requirements (IDs), depends_on
  (unit IDs), status, audit (ID or null). Unit status: pending, in_progress,
  awaiting_audit, verified, blocked. Blocked units also have a blocker
  explanation. Map inventory items to milestone evidence, not one state unit per
  item; explicitly record exclusions.
- Evidence: id, source (actual file/resource/command), observed_version (hash,
  resource revision or timed observation), record (local file containing observation).
  External evidence needs a local observation record, not a fabricated local source.
- Audit: id, report (local file), plan_revision, auditor (child identity), scope (unit, integration, reconciliation), integrity
  (clean, suspect, violation), checks (one per examined requirement).
- Check: requirement (ID), verdict (pass, fail, blocked), evidence (IDs), and
  criterion_text (the exact approved criterion text this check assessed).
- Fact: statement, audit (current clean audit ID), evidence (IDs).
- Hypotheses: unverified strings, never promoted merely because an executor said so.

Local references use forward-slash relative paths inside this work directory.
Round reports can themselves contain observations and serve as evidence records.
The parent saves child reports unchanged before extracting structural metadata.
Audit files are numbered and preserved; updates replace state.json, not history.
Write the replacement to a sibling temporary file, validate it, then atomically
replace state.json to avoid a half-written checkpoint. This is not a lock; only one
manager may execute a given work item at once.

A completed work item requires all its units verified, every mandatory requirement
represented in units, and a clean current-revision final_audit with integration scope passing every mandatory
criterion. Optional work not undertaken stays in plan exclusions, not as silently
ignored pending units. A normal verified unit requires a clean passing audit of all
its referenced requirements and verified dependencies. An audit from an earlier
plan revision may support a unit only when every passing check includes
criterion_text exactly matching the current approved criterion, its evidence remains
current, and no changed requirement or dependency invalidated that unit. Old checks
without criterion_text cannot establish current verification after a revision and
must be re-audited. The final integration audit must always be clean and from the
current plan revision.
The same final integration audit may be referenced by several units when it
directly checks their accepted outcomes and all dependencies are satisfied;
there is no requirement for one audit file per unit.

The validator checks reference structure and file existence, not whether claims are
true, reports faithfully transcribed, artifact versions current, or permissions
actually enforced. These are the manager/auditor's responsibilities. An audit ID
alone cannot demonstrate that a different child ran: retain the child identity and
host trace pointer in the audit report and inspect them during evaluation.

Keep `report.md` short: outcome and revision, a checkbox list of every milestone,
verified count, one concrete next deliverable and only current blockers. Use
`[x]` only for accepted, independently verified milestones; `[~]` for partial or
delivered-but-unverified work; `[ ]` for pending work; and `[!]` for blocked
work. It is derived from `state.json` plus evidence; audit and attempt totals are
diagnostic and never presented as completion. A milestone may be delivered yet
awaiting an auditor; show it as partial, not verified. When significant evidence
exists but no milestone passes yet, name that evidence and the unmet acceptance
checks so a `0/N` count does not conceal what was accomplished or imply progress
that has not been accepted.

Unit audits assess the contribution to each referenced requirement within that
unit's explicit scope and local acceptance checks. A passing inventory unit does
not establish that every inventoried item has been examined. The final audit must
assess the full original requirements across all units, not aggregate scoped passes
as if each were proof of global completion.
