from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.agent import AgentTemplate

logger = structlog.get_logger(__name__)


def _get_agents_root() -> Path:
    settings = None
    try:
        from src.config import get_settings
        settings = get_settings()
    except Exception:
        pass
    if settings and settings.agents_templates_root:
        root = Path(settings.agents_templates_root)
        if root.exists():
            return root
    env_root = os.environ.get("BACKEND_AGENTS_ROOT", "")
    if env_root:
        p = Path(env_root)
        if p.exists():
            return p
    sites_dir = Path(__file__).resolve().parent.parent.parent.parent
    candidates = [
        sites_dir / "backend2" / "agents",
        sites_dir / "backend" / "agents",
        sites_dir.parent / "ai-service" / "agents",
        Path(__file__).resolve().parent.parent.parent / "agents",
    ]
    for c in candidates:
        if c.exists():
            return c
    return candidates[0]


def _read_md(entry_path: Path, ref: str | None) -> str | None:
    if not ref:
        return None
    md_path = entry_path / ref
    if md_path.exists():
        return md_path.read_text(encoding="utf-8")
    return None


def _discover_templates(agents_root: Path | None = None) -> list[dict[str, Any]]:
    """Discover agent.json files in the agents directory.
    
    Used by the seed script. At runtime, prefer DB-backed templates.
    """
    root = agents_root or _get_agents_root()
    if not root.exists():
        logger.warning("Agent templates directory not found", path=str(root))
        return []

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
            "is_active": manifest.get("isActive", True),
            "config": manifest.get("config", {}),
            "tool_choice": (manifest.get("config") or {}).get("toolChoice"),
        })
    return templates


async def seed_templates(session: AsyncSession) -> list[AgentTemplate]:
    """Upsert agent templates from files into the database.
    
    This is the 2026 approach: files are dev-time only, DB is source of truth.
    """
    templates = _discover_templates()
    if not templates:
        logger.warning("No agent templates found to seed")
        return []

    seeded: list[AgentTemplate] = []
    for data in templates:
        existing = await session.execute(
            select(AgentTemplate).where(AgentTemplate.slug == data["slug"])
        )
        template = existing.scalar_one_or_none()

        if template:
            template.name = data["name"]
            template.role = data["role"]
            template.version = data["version"]
            template.model_policy = data["model_policy"]
            template.allowed_tools = data["allowed_tools"]
            template.allowed_skills = data["allowed_skills"]
            template.channels = data["channels"]
            template.guardrails = data["guardrails"]
            template.persona_meta = data.get("persona_meta") or {}
            template.human_approval = data.get("human_approval") or {}
            template.handoffs = data.get("handoffs") or []
            template.mcp_servers = data.get("mcp_servers") or []
            template.budget = data.get("budget") or {}
            template.config = data.get("config") or {}
            template.tool_choice = data.get("tool_choice")
            template.instructions_agents = data.get("instructions_agents")
            template.instructions_soul = data.get("instructions_soul")
            template.instructions_tools = data.get("instructions_tools")
            template.instructions_persona = data.get("instructions_persona")
            seeded.append(template)
            logger.debug("Template exists, updated with file changes", slug=data["slug"])
        else:
            template = AgentTemplate(**data)
            session.add(template)
            seeded.append(template)
            logger.debug("Template created", slug=data["slug"])

    await session.commit()
    try:
        from src.prompts.template_registry import reset_prompt_registry
        reset_prompt_registry()
    except Exception:
        pass
    if seeded:
        logger.info("New templates seeded", count=len(seeded), slugs=[t.slug for t in seeded])
    else:
        logger.info("All templates already exist in DB, skipped")

    return seeded


async def get_template(slug: str, session: AsyncSession) -> AgentTemplate | None:
    result = await session.execute(
        select(AgentTemplate).where(AgentTemplate.slug == slug)
    )
    tmpl = result.scalar_one_or_none()
    if tmpl:
        return tmpl

    # 2026 Resilient Fallback: If not yet seeded in DB, auto-discover directly from disk contract
    disk_templates = _discover_templates()
    match_data = next((d for d in disk_templates if d["slug"] == slug), None)
    if match_data:
        try:
            tmpl = AgentTemplate(**match_data)
            session.add(tmpl)
            await session.commit()
            logger.info("Auto-seeded template from disk on first access", slug=slug)
            return tmpl
        except Exception as e:
            logger.warning("Failed to persist auto-seeded template to DB, returning in-memory instance", slug=slug, error=str(e))
            return AgentTemplate(**match_data)

    return None


async def list_templates(session: AsyncSession, active_only: bool = False) -> list[AgentTemplate]:
    stmt = select(AgentTemplate)
    if active_only:
        stmt = stmt.where(AgentTemplate.is_active == True)
    stmt = stmt.order_by(AgentTemplate.role, AgentTemplate.slug)
    result = await session.execute(stmt)
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
