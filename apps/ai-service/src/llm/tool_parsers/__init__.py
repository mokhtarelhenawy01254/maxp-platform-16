from __future__ import annotations

from typing import Any

from src.llm.tool_parsers.base import BaseToolParser
from src.llm.tool_parsers.openai_compat import OpenAIToolParser

_PARSER_CACHE: dict[str, BaseToolParser] = {}


def get_parser(model: str | None, provider: str | None = None) -> BaseToolParser:
    if not model:
        return _get_or_create("openai_compat", OpenAIToolParser)

    model_lower = model.strip().lower()

    if "gemma-4" in model_lower or "gemma4" in model_lower:
        if ":" in model_lower:
            return _get_or_create("openai_compat", OpenAIToolParser)

        from src.llm.tool_parsers.gemma4 import Gemma4ToolParser

        return _get_or_create("gemma4", Gemma4ToolParser)

    if provider and provider.upper() == "DEEPSEEK":
        from src.llm.tool_parsers.deepseek_v4 import DeepSeekV4ToolParser

        return _get_or_create("deepseek_v4", DeepSeekV4ToolParser)

    if "deepseek" in model_lower:
        from src.llm.tool_parsers.deepseek_v4 import DeepSeekV4ToolParser

        return _get_or_create("deepseek_v4", DeepSeekV4ToolParser)

    return _get_or_create("openai_compat", OpenAIToolParser)


def _get_or_create(key: str, cls: type[BaseToolParser]) -> BaseToolParser:
    if key not in _PARSER_CACHE:
        _PARSER_CACHE[key] = cls()
    return _PARSER_CACHE[key]


def clear_parser_cache() -> None:
    _PARSER_CACHE.clear()


__all__ = [
    "BaseToolParser",
    "OpenAIToolParser",
    "get_parser",
    "clear_parser_cache",
]
