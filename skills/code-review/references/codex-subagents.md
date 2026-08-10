# Codex specialist handoff

Use this topology only when the inventory reports more than 100 changed files and
Codex multi-agent tools are available. Subagents inherit the review sandbox,
inspect the same repository read-only, and never edit, write SARIF, or publish.
Run the two specialists sequentially so the second receives the first result and
the review stays within the available agent slots.

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

2. Wait for the mapper to finish. Spawn one `risk_verifier`; include the mapper's
   returned text verbatim under `HANDOFF FROM change_mapper`. Ask it to challenge
   every candidate, deduplicate shared root causes, and independently close
   security, tenant/data, persistence, concurrency, reliability, CI/deploy,
   observability, and changed-test gaps. It must also independently reopen every
   mapper `CLEARED LEAD` involving security, authorization, tenant/cache,
   persistence, or concurrency rather than accepting that disproof verbatim.
   It must not clear a confirmed behavior regression in a pre-existing exported
   operation solely because no in-repository caller is found: absent evidence
   that the operation was removed or dead before the diff, its callable
   contract is the reachability boundary. This rule does not make a newly added,
   unwired export reachable.
   Require this schema:

   ```text
   ROLE: risk_verifier
   HANDOFF DECISIONS:
   - candidate or high-risk cleared lead | confirmed or cleared | concrete source evidence
   NEW CANDIDATES (maximum 24):
   - changed fix path:line | mechanism | reachable consequence | proving source
   COVERAGE GAPS:
   - changed file/area not settled
   ```

3. Wait for the verifier. The primary agent verifies every surviving or new
   candidate in source and the diff, fills any coverage gap, assigns severity,
   writes and validates SARIF, and renders the response.

A handoff is valid only when both spawn calls succeed, both agents complete, and
the second spawn contains the actual first result. When the runtime prompt says
multi-agent tools are enabled, attempt the spawn rather than inferring that they
are unavailable. If a spawn fails, make at most three total attempts for that
same role; only after all three fail run the missing pass in the primary
session. For 100 or fewer changed files or when the tools are not enabled,
perform the two passes sequentially in the primary session without pretending
that a handoff occurred.
