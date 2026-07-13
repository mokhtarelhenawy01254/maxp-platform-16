from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ToolDefinition:
    name: str
    description: str = ""
    parameters: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, tool: dict[str, Any]) -> ToolDefinition:
        func = tool.get("function", tool) if isinstance(tool, dict) else tool
        name = ""
        description = ""
        params: dict = {}
        if isinstance(func, dict):
            name = str(func.get("name") or "")
            description = str(func.get("description") or "")
            raw_params = func.get("parameters") or {}
            if hasattr(raw_params, "model_json_schema"):
                raw_params = raw_params.model_json_schema()
            params = raw_params if isinstance(raw_params, dict) else {"type": "object"}
        return cls(name=name, description=description, parameters=params)

    @staticmethod
    def sanitize_name(name: str, seen: dict[str, str] | None = None) -> str:
        safe = _SAFE_TOOL_NAME_RE.sub("_", name).strip("_") or "tool"
        safe = safe[:64]
        if seen is None:
            return safe
        existing = seen.get(name)
        if existing:
            return existing
        if safe not in seen:
            seen[name] = safe
            return safe
        suffix = 2
        while True:
            candidate = f"{safe[:59]}_{suffix}"
            if candidate not in seen:
                seen[name] = candidate
                return candidate
            suffix += 1


_SAFE_TOOL_NAME_RE = re.compile(r"[^a-zA-Z0-9_]")


def tool_names_set(tools: list[dict[str, Any]] | None) -> set[str]:
    if not tools:
        return set()
    result: set[str] = set()
    for t in tools:
        if isinstance(t, dict):
            func = t.get("function", t) if isinstance(t, dict) else t
            if isinstance(func, dict):
                result.add(str(func.get("name") or ""))
    return result


class BaseToolParser(ABC):
    supports_streaming: bool = False
    supports_required_and_named: bool = True

    @abstractmethod
    def render_tools(self, tools: list[dict[str, Any]]) -> str | None:
        ...

    @abstractmethod
    def parse_calls(self, text: str) -> list[dict[str, Any]]:
        ...

    def parse_stream(
        self, prev: str, curr: str, delta: str
    ) -> list[dict[str, Any]]:
        raise NotImplementedError(f"{type(self).__name__} does not support streaming")

    def model_key(self) -> str:
        return type(self).__name__

    @staticmethod
    def validate_tools(tools: list[dict[str, Any]] | None) -> str | None:
        if not tools:
            return None
        for i, tool in enumerate(tools):
            func = tool.get("function", {}) if isinstance(tool, dict) else {}
            name = func.get("name", "") if isinstance(func, dict) else ""
            if not name:
                return f"tool[{i}]: missing function.name"
            raw_params = func.get("parameters") if isinstance(func, dict) else None
            if raw_params is not None and not isinstance(raw_params, dict):
                return f"tool[{i}]: parameters must be a dict"
        return None

    @staticmethod
    def validate_output(
        tool_calls: list[dict[str, Any]],
        tool_names: set[str] | None = None,
    ) -> str | None:
        for tc in tool_calls:
            func = tc.get("function", {}) if isinstance(tc, dict) else {}
            name = func.get("name", "") if isinstance(func, dict) else ""
            if not name:
                return "tool_call missing function.name"
            args = func.get("arguments") if isinstance(func, dict) else None
            if args is None:
                return f"tool_call '{name}': missing arguments"
            if isinstance(args, str):
                try:
                    json.loads(args)
                except json.JSONDecodeError:
                    return f"tool_call '{name}': arguments not valid JSON"
            if tool_names is not None and name not in tool_names:
                return f"tool_call '{name}': not in declared tools"
        return None


__all__ = ["BaseToolParser", "ToolDefinition", "tool_names_set"]
