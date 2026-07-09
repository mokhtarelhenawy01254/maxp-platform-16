from __future__ import annotations

from typing import Any

from src.llm.gemma_chat_template import parse_tool_calls, render_tool_definitions
from src.llm.tool_parsers.base import BaseToolParser


class _SchemaWrapper:
    def __init__(self, parameters: dict[str, Any]) -> None:
        self._parameters = parameters

    def model_json_schema(self) -> dict[str, Any]:
        return self._parameters


class _ToolWrapper:
    def __init__(self, name: str, description: str, parameters: dict[str, Any]) -> None:
        self.name = name
        self.description = description
        self.input_model = _SchemaWrapper(parameters) if parameters else None


class Gemma4ToolParser(BaseToolParser):
    supports_streaming = False
    supports_required_and_named = True

    @classmethod
    def model_key(cls) -> str:
        return "gemma4"

    def render_tools(self, tools: list[dict[str, Any]]) -> str | None:
        if not tools:
            return None
        wrapped = []
        for tool in tools:
            func = tool.get("function", tool) if isinstance(tool, dict) else tool
            name = func.get("name", "unknown_tool") if isinstance(func, dict) else getattr(func, "name", "unknown_tool")
            description = func.get("description", "") if isinstance(func, dict) else getattr(func, "description", "")
            params = func.get("parameters", {}) if isinstance(func, dict) else {}
            wrapped.append(_ToolWrapper(name, description, params))
        return render_tool_definitions(wrapped)

    def parse_calls(self, text: str) -> list[dict[str, Any]]:
        return parse_tool_calls(text)

    def parse_stream(self, prev: str, curr: str, delta: str) -> list[dict[str, Any]]:
        return []


__all__ = ["Gemma4ToolParser"]
