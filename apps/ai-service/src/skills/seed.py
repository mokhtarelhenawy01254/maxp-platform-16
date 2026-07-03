from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.skill import Skill

_SKILLS_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "skills"
logger = structlog.get_logger(__name__)


async def seed_skills(session: AsyncSession) -> list[Skill]:
    """Upsert filesystem skills into the ai.skills table.

    Scans skills/<id>/ for skill.json + SKILL.md and upserts each into DB.
    """
    if not _SKILLS_ROOT.is_dir():
        logger.warning("skills_root_not_found", path=str(_SKILLS_ROOT))
        return []

    seeded: list[Skill] = []
    for skill_dir in sorted(_SKILLS_ROOT.iterdir()):
        if not skill_dir.is_dir():
            continue
        skill_json_path = skill_dir / "skill.json"
        if not skill_json_path.exists():
            continue
        try:
            config: dict[str, Any] = json.loads(skill_json_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("skill_json_parse_failed", path=str(skill_json_path), error=str(exc))
            continue
        skill_id: str = config.get("id", skill_dir.name)

        md_path = skill_dir / "SKILL.md"
        instructions = md_path.read_text(encoding="utf-8") if md_path.exists() else ""

        existing = await session.execute(
            select(Skill).where(Skill.id == skill_id, Skill.company_id == "__system__")
        )
        record = existing.scalar_one_or_none()

        raw_triggers = config.get("triggerPhrases", [])
        trigger_str = ",".join(raw_triggers) if isinstance(raw_triggers, list) else ""

        if record:
            record.name = config.get("displayName", skill_id)
            record.version = config.get("version", "1.0.0")
            record.description = config.get("description", "")
            record.trigger_phrases = trigger_str
            record.instructions = instructions
            record.allowed_tools = config.get("allowedTools", [])
            record.requires_human_approval = bool(config.get("requiresHumanApproval", False))
            record.max_tool_count = int(config.get("maxToolCount", 0))
            seeded.append(record)
        else:
            record = Skill(
                id=skill_id,
                company_id="__system__",
                name=config.get("displayName", skill_id),
                version=config.get("version", "1.0.0"),
                description=config.get("description", ""),
                trigger_phrases=trigger_str,
                instructions=instructions,
                allowed_tools=config.get("allowedTools", []),
                channels=[],
                priority=0,
                enabled=True,
                requires_human_approval=bool(config.get("requiresHumanApproval", False)),
                max_tool_count=int(config.get("maxToolCount", 0)),
            )
            session.add(record)
            seeded.append(record)

    await session.commit()
    if seeded:
        logger.info("skills_seeded", count=len(seeded), ids=[s.id for s in seeded])
    else:
        logger.info("no_new_skills_to_seed")

    return seeded
