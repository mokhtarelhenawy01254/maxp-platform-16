from __future__ import annotations

import json
from pathlib import Path

import pytest

from src.agents.loader import _discover_templates
from src.tools.names import canonical_tool_name
from src.tools.registry import get_tool, get_tool_names_for_role

AGENT_DIR = Path(__file__).resolve().parents[3] / "backend" / "agents" / "executive-assistant-agent"
if not AGENT_DIR.exists():
    AGENT_DIR = Path(__file__).resolve().parents[4] / "apps" / "backend" / "agents" / "executive-assistant-agent"
MANIFEST_PATH = AGENT_DIR / "agent.json"


def _manifest() -> dict:
    with open(MANIFEST_PATH, encoding="utf-8") as f:
        return json.load(f)


def test_contract_folder_has_all_files():
    for filename in ("agent.json", "SOUL.md", "PERSONA.md", "TOOLS.md", "AGENTS.md", "evals.json"):
        assert (AGENT_DIR / filename).exists(), f"Missing {filename} in {AGENT_DIR}"


def test_discovered_by_loader_with_instructions():
    templates = {t["slug"]: t for t in _discover_templates(AGENT_DIR.parent)}
    template = templates.get("executive-assistant-agent")
    assert template is not None, "executive-assistant-agent must be discovered from backend/agents"
    assert template["role"] == "EXECUTIVE_ASSISTANT"
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
    role_tools = set(get_tool_names_for_role("EXECUTIVE_ASSISTANT"))
    assert role_tools == manifest_tools, (
        "role_tools.yaml EXECUTIVE_ASSISTANT must mirror agent.json allowedTools; "
        f"yaml-only={sorted(role_tools - manifest_tools)}, "
        f"manifest-only={sorted(manifest_tools - role_tools)}"
    )


def test_soul_has_no_negative_functional_constraints():
    soul = (AGENT_DIR / "SOUL.md").read_text(encoding="utf-8")
    forbidden = ["أنا مسؤول فقط عن", "لا شأن لي ب", "أنا غير معني ب"]
    for phrase in forbidden:
        assert phrase not in soul, f"Negative constraint '{phrase}' forbidden in SOUL.md"
