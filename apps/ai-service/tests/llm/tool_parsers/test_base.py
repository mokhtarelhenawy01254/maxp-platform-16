from __future__ import annotations

from typing import Any

import pytest

from src.llm.tool_parsers.base import BaseToolParser, ToolDefinition, tool_names_set

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

_SAMPLE_CALLS = [
    {
        "id": "call_abc123",
        "type": "function",
        "function": {"name": "test_tool", "arguments": '{"query": "hello"}'},
    }
]


class _ConcreteParser(BaseToolParser):
    def render_tools(self, tools: list[dict[str, Any]]) -> str | None:
        return "rendered"

    def parse_calls(self, text: str) -> list[dict[str, Any]]:
        return []


# --- Contract tests (auto-discovered via conftest) ---

def test_parser_contract_render_tools(parser_cls: type[BaseToolParser]):
    parser = parser_cls()
    result = parser.render_tools(_SAMPLE_TOOLS)
    assert result is None or isinstance(result, str)


def test_parser_contract_parse_calls(parser_cls: type[BaseToolParser]):
    parser = parser_cls()
    result = parser.parse_calls("")
    assert isinstance(result, list)


def test_parser_contract_parse_stream(parser_cls: type[BaseToolParser]):
    parser = parser_cls()
    result = parser.parse_stream("a", "b", "c")
    assert isinstance(result, list)


def test_parser_contract_model_key(parser_cls: type[BaseToolParser]):
    parser = parser_cls()
    assert isinstance(parser.model_key(), str)
    assert len(parser.model_key()) > 0


def test_parser_contract_validate_tools(parser_cls: type[BaseToolParser]):
    assert parser_cls.validate_tools(None) is None
    assert parser_cls.validate_tools(_SAMPLE_TOOLS) is None


def test_parser_contract_validate_output(parser_cls: type[BaseToolParser]):
    assert parser_cls.validate_output([]) is None
    assert parser_cls.validate_output(_SAMPLE_CALLS) is None


# --- ToolDefinition ---

def test_tool_definition_from_dict():
    t = ToolDefinition.from_dict(_SAMPLE_TOOLS[0])
    assert t.name == "test_tool"
    assert t.description == "A test tool"
    assert t.parameters["type"] == "object"


def test_tool_definition_from_bare_function():
    t = ToolDefinition.from_dict({"name": "bare_fn", "description": "no wrapper"})
    assert t.name == "bare_fn"
    assert t.description == "no wrapper"


def test_tool_definition_from_empty():
    t = ToolDefinition.from_dict({})
    assert t.name == ""


def test_tool_definition_sanitize_name():
    assert ToolDefinition.sanitize_name("my-tool") == "my_tool"
    assert ToolDefinition.sanitize_name("") == "tool"
    assert ToolDefinition.sanitize_name("a" * 100) == "a" * 64


def test_tool_definition_sanitize_dedup():
    seen: dict[str, str] = {}
    first = ToolDefinition.sanitize_name("my-tool", seen)
    second = ToolDefinition.sanitize_name("my-tool", seen)
    assert first == second


def test_tool_definition_sanitize_collision():
    seen: dict[str, str] = {}
    a = ToolDefinition.sanitize_name("a", seen)
    b = ToolDefinition.sanitize_name("a", seen)
    assert a == b


def test_tool_names_set():
    assert tool_names_set(None) == set()
    assert tool_names_set(_SAMPLE_TOOLS) == {"test_tool"}
    assert tool_names_set([]) == set()


# --- BaseToolParser basics ---

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


# --- validate_tools ---

def test_validate_tools_none_is_ok():
    assert BaseToolParser.validate_tools(None) is None

def test_validate_tools_empty_is_ok():
    assert BaseToolParser.validate_tools([]) is None

def test_validate_tools_valid():
    assert BaseToolParser.validate_tools(_SAMPLE_TOOLS) is None

def test_validate_tools_missing_name():
    result = BaseToolParser.validate_tools([{"type": "function", "function": {}}])
    assert result is not None
    assert "missing function.name" in result

def test_validate_tools_missing_function():
    result = BaseToolParser.validate_tools([{"type": "function"}])
    assert result is not None
    assert "missing function.name" in result

def test_validate_tools_bad_params():
    result = BaseToolParser.validate_tools([{"type": "function", "function": {"name": "x", "parameters": "string"}}])
    assert result is not None
    assert "parameters must be a dict" in result

# --- validate_output ---

def test_validate_output_empty():
    assert BaseToolParser.validate_output([]) is None

def test_validate_output_valid():
    assert BaseToolParser.validate_output(_SAMPLE_CALLS) is None

def test_validate_output_missing_function():
    result = BaseToolParser.validate_output([{"id": "x"}])
    assert result is not None
    assert "missing function.name" in result

def test_validate_output_missing_name():
    result = BaseToolParser.validate_output([{"id": "x", "function": {}}])
    assert result is not None
    assert "missing function.name" in result

def test_validate_output_missing_arguments():
    result = BaseToolParser.validate_output([{"id": "x", "function": {"name": "t"}}])
    assert result is not None
    assert "missing arguments" in result

def test_validate_output_bad_json_args():
    result = BaseToolParser.validate_output([{"id": "x", "function": {"name": "t", "arguments": "{bad"}}])
    assert result is not None
    assert "not valid JSON" in result

def test_validate_output_unknown_tool_name():
    result = BaseToolParser.validate_output(_SAMPLE_CALLS, {"other_tool"})
    assert result is not None
    assert "not in declared tools" in result

def test_validate_output_with_tool_names():
    assert BaseToolParser.validate_output(_SAMPLE_CALLS, {"test_tool"}) is None
