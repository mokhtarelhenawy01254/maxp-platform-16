from __future__ import annotations

import json
from pathlib import Path

import pytest

from src.agents.loader import _discover_templates
from src.tools.names import canonical_tool_name
from src.tools.registry import get_tool, get_tool_names_for_role

AGENT_DIR = Path(__file__).resolve().parents[3] / "backend" / "agents" / "store-manager-agent"
MANIFEST_PATH = AGENT_DIR / "agent.json"


def _manifest() -> dict:
    with open(MANIFEST_PATH, encoding="utf-8") as f:
        return json.load(f)


def test_contract_folder_has_all_files():
    for filename in ("agent.json", "SOUL.md", "PERSONA.md", "TOOLS.md", "AGENTS.md", "evals.json"):
        assert (AGENT_DIR / filename).exists(), filename


def test_discovered_by_loader_with_instructions():
    templates = {t["slug"]: t for t in _discover_templates()}
    template = templates.get("store-manager-agent")
    assert template is not None, "store-manager-agent must be discovered from backend/agents"
    assert template["role"] == "STORE_MANAGER"
    assert template["instructions_soul"], "SOUL.md must be attached"
    assert template["instructions_tools"], "TOOLS.md must be attached"
    assert template["instructions_persona"], "PERSONA.md must be attached"
    assert template["instructions_agents"], "AGENTS.md must be attached"


def test_every_allowed_tool_resolves_in_registry():
    manifest = _manifest()
    unresolved = [
        name
        for name in manifest["allowedTools"]
        if get_tool(canonical_tool_name(name)) is None
    ]
    assert unresolved == [], f"allowedTools not found in registry: {unresolved}"


def test_manifest_tools_match_role_yaml():
    manifest = _manifest()
    manifest_tools = {canonical_tool_name(n) for n in manifest["allowedTools"]}
    role_tools = set(get_tool_names_for_role("STORE_MANAGER"))
    assert role_tools == manifest_tools, (
        "role_tools.yaml STORE_MANAGER must mirror agent.json allowedTools; "
        f"yaml-only={sorted(role_tools - manifest_tools)}, "
        f"manifest-only={sorted(manifest_tools - role_tools)}"
    )


def test_storefront_write_tools_are_approval_gated():
    from src.tools.registry import DIRECT_WRITE_TOOL_NAMES, WRITE_TOOL_NAMES

    manifest = _manifest()
    for name in manifest["allowedTools"]:
        canonical = canonical_tool_name(name)
        if canonical in WRITE_TOOL_NAMES and canonical not in DIRECT_WRITE_TOOL_NAMES:
            tool = get_tool(canonical)
            assert tool.approval_mode == "always_require", canonical


def test_storefront_tools_present():
    manifest_tools = {canonical_tool_name(n) for n in _manifest()["allowedTools"]}
    for expected in (
        "conversion_tools_read",
        "conversion_tool_toggle",
        "conversion_tool_set_threshold",
        "payment_settings_read",
        "payment_methods_configure",
    ):
        assert expected in manifest_tools, expected


def test_evals_scenarios_are_valid():
    with open(AGENT_DIR / "evals.json", encoding="utf-8") as f:
        evals = json.load(f)
    scenarios = evals.get("scenarios") or []
    assert len(scenarios) >= 3
    for scenario in scenarios:
        assert scenario.get("name"), "each scenario needs a name"
        assert scenario.get("input"), "each scenario needs an input"
        if "forbidden" in scenario:
            assert isinstance(scenario["forbidden"], list)


def test_soul_has_no_negative_functional_constraints():
    soul = (AGENT_DIR / "SOUL.md").read_text(encoding="utf-8")
    banned_patterns = [
        "مسؤول عن",
        "مش شأن",
        "لا أفهم",
        "لا شأن لي",
        "فقط ولا",
    ]
    hits = [p for p in banned_patterns if p in soul]
    assert hits == [], f"SOUL.md contains negative functional constraint phrasing: {hits}"
