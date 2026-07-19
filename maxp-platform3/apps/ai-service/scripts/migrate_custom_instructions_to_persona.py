#!/usr/bin/env python3
"""One-time migration: move custom_instructions["soul"] → persona["personaInstructions"]."""

from __future__ import annotations

import asyncio
import sys

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


async def migrate(dry_run: bool) -> None:
    from src.config import get_settings
    settings = get_settings()
    DATABASE_URL = settings.database_url or "postgresql+asyncpg://appuser:0165676135@localhost:5432/maxp"
    engine = create_async_engine(DATABASE_URL, pool_size=2)

    scanned = migrated = cleared = 0
    async with engine.connect() as conn:
        rows = await conn.execute(
            text("""
                SELECT id, persona, custom_instructions
                FROM ai.agents
                WHERE custom_instructions IS NOT NULL
                  AND custom_instructions != '{}'::jsonb
                ORDER BY id
            """)
        )
        for row in rows:
            agent_id, persona_raw, ci_raw = row
            persona = dict(persona_raw or {})
            ci = dict(ci_raw or {})
            custom_soul = _find_custom_soul(ci)
            if not custom_soul:
                continue
            existing = persona.get("personaInstructions")
            if existing and existing.strip():
                continue
            scanned += 1
            if dry_run:
                print(f"[DRY-RUN] agent {agent_id}: would migrate")
                continue
            persona["personaInstructions"] = custom_soul
            ci.pop("soul", None)
            import json
            await conn.execute(
                text("""
                    UPDATE ai.agents
                    SET persona = :persona::jsonb,
                        custom_instructions = :ci::jsonb
                    WHERE id = :id
                """),
                {"persona": json.dumps(persona), "ci": json.dumps(ci), "id": agent_id},
            )
            migrated += 1
            if not ci:
                cleared += 1

        if not dry_run:
            await conn.commit()

    await engine.dispose()
    tag = "[DRY-RUN] " if dry_run else ""
    print(f"{tag}Found: {scanned} agents with custom_instructions[soul]")
    print(f"{tag}Migrated: {migrated}")
    print(f"{tag}Fully cleared: {cleared}")


def _find_custom_soul(ci: dict | None) -> str | None:
    if not ci:
        return None
    v = ci.get("soul")
    return v.strip() if isinstance(v, str) and v.strip() else None


async def main():
    dry_run = "--dry-run" in sys.argv
    await migrate(dry_run)


if __name__ == "__main__":
    asyncio.run(main())
