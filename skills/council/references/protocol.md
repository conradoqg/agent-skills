# Council Protocol

This protocol is harness-agnostic. Adapters should map it onto the local orchestration features of the host environment.

## Inputs

- problem statement
- optional profile
- optional triad
- optional explicit member list
- optional `show_rounds` flag

## Panel Selection

Resolve the active PROFILE first, then the members/triad WITHIN it.

Active profile:

- If `--profile` is given, that is the active profile.
- Else the active profile is `classic`.

Members within the active profile, in order:

1. If the user specifies `--members`, use exactly those members.
2. Else if the user specifies `--triad`, resolve that triad inside the active profile.
3. Else inspect the problem statement for keyword triads that exist in the active profile:
   - Match by MEANING, not by literal token. The keywords are English concept
     labels; the problem may be in any language. Interpret the problem's intent
     (translating it to English if needed) and select every triad whose concept
     the problem is about. A prompt in Portuguese saying "segurança" matches the
     `security` keyword; "implantar/publicar" matches `deploy`; and so on. Do not
     require the literal English word to appear.
   - Collect ALL triads whose concepts the problem touches (do not stop at the
     first match).
   - If exactly one matches, use it.
   - If more than one matches, do NOT pick silently. Present the matched
     triads (name + rationale + members) and ask the user to choose. ALWAYS
     offer, as the first option, an explicit "all / todos" choice whenever more
     than one option exists:
     a. all/todos — combined panel: the union of ALL matched triads (and any
        other option offered), deduplicated. This option MUST always be present
        when more than one option exists;
     b. one — the user names which single triad;
     c. specific members — the user names an explicit member list.
     Wait for the answer before running Round 1.
4. Else use the active profile's `default_triad`.

`--profile` sets scope only; it does NOT short-circuit keyword matching. The
profile's `default_triad` is the fallback used when no keyword matches, not an
override of the keyword step.

Default behavior should prefer 3 members for speed and clarity. Use the full panel only when the user asks for it or when the decision is unusually ambiguous.

## Round 1: Independent Analysis

- Run each selected member independently.
- Keep the first round blind-first: each member sees the problem statement and their own persona only.
- Ask for a compact standalone analysis with a clear verdict and confidence level.
- Prefer parallel execution when the harness supports it.

## Round 2: Cross-Examination

- Share the round 1 outputs with each member.
- Ask each member to:
  - name the position they most disagree with and why
  - name one insight that strengthened their thinking
  - say whether anything changed
  - restate their position after the exchange
- Prefer sequential execution so later responses can react to earlier cross-exams.

## Round 3: Final Position

- Ask for a short final stance only.
- No new arguments unless a harness limitation forces a condensed fallback.
- Socrates may ask one final question before stating a position.

## Synthesis

Use the verdict template and report:

- problem
- composition
- consensus or lack of consensus
- points of agreement
- points of disagreement
- minority report
- unresolved questions
- recommended next steps

Keep the default output compact. Only include round transcripts when the user asks for them.

## Enforcement Rules

- Do not allow recursive questioning loops.
- Require real disagreement before declaring consensus.
- If consensus arrives too early, run one counterfactual pass:
  - Assume the current consensus is wrong. What strongest alternative would flip the decision?
- If the harness cannot support multi-round orchestration, simulate the same structure in one agent and disclose that fallback.

## Graceful Fallback

When a harness cannot spawn subagents or parallelize:

1. simulate round 1 as clearly separated persona sections
2. simulate round 2 as explicit disagreements between those sections
3. simulate round 3 as short final positions
4. synthesize the verdict in the same format
