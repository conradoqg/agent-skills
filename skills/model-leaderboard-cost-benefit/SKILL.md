---
name: model-leaderboard-cost-benefit
description: Analyze current model leaderboards and produce an auditable cost-benefit ranking. Use when comparing recent OpenAI, Anthropic, or Google models by benchmark capability, cost, or GitHub Copilot premium-request multiplier.
metadata:
---

# Model Leaderboard Cost-Benefit

Analyze current model leaderboards and rank cost-benefit with auditable rules.

## Workflow

1. Fetch current data. For Artificial Analysis, use
   `https://artificialanalysis.ai/leaderboards/models?status=all`. For GitHub
   Copilot multipliers, use the official premium-request multiplier docs.
2. Prefer a direct API when an official, simple endpoint exists. Otherwise,
   extract the HTML/Next.js payload, especially the `models` object.
3. Treat every `models` item as an independent entity. Do not aggregate
   variants by name, family, or inference.
4. For the default TerminalBench analysis:
   - keep models whose `releaseDate` is less than one year old;
   - keep only `OpenAI`, `Google`, and `Anthropic` in `modelCreatorName`;
   - require numeric `intelligenceIndex`, `terminalbenchHard`, and
     `intelligenceIndexCostTotal` values;
   - sort by `intelligenceIndex` and retain the top 40;
   - rank with 70% `terminalbenchHard` and 30% inverted
     `intelligenceIndexCostTotal`.
5. Produce an exclusion summary with reasons for models removed at each
   relevant stage.
6. State that a higher weighted score is better.
7. Recommend models for cheap, balanced, strong terminal/agentic, and
   premium/maximum-quality profiles.
8. Return the ranking directly in chat. Do not create Markdown, CSV, JSON, or
   report files unless the user explicitly asks for them.
9. Format the answer for human reading:
   - start with collection time, source, and score formula;
   - show a short recommendation table before the full ranking;
   - use short headers: `#`, `Creator`, `Model`, `Reasoning`, `Intelligence`,
     `TB Hard`, `Cost`, `TB/Cost`, `Score`, `Copilot`;
   - right-align numeric Markdown columns;
   - explain that `Copilot` is the paid-plan premium-request multiplier and
     `N/A` means no explicit match in the documentation;
   - summarize exclusions by reason and count, noting that reasons are not
     mutually exclusive;
   - show the detailed excluded-model table only when requested.

Answer in the user's language unless they request a specific output language.

## Bundled script

Use the bundled script when the request is exactly the Artificial Analysis and
TerminalBench workflow. It prints to stdout; use that output to answer in chat:

```bash
python3 scripts/artificial_analysis_terminalbench.py --format markdown
```

The script uses only the Python standard library, downloads the current HTML,
extracts `models`, applies the filters, and calculates:

```text
score = 0.7 * norm(terminalbenchHard) + 0.3 * norm(inverted_cost)
```

Adjust its parameters when the user requests a different top N, provider set,
weighting, capability metric, or cost metric. The script also adds the paid-plan
GitHub Copilot multiplier when the official documentation explicitly matches a
model or family.

## Normalization

- `terminalbenchHard`: min-max; higher is better.
- `intelligenceIndexCostTotal`: inverted min-max; lower cost is better.
- If every value for a metric is equal, assign `1.0` to every model for that
  metric to avoid division by zero.

## Required columns

Every main table must include:

- model creator;
- model;
- reasoning;
- `intelligenceIndex`;
- `terminalbenchHard`;
- `intelligenceIndexCostTotal`;
- `terminalbenchHard / intelligenceIndexCostTotal`;
- weighted `score`;
- paid-plan GitHub Copilot multiplier.

## Guardrails

- Always report the collection date and time.
- Do not leave output files in the workspace by default. Prefer pipelines and
  stdout for temporary inspection, and remove temporary files before finishing.
- Do not claim the ranking is stable; it depends on the current payload.
- If extraction breaks after a site change, inspect the current HTML/payload
  structure before changing ranking rules.
- Treat missing fields and `"$undefined"` as absent and record the exclusion.
