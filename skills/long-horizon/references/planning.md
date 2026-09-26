# Planning and launch

Inspect the user's artifacts before asking questions that those artifacts answer.
After inspection, separate established facts, recommendations in the artifacts,
and decisions the user has explicitly confirmed. A recommendation is not approval:
do not turn it into a requirement, acceptance criterion, migration rule, or
constraint until the user confirms it. Identify material open choices and ask a
short, targeted round before drafting a contract that depends on them. State the
concrete alternatives and consequences when the artifacts support them; do not
ask the user to repeat discoverable facts or to approve settled decisions.

Ask short rounds about remaining decisions: outcome, deliverables, inclusions,
exclusions, depth, acceptance, constraints and autonomy. Do not demand a fixed
questionnaire when the user supplied this information already. Keep the interview
proportional: ask only questions whose answers materially change the plan. If one
high-impact decision remains, ask that decision rather than reopening settled
scope. If the user says to proceed with a recommendation, record that as the
decision; if they defer it, keep it explicitly unresolved and do not freeze a
dependent criterion as approved.

Consult an available specialist skill only for a concrete decision: brainstorm for
alternatives, stress-test for uncertain assumptions, what-if-oracle for scenarios,
council for competing perspectives. Respect each skill's triggers and questions.
Record resulting decisions, not their entire deliberations. An optional missing
skill is not a blocker; a required unavailable capability is.

Use [plan template](../assets/plan-template.md). The contract records observable
outcomes and criterion IDs, not only activities. For exhaustive requests, include
an inventory discovery/audit unit and a depth protocol. For subjective outputs,
agree on criterion-specific quality anchors; do not invent a universal score.
Choose one to six outcome-sized milestones, using one or two for small tasks and
more only when distinct deliverables justify them. Put file-level inventory, searches, small fixes and focused
checks inside milestone evidence; do not make each one a separate unit. Name at
most two independent domain workstreams when parallel execution will help, and
reserve a separate auditor. State the expected deliverable and verification for
each milestone so progress can be reported without counting agent rounds.

Approval fixes a numbered plan revision. Record the user's approval instruction;
do not infer approval from elapsed time, artifact recommendations, or from a
request to discuss. Already approved plans need only gap checks, not a new
interview; honor an explicit instruction not to interview again. Material changes require
a recorded decision; ordinary sequencing and decomposition do not. Before asking
for approval of a material revision, explain which acceptance criteria, units and
dependent checks change, which earlier checks remain valid and why, and the exact
verification still needed. Do not silently invalidate the whole plan or preserve a
check whose criterion, evidence or dependency changed.

When writes are permitted, save `plan.md`, `state.json` and a short `report.md`
in the selected work directory. Start from [state template](../assets/state-template.json)
and follow [state and artifact layout](state.md). Use a descriptive unique ID;
never overwrite another work item. Operational records are local by default; do
not change Git settings or `.gitignore` automatically in the user's project.

Ask once: normal execution or Goal? If the user already selected, reuse it.
Then fill [launch template](../assets/launch-template.md) with the absolute plan
path, ID, revision, outcome and acceptance. Present only the chosen variant.
Goal is requested explicitly in that variant, without an invented token budget.
If the host cannot start Goal programmatically, give its supported user action;
do not invent a slash command or claim it was started.

End the planning phase after delivering the prompt. Launch only on a later
execution instruction. A user who supplied an approved plan and already requests
execution may enter the execution phase directly without this planning ceremony.
In read-only Plan mode, show the complete draft and explain that persistence and
the absolute saved-plan launch prompt remain pending until writes are allowed.
