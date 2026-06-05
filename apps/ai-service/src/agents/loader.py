from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.db.models.agent import AgentTemplate

logger = structlog.get_logger(__name__)


def _get_agents_root() -> Path:
    settings = get_settings()
    if settings.agents_templates_root:
        root = Path(settings.agents_templates_root)
        if root.exists():
            return root
    # Fallback: relative to project root
    candidates = [
        Path(os.environ.get("BACKEND_AGENTS_ROOT", "")),
        Path(__file__).resolve().parent.parent.parent.parent.parent / "apps" / "backend" / "agents",
        Path(__file__).resolve().parent.parent.parent / "agents",
    ]
    for c in candidates:
        if c.exists():
            return c
    return candidates[1]  # default fallback

TEMPLATE_DESCRIPTIONS: list[dict[str, Any]] = []


def _discover_templates(agents_root: Path | None = None) -> list[dict[str, Any]]:
    """Discover agent.json files in the agents directory."""
    root = agents_root or _get_agents_root()
    if not root.exists():
        logger.warning("Agent templates directory not found", path=str(root))
        return []
    def _read_md(entry_path: Path, ref: str | None) -> str | None:
        if not ref:
            return None
        md_path = entry_path / ref
        if md_path.exists():
            return md_path.read_text(encoding="utf-8")
        return None

    templates = []
    for entry in sorted(root.iterdir()):
        if entry.name == "_shared" or not entry.is_dir():
            continue
        manifest_path = entry / "agent.json"
        if not manifest_path.exists():
            continue
        try:
            with open(manifest_path, encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception as e:
            logger.warning("Failed to load agent manifest", slug=entry.name, error=str(e))
            continue

        instructions = manifest.get("instructions", {})

        templates.append({
            "slug": manifest.get("slug", entry.name),
            "role": manifest.get("role", "").upper(),
            "name": manifest.get("name", entry.name),
            "version": manifest.get("version", "1.0.0"),
            "model_policy": manifest.get("modelPolicy", {}),
            "allowed_tools": manifest.get("allowedTools", []),
            "allowed_skills": manifest.get("allowedSkills", []),
            "channels": manifest.get("channels", []),
            "guardrails": manifest.get("guardrails", {}),
            "persona_meta": manifest.get("personaMeta", {}),
            "instructions_agents": _read_md(entry, instructions.get("agents")),
            "instructions_soul": _read_md(entry, instructions.get("soul")),
            "instructions_tools": _read_md(entry, instructions.get("tools")),
            "instructions_persona": _read_md(entry, instructions.get("persona")),
            "human_approval": manifest.get("humanApproval", {}),
            "handoffs": manifest.get("handoffs", []),
            "mcp_servers": manifest.get("mcpServers", []),
            "budget": manifest.get("budget", {}),
            "output_schema": manifest.get("outputSchema"),
            "config": manifest.get("config", {}),
        })
    return templates


async def seed_templates(session: AsyncSession) -> list[AgentTemplate]:
    """Load and seed agent templates into the database."""
    templates = _discover_templates()
    if not templates:
        logger.warning("No agent templates found to seed")
        return []

    seeded: list[AgentTemplate] = []
    for data in templates:
        existing = await session.execute(
            select(AgentTemplate).where(AgentTemplate.slug == data["slug"])
        )
        if existing.scalar_one_or_none():
            logger.debug("Template already exists, skipping", slug=data["slug"])
            continue

        template = AgentTemplate(**data)
        session.add(template)
        seeded.append(template)

    if seeded:
        await session.commit()
        logger.info("Seeded agent templates", count=len(seeded), slugs=[t.slug for t in seeded])
    else:
        logger.info("No new agent templates to seed")

    return seeded


async def get_template(slug: str, session: AsyncSession) -> AgentTemplate | None:
    result = await session.execute(
        select(AgentTemplate).where(AgentTemplate.slug == slug)
    )
    return result.scalar_one_or_none()


async def list_templates(session: AsyncSession) -> list[AgentTemplate]:
    result = await session.execute(
        select(AgentTemplate).order_by(AgentTemplate.role, AgentTemplate.slug)
    )
    return list(result.scalars().all())


async def get_skills_for_agent(company_id: str, session: AsyncSession) -> list[dict[str, Any]]:
    """Fetch all enabled skills for the given company from the database."""
    from src.db.models.skill import Skill
    
    stmt = (
        select(Skill)
        .where(Skill.company_id == company_id, Skill.enabled == True)
        .order_by(Skill.priority.desc())
    )
    result = await session.execute(stmt)
    skills = result.scalars().all()
    
    return [
        {
            "name": s.name,
            "instructions": s.instructions,
            "allowed_tools": s.allowed_tools,
            "trigger_phrases": s.trigger_phrases,
            "channels": s.channels,
        }
        for s in skills
    ]
