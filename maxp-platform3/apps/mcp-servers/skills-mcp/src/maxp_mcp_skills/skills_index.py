from __future__ import annotations

import json
from pathlib import Path
from typing import Literal

import structlog
from pydantic import BaseModel, ConfigDict, Field

logger = structlog.get_logger(__name__)


SKILL_MANIFEST_FILENAME = "skill.json"
SKILL_BODY_FILENAME = "SKILL.md"


class SkillEntry(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., description="Slug taken from the skill directory name.")
    displayName: str = Field(
        ...,
        alias="displayName",
        description="Human-readable name sourced from skill.json displayName.",
    )
    description: str = Field(
        ...,
        description="Short description sourced from skill.json description, used by the agent to decide when to apply the skill.",
    )
    type: Literal["skill-md"] = Field(
        "skill-md",
        description="Discriminator advertising the resource format. Always skill-md for now.",
    )
    url: str = Field(
        ...,
        description="MCP URI that the agent must read to fetch the SKILL.md markdown body.",
    )


class SkillsIndex(BaseModel):
    skills: list[SkillEntry] = Field(
        default_factory=list,
        description="All skills discovered in the skills directory at the time of the last refresh.",
    )

    def to_json(self) -> str:
        return self.model_dump_json(by_alias=True)


async def scan_skills_dir(skills_dir: Path) -> SkillsIndex:
    log = logger.bind(skills_dir=str(skills_dir))
    if not skills_dir.exists() or not skills_dir.is_dir():
        log.warning("skills directory missing")
        return SkillsIndex(skills=[])

    entries: list[SkillEntry] = []
    for child in sorted(skills_dir.iterdir()):
        if not child.is_dir():
            continue
        manifest_path = child / SKILL_MANIFEST_FILENAME
        body_path = child / SKILL_BODY_FILENAME
        if not manifest_path.is_file() or not body_path.is_file():
            continue
        try:
            manifest_raw = manifest_path.read_text(encoding="utf-8")
            manifest = json.loads(manifest_raw)
        except (OSError, json.JSONDecodeError) as exc:
            log.warning("skill manifest unreadable", slug=child.name, error=str(exc))
            continue

        slug = child.name
        display_name = str(manifest.get("displayName") or slug)
        description = str(manifest.get("description") or "")
        entries.append(
            SkillEntry(
                name=slug,
                displayName=display_name,
                description=description,
                type="skill-md",
                url=f"skill://{slug}/{SKILL_BODY_FILENAME}",
            )
        )

    log.info("skills indexed", count=len(entries))
    return SkillsIndex(skills=entries)
