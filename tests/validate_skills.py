#!/usr/bin/env python3
"""Validate the portable skill catalog without third-party dependencies."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"
NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def metadata(text: str) -> dict[str, str]:
    if not text.startswith("---\n") or "\n---\n" not in text[4:]:
        raise ValueError("missing YAML frontmatter")
    block = text[4 : text.index("\n---\n", 4)]
    result: dict[str, str] = {}
    for line in block.splitlines():
        if ":" in line and not line[:1].isspace():
            key, value = line.split(":", 1)
            result[key.strip()] = value.strip().strip("'\"")
    return result


def main() -> int:
    errors: list[str] = []
    seen: set[str] = set()
    for skill_file in sorted(SKILLS.glob("*/SKILL.md")):
        relative = skill_file.relative_to(ROOT)
        try:
            values = metadata(skill_file.read_text(encoding="utf-8"))
        except ValueError as exc:
            errors.append(f"{relative}: {exc}")
            continue
        name = values.get("name", "")
        description = values.get("description", "")
        if not NAME_RE.fullmatch(name):
            errors.append(f"{relative}: invalid name {name!r}")
        if name != skill_file.parent.name:
            errors.append(f"{relative}: name must match directory")
        if name in seen:
            errors.append(f"{relative}: duplicate name {name!r}")
        seen.add(name)
        if len(description) < 20:
            errors.append(f"{relative}: description is too short")
        text = skill_file.read_text(encoding="utf-8")
        if "~/.kiro/skills/" in text or "~/.kiro/prompts/" in text:
            errors.append(f"{relative}: contains a non-portable Kiro path")

    if not seen:
        errors.append("no skills discovered")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"validated {len(seen)} skill(s): {', '.join(sorted(seen))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

