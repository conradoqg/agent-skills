---
name: user-trials
description: >
  Use this skill when the user wants distinct end-user perspectives grounded in
  actually operating a product through a browser, CLI, or API, or wants useful
  personas inferred from a product or codebase for experiential testing.
  Triggers include "test this as different users", "click through and
  critique", "what would users expect", persona-based usability testing, and
  developer-experience trials. Do not use for hypothetical expert debate
  without an operable product, deterministic QA/security/performance audits, or
  claims about real-user research.
---

# User Trials

Run independent, evidence-backed product trials from the viewpoints of users
whose goals and constraints are grounded in the product. The result is a set of
observations and situated opinions, not simulated market research.

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
- Read `references/surfaces.md` only for the surfaces selected for this run.
- Read `references/report-template.md` before synthesizing completed trials.

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

### 2. Build a coverage-driven panel

Use the persona model to select the smallest panel that covers every materially
distinct actor/permission boundary and critical journey. Add a contrast in
experience, pressure, or evaluative lens only when it could change behavior.
There is no fixed panel size.

Treat user-supplied personas as constraints, then fill missing fields. Do not
accept a title or adjective alone as a complete persona.

- For up to six personas, continue when the requested work is otherwise safe.
- Above six, show the coverage matrix and ask the user to approve or narrow the
  panel before operating the product.

### 3. Write the trial charter

For each persona, define one or more concrete missions, starting state, success
condition, allowed actions, prohibited actions, and reset strategy. Share the
charter in a concise progress update. Continue without another approval when
the user already requested testing and every action is read-only or safely
isolated.

The coordinator may use source evidence to classify a command, control, or
endpoint as allowed and read-only in the charter. That is harness authorization,
not persona knowledge: tell the persona that the action is permitted, but do not
reveal its expected result, implementation, or hidden recovery path.

Pause for authorization before using real credentials or performing purchases,
publishing, deletion, production mutation, or external communication. A broad
request to "test everything" does not authorize those actions.

### 4. Execute independently

Use one independent delegate per persona when delegation is available. Run in
batches if concurrency is limited. Each delegate receives only its persona
card, mission, user-visible context, target, safety boundaries, and the trial
record below. Do not share other personas' results or source-derived privileged
knowledge before the trial ends.

When delegation is unavailable, run personas sequentially with clearly reset
context and state, then disclose that fallback. Do not simulate clicks,
commands, responses, or errors: every claimed interaction needs tool evidence.

For each meaningful step, record:

```text
mission -> expectation before action -> action -> observed result -> evidence
```

Also record hesitation, recovery, task impact, confidence, and the persona's
opinion. Keep observation, inference, preference, tool failure, and
recommendation distinct.

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

Before sending the report, verify that every persona result includes confidence
or limitations and that the synthesis states the synthetic-trial limitation.

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
