---
name: council
description: Run a structured multi-perspective council on a hard decision, design choice, debugging question, strategy problem, or tradeoff. Use when the user wants multiple viewpoints, explicit cross-examination, and a compact final verdict.
source: https://github.com/tsenart/council-skill
---

# Council

Use this skill when the user wants a multi-perspective council rather than a
single answer. Good triggers include:

- "run a council on this"
- "get multiple perspectives"
- "debate this decision"
- "stress test this plan"
- architecture, product, strategy, debugging, risk, or founder tradeoffs

If `$ARGUMENTS` is non-empty, treat it as the problem statement. Otherwise ask
the user for the question to deliberate on.

## First Step

Read only the references you need:

- `references/profiles.yaml` for panel selection
- `references/protocol.md` for orchestration
- `references/verdict-template.md` for final output shape
- `references/personas/<member>.md` only for the members you actually select

## Defaults

- Default to real delegation (one independent subagent per member) whenever a
  delegation tool exists. Single-agent simulation is the exception, not a
  convenience. Resolve this before anything else — see "Resolve Orchestration".
- Prefer 3 members unless the user asks for a full panel or the problem is
  unusually ambiguous.
- Default to `classic` + `architecture` if nothing else is specified.
- Keep the final verdict compact unless the user asks to see the rounds.

## Resolve Orchestration (do this first)

Before selecting the panel, inspect your available tools for ANY delegation
capability: `subagent`, `spawn_agent`, `task`, `oracle`, `delegate`, forked or
parallel agent contexts. Codex/Amp/Claude Code are examples, NOT the full list.

- If ANY such tool exists, you MUST use it for Round 1 (one delegate per
  member). Cost, effort, or "this seems disproportionate" are NOT valid reasons
  to skip it — the only criterion is capability, not convenience.
- Fallback (single-agent simulation) is permitted ONLY if no delegation tool
  exists at all.

## Workflow

### 1. Resolve The Panel

First resolve the active profile: use `--profile` if given, else `classic`.
`--profile` sets scope only — it does NOT skip keyword matching.

Then resolve members WITHIN the active profile, in order:

1. explicit `--members`
2. explicit `--triad` (resolved inside the active profile)
3. keyword triad match — collect ALL matching triads in the active profile, not
   just the first. Match by MEANING, not literal token: keywords are English
   concept labels but the problem may be in any language, so interpret intent
   (translate to English if needed) — e.g. Portuguese "segurança" matches
   `security`, "implantar/publicar" matches `deploy`. Then:
   - exactly one match → use it.
   - more than one match → do NOT pick silently. List the matched triads
     (name, rationale, members) and ask the user to choose. ALWAYS present, as
     the first option, an explicit "all / todos" choice — the combined panel
     that is the union of ALL matched triads (and any other option you offered),
     deduplicated. The options are: (a) all/todos — combined panel (union of
     every matched triad, deduplicated); this option MUST always be offered
     whenever more than one option exists; (b) a single named triad; or (c) an
     explicit member list. Wait for the answer.
4. the active profile's `default_triad` (fallback when no keyword matches)

### 2. Round 1: Independent Analysis

- Run each selected member independently.
- Keep round 1 blind-first: each member sees only the problem statement and
  their own persona text.
- Ask for a compact standalone analysis that ends with a clear verdict,
  confidence, and where the member may be wrong.

Orchestration (see "Resolve Orchestration" — decided before Round 1):

- If a delegation tool exists, you MUST run one independent delegate per
  selected member. This is mandatory, not preferred.
- Tool-specific hints: Codex `spawn_agent` + `send_input` + `wait_agent`; Amp
  one `oracle` call per member; Claude Code parallel/forked contexts; any host
  exposing a `subagent`/`task`/`delegate` tool — use it. These are examples, not
  an exhaustive list; a tool not named here still counts.
- Only if NO delegation tool exists at all: keep the protocol in the main
  session, separate the member outputs clearly, and follow "Fallback Mode".

Suggested round 1 packet:

```text
You are operating as one member of a structured council.

Persona:
{persona}

Problem:
{problem}

Produce a compact standalone analysis.
End with a clear verdict, confidence, and where you may be wrong.
Do not anticipate the other members.
```

### 3. Round 2: Cross-Examination

- Share the round 1 outputs with each member.
- Ask each member to:
  - name the position they most disagree with and why
  - name one insight that strengthened their thinking
  - say whether anything changed
  - restate their position after the exchange
- Prefer sequential execution so later responses can react to earlier
  disagreements.

If a delegation tool exists, run the cross-exam through delegates too. Run the
cross-exam in the main session ONLY when no delegation tool exists — never
because a second delegate pass "seems like too much".

Suggested round 2 packet:

```text
Here are the other council members' round 1 analyses:

{peer_outputs}

Respond to all of the following:
1. Which member do you most disagree with, and why?
2. Which member strengthened your thinking, and how?
3. What changed, if anything?
4. Restate your position after the exchange.

Keep it compact and engage at least two members by name.
```

### 4. Round 3: Final Position

- Ask for a short final stance only.
- No new arguments unless a host limitation forces a condensed fallback.
- Socrates may ask one final question before stating a position.

### 5. Synthesis

- Use `references/verdict-template.md`.
- Default to the final verdict only.
- If the user asks to show rounds, include concise round summaries after the
  verdict.

## Fallback Mode

Permitted ONLY when no delegation tool exists at all. "Disproportionate",
"too costly", or "this is simple enough" are NOT valid triggers — capability is
the sole criterion.

If you fall back, you MUST name the delegation tools you checked for and did not
find (e.g. "no `subagent`, `spawn_agent`, `task`, or forked-context tool is
available"). A fallback without that named justification is invalid — if you
cannot honestly write that sentence, a tool exists and you must delegate.

Then:

1. simulate round 1 as clearly separated persona sections
2. simulate round 2 as explicit cross-exam sections
3. simulate round 3 as final positions
4. disclose that you used the single-agent fallback

## Guardrails

- Do not force consensus.
- If the panel converges too quickly, run one counterfactual pass.
- Prefer substance over theater: the council should improve the answer, not
  just decorate it.
