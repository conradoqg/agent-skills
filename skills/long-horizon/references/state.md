# State format, version 1

Copy assets/state-template.json when opening a work item. Field names and enums
stay in English; user-facing prose follows the user's language. Records belong to
one work directory, with IDs stable across rounds. Never reuse an ID for a different
requirement. The manager is the only writer of control records.

- Top level: version=1, id, plan (local relative file), plan_revision (positive
  integer), approved (boolean), status, requirements, units, evidence, audits,
  facts, hypotheses, final_audit (audit ID or null), next_step.
- Work status: planning, ready, running, paused, blocked, completed.
- Requirement: id, criterion, required (boolean). Requirements are the approved
  acceptance criteria; keep their text synchronized with the numbered plan revision.
- Unit: id, goal, requirements (IDs), depends_on (unit IDs), status, audit (ID or
  null). Unit status: pending, in_progress, awaiting_audit, verified, blocked.
  Blocked units also have a blocker explanation. Inventory items map to unit IDs
  in the plan or a local evidence record; explicitly record exclusions.
- Evidence: id, source (actual file/resource/command), observed_version (hash,
  resource revision or timed observation), record (local file containing observation).
  External evidence needs a local observation record, not a fabricated local source.
- Audit: id, report (local file), plan_revision, auditor (child identity), scope (unit, integration, reconciliation), integrity
  (clean, suspect, violation), checks (one per examined requirement).
- Check: requirement (ID), verdict (pass, fail, blocked), evidence (IDs).
- Fact: statement, audit (current clean audit ID), evidence (IDs).
- Hypotheses: unverified strings, never promoted merely because an executor said so.

Local references use forward-slash relative paths inside this work directory.
Round reports can themselves contain observations and serve as evidence records.
The parent saves child reports unchanged before extracting structural metadata.
Round files are numbered and preserved; updates replace state.json, not history.
Write the replacement to a sibling temporary file, validate it, then atomically
replace state.json to avoid a half-written checkpoint. This is not a lock; only one
manager may execute a given work item at once.

A completed work item requires all its units verified, every mandatory requirement
represented in units, and a clean current-revision final_audit with integration scope passing every mandatory
criterion. Optional work not undertaken stays in plan exclusions, not as silently
ignored pending units. A normal verified unit requires a clean current-revision
passing audit of all its referenced requirements and verified dependencies.

The validator checks reference structure and file existence, not whether claims are
true, reports faithfully transcribed, artifact versions current, or permissions
actually enforced. These are the manager/auditor's responsibilities. An audit ID
alone cannot demonstrate that a different child ran: retain the child identity and
host trace pointer in the audit report and inspect them during evaluation.

Unit audits assess the contribution to each referenced requirement within that
unit's explicit scope and local acceptance checks. A passing inventory unit does
not establish that every inventoried item has been examined. The final audit must
assess the full original requirements across all units, not aggregate scoped passes
as if each were proof of global completion.
