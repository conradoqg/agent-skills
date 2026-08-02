# Ideation Process — Methodology, Output, Troubleshooting

> Read this when running an ideation session end to end: the five-phase methodology, output formats, supplementary techniques, troubleshooting table, and success criteria. Pair with `ideation-frameworks.md` (technique detail) and `red-flags.md`.

## Methodology

### Phase 1: Frame the Problem Space

Before generating ideas, establish clarity on the context:

1. **Define the Target Outcome** -- What measurable result are we trying to achieve? (e.g., increase activation rate by 15%, reduce churn by 10%)
2. **Identify the Target Segment** -- Who specifically are we solving for? Include behavioral and situational context, not just demographics.
3. **Map Known Constraints** -- Budget, timeline, technical platform, regulatory requirements, team capacity.
4. **Surface a Decision-Critical Condition** -- Before ideation, ask what
   concrete eligibility, dependency, failure mode, operational limit, or
   recovery constraint could make a promising direction unsuitable. For an
   unknown condition, record it as an assumption and avoid treating it as true.

For high-impact, automated, broad, or hard-to-reverse changes, cover the target
outcome and at least one independent decision condition before generating
solutions. This is not an invitation to collect every possible fact: prefer the
condition most likely to reverse the shortlist or change the safe scope of a
first step.

### Phase 2: Product Trio Ideation

Generate 5 ideas from each of the three perspectives (15 total):

**Product Manager Perspective (5 ideas)**
Focus: Business value, market positioning, customer pain points, strategic alignment
- What problems do customers report most frequently?
- Where are competitors weak that we could be strong?
- Which segments are underserved by current solutions?
- What would make customers willing to pay more or switch?
- How does this connect to our strategic objectives?

**Designer Perspective (5 ideas)**
Focus: User experience, workflows, accessibility, delight, friction reduction
- Where do users drop off or struggle in current flows?
- What tasks take too many steps or too much cognitive load?
- How could we surprise users with unexpected value?
- What accessibility gaps exist that exclude potential users?
- Where can we reduce time-to-value for new users?

**Engineer Perspective (5 ideas)**
Focus: Technical feasibility, scalability, platform capabilities, integration opportunities
- What new capabilities does our tech stack enable?
- Which features could we build quickly with high impact?
- Where could automation replace manual processes?
- What data do we have that we are not leveraging?
- Which technical debt, if resolved, would unlock new possibilities?

For each perspective, record relevant preconditions beside the ideas. A
precondition is not another idea: it is a fact that must hold for the idea to
be eligible, safe, or feasible. If it is unknown, include an observation-first,
segmented, reversible, or assisted direction rather than assuming a broad
launch is viable.

### Phase 3: Approach by Product Type

#### For New Products

Apply these lenses to each idea:

| Lens | Question |
|------|----------|
| **Core Value** | Does this idea deliver a single, clear value proposition? |
| **Speed to Validate** | Can we test the core assumption in under 2 weeks? |
| **Differentiation** | Why would someone choose this over existing alternatives? |
| **Market Timing** | Is the market ready for this? What tailwinds exist? |
| **Scalability** | Can this grow beyond the initial use case? |

#### For Existing Products (Opportunity Solution Tree)

Follow Teresa Torres' Continuous Discovery Habits framework:

```
Desired Outcome
├── Opportunity 1 (unmet need / pain point / desire)
│   ├── Solution A
│   ├── Solution B
│   └── Solution C
├── Opportunity 2
│   ├── Solution D
│   └── Solution E
└── Opportunity 3
    ├── Solution F
    └── Solution G
```

1. **Start with the outcome** -- The metric or business result you want to move.
2. **Map opportunities** -- Interview-driven insights about what customers need, want, or struggle with.
3. **Generate solutions per opportunity** -- Each opportunity gets multiple potential solutions.
4. **Compare and select** -- Evaluate solutions within the same opportunity branch, not across branches.

Before selecting, identify any branch whose solution depends on an unverified
eligibility, capacity, authorization, or recovery condition. Keep that branch
as a learning candidate or narrow its scope until the condition is understood.
### Phase 4: Prioritize the shortlist

From the ideas generated, select a shortlist sized to the decision and time
available. In a full 90-minute workshop, five is a useful default; smaller
sessions should keep only the alternatives that can be meaningfully compared.
Use this scoring model:

| Criterion | Weight | Scale |
|-----------|--------|-------|
| Customer Impact | 30% | 1-10 |
| Strategic Alignment | 25% | 1-10 |
| Feasibility | 20% | 1-10 |
| Speed to Validate | 15% | 1-10 |
| Differentiation | 10% | 1-10 |

**Weighted Score** = (Impact x 0.30) + (Strategy x 0.25) + (Feasibility x 0.20) + (Speed x 0.15) + (Differentiation x 0.10)

### Phase 5: Document Each Idea

For each prioritized idea, produce:

| Field | Description |
|-------|-------------|
| **Name** | Short, memorable name for the idea |
| **Description** | 2-3 sentence summary of what it is |
| **Reasoning** | Why this idea ranks highly -- connect to outcome and evidence |
| **Source Perspective** | PM, Designer, or Engineer |
| **Key Assumptions** | 2-3 assumptions that must be true for this to succeed |
| **Preconditions / Eligibility** | Constraint, segment, dependency, or control that must hold before broader use |
| **Suggested Validation** | How to test the riskiest assumption first |
| **Effort Estimate** | T-shirt size (XS / S / M / L / XL) |

## Output Format

### Prioritized Ideas Table

| Rank | Name | Source | Score | Effort | Top Assumption |
|------|------|--------|-------|--------|----------------|
| 1 | ... | PM | 8.4 | M | ... |
| 2 | ... | Design | 7.9 | S | ... |
| 3 | ... | Eng | 7.6 | L | ... |

### Detailed Idea Cards

For each idea, fill in the template from `assets/ideation_workshop_template.md`.

## Supplementary Techniques

When the trio needs additional stimulus:

- **SCAMPER** -- Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Reverse. Apply to existing products or competitor features.
- **How Might We (HMW)** -- Reframe problems as opportunity questions. "Users churn after trial" becomes "How might we demonstrate value before the trial ends?"
- **Crazy 8s** -- 8 sketches in 8 minutes per person. Forces breadth over depth.
- **Worst Possible Idea** -- Generate deliberately bad ideas, then invert them to find hidden good ones.

See `references/ideation-frameworks.md` for detailed descriptions of each technique.

## Troubleshooting

| Problem | Likely Cause | Resolution |
|---------|-------------|------------|
| Ideation session produces only incremental ideas, no breakthrough thinking | Anchoring bias -- team defaults to what they know; PM perspective dominates | Explicitly rotate perspectives (Designer first, then Engineer); use "Worst Possible Idea" technique to break anchoring; invite an outsider to challenge assumptions |
| Prioritization scores cluster tightly, making ranking impossible | Scoring criteria are too similar, or the team is avoiding differentiation | Add a forced-rank step after weighted scoring; increase weight spread between criteria; use pairwise comparison for the shortlist |
| Opportunity Solution Tree has too many branches to be actionable | Team brainstormed opportunities without filtering by evidence | Require each opportunity to link to at least 2 user interview quotes or data points; prune branches without evidence |
| Stakeholders reject prioritized ideas because "the real problem is different" | Problem framing was done without stakeholder input; target outcome not validated | Run a problem framing workshop with stakeholders before ideation; validate the target outcome with data before generating solutions |
| Same ideas keep resurfacing across sessions | Previous ideation results not documented or accessible; no "already considered" registry | Maintain an idea backlog with status (explored, parked, rejected with rationale); review it at the start of each session |
| Engineer perspective ideas are too implementation-focused | Engineers default to "how to build" rather than "what to build" | Reframe the prompt: "What new capability would our tech stack enable for users?" rather than "What should we build next?" |
| Validation suggestions are too expensive or slow | Team defaults to full A/B tests when lighter methods exist | Introduce pretotyping and Wizard-of-Oz as first validation options; define the smallest experiment that can change the decision |

## Success Criteria

- Each ideation session produces at least 15 ideas across all three Product Trio perspectives (minimum 3 per perspective)
- Each prioritized idea has a documented riskiest assumption and a validation plan
- At least 60% of prioritized ideas can begin validation within 2 weeks using lightweight methods
- Stakeholders rate the ideation output as "relevant to strategic objectives" at 4+/5
- Ideas that proceed to validation have a clear connection to the target outcome (traceable through the Opportunity Solution Tree)
- Ideation cadence is maintained (at minimum quarterly for existing products, monthly during new product exploration)
- At least 1 idea per quarter advances from ideation through validation to backlog commitment

## Further Reading

- Teresa Torres, *Continuous Discovery Habits* (2021)
- Marty Cagan, *Inspired* (2018)
- Jake Knapp, *Sprint* (2016)
- Michael Michalko, *Thinkertoys* (2006) -- SCAMPER origin
