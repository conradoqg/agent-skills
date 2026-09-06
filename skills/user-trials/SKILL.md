---
name: user-trials
description: >
  Use this skill when the user wants distinct end-user perspectives grounded in
  actually operating a product through a browser, CLI, or API, or wants useful
  personas inferred from a product or codebase for experiential testing.
  Triggers include "test this as different users", "click through and
  critique", "what would users expect", "what is confusing or frustrating",
  persona-based usability testing of visual presentation, business meaning and
  flows, and developer-experience trials. Do not use for hypothetical expert debate
  without an operable product, deterministic QA/security/performance audits, or
  claims about real-user research.
---

# User Trials

Run independent, evidence-backed product trials from the viewpoints of users
whose goals and constraints are grounded in the product. The result is a set of
observations and situated opinions, not simulated market research.
Explain what each persona understood, liked, disliked, trusted, or could not
decide, and how the operated product led to that assessment. Task completion
alone does not establish a good experience.

## Resolve the request

- **Discover only:** If the user asks who should test the product, inspect the
  available product evidence, propose the panel and missions, and stop.
- **Run trials:** If the user asks to operate, test, experience, or critique the
  product, derive the panel and then execute the trials.
- **Deliberate:** Invoke Council after the trials only when the user explicitly
  asks for a decision, prioritization, or Council handoff.

If the request is only a hypothetical design or architecture debate, do not
role-play product use. Answer directly or route to Council. If no operable
target is available for a requested trial, ask for the target instead of
inventing an interaction.

## Read the relevant references

- Read `references/persona-model.md` before deriving or validating a panel.
- Before operating, read `references/experience-lenses.md` and the selected
  sections of `references/surfaces.md`. For visual interfaces, also read
  `references/visual-evidence.md` so evidence is captured during the trial.
- Defer `references/report-template.md` until trial evidence is complete, then
  read it immediately before synthesis; keep the decision summary visible and
  evidence one step away.

## Workflow

### 1. Discover the product and its users

Inspect the highest-signal evidence available: user-facing routes, commands,
API contracts, authorization roles, onboarding, product documentation, error
paths, and critical workflows. Follow repository instructions and prefer a code
graph over text search when one is available.

Build an actor-and-journey map before choosing personas. Source code may inform
the coordinator, but it is privileged test-design context: never reveal
implementation details to a trial persona unless a real user in that role would
know them.

Keep that map compact: product promise, role, intended outcome, consequential
decision, prerequisite or handoff, and observable proof of completion. Separate
documented facts from unknown business rules. Select missions that exercise
different decisions or consequences, not merely more screens. Use the probing
guidance in `references/experience-lenses.md` for dependent or asynchronous work.

### 2. Build a coverage-driven panel

Use the persona model to select the smallest panel that covers every materially
distinct actor/permission boundary and critical journey within the requested
scope. A small task may need only one persona. Add a contrast in
experience, pressure, or evaluative lens only when it could change behavior.
There is no fixed panel size.

Treat user-supplied personas as constraints, then fill missing fields. Do not
accept a title or adjective alone as a complete persona.

Keep the panel within the requested scope and effort. Explain what each added
persona tests that the existing panel cannot; do not expand it merely to collect
more opinions.

### 3. Write the trial charter

For each persona, define one or more concrete missions, starting state, success
condition, allowed actions, prohibited actions, reset strategy, and a bounded
effort or stop condition. Give an outcome to achieve, not a route or a list of
suspected defects; provide steps only if the user is testing that exact route.
Identify the allowed local evidence/report directory separately from permissions
to mutate the product.
For visual trials, verify that one discovery-state capture can actually be saved
using `references/visual-evidence.md` before delegating. Give delegates the
verified capture location and the report directory; do not assume their browser
tool can write directly into the report directory. This is harness setup, not
persona evidence or knowledge of the task's outcome.
Share the charter in a concise progress update. Continue without another approval when
the user already requested testing and every action is read-only or safely
isolated.

The coordinator may use source evidence to classify a command, control, or
endpoint as allowed and read-only in the charter. That is harness authorization,
not persona knowledge: tell the persona that the action is permitted, but do not
reveal its expected result, implementation, or hidden recovery path.

Before using real credentials or performing purchases, publishing, deletion,
production mutation, or external communication, confirm that the specific action
is already authorized; otherwise ask. A broad request to "test everything" does
not authorize those actions. Do not ask again for authorization already given.

### 4. Execute independently

Use one independent delegate per persona when delegation is available. Run in
batches if concurrency is limited. Each delegate receives only its persona
card, mission, user-visible context, target, safety boundaries, the trial
record below and the selected surface's evidence-capture requirements. Do not
share other personas' results or source-derived privileged
knowledge before the trial ends.

Delegates return both the trial record and saved evidence with IDs and paths;
transient tool screenshots alone may be inaccessible to the coordinator. Use
separate sessions and data for independent parallel trials. Distinguish these
from roles cooperating on one mission: preserve that mission's state across a
handoff and transfer only information a real user could receive. Serialize access
to shared mutable state. Reset between independent attempts, never in the middle
of a dependent journey. Disclose a cooperative handoff as such, not independent
corroboration.

Ask each delegate for one concise record with evidence paths and a debrief, not
a second full report. Synthesize once; revisit an observation only when resolving
it could change the conclusion or recommendation. Stop when the mission's outcome
and material uncertainty are established or the charter's effort bound is reached.

When delegation is unavailable, run personas sequentially, resetting product
state and re-establishing each knowledge boundary. Disclose the fallback and any
prior exposure: rephrasing a persona does not erase the evaluator's knowledge or
provide independent context. Do not simulate clicks,
commands, responses, or errors: every claimed interaction needs tool evidence.

For each meaningful step, record:

```text
mission -> expectation before action -> action -> observed result -> evidence
```

Use visible labels, affordances, documentation and feedback to choose the next
action. Record a brief expectation before consequential actions and an immediate
reaction afterward; do not reconstruct all expectations after seeing the result.
When stuck, try plausible user-visible recovery within the charter, then record
abandonment or failure. Do not use implementation knowledge to rescue the task.

Apply the experience lenses to encountered states, without forcing a finding in
each category. Record helpful moments as well as hesitation, recovery, task
impact, confidence, and situated opinions. Tie any claimed hesitation to a
visible ambiguity, detour or repeated action. Do not invent human emotions,
quotes, dwell times or satisfaction scores from agent execution.

At the end of each mission, distinguish what the persona believes happened from
what the evidence verifies: opening a success screen may not produce the intended
business outcome or usable deliverable. Briefly debrief what was clear, what was
unwelcome or confusing, what helped, and what remains uncertain. Keep observation,
inference, preference, tool failure, and recommendation distinct.
Name the furthest verified result precisely: accepted request, completed job,
persisted change, usable artifact, or downstream outcome. Check the resulting
artifact or state through a permitted user surface when the mission depends on
it; if unavailable, carry that limit into the report's opening.

For material interface findings, capture the relevant state at discovery time
and deliver it with visual annotations and commentary as described in
`references/visual-evidence.md`. Do not postpone evidence collection until the
report; transient states may be gone.

Do not repair the product or recreate a missing product deliverable during the
trial. That turns an observed failure into an unrequested workaround and can
make the mission appear successful. Local screenshots, traces, and report files
are allowed as evidence, but label them as evaluator artifacts rather than
product outputs.

### 5. Handle failures honestly

Retry a transient tool or transport failure at most once, and only when no
product state may have changed. If it still fails, mark that portion
inconclusive. Never report automation failure as product friction.

### 6. Synthesize without voting

Preserve each persona's opinion, then group corroborated observations and
meaningful disagreements. Do not turn persona count into prevalence, average
away minority reactions, or claim demographic validity. Architecture and
roadmap implications are hypotheses unless the user explicitly requests a
subsequent deliberation.

Lead with the experience and mission outcome, not implementation diagnoses.
Explain conflicting mental models or preferences without forcing consensus.
Connect improvement hypotheses to specific findings, without turning the report
into an unsolicited redesign or repairing the product.

Before sending the report, verify:

- Read only the first paragraph of the final message: for a material failure,
  does it say what the affected user cannot decide or finish, or could do
  incorrectly? A description of the bad result alone is not its consequence.
  Put that operational effect here with the priority and decisive limit. For a
  clean mission, give the supported outcome and its boundary without inventing
  a problem. Do not rely on a later table or appendix to complete this paragraph.

- Every material finding links the persona's expectation, actual evidence and
  consequence; severity follows mission impact, not aesthetic dislike.
- Each persona has an outcome, a situated assessment, and confidence or limits.
  Successful paths and useful product behavior are retained when observed.
- Relevant visual, language, business, flow and trust dimensions are addressed
  through evidence or marked untested; no defect quota is imposed.
- Screenshots and annotations are legible, mapped to findings, and accessible in
  the delivered report. Missing captures or unverified outcomes are explicit.
- The first layer states scope, outcome, affected users, consequential findings,
  improvements and decisive limits without requiring the reader to reconstruct
  persona sessions. Each material suggestion has a concrete change, expected
  benefit and observable check; evidence and detailed steps are directly reachable.
- The exact targets written in the actual report's links, disclosures and static
  representation were checked,
  or their precise verification gaps are declared. Concision must not hide impact
  or uncertainty that changes the conclusion.
- The report states that these are synthetic trials, lists coverage gaps, and
  does not imply real-user testimony, prevalence or exhaustive validation.

## Gotchas

- A CEO is a user persona only when that role actually operates the tested
  workflow; otherwise it is a stakeholder lens for Council.
- Designer, artist, analytical, impatient, and cautious are roles or traits,
  not complete personas by themselves.
- Inspecting source is useful for test design but contaminates a user's trial if
  implementation knowledge leaks into the persona packet.
- Screenshots prove appearance, not intent. Pair them with the action and
  observed state that make the finding reproducible.
- When an export, download, generated file, or API payload is missing, preserve
  that absence. Do not fabricate a replacement to complete the user's mission.
- Synthetic trials can discover friction and generate hypotheses; they do not
  replace research with real users, accessibility studies, or statistical
  validation.
