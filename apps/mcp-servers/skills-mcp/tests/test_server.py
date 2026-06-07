from __future__ import annotations

import asyncio
import json
from collections.abc import Callable
from pathlib import Path

import pytest
from mcp.server.lowlevel.server import NotificationOptions

from maxp_mcp_skills.server import create_server


async def _read_resource_first(mcp, uri: str):
    contents = await mcp.read_resource(uri)
    items = list(contents)
    assert items, f"no contents returned for uri {uri}"
    return items[0]


@pytest.mark.asyncio
async def test_initialize_advertises_resources_capability(skills_dir: Path) -> None:
    mcp, state = create_server(skills_dir)
    await state.refresh()

    capabilities = mcp._mcp_server.get_capabilities(NotificationOptions(), {})
    advertised = capabilities.model_dump(exclude_none=True)

    assert "resources" in advertised
    assert capabilities.resources is not None


@pytest.mark.asyncio
async def test_resources_read_index_json_lists_all_skills(skills_dir: Path) -> None:
    mcp, state = create_server(skills_dir)
    await state.refresh()

    first = await _read_resource_first(mcp, "skill://index.json")

    assert first.mime_type == "application/json"
    payload = json.loads(first.content)
    names = sorted(entry["name"] for entry in payload["skills"])
    assert names == ["skill-alpha", "skill-beta"]

    alpha = next(entry for entry in payload["skills"] if entry["name"] == "skill-alpha")
    assert alpha["type"] == "skill-md"
    assert alpha["url"] == "skill://skill-alpha/SKILL.md"
    assert alpha["displayName"] == "Skill Alpha"
    assert alpha["description"] == "Use alpha when scanning shelves."


@pytest.mark.asyncio
async def test_resources_read_skill_md_returns_markdown(skills_dir: Path) -> None:
    mcp, state = create_server(skills_dir)
    await state.refresh()

    first = await _read_resource_first(mcp, "skill://skill-alpha/SKILL.md")

    assert first.mime_type == "text/markdown"
    assert "# Skill Alpha" in first.content
    assert "scan shelves" in first.content


@pytest.mark.asyncio
async def test_hot_reload_picks_up_new_skill(
    skills_dir: Path,
    write_skill: Callable[[Path, str, str, str, str], None],
) -> None:
    mcp, state = create_server(skills_dir)
    await state.start_watcher()
    try:
        before = await _read_resource_first(mcp, "skill://index.json")
        before_names = {entry["name"] for entry in json.loads(before.content)["skills"]}
        assert before_names == {"skill-alpha", "skill-beta"}

        write_skill(
            skills_dir,
            "skill-gamma",
            "Skill Gamma",
            "Use gamma for surprise onboarding.",
            "# Skill Gamma\n\nFor onboarding.\n",
        )

        deadline = 5.0
        interval = 0.1
        elapsed = 0.0
        found = False
        while elapsed < deadline:
            await asyncio.sleep(interval)
            elapsed += interval
            current = await _read_resource_first(mcp, "skill://index.json")
            names = {entry["name"] for entry in json.loads(current.content)["skills"]}
            if "skill-gamma" in names:
                found = True
                break

        assert found, f"skill-gamma was not picked up within {deadline}s"
    finally:
        await state.stop_watcher()
