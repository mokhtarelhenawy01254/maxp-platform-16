from __future__ import annotations

import json
from typing import Any

from src.llm.tool_parsers.openai_compat import OpenAIToolParser

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


def test_supports_streaming():
    assert OpenAIToolParser.supports_streaming is True


def test_render_tools_returns_json():
    parser = OpenAIToolParser()
    rendered = parser.render_tools(_SAMPLE_TOOLS)
    assert rendered is not None
    parsed = json.loads(rendered)
    assert parsed == _SAMPLE_TOOLS


def test_render_tools_empty_returns_none():
    parser = OpenAIToolParser()
    assert parser.render_tools([]) is None
    assert parser.render_tools(None) is None  # type: ignore


def test_parse_calls_always_empty():
    parser = OpenAIToolParser()
    assert parser.parse_calls("") == []
    assert parser.parse_calls("any text here") == []


def test_parse_stream_always_empty():
    parser = OpenAIToolParser()
    assert parser.parse_stream("", "", "") == []
    assert parser.parse_stream("a", "b", "c") == []
