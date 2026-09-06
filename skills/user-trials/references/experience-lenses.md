# Experience lenses

Read before operating the product. Use these lenses to notice what matters to
the persona's mission, not as a checklist of defects to manufacture. Start with
an uncoached attempt; then probe relevant uncertainty through permitted actions.
Broader requests warrant several journeys, not a critique of every screen.

| Lens | What to examine through actual use |
|---|---|
| First understanding and presentation | Can I tell what this product or page is for, what matters now, and where to start? Does its presentation fit my task? |
| Visual hierarchy and interaction | Can I find, read and distinguish the relevant content and controls at the tested viewport? Do spacing, density, emphasis and affordances help me act? |
| Language and information | Do labels, terminology, dates, units, empty states and instructions mean something clear to me? Is needed context available where I decide? |
| Business meaning and value | Do I understand what statuses, totals, eligibility, costs, permissions or commitments mean? Can I make the intended decision, and does the delivered result serve my goal? |
| Flow and control | Is the next step discoverable? Can I navigate back, preserve work, correct a choice and finish without unexplained detours? |
| Feedback, recovery and trust | Do I know whether an action happened, is pending, succeeded or failed? Is recovery actionable? Do contradictions make the result unreliable for my task? |

Use only applicable lenses and explain material gaps in coverage. Loading,
empty, validation, permission and recovery states are useful when encountered or
safely reachable within the mission; do not expand into exhaustive QA. Note
observed readability or keyboard obstacles without claiming an accessibility
audit. For CLI/API trials, adapt presentation to help, documentation and output
structure rather than demanding screenshots.

## Keep a user's perspective

For a consequential decision, probe four questions through use: does the persona
know what to achieve next, notice an available action, connect that action to the
goal, and recognize progress afterward? Record the actual cue or missing cue,
not a checklist score. Do not coach a persona with these answers in advance.

For dependent journeys, follow the result across boundaries that matter to the
mission: selection into approval, approval into execution, execution into a saved
result or artifact, and the next role's use of it. Compare identifiers, scope,
units and item-level outcomes where a total or confirmation could mislead a
decision. Reload or re-query when persistence matters. For asynchronous work,
distinguish acceptance from terminal job state and terminal state from every item
succeeding; poll within the charter rather than indefinitely.

Probe recovery only when authorized and discoverable: preserve valid work,
correct known inputs, retry the failed portion, then verify the resulting state.
Do not invent missing business data. A permission restriction, dense expert view
or intentionally deferred decision can be appropriate; assess its explanation
and consequence before calling it a defect. An undefined term alone establishes
uncertainty, not proof that its underlying calculation is wrong.

- State the expectation in ordinary task language: "I expect this total to cover
  the rows I am about to export," not "the filter predicate is wrong."
- Explain dislikes specifically: what felt unclear, excessive, missing or
  unhelpful for this persona, which cue led there, and the resulting action or
  uncertainty. "Bad UX" or "modern design needed" is not an experience finding.
- Separate an observed contradiction from an uncertain business rule. If the UI
  never defines a status, report the missing explanation and its decision impact;
  do not invent the company's intended policy.
- Preserve effective moments: a clear label, useful default, reassuring preview
  or easy recovery is worth keeping. Do not add praise to meet a quota.
- Completion and confidence can differ. A persona may finish after backtracking,
  or believe they finished despite an absent export. Report both, with evidence.
- A preference may be valid without being a defect. A dense table may help a
  frequent operator and overwhelm a newcomer; say why, without counting votes.

## Mission debrief

Summarize the persona's assessment in a few natural sentences supported by the
trial: what they achieved, what helped, what they disliked or misunderstood,
and what they would need clarified before trusting or repeating this workflow.
Explicitly say when no material friction was encountered. First-person wording
is optional; label it as a synthetic persona assessment, never a real quote.

Do not role-play panic, delight, elapsed human effort or purchase intent. Report
recorded actions and plausible situated interpretations, with confidence and
limits. Recommendations follow the experience evidence; they do not substitute
for it.
