---
name: brainstorm-ideas
description: >
  Facilitate structured product ideation for new products and improvements to
  existing ones, using Product Trio perspectives and Opportunity Solution Trees.
  Use when the user needs to generate, compare, or prioritize product ideas,
  even if they do not mention these frameworks.
license: MIT + Commons Clause
metadata:
  version: 1.0.1
  author: borghei
  category: project-management
  domain: product-discovery
  updated: 2026-06-15
  tech-stack: product-trio, opportunity-solution-tree, scamper, hmw
  source: https://github.com/borghei/Claude-Skills/tree/main/project-management/discovery/brainstorm-ideas
  source_version: 1.0.1
  local_adaptations: decision-critical discovery coverage before ideation
---
# Product ideation

Generate alternatives from PM, Designer, and Engineer perspectives, then map,
compare, and document the shortlist. Scale the number of ideas and the final
shortlist to the decision, time available, and risk; use the full workshop
format only when its depth is warranted.

## Clarify First

Before ideating, confirm these inputs. If any is unknown or vague, ASK — do not assume:

- [ ] **New vs existing product** — selects the approach (new-product lenses vs Opportunity Solution Tree mapping)
- [ ] **Target outcome or problem** — the desired outcome the session is anchored to (ungrounded ideation produces random ideas, not prioritizable ones)
- [ ] **Hard constraints** — tech stack, timeline, budget limits (bound the feasibility and speed scores in prioritization)
- [ ] **Decision-critical condition** — a concrete eligibility, dependency,
  downside, operational limit, or recovery condition that could make an
  otherwise attractive direction unsuitable

Stop rule: ask only the 2-3 inputs that most change the output. Cover the
outcome and at least one independent condition that could invalidate or reshape
the direction before generating solutions. Ask about observable current
conditions rather than requesting an abstract diagnosis. If a material answer
is unknown, state it as an assumption and prefer an option that learns or limits
exposure to it. If the user says "just draft it," proceed and list assumptions
and preconditions at the top of the artifact.

## Decision-Critical Coverage

Before moving from framing to Product Trio ideation, distinguish:

- **Known evidence** — current behavior, segment, outcome, and constraints.
- **Assumptions** — conditions a direction needs in order to work.
- **Decision-critical unknowns** — facts that could reverse the shortlist,
  change reversibility, or expose material harm.

Do not turn every unknown into a research task. For low-stakes, reversible
exploration, a short uncertainty note is enough. For automation, a broad
rollout, material financial or access impact, contractual obligations, or an
irreversible change, first ask about one concrete condition of eligibility,
failure, capacity, authorization, or recovery. If the participant cannot answer
it, include a reversible or observation-first direction rather than quietly
assuming it away.

## References

Load the reference that matches the task — keep this file lean and pull detail on demand:

- **[references/ideation-process.md](references/ideation-process.md)** — the full five-phase methodology (frame → trio → product-type approach → prioritize → document), output formats, supplementary techniques, troubleshooting table, success criteria, and further reading. Read when running a session end to end.
- **[references/ideation-frameworks.md](references/ideation-frameworks.md)** — deep descriptions of the Product Trio methodology and each supplementary technique (SCAMPER, HMW, Crazy 8s, Worst Possible Idea). Read when you need technique detail or facilitation mechanics.
- **[references/red-flags.md](references/red-flags.md)** — common ways ideation output goes wrong with bad/good examples. Read before publishing the idea list or moving to prioritization.

## Scope & Limitations

**In Scope:** Structured ideation facilitation using Product Trio approach, Opportunity Solution Tree mapping, proportional idea prioritization, SCAMPER and HMW supplementary techniques, and idea documentation with validation plans.

**Out of Scope:** Running assumption tests or experiments, detailed product requirements, market research and competitive analysis, and financial modeling. Clearly state the next question, experiment, or planning artifact needed rather than assuming a particular downstream workflow exists.

**Limitations:** Ideation quality is bounded by the diversity of perspectives in the room -- remote-only sessions may reduce creative energy. Scoring models provide structured comparison but are not objective truth; they encode the biases of the scorers. Opportunity Solution Trees require ongoing user research to populate -- they are not a substitute for customer interviews.

## Calibration

- Treat risk, compliance, operational capacity, and recovery as conditions on
  a solution, not as a fourth source of ideas. They should reshape the
  shortlist and validation plan.
- For each prioritized idea, state the precondition that must be true, who or
  what it affects, and the smallest way to test or bound that precondition.
- When the underlying cause or eligibility is not yet known, include a
  segmented pilot, reversible rule, manual assist, or observation-first path
  alongside build-oriented ideas.
