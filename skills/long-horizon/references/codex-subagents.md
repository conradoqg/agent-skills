# Codex delegation adapter

This file also enables the repository evaluator's Codex multi-agent capability.
Use native child-agent tools, not create_thread or user-visible sidebar tasks.

- With collaboration.spawn_agent, use fork_turns="none" and a self-contained
  packet. With a different spawn API, use its documented fresh-context equivalent.
  Never pass a full parent history as a shortcut. Do not override the model unless
  the user or applicable environment instructions require it.
- Name each role and round in the packet, for example executor_001 and auditor_001.
  Wait for the executor before creating the auditor. Do not reuse the executor as
  auditor, or reuse prior-round children. Close/release finished children when the
  tool offers that capability so long work does not exhaust slots.
- The auditor's packet forbids changing task artifacts and control records. Use
  runtime read-only permissions if available. Otherwise disclose that the restriction
  is instruction-only; do not claim the native tools enforce it.
- The parent owns the work directory's control records. Children return reports;
  executor changes are limited to the explicitly named work surfaces.
- If capacity is temporarily occupied, release completed children or wait for active
  work before retrying. If independent contexts genuinely cannot be provided,
  checkpoint and report execution blocked, without parent-role simulation.

For Goal execution, require the user's explicit Goal launch request, use only the
currently available documented Goal capability, and copy the approved outcome and
acceptance into the goal. Never create a goal merely because the skill was invoked.
If that capability is absent, provide a normal launch prompt as an option but do
not silently switch an already requested Goal execution to another mode.
