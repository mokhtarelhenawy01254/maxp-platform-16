from __future__ import annotations

import re
from pathlib import Path

import structlog

from maxp_mcp_skills.skills_index import SKILL_BODY_FILENAME

logger = structlog.get_logger(__name__)


SLUG_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_\-]*$")


class SkillNotFoundError(LookupError):
    pass


class InvalidSkillSlugError(ValueError):
    pass


def _validate_slug(slug: str) -> None:
    if not SLUG_PATTERN.match(slug):
        raise InvalidSkillSlugError(f"invalid skill slug: {slug!r}")


async def load_skill_markdown(skills_dir: Path, slug: str) -> str:
    _validate_slug(slug)
    skills_root = skills_dir.resolve()
    candidate = (skills_root / slug / SKILL_BODY_FILENAME).resolve()
    if not candidate.is_relative_to(skills_root):
        raise InvalidSkillSlugError(f"slug escapes skills root: {slug!r}")
    if not candidate.is_file():
        raise SkillNotFoundError(f"SKILL.md not found for slug {slug!r}")
    return candidate.read_text(encoding="utf-8")
