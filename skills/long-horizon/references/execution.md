# Execute and resume

1. Read the approved plan, current state and concise `report.md`. On resume,
   reconcile recorded results with current artifacts and identify interrupted
   actions before repeating anything with side effects. Recheck affected evidence;
   do not launch a new agent merely to restate a valid checkpoint.
2. Map the approved outcome to one to six outcome-sized milestones (one or two
   for a small task). Each has a concrete deliverable, acceptance checks, real
   dependencies and a way to verify it. Inventory rows, files, searches, test
   cases and small fixes belong inside milestone evidence, not in `state.units`.
   More than six need a specific reason. Existing approved criteria stay intact;
   reorganizing work must preserve valid evidence and dependency meaning.
3. Identify at most two independent domain workstreams with distinct ownership
   (for example source/data and UI), plus the manager's integration work. Use
   parallel agents only when two substantial workstreams can advance without a
   shared-write conflict or unmet dependency. Reserve capacity for one separate
   auditor. For a one-milestone task, the manager executes directly unless it
   contains genuinely substantial independent domains or the user requests
   parallel delegation. For small or serial work, do not spend
   more effort setting up an agent than the bounded work itself. Use the [contract](../assets/contract-template.md)
   for each bounded assignment; reuse the same worker for subsequent assignments
   in its workstream.
4. Execute a milestone until its deliverable is coherent. Run focused checks and
   record only the evidence needed to prove acceptance. Mark implementation
   progress separately from independent verification. Do not let an inventory
   become an endless prerequisite: inspect enough to safely design independent
   parts, continue discovery for the exhaustive boundary, and reserve the final
   coverage claim for the completed inventory audit.
5. Default to one final independent audit of the integrated result. Add an
   intermediate audit only when its verdict must guide a consequential next step:
   for example an exhaustive inventory that controls a migration, a risky data
   conversion, or a deliverable likely to become costly to repair later. Audit
   cohesive batches, not each file, correction or resumed turn. Give the auditor
   approved criteria, current artifact versions, evidence locations and scoped
   claims as untrusted leads. Save the [audit](../assets/audit-template.md).
   One audit may verify several milestones if it directly checks each one's
   acceptance. For failures, group related findings into one repair assignment,
   then recheck only affected criteria and dependencies.
6. Update `state.json`, validate it, and regenerate a short `report.md` after a
   meaningful milestone change, blocker or interruption. Communicate progress at
   those points and at least once per hour during sustained execution. Show
   delivered and independently verified milestones separately, the next concrete
   deliverable, blockers and the path to completion; do not use round counts as
   progress. After implementation is delivered, the final independent audit
   checks all approved criteria against current artifacts before completion.

Use [state](state.md) for record semantics and the fixed artifact layout. The
manager remains the only writer of control records; workers return or write
authorized workstream evidence and work artifacts. Preserve audit history. A
repair does not erase failed findings, but it also does not require a new work
unit for each edited file.

For an active legacy work item with many small units or `rounds/` directories,
do not rewrite or delete its history. First publish a concise milestone map and
the next deliverable. Stop adding micro-units; consolidate open findings into
the existing outcome units where dependencies allow. Reuse current evidence
when its scope and artifact version still match, and audit the completed
milestone rather than replaying earlier searches. Reorganizing operational
work does not change approved acceptance; any material contract change still
needs the user's decision.

## Dependencies and stopping rules

Dependencies express actual prerequisites, not a blanket gate on all later work.
Discovery, design, implementation, verification and documentation may overlap
where evidence and ownership permit. Never claim exhaustive coverage from a
sample. Link each inventory item to its milestone evidence and record exclusions
and unresolved boundaries. New findings inside approved scope enlarge the
inventory; changes to the agreed outcome require the user's decision.

If a method fails at an explicit capability boundary, record it and stop retrying
until capacity or conditions change. For an inconclusive result, allow one
materially different approach; if it produces no new evidence, checkpoint that
line of work. A failed audit returns actionable findings, not permission for an
unbounded cycle of new agents and nearly identical reports. After two repair and
re-audit attempts without closing a material gap, pause that milestone, explain
the remaining decision or capability needed, and continue independent work.

If no auditor slot exists, the manager or available workers may keep producing
authorized deliverables. Mark them awaiting independent audit and do not claim
verification or completion. Reuse a known auditor if available. Do not repeatedly
probe a rejected spawn or fabricate cleanup. If every line is blocked, save the
checkpoint, explain the exact blocker and end the turn awaiting a real change.

Keep explicit limits supplied by the user. Do not invent Goal token budgets.
For Goal execution, follow the host's lifecycle rules separately from local work
status. `paused` requires the user's request; `complete` requires every approved
criterion and the final audit. No background continuation or recurring
notification is implied.
