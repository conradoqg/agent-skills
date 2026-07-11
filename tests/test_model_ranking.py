#!/usr/bin/env python3
"""Offline checks for the leaderboard ranking helpers."""

from __future__ import annotations

import importlib.util
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "skills/model-leaderboard-cost-benefit/scripts/artificial_analysis_terminalbench.py"
SPEC = importlib.util.spec_from_file_location("leaderboard", SCRIPT)
assert SPEC and SPEC.loader
leaderboard = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = leaderboard
SPEC.loader.exec_module(leaderboard)


def main() -> None:
    assert leaderboard.norm([10.0, 20.0]) == [0.0, 1.0]
    assert leaderboard.norm([10.0, 20.0], invert=True) == [1.0, 0.0]
    assert leaderboard.norm([5.0, 5.0]) == [1.0, 1.0]
    assert leaderboard.numeric(True) is None
    assert leaderboard.numeric("12.5") == 12.5

    today = datetime.now(timezone.utc).date().isoformat()
    models = [
        {"name": "Capable", "modelCreatorName": "OpenAI", "releaseDate": today,
         "intelligenceIndex": 90, "terminalbenchHard": 90, "intelligenceIndexCostTotal": 20},
        {"name": "Cheap", "modelCreatorName": "Google", "releaseDate": today,
         "intelligenceIndex": 80, "terminalbenchHard": 70, "intelligenceIndexCostTotal": 1},
        {"name": "Excluded", "modelCreatorName": "Other", "releaseDate": today,
         "intelligenceIndex": 100, "terminalbenchHard": 100, "intelligenceIndexCostTotal": 1},
    ]
    ranked, excluded = leaderboard.rank_models(leaderboard.parse_args([]), models)
    assert [item.model["name"] for item in ranked] == ["Capable", "Cheap"]
    assert excluded[0]["model"] == "Excluded"
    print("model ranking checks passed")


if __name__ == "__main__":
    main()
