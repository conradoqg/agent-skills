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
  On a plan revision, compare each existing check against the approved criterion
  text and current evidence. Preserve unaffected checks only when both still match;
  invalidate changed checks, their dependent units/conclusions and final_audit.
  Explain this impact to the user before committing the revision. Keep historical
  observations as evidence, but promote facts only from a current-revision clean
  audit. A final integration audit is always required for the current revision.

Keep explicit limits supplied by the user. Do not invent Goal token budgets.
If an attempt fails with an explicit capability boundary (for example, an unsupported
surface or a subagent thread limit), record it and stop retrying that operation until
the capability or relevant conditions change. For an inconclusive result without an
explicit boundary, allow at most one materially different approach; if it yields no
new evidence, checkpoint the line of work instead of repeating it. Track attempts
against the evidence gap in the round record and `next_step`; resuming does not reset
this limit. Retry only after the missing input, permissions, tool capability or
relevant artifact changes. Record what was tried, what evidence is missing, why it
blocks acceptance and the exact condition that would make a new attempt useful. Do
not weaken the approved scope to clear the blocker. An independent unit may proceed
if its dependencies are verified.

If every remaining required unit is blocked, or no permitted action can advance any
unit, save and validate the checkpoint, explain the blocker and ask only for the
access or decision needed to continue. Do not claim completion or pretend a blocked
unit passed. End the current turn awaiting that input; use only Goal lifecycle
controls documented and available in the host. A blocker is a stopping condition for
the current attempt, not approval to silently change the contract.

For every progress update, interruption, blocked handoff or resume, compose a
self-contained message using [the progress template](../assets/progress-template.md).
Assume the user may return hours or days later without reading prior updates or
internal reasoning. Include the approved outcome, current phase/status, work and
evidence since the last update, verified units / total, what remains and why, what
user input is needed (if any), and the next action. Define technical terms and
explain IDs. Translate host controls such as Goal status and checkpoint into the
user's language; name the control only if it helps them act. A question must identify
the exact requested action and its consequence;
do not ask a generic comprehension question. If independent work can proceed, state
that no response is needed yet and continue. If the user explicitly asks whether an
explanation was clear, contextualize first and ask about clarity rather than testing
recall.

Persist at every role boundary. Stop/pause instructions checkpoint promptly. Report
partial verified results and gaps on limits or interruption. Goal status operations
must follow the host's rules even when the local work state is blocked or paused.
No background continuation or scheduled notifications are implied by this skill.
