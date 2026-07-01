#!/usr/bin/env python3
"""Seed agent templates from backend/agents/*/agent.json into the database.

Usage:
    python -m scripts.seed_agent_templates

This is the 2026 approach: agent.json files are dev-time artifacts only.
At runtime, the system reads from `ai.agent_templates` in the database.
Run this script after modifying any agent.json or markdown files.
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from typing import Any

import structlog


def _discover_agents_root() -> Path:
    """Find the backend/agents/ directory."""
    import os; env_root = os.environ.get("BACKEND_AGENTS_ROOT", "")
    if env_root:
        p = Path(env_root)
        if p.exists():
            return p
    candidates = [
        Path(__file__).resolve().parent.parent.parent / "backend2" / "agents",
        Path(__file__).resolve().parent.parent.parent / "backend" / "agents",
        Path(__file__).resolve().parent.parent.parent.parent / "apps" / "backend" / "agents",
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


def load_templates_from_files(agents_root: Path | None = None) -> list[dict[str, Any]]:
    """Load all agent.json + markdown files into template dicts."""
    root = agents_root or _discover_agents_root()
    if not root.exists():
        print(f"Agent templates directory not found: {root}")
        return []

    templates = []
    for entry in sorted(root.iterdir()):
        if entry.name == "_shared" or not entry.is_dir():
            continue
        manifest_path = entry / "agent.json"
        if not manifest_path.exists():
            continue
        with open(manifest_path, encoding="utf-8") as f:
            manifest = json.load(f)

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


async def seed(session) -> int:
    """Upsert all file-based templates into ai.agent_templates."""
    from sqlalchemy import select
    from src.db.models.agent import AgentTemplate

    templates = load_templates_from_files()
    if not templates:
        print("No agent templates found.")
        return 0

    upserted = 0
    for data in templates:
        slug = data["slug"]
        existing = await session.execute(
            select(AgentTemplate).where(AgentTemplate.slug == slug)
        )
        template = existing.scalar_one_or_none()

        if template:
            for key, value in data.items():
                setattr(template, key, value)
            print(f"  Updated: {slug}")
        else:
            template = AgentTemplate(**data)
            session.add(template)
            print(f"  Created: {slug}")
        upserted += 1

    await session.commit()
    print(f"\nSeeded {upserted} agent templates.")
    return upserted


async def main() -> None:
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    DATABASE_URL = "postgresql+asyncpg://appuser:0165676135@localhost:5432/maxp"
    engine = create_async_engine(DATABASE_URL, pool_size=5)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        await seed(session)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
