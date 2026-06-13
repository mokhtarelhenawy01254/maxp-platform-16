"""
Agent Quality Eval Job
Runs periodically to evaluate agent performance and log results.
"""
from __future__ import annotations

import asyncio
import os
from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from src.config import get_settings


async def run_eval() -> str:
    settings = get_settings()
    engine = create_async_engine(settings.database_url)

    agents = []
    async with engine.connect() as conn:
        result = await conn.execute(
            text("SELECT name, role, model FROM ai.company_agents WHERE status = 'ACTIVE'")
        )
        for row in result:
            agents.append(f"  {row.role:20s} {row.name:30s} {row.model or 'N/A':20s}")

    await engine.dispose()

    lines = [
        "=" * 50,
        f"Agent Quality Report — {datetime.now(UTC).isoformat()}",
        f"Environment: {settings.environment}",
        "=" * 50,
        f"\nTotal Agents: {len(agents)}",
        "-" * 30,
    ]
    lines.extend(agents)

    report = "\n".join(lines)
    log_path = os.path.join(
        os.environ.get("PROJECT_ROOT", os.path.expanduser("~")),
        ".learnings",
        "AGENT_QUALITY_REPORT.md",
    )
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"\n\n{report}\n")

    print(report)
    return report


if __name__ == "__main__":
    asyncio.run(run_eval())
