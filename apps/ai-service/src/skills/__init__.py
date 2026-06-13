from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import structlog
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.skill import Skill
from src.skills.integration import clear_skills_cache
from src.skills.validation import log_validation, validate_skill_config

logger = structlog.get_logger(__name__)

_SKILLS_ROOT = Path(__file__).resolve().parent.parent.parent / "skills"
GLOBAL_SKILL_COMPANY_ID = "global"


async def _ensure_skills_table(session: AsyncSession) -> None:
    """Create the skills table in dev environments where Alembic was not run."""
    await session.execute(text("CREATE SCHEMA IF NOT EXISTS ai"))
    await session.execute(text("""
        CREATE TABLE IF NOT EXISTS ai.skills (
            id VARCHAR(100) PRIMARY KEY,
            company_id VARCHAR NOT NULL,
            name VARCHAR(200) NOT NULL,
            version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
            description TEXT NULL,
            trigger_phrases VARCHAR NOT NULL DEFAULT '',
            instructions TEXT NOT NULL,
            content TEXT NULL,
            allowed_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
            channels JSONB NOT NULL DEFAULT '[]'::jsonb,
            priority INTEGER NOT NULL DEFAULT 0,
            enabled BOOLEAN NOT NULL DEFAULT TRUE,
            requires_human_approval BOOLEAN NOT NULL DEFAULT FALSE,
            max_tool_count INTEGER NOT NULL DEFAULT 0,
            skill_metadata JSONB NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))
    await session.execute(text("ALTER TABLE ai.skills ADD COLUMN IF NOT EXISTS content TEXT NULL"))
    await session.execute(text("CREATE INDEX IF NOT EXISTS ix_ai_skills_company_id ON ai.skills (company_id)"))
    await session.commit()


def _discover_skills() -> list[dict[str, Any]]:
    """Scan the skills/ directory and return skill data dicts."""
    root = _SKILLS_ROOT
    if not root.exists():
        logger.warning("skills_directory_not_found", path=str(root))
        return []

    results: list[dict[str, Any]] = []
    for entry in sorted(root.iterdir()):
        if not entry.is_dir():
            continue
        skill_file = entry / "skill.json"
        if not skill_file.exists():
            continue
        try:
            config = json.loads(skill_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("skill_json_parse_error", path=str(skill_file), error=str(exc))
            continue

        md_path = entry / "SKILL.md"
        content = md_path.read_text(encoding="utf-8") if md_path.exists() else None

        trigger_phrases = config.get("triggerPhrases", [])
        if isinstance(trigger_phrases, list):
            trigger_phrases_text = ",".join(str(item) for item in trigger_phrases)
        else:
            trigger_phrases_text = str(trigger_phrases or "")

        # Validate skill config and log warnings (non-blocking)
        errors, warnings = validate_skill_config(config)
        log_validation(config.get("id", entry.name), errors, warnings)

        results.append({
            "id": config.get("id", entry.name),
            "company_id": config.get("companyId", GLOBAL_SKILL_COMPANY_ID),
            "name": config.get("displayName", entry.name),
            "version": config.get("version", "1.0.0"),
            "description": config.get("description", ""),
            "trigger_phrases": trigger_phrases_text,
            "instructions": content or config.get("description", "") or entry.name,
            "allowed_tools": config.get("allowedTools", []),
            "channels": config.get("channels", []),
            "priority": int(config.get("priority", 0) or 0),
            "enabled": bool(config.get("enabled", True)),
            "requires_human_approval": config.get("requiresHumanApproval", False),
            "max_tool_count": config.get("maxToolCount", 0),
            "skill_metadata": config,
            "content": content,
        })
    return results


async def seed_skills(session: AsyncSession) -> int:
    """Scan skills/ directory and upsert skill records into the DB."""
    await _ensure_skills_table(session)
    skills = _discover_skills()
    if not skills:
        return 0
    seeded = 0
    try:
        for data in skills:
            existing = await session.execute(
                select(Skill).where(Skill.id == data["id"])
            )
            if existing.scalar_one_or_none() is not None:
                continue
            skill = Skill(**data)
            session.add(skill)
            seeded += 1
        if seeded:
            await session.commit()
    except Exception as exc:
        logger.warning("skills_seed_failed", error=str(exc))
        return 0
    clear_skills_cache()
    logger.info(
        "skills_seeded",
        total=len(skills),
        new=seeded,
        cache_cleared=True,
    )
    return seeded


async def get_skill(skill_id: str, session: AsyncSession) -> Skill | None:
    """Fetch a single skill by ID."""
    result = await session.execute(select(Skill).where(Skill.id == skill_id))
    return result.scalar_one_or_none()


async def get_all_skill_ids(session: AsyncSession) -> list[str]:
    """Return all skill IDs from the DB."""
    result = await session.execute(
        select(Skill.id).order_by(Skill.id)
    )
    return [row[0] for row in result.all()]


async def get_skills_content(skill_ids: list[str], session: AsyncSession) -> str:
    """Build a <skills> XML block from the given skill IDs' content."""
    if not skill_ids:
        return ""
    result = await session.execute(
        select(Skill).where(Skill.id.in_(skill_ids))
    )
    skills = result.scalars().all()
    blocks: list[str] = []
    for skill in skills:
        blocks.append(f"<skill id=\"{skill.id}\">")
        if skill.content:
            blocks.append(skill.content)
        blocks.append("</skill>")
    if not blocks:
        return ""
    return "\n".join(["<skills>", *blocks, "</skills>"])
