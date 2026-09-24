# Codex delegation adapter

This file also enables the repository evaluator's Codex multi-agent capability.
Use native child-agent tools, not create_thread or user-visible sidebar tasks.

- With collaboration.spawn_agent, use fork_turns="none" and a self-contained
  packet. With a different spawn API, use its documented fresh-context equivalent.
  Never pass a full parent history as a shortcut. Do not override the model unless
  the user or applicable environment instructions require it.
- Name each role and round in the packet, for example executor_001 and auditor_001.
  Wait for the executor before creating the auditor. Do not reuse the executor as
  auditor, or reuse prior-round children. Inspect the host's documented lifecycle
  operations. Close/release a finished child only when an actual supported operation
  is available; never claim cleanup without confirmation. Some hosts expose no such
  operation, so do not assume the manager can free a completed child.
- The auditor's packet forbids changing task artifacts and control records. Use
  runtime read-only permissions if available. Otherwise disclose that the restriction
  is instruction-only; do not claim the native tools enforce it.
- The parent owns the work directory's control records. Children return reports;
  executor changes are limited to the explicitly named work surfaces.
- If capacity is temporarily occupied, use a documented release operation when
  available. Wait only for a known active child whose identity and status are
  available through a documented wait operation; do not call wait with no target or
  repeat empty waits. If no active child can be identified, checkpoint rather than
  polling. If a spawn returns an explicit thread or agent limit, record the failed
  attempt and stop spawning for that role/round; retry only after a concrete capacity
  change, not by issuing the same request again.
  If independent contexts still cannot be provided, checkpoint and report execution
  blocked, without parent-role simulation or a user-visible task as a workaround.

For Goal execution, require the user's explicit Goal launch request, use only the
currently available documented Goal capability, and copy the approved outcome and
acceptance plus a verifiable finish line and blocked-stop condition into the goal.
Never create a goal merely because the skill was invoked.
If that capability is absent, provide a normal launch prompt as an option but do
not silently switch an already requested Goal execution to another mode.

Keep the local work status separate from the host Goal status. A blocked unit does
not make the Goal complete. Save and validate the local checkpoint, explain the
specific missing access or decision, ask for it once, and end the current turn; do
not poll or repeat an unchanged attempt while waiting for the user. In Codex, only
set the Goal to `blocked` after the same blocking condition is present in three
consecutive Goal turns; count the initial/user-triggered turn and automatic
continuations. Use the documented status operation only if it is callable in the
current host. If it is not callable, say the Goal
status could not be changed; do not claim it was paused or blocked. Set `paused` only
when the user explicitly asks. Set `complete` only after every approved criterion
and the final independent audit pass.
