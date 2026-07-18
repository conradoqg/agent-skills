---
name: grilling
description: >
  Use this skill when the user asks to be grilled or to stress-test a plan,
  decision, design, or idea before acting. Select sequential mode to resolve one
  decision at a time, or batch mode to cover independent decisions together in
  rounds. Use it for requests such as "grill me", "grilling", "batch grill",
  or when the user wants assumptions and tradeoffs surfaced before execution.
license: MIT
source:
  - https://github.com/mattpocock/skills/tree/main/skills/productivity/grilling
  - https://github.com/mattpocock/skills/tree/fde4cd58cf9d53e6fc287c445f33253645364311/skills/in-progress/batch-grill-me
---

# Grilling

Stress-test the user's thinking until every material decision is explicit and
shared understanding is confirmed. This skill does not enact the result.

**Failure pattern:** Acting on a plan while decisions, dependencies, or assumptions remain implicit.
**Verified by:** `python3 tests/validate_skills.py` passes with this skill in the catalog.

## Select the mode

Before asking substantive questions, require an explicit mode selection. Accept
`sequential` or `batch` in the request; otherwise ask:

> Which grilling mode should I use: **sequential** (one decision per turn) or
> **batch** (all independent decisions per round)?

State the chosen mode before beginning. Do not silently substitute one mode for
the other.

## Shared rules

1. Map the subject as a decision tree: each decision may unlock dependent
   decisions.
2. Research facts available in the environment with the relevant tools instead
   of asking the user. Decisions and preferences remain the user's to make.
3. Give a recommended answer with every decision question, but wait for the
   user's answer before treating it as settled.
4. Never assume an unresolved decision. Do not act on the outcome until the
   user explicitly confirms shared understanding.

## Sequential mode

Use this mode for a focused, conversational interview.

1. Ask the next unresolved decision whose prerequisites are settled.
2. Ask exactly one question, including its recommendation, then wait for the
   answer. Do not combine questions.
3. Incorporate the answer, identify the next unlocked decision, and repeat.

## Batch mode

Use this mode to cover a wider decision tree efficiently without asking
questions whose answers depend on each other.

1. Identify the **frontier**: every unresolved decision whose prerequisites are
   already settled.
2. Ask the full frontier in one numbered round, with a recommendation for each
   question. Wait for all answers before starting another round.
3. Recompute the frontier after the answers. A decision that depends on another
   open question from the current round belongs to a later round.
4. If a frontier question requires a fact from the environment, investigate it
   with available tools or a delegate. Treat that fact as an unsettled
   prerequisite, but continue asking unrelated frontier questions instead of
   blocking the entire round.

## Completion

The grilling session is ready to close only when the chosen mode has visited
every material branch, no decision is silently assumed, and the user confirms
that shared understanding has been reached. Then summarize the settled
choices, unresolved facts (if any), and explicit next action; wait for the user
to request that action.

## Gotchas

- In sequential mode, multiple questions at once defeat the mode; ask one and
  wait.
- In batch mode, asking a dependent question in the same round forces the user
  to guess; defer it until its prerequisites are settled.
- Do not turn fact-finding into homework for the user when the environment or
  available tools can answer it.

## What didn't work

- A single undifferentiated interview flow: it either overwhelms the user with
  dependent questions or needlessly serializes independent decisions; select a
  mode explicitly instead.
