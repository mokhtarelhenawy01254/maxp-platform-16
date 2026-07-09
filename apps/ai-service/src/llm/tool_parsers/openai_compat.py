from __future__ import annotations

import json
from typing import Any

from src.llm.tool_parsers.base import BaseToolParser


class OpenAIToolParser(BaseToolParser):
    supports_streaming = True
    supports_required_and_named = True

    def render_tools(self, tools: list[dict[str, Any]]) -> str | None:
        if not tools:
            return None
        return json.dumps(tools, ensure_ascii=False)

    def parse_calls(self, text: str) -> list[dict[str, Any]]:
        return []

    def parse_stream(
        self, prev: str, curr: str, delta: str
    ) -> list[dict[str, Any]]:
        return []


__all__ = ["OpenAIToolParser"]
