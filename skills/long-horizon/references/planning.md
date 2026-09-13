# Planning and launch

Inspect the user's artifacts before asking questions that those artifacts answer.
Ask short rounds about unresolved decisions: outcome, deliverables, inclusions,
exclusions, depth, acceptance, constraints and autonomy. Do not demand a fixed
questionnaire when the user supplied this information already.

Consult an available specialist skill only for a concrete decision: brainstorm for
alternatives, stress-test for uncertain assumptions, what-if-oracle for scenarios,
council for competing perspectives. Respect each skill's triggers and questions.
Record resulting decisions, not their entire deliberations. An optional missing
skill is not a blocker; a required unavailable capability is.

Use [plan template](../assets/plan-template.md). The contract records observable
outcomes and criterion IDs, not only activities. For exhaustive requests, include
an inventory discovery/audit unit and a depth protocol. For subjective outputs,
agree on criterion-specific quality anchors; do not invent a universal score.

Approval fixes a numbered plan revision. Record the user's approval instruction;
do not infer approval from elapsed time or from a request to discuss. Already
approved plans need only gap checks, not a new interview. Material changes require
a recorded decision; ordinary sequencing and decomposition do not.

When writes are permitted, save plan.md and state.json in the selected work
directory. Start from [state template](../assets/state-template.json) and follow
[state format](state.md). Use a descriptive unique ID; never overwrite another
work item. Operational records are local by default; do not change Git settings
or .gitignore automatically in the user's project.

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
