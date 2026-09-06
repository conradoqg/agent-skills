# Codex specialist passes

Use this topology only when the inventory reports more than 100 changed files and
Codex multi-agent tools are available. Subagents inherit the review sandbox,
inspect the same repository read-only, and never edit, write SARIF, or publish.
Start the two specialists independently and in parallel when two subagent slots
are available. If the second spawn is rejected for capacity, let the first finish
and retry the second; do not reduce coverage merely because parallelism was
unavailable.

After phase 1 produces the compare range, inventory, impact map, and risk leads:

1. Spawn one `change_mapper`. Include the compare range and artifact paths. Ask
   it to cover every behavior-affecting changed block, separating mechanical
   families from unique changes and emphasizing deletions, contracts, callers,
   implementors, configuration, migrations, and tests changed with code. Require
   no more than 24 concise candidates in this schema; this ceiling is large
   enough for a broad review while still forcing prioritization:

   ```text
   ROLE: change_mapper
   CANDIDATES:
   - changed fix path:line | mechanism | reachable consequence | proving source
   CLEARED LEADS:
   - path:block | concrete disproof
   COVERAGE:
   - changed files/areas inspected
   ```

2. Without waiting for the mapper, spawn one independent `risk_verifier` with the
   same compare range and artifact paths. Ask it to inspect security,
   tenant/data, persistence, concurrency, reliability, CI/deploy,
   observability, and changed-test risks without relying on the mapper's
   candidate selection. It must actively search for concrete disproof and
   shared root causes rather than accepting or duplicating a suspicious symptom.
   It must not clear a confirmed behavior regression in a pre-existing exported
   operation solely because no in-repository caller is found: absent evidence
   that the operation was removed or dead before the diff, its callable
   contract is the reachability boundary. This rule does not make a newly added,
   unwired export reachable.
   Require this schema:

   ```text
   ROLE: risk_verifier
   CANDIDATES (maximum 24):
   - changed fix path:line | mechanism | reachable consequence | proving source
   CLEARED HIGH-RISK LEADS:
   - path:block | concrete disproof
   COVERAGE GAPS:
   - changed file/area not settled
   ```

3. Wait for both specialists. The primary agent cross-checks their independent
   outputs, verifies every surviving candidate in source and the diff,
   deduplicates shared root causes, fills every coverage gap, assigns severity,
   writes and validates SARIF, and renders the response.

A parallel specialist run is valid only when both spawn calls succeed and both
agents complete. When the runtime prompt says multi-agent tools are enabled,
attempt both spawns rather than inferring that they are unavailable. If a spawn
fails, make at most three total attempts for that same role; only after all three
fail run the missing pass in the primary session. For 100 or fewer changed files
or when the tools are not enabled, perform the two passes sequentially in the
primary session without pretending that parallel specialists ran.
