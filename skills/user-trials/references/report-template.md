# User Trials report

Read before synthesis. Keep the report proportional to the tested journeys;
group repeated evidence instead of repeating every trace. Write in the user's
language. For visual trials, follow `visual-evidence.md` for the illustrated
artifact. CLI/API reports normally use commented text excerpts.

## Experience overview

Lead with what the personas could accomplish, the most consequential friction,
and observed strengths worth preserving. State that these are synthetic trials
based on actual tool interactions, not interviews or representative user research.

## Trial charter and coverage

- Product/version, tested surface and relevant device/viewport or locale
- Missions, starting states, stop conditions and safety boundaries
- Panel, grounding evidence and material assumptions
- Protocol: delegated or sequential fallback, isolation and any contamination
- Journeys and relevant experience lenses exercised; important untested areas

## Persona results

For each persona:

- **Situation:** role, goal, context, permissions, starting mental model, success
- **Outcome:** completed, failed, abandoned, or inconclusive; distinguish believed
  completion from verified results when they differ
- **Experience:** a concise journey from expectation to action, observation and
  evidence IDs, retaining detours or recovery that changed the experience
- **Assessment:** what was clear/helpful, disliked/confusing, and still uncertain
  for this persona; label first-person summaries as synthetic assessments
- **Confidence and limitations:** evidence strength, assumptions, missing states

Link to shared findings below. Preserve disagreement without invented quotations
or mandatory positive/negative reactions.

## Illustrated findings

Order by mission impact. Use one unit per distinct finding:

1. **ID and title:** a concrete experience consequence, such as "The confirmation
   leaves me unsure whether my request is finished."
2. **Who and where:** persona(s), mission, relevant lens and reproducible steps.
3. **Expected versus observed:** the expectation's visible or contextual basis,
   the actual result and linked evidence. Separate inference from observation.
4. **Figure or excerpt:** annotated screenshot beside its caption, or commented
   command/HTTP evidence. Use before/after views when necessary to explain a
   transition. State missing visual evidence explicitly.
5. **Situated reaction and impact:** why this persona cared, any recovery or
   workaround, severity and confidence. Distinguish preference from defect.
6. **Improvement hypothesis:** a direction tied to the unmet need and what would
   need checking to know whether it helps. Do not prescribe an untested redesign.

Severity describes mission impact, independently of confidence:

- **Blocker:** the mission cannot be completed safely.
- **High:** completion produces a wrong result or requires an unsafe workaround.
- **Medium:** material delay, confusion, or recovery work.
- **Low:** localized friction or preference with little task impact.

Record useful behavior or a clean mission without assigning a defect severity.
Do not inflate a finding because several synthetic personas mention it.

## Cross-persona synthesis

- Corroborated observations and meaningful divergent reactions, with context
- What to preserve and improvement hypotheses linked to findings
- Inconclusive areas, capture limitations, coverage gaps and questions for actual
  users or product owners; avoid an exhaustive-validation claim
- If requested, an evidence packet for Council; otherwise do not force a roadmap
  or architecture decision

## Evidence index

Map evidence IDs to finding IDs, persona/mission steps and the embedded figure
or excerpt. Link safe supporting files where useful. Raw logs and screenshots
supplement the readable account; the reader should not need to inspect them to
understand a reported problem.
