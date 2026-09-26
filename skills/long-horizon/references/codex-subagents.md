# Codex delegation adapter

Use native child-agent tools, not `create_thread` or user-visible sidebar tasks.
The bounded roster is the manager, up to two domain workers, and one auditor.
Spawn only when there is a concrete independent assignment; reserve one slot
for the auditor. Never spawn a fresh pair for each file, repair or milestone.
For a small one-milestone task, use no domain worker unless it has substantial
independent work or the user explicitly wants parallel agents; spawn only the
separate auditor at completion.

- Create a worker with `fork_turns="none"` and a self-contained contract naming
  its domain, owned paths, deliverable, acceptance, dependencies and evidence
  location. Reuse that worker with `followup_task` for the next assignment in the
  same domain. Use `send_message` only to steer an active worker. Do not override
  the model unless the user or environment requires it.
- Create a separate auditor at the final review, or earlier only when a
  consequential milestone needs independent clearance. Reuse this auditor for
  any later audit and the final integrated review. Send the
  approved criteria and current evidence pointers, not the worker's reasoning.
  The auditor must inspect the current artifacts directly and never implement
  or repair this work item. If it previously audited a milestone, it must
  recheck changed evidence rather than trusting its earlier conclusion.
- Keep the agent roster and workstream ownership in the manager's checkpoint.
  Before delegating, inspect known agents and their status. Reuse an idle child;
  wait only for a known active child. Avoid overlapping edits to the same paths.
  Audit a stable artifact version; if another worker changes audited paths,
  invalidate the affected check and re-observe those paths.
- Some hosts cannot remove completed agents. A returned `agent thread limit`
  is a capacity boundary, not a request to retry or invent cleanup. Stop new
  spawns, reuse an available child if one exists, and let the manager continue
  authorized implementation. Keep results awaiting independent audit if no
  auditor exists. Never claim that the parent performed an independent audit.
- The manager alone writes `plan.md`, `state.json`, `report.md` and audit records.
  Workers may write only the named product artifacts and workstream evidence.
  An auditor returns its report to the manager and remains observational. Use
  enforced read-only permissions when supported; otherwise state that the
  restriction is instructional.

For Goal execution, require the user's explicit Goal launch request and use only
the documented Goal capability. Keep local work status separate from host Goal
status. A blocked milestone does not complete the Goal. Set `paused` only at the
user's request and `complete` only after all approved criteria and the final
independent audit pass. In Codex, set Goal `blocked` only after the same blocking
condition recurs in three consecutive Goal turns; do not poll or repeat an
unchanged attempt while waiting. If the status control is unavailable, say so.
