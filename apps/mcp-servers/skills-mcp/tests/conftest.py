from __future__ import annotations

import json
import sys
from collections.abc import Iterator
from pathlib import Path

import pytest

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PACKAGE_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))


def _write_skill(root: Path, slug: str, display_name: str, description: str, body: str) -> None:
    skill_dir = root / slug
    skill_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "id": slug,
        "displayName": display_name,
        "version": "1.0.0",
        "description": description,
        "allowedTools": [],
        "requiresHumanApproval": False,
        "maxToolCount": 1,
    }
    (skill_dir / "skill.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (skill_dir / "SKILL.md").write_text(body, encoding="utf-8")


@pytest.fixture
def skills_dir(tmp_path: Path) -> Iterator[Path]:
    root = tmp_path / "skills"
    root.mkdir(parents=True, exist_ok=True)
    _write_skill(
        root,
        "skill-alpha",
        "Skill Alpha",
        "Use alpha when scanning shelves.",
        "# Skill Alpha\n\nUse this when you must scan shelves.\n",
    )
    _write_skill(
        root,
        "skill-beta",
        "Skill Beta",
        "Use beta for pricing reviews.",
        "# Skill Beta\n\nUse this for pricing reviews.\n",
    )
    yield root


@pytest.fixture
def write_skill():
    return _write_skill
