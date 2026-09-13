# Execute and resume

1. Identify work ID/path, read approved plan revision and state, validate records.
   Confirm independent contexts exist. Do not treat a tool's unfamiliar name as
   unavailability; inspect its documented capability and attempt legitimate use.
2. On resume, first send a fresh auditor to compare recorded evidence with current
   artifacts. Treat an interrupted executor's effects as unverified; do not blindly
   replay actions with external side effects. Reconcile first, then recover.
3. Choose an unresolved unit whose dependencies are verified. Populate
   [contract](../assets/contract-template.md). Include the original outcome,
   acceptance IDs, authorized changes, exclusions, relevant evidence and selected
   specialist skills. The child receives this packet, not the parent's full chat.
4. Persist the contract before dispatch; mark the unit in_progress. Start one fresh
   executor. Wait for its result, save the execution report, mark awaiting_audit.
5. Start a different fresh auditor with the contract, evidence pointers and execution
   report as untrusted leads. It independently inspects the environment and returns
   [audit](../assets/audit-template.md). No implementation history or reasoning.
6. Save the audit. Only clean passing criteria may support verified state. Record
   facts and evidence references, preserve gaps and hypotheses separately. A failed
   criterion returns the unit to pending for another numbered round; unavailable
   prerequisites make it blocked. Keep previous round files intact.
7. Validate state, update the derived report, communicate progress, and continue.
   When all required units appear verified, run a final integration audit covering
   every required criterion against the current combined result. Persist this as
   final_audit. Mark completed only after that clean audit and structural validation.

The manager may adapt units but cannot remove an approved requirement to close a
gap. Discoveries inside the existing scope extend the inventory; discoveries that
change the agreed outcome are proposals for the user. Link each inventory item to
a unit so the denominator is inspectable. A new inventory invalidates any claim
that the earlier smaller inventory was exhaustive.

Audit evidence should identify the observed artifact version: file hash, commit
plus dirty-state detail, resource revision, or observation time and query for live
state. If no reliable version exists, re-observe instead of asserting freshness.
Invalidate affected units, dependent criteria and final_audit after changes.

Keep explicit limits supplied by the user. Do not invent Goal token budgets.
If a round makes no verified progress, diagnose the specific failure and choose a
different permitted action; do not repeat an unchanged attempt indefinitely. If no
action can advance the task, checkpoint with the blocker and exact next requirement.
An available independent unit may proceed while another is blocked.

Persist at every role boundary. Stop/pause instructions checkpoint promptly. Report
partial verified results and gaps on limits or interruption. Goal status operations
must follow the host's rules even when the local work state is blocked or paused.
No background continuation or scheduled notifications are implied by this skill.
