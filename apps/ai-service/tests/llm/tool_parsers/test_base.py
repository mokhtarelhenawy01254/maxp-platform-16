from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import pytest

from src.llm.tool_parsers.base import BaseToolParser

_SAMPLE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "test_tool",
            "description": "A test tool",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                },
                "required": ["query"],
            },
        },
    }
]


class _ConcreteParser(BaseToolParser):
    def render_tools(self, tools: list[dict[str, Any]]) -> str | None:
        return "rendered"

    def parse_calls(self, text: str) -> list[dict[str, Any]]:
        return []


def test_abstract_class_cannot_be_instantiated():
    with pytest.raises(TypeError):
        BaseToolParser()  # type: ignore


def test_concrete_parser_can_be_instantiated():
    parser = _ConcreteParser()
    assert parser.supports_streaming is False
    assert parser.supports_required_and_named is True
    assert parser.render_tools(_SAMPLE_TOOLS) == "rendered"
    assert parser.parse_calls("") == []


def test_parse_stream_raises_not_implemented():
    parser = _ConcreteParser()
    with pytest.raises(NotImplementedError):
        parser.parse_stream("", "", "")


def test_model_key_returns_class_name():
    assert _ConcreteParser().model_key() == "_ConcreteParser"


def test_render_tools_accepts_empty_list():
    parser = _ConcreteParser()
    assert parser.render_tools([]) == "rendered"


def test_parse_calls_returns_list():
    parser = _ConcreteParser()
    assert isinstance(parser.parse_calls("some text"), list)
