from __future__ import annotations

import pathlib
from typing import Any

import yaml

_ROLE_TOOLS: dict[str, list[str]] | None = None


def load_role_tools() -> dict[str, list[str]]:
    global _ROLE_TOOLS
    if _ROLE_TOOLS is None:
        path = pathlib.Path(__file__).parent / "role_tools.yaml"
        with open(path, encoding="utf-8") as f:
            data: dict[str, Any] = yaml.safe_load(f)
        _ROLE_TOOLS = data.get("roles", {})
    return _ROLE_TOOLS


def get_tool_names_for_role(role: str) -> list[str]:
    roles = load_role_tools()
    return roles.get(role.upper(), [])

