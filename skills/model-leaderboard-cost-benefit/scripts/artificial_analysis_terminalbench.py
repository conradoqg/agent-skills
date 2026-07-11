#!/usr/bin/env python3
"""Extract Artificial Analysis model leaderboard and rank TerminalBench value."""

from __future__ import annotations

import argparse
import html
import json
import math
import re
import sys
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any


DEFAULT_URL = "https://artificialanalysis.ai/leaderboards/models?status=all"
COPILOT_MULTIPLIERS_URL = (
    "https://docs.github.com/en/copilot/managing-copilot/monitoring-usage-and-entitlements/"
    "about-premium-requests#model-multipliers"
)
COPILOT_MULTIPLIERS_PAID = {
    "claude haiku 4.5": 0.33,
    "claude opus 4.5": 3.0,
    "claude opus 4.6": 3.0,
    "claude opus 4.6 fast mode": 30.0,
    "claude opus 4.7": 15.0,
    "claude sonnet 4": 1.0,
    "claude sonnet 4.5": 1.0,
    "claude sonnet 4.6": 1.0,
    "gemini 2.5 pro": 1.0,
    "gemini 3 flash": 0.33,
    "gemini 3.1 pro": 1.0,
    "gpt-4.1": 0.0,
    "gpt-4o": 0.0,
    "gpt-5 mini": 0.0,
    "gpt-5.2": 1.0,
    "gpt-5.2-codex": 1.0,
    "gpt-5.3-codex": 1.0,
    "gpt-5.4": 1.0,
    "gpt-5.4 mini": 0.33,
    "gpt-5.4 nano": 0.25,
    "gpt-5.5": 7.5,
    "grok code fast 1": 0.25,
    "raptor mini": 0.0,
}


@dataclass
class RankedModel:
    model: dict[str, Any]
    tb_per_cost: float
    capability_norm: float
    cost_norm: float
    score: float


def fetch_text(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
            )
        },
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def decode_next_chunks(document: str) -> str:
    chunks: list[str] = []
    for match in re.finditer(r"self\.__next_f\.push\(\[1,([\"'])(.*?)\1\]\)</script>", document, re.S):
        raw = match.group(2)
        try:
            chunks.append(json.loads(f'"{raw}"'))
        except json.JSONDecodeError:
            chunks.append(raw)
    if chunks:
        return html.unescape("".join(chunks))
    return html.unescape(document)


def find_matching_bracket(text: str, start: int) -> int:
    depth = 0
    in_string = False
    escape = False
    quote = ""
    for idx in range(start, len(text)):
        char = text[idx]
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == quote:
                in_string = False
            continue
        if char in ('"', "'"):
            in_string = True
            quote = char
            continue
        if char == "[":
            depth += 1
        elif char == "]":
            depth -= 1
            if depth == 0:
                return idx
    raise ValueError("could not find closing bracket for models array")


def extract_models(document: str) -> list[dict[str, Any]]:
    candidates = [document, decode_next_chunks(document)]
    patterns = [r'"models"\s*:\s*\[', r'\\"models\\"\s*:\s*\[']
    model_sets: list[list[dict[str, Any]]] = []

    for text in candidates:
        for pattern in patterns:
            for match in re.finditer(pattern, text):
                array_start = match.end() - 1
                array_end = find_matching_bracket(text, array_start)
                payload = text[array_start : array_end + 1]
                payload = payload.replace('\\"', '"')
                payload = payload.replace('"$undefined"', "null")
                payload = payload.replace("$undefined", "null")
                try:
                    models = json.loads(payload)
                except json.JSONDecodeError:
                    continue
                if isinstance(models, list) and models:
                    model_sets.append([m for m in models if isinstance(m, dict)])

    if not model_sets:
        raise ValueError("models array not found in HTML/Next.js payload")

    required_keys = {
        "modelCreatorName",
        "releaseDate",
        "intelligenceIndex",
        "terminalbenchHard",
        "intelligenceIndexCostTotal",
    }
    model_sets.sort(
        key=lambda models: sum(len(required_keys.intersection(model.keys())) for model in models[:10]),
        reverse=True,
    )
    return model_sets[0]


def numeric(value: Any) -> float | None:
    if value is None or value == "$undefined":
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)) and math.isfinite(value):
        return float(value)
    if isinstance(value, str):
        try:
            parsed = float(value)
        except ValueError:
            return None
        return parsed if math.isfinite(parsed) else None
    return None


def parse_date(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value[:10]).replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def fmt(value: Any, digits: int = 3) -> str:
    parsed = numeric(value)
    if parsed is None:
        return ""
    rounded = round(parsed, digits)
    text = f"{rounded:.{digits}f}".rstrip("0").rstrip(".")
    return text if text else "0"


def fmt_fixed(value: Any, digits: int) -> str:
    parsed = numeric(value)
    if parsed is None:
        return ""
    return f"{parsed:.{digits}f}"


def norm(values: list[float], invert: bool = False) -> list[float]:
    if not values:
        return []
    low = min(values)
    high = max(values)
    if high == low:
        normalized = [1.0 for _ in values]
    else:
        normalized = [(value - low) / (high - low) for value in values]
    if invert:
        return [1.0 - value for value in normalized]
    return normalized


def reason_label(model: dict[str, Any]) -> str:
    value = model.get("reasoningModel")
    if value is True:
        return "sim"
    if value is False:
        return "não"
    return ""


def copilot_model_key(name: Any) -> str | None:
    if not isinstance(name, str) or not name:
        return None
    normalized = re.sub(r"\s*\([^)]*\)", "", name).lower()
    normalized = normalized.replace("preview", "")
    normalized = re.sub(r"\s+", " ", normalized).strip()

    if "claude" in normalized:
        if "haiku" in normalized and "4.5" in normalized:
            return "claude haiku 4.5"
        if "opus" in normalized:
            for version in ("4.7", "4.6", "4.5"):
                if version in normalized:
                    return f"claude opus {version}"
        if "sonnet" in normalized:
            for version in ("4.6", "4.5"):
                if version in normalized:
                    return f"claude sonnet {version}"
            if re.search(r"\b4\b", normalized):
                return "claude sonnet 4"

    if normalized.startswith("gemini"):
        if "3.1" in normalized and "pro" in normalized:
            return "gemini 3.1 pro"
        if "3 flash" in normalized:
            return "gemini 3 flash"
        if "2.5" in normalized and "pro" in normalized:
            return "gemini 2.5 pro"

    if normalized.startswith("gpt"):
        if normalized.startswith("gpt-4.1"):
            return "gpt-4.1"
        if normalized.startswith("gpt-4o"):
            return "gpt-4o"
        if normalized.startswith("gpt-5.5"):
            return "gpt-5.5"
        if normalized.startswith("gpt-5.4 nano"):
            return "gpt-5.4 nano"
        if normalized.startswith("gpt-5.4 mini"):
            return "gpt-5.4 mini"
        if normalized.startswith("gpt-5.4"):
            return "gpt-5.4"
        if normalized.startswith("gpt-5.3 codex"):
            return "gpt-5.3-codex"
        if normalized.startswith("gpt-5.2 codex"):
            return "gpt-5.2-codex"
        if normalized.startswith("gpt-5.2"):
            return "gpt-5.2"
        if normalized.startswith("gpt-5 mini"):
            return "gpt-5 mini"

    if normalized.startswith("grok code fast 1"):
        return "grok code fast 1"
    if normalized.startswith("raptor mini"):
        return "raptor mini"
    return None


def copilot_multiplier_paid(model: dict[str, Any]) -> float | None:
    key = copilot_model_key(model.get("name"))
    if key is None:
        return None
    return COPILOT_MULTIPLIERS_PAID.get(key)


def fmt_multiplier(value: float | None) -> str:
    if value is None:
        return "N/A"
    return f"{value:g}"


def exclusion(
    model: dict[str, Any],
    reason: str,
    capability_key: str,
    cost_key: str,
    intelligence_key: str,
) -> dict[str, Any]:
    cost = numeric(model.get(cost_key))
    capability = numeric(model.get(capability_key))
    return {
        "creator": model.get("modelCreatorName", ""),
        "model": model.get("name", ""),
        "reasoning": reason_label(model),
        intelligence_key: numeric(model.get(intelligence_key)),
        capability_key: capability,
        cost_key: cost,
        "tb_per_cost": capability / cost if capability is not None and cost and cost > 0 else None,
        "score": None,
        "reason": reason,
    }


def rank_models(args: argparse.Namespace, models: list[dict[str, Any]]) -> tuple[list[RankedModel], list[dict[str, Any]]]:
    now = datetime.now(timezone.utc)
    providers = {provider.strip() for provider in args.providers.split(",") if provider.strip()}
    max_age_seconds = args.max_age_days * 24 * 60 * 60

    eligible: list[dict[str, Any]] = []
    exclusions: list[dict[str, Any]] = []

    for model in models:
        creator = model.get("modelCreatorName")
        release_date = parse_date(model.get("releaseDate"))
        intelligence = numeric(model.get(args.intelligence_key))
        capability = numeric(model.get(args.capability_key))
        cost = numeric(model.get(args.cost_key))

        reasons: list[str] = []
        if creator not in providers:
            reasons.append("criador fora do filtro")
        if release_date is None:
            reasons.append("releaseDate ausente ou inválida")
        elif (now - release_date).total_seconds() >= max_age_seconds:
            reasons.append(f"releaseDate com {args.max_age_days} dias ou mais")
        if intelligence is None:
            reasons.append(f"{args.intelligence_key} ausente")
        if capability is None:
            reasons.append(f"{args.capability_key} ausente")
        if cost is None:
            reasons.append(f"{args.cost_key} ausente")
        elif cost <= 0:
            reasons.append(f"{args.cost_key} <= 0")

        if reasons:
            exclusions.append(
                exclusion(model, "; ".join(reasons), args.capability_key, args.cost_key, args.intelligence_key)
            )
        else:
            eligible.append(model)

    eligible.sort(key=lambda item: numeric(item.get(args.intelligence_key)) or float("-inf"), reverse=True)
    top = eligible[: args.top_n]
    for model in eligible[args.top_n :]:
        exclusions.append(
            exclusion(
                model,
                f"fora do Top {args.top_n} por {args.intelligence_key}",
                args.capability_key,
                args.cost_key,
                args.intelligence_key,
            )
        )

    capabilities = [numeric(model.get(args.capability_key)) or 0.0 for model in top]
    costs = [numeric(model.get(args.cost_key)) or 0.0 for model in top]
    capability_norm = norm(capabilities)
    cost_norm = norm(costs, invert=True)

    ranked: list[RankedModel] = []
    for idx, model in enumerate(top):
        capability = numeric(model.get(args.capability_key)) or 0.0
        cost = numeric(model.get(args.cost_key)) or 0.0
        score = args.capability_weight * capability_norm[idx] + args.cost_weight * cost_norm[idx]
        ranked.append(
            RankedModel(
                model=model,
                tb_per_cost=capability / cost,
                capability_norm=capability_norm[idx],
                cost_norm=cost_norm[idx],
                score=score,
            )
        )

    ranked.sort(key=lambda item: item.score, reverse=True)
    return ranked, exclusions


def row_for_ranked(position: int, item: RankedModel, args: argparse.Namespace) -> list[str]:
    model = item.model
    return [
        str(position),
        str(model.get("modelCreatorName", "")),
        str(model.get("name", "")),
        reason_label(model),
        fmt_fixed(model.get(args.intelligence_key), 2),
        fmt_fixed(model.get(args.capability_key), 3),
        fmt_fixed(model.get(args.cost_key), 3),
        fmt_fixed(item.tb_per_cost, 6),
        fmt_fixed(item.score, 4),
        fmt_multiplier(copilot_multiplier_paid(model)),
    ]


def row_for_exclusion(item: dict[str, Any], args: argparse.Namespace) -> list[str]:
    return [
        str(item.get("creator", "")),
        str(item.get("model", "")),
        str(item.get("reasoning", "")),
        fmt_fixed(item.get(args.intelligence_key), 2),
        fmt_fixed(item.get(args.capability_key), 3),
        fmt_fixed(item.get(args.cost_key), 3),
        fmt_fixed(item.get("tb_per_cost"), 6),
        fmt_fixed(item.get("score"), 4),
        str(item.get("reason", "")),
    ]


def markdown_table(headers: list[str], rows: list[list[str]], aligns: list[str] | None = None) -> str:
    if aligns is None:
        aligns = ["---" for _ in headers]
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(aligns) + " |",
    ]
    lines.extend("| " + " | ".join(cell.replace("|", "\\|") for cell in row) + " |" for row in rows)
    return "\n".join(lines)


def exclusion_summary(exclusions: list[dict[str, Any]]) -> list[tuple[str, int]]:
    counts: dict[str, int] = {}
    for item in exclusions:
        for reason in str(item.get("reason", "")).split("; "):
            if reason:
                counts[reason] = counts.get(reason, 0) + 1
    return sorted(counts.items(), key=lambda entry: (-entry[1], entry[0]))


def recommendation_rows(args: argparse.Namespace, ranked: list[RankedModel]) -> list[list[str]]:
    if not ranked:
        return []

    best_score = max(ranked, key=lambda item: item.score)
    cheapest = min(ranked, key=lambda item: numeric(item.model.get(args.cost_key)) or float("inf"))
    strongest_terminal = max(ranked, key=lambda item: numeric(item.model.get(args.capability_key)) or float("-inf"))
    premium = max(ranked, key=lambda item: numeric(item.model.get(args.intelligence_key)) or float("-inf"))

    picks = [
        ("barato", cheapest, f"menor {args.cost_key} no ranking"),
        ("balanceado", best_score, "maior score ponderado"),
        ("forte terminal/agentic", strongest_terminal, f"maior {args.capability_key}"),
        ("premium / máxima qualidade", premium, f"maior {args.intelligence_key}"),
    ]

    rows: list[list[str]] = []
    for profile, item, reason in picks:
        rows.append(
            [
                profile,
                str(item.model.get("modelCreatorName", "")),
                str(item.model.get("name", "")),
                fmt_fixed(item.model.get(args.capability_key), 3),
                fmt_fixed(item.model.get(args.cost_key), 3),
                fmt_fixed(item.score, 4),
                fmt_multiplier(copilot_multiplier_paid(item.model)),
                reason,
            ]
        )
    return rows


def emit_markdown(args: argparse.Namespace, ranked: list[RankedModel], exclusions: list[dict[str, Any]], total: int) -> None:
    collected = datetime.now(timezone.utc).isoformat(timespec="seconds")
    headers = [
        "#",
        "Criador",
        "Modelo",
        "Reasoning",
        "Intelligence",
        "TB Hard",
        "Custo",
        "TB/Custo",
        "Score",
        "Copilot",
    ]
    print(f"Coleta: {collected} | Fonte: {args.url} | Modelos no payload: {total}")
    print(
        "Score: maior e melhor. Fórmula: "
        f"{args.capability_weight:g} * norm({args.capability_key}) + "
        f"{args.cost_weight:g} * norm({args.cost_key} invertido)."
    )
    print(f"Multiplicador Copilot: planos pagos, fonte: {COPILOT_MULTIPLIERS_URL}. N/A = sem correspondência explícita.")
    print()
    print("## Recomendações por perfil")
    print(
        markdown_table(
            ["Perfil", "Criador", "Modelo", "TB Hard", "Custo", "Score", "Copilot", "Critério"],
            recommendation_rows(args, ranked),
            ["---", "---", "---", "---:", "---:", "---:", "---:", "---"],
        )
    )
    print()
    print("## Ranking ponderado 70/30")
    print(
        markdown_table(
            headers,
            [row_for_ranked(idx, item, args) for idx, item in enumerate(ranked, start=1)],
            ["---:", "---", "---", ":---:", "---:", "---:", "---:", "---:", "---:", "---:"],
        )
    )
    print()
    print("## Exclusões")
    print("Motivos não são mutuamente exclusivos.")
    print(
        markdown_table(
            ["Motivo", "Modelos"],
            [[reason, str(count)] for reason, count in exclusion_summary(exclusions)],
            ["---", "---:"],
        )
    )


def emit_json(args: argparse.Namespace, ranked: list[RankedModel], exclusions: list[dict[str, Any]], total: int) -> None:
    payload = {
        "collectedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": args.url,
        "totalModels": total,
        "ranking": [
            {
                "creator": item.model.get("modelCreatorName"),
                "model": item.model.get("name"),
                "reasoning": reason_label(item.model),
                args.intelligence_key: numeric(item.model.get(args.intelligence_key)),
                args.capability_key: numeric(item.model.get(args.capability_key)),
                args.cost_key: numeric(item.model.get(args.cost_key)),
                f"{args.capability_key}_per_{args.cost_key}": item.tb_per_cost,
                "score": item.score,
                "githubCopilotPaidMultiplier": copilot_multiplier_paid(item.model),
            }
            for item in ranked
        ],
        "exclusions": exclusions,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    parser.add_argument("--providers", default="OpenAI,Google,Anthropic")
    parser.add_argument("--max-age-days", type=int, default=365)
    parser.add_argument("--top-n", type=int, default=40)
    parser.add_argument("--intelligence-key", default="intelligenceIndex")
    parser.add_argument("--capability-key", default="terminalbenchHard")
    parser.add_argument("--cost-key", default="intelligenceIndexCostTotal")
    parser.add_argument("--capability-weight", type=float, default=0.7)
    parser.add_argument("--cost-weight", type=float, default=0.3)
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    weight_total = args.capability_weight + args.cost_weight
    if weight_total <= 0:
        print("weights must sum to a positive value", file=sys.stderr)
        return 2
    args.capability_weight = args.capability_weight / weight_total
    args.cost_weight = args.cost_weight / weight_total

    try:
        document = fetch_text(args.url)
        models = extract_models(document)
        ranked, exclusions = rank_models(args, models)
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    if args.format == "json":
        emit_json(args, ranked, exclusions, len(models))
    else:
        emit_markdown(args, ranked, exclusions, len(models))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
