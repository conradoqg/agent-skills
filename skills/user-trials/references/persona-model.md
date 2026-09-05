# Persona model and panel selection

## Persona card

A trial persona is a concrete behavioral configuration, not a fictional
biography. Define only fields that can affect the mission:

| Field | Meaning |
|---|---|
| Role | Relationship to the product and responsibilities in this workflow |
| Goal | Outcome the person is trying to achieve |
| Experience | Relevant domain and product familiarity |
| Context | Time pressure, frequency, environment, or stakes |
| Permissions | What the person can see and change |
| Success | Observable completion criterion |
| Lens | What this person notices because it affects their goal |
| Starting mental model | What this person expects the product's terms and actions to mean, based on prior experience or visible cues |
| Knowledge boundary | Information a real user in this situation would know |

An archetype is a reusable behavioral pattern such as "cautious newcomer" or
"high-frequency operator". A persona instantiates an archetype for a particular
product, role, mission, and context.

Distinguish product facts from assumptions used to configure the trial. Include
language, device, input method or domain vocabulary only when they could change
the journey and can actually be exercised. Do not infer behavior from demographic
stereotypes, invent a biography, or assume the persona already knows the UI.

## Derive candidates from product evidence

1. Identify actors from authorization roles, navigation, command groups, API
   consumers, onboarding, documentation, and ownership boundaries.
2. Identify critical journeys from primary routes, commands, endpoints, error
   recovery, recurring operations, and irreversible transitions.
3. Create candidates at intersections where role, permissions, or success
   criteria materially alter the path.
4. Add behavioral contrasts only where experience, pressure, or tolerance for
   risk plausibly changes what the person does or notices.

Do not create a generic executive, designer, artist, or "analytical user"
unless product evidence connects that role or lens to a real workflow.

## Select the panel

Construct a coverage matrix with candidates as rows and material
actor/permission-plus-journey combinations within the user's scope as columns.
Select the smallest set
whose union covers every column. Prefer a persona that covers several compatible
journeys, but never merge personas with conflicting permissions, knowledge, or
success criteria.

Stop adding personas when the next candidate contributes no unique journey,
permission boundary, recovery behavior, or materially different decision lens.
There is no minimum or maximum. Ask for confirmation before executing more than
six because cost and duration become material, not because six is a validity
threshold.

## Example

Weak: "CEO, analytical, wants good dashboards."

Executable: "Operations director who opens the dashboard weekly, has read-only
portfolio access, has five minutes before a review meeting, and succeeds when
they can explain which project is delayed and why without editing records."
