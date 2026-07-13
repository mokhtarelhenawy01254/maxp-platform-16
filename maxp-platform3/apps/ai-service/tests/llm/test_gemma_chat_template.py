"""Unit tests for src.llm.gemma_chat_template.

These tests exercise the render/parse functions for the Gemma 4 native
function-calling protocol. They use lightweight fake tool objects with the
same attribute shape as agent_framework.FunctionTool (name, description,
input_model) so the module can be tested in isolation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

import pytest
from pydantic import BaseModel, Field

from src.llm.gemma_chat_template import (
    QUOTE_TOKEN,
    TOOL_BEGIN,
    TOOL_CALL_BEGIN,
    TOOL_CALL_END,
    TOOL_END,
    TOOL_RESPONSE_BEGIN,
    TOOL_RESPONSE_END,
    is_gemma_model,
    parse_tool_calls,
    parse_tool_declarations,
    parse_tool_responses,
    render_tool_definitions,
    render_tool_response,
    render_tools,
    strip_tool_blocks,
)


@dataclass
class FakeTool:
    name: str
    description: str = ""
    input_model: type[BaseModel] | None = None
    extras: dict[str, Any] = field(default_factory=dict)


class ProductSearchInput(BaseModel):
    query: str = Field(description="Search keyword")
    limit: int = Field(default=10, description="Max results")


class OrderCancelInput(BaseModel):
    order_number: str = Field(description="Order number to cancel")
    reason: str = Field(description="Cancellation reason")


class MultiVariantInput(BaseModel):
    name: str
    tags: list[str] = Field(default_factory=list)
    status: str = Field(default="active", description="active or inactive")


def test_quote_token_constant_is_correct() -> None:
    assert QUOTE_TOKEN == '<|"|>'


def test_render_tools_with_empty_list_returns_empty_string() -> None:
    assert render_tools([]) == ""
    assert render_tool_definitions([]) == ""


def test_render_tools_produces_gemma_4_declaration_format() -> None:
    tool = FakeTool(
        name="product_search",
        description="Search for products by name",
        input_model=ProductSearchInput,
    )
    rendered = render_tools([tool])
    assert rendered.startswith(TOOL_BEGIN + "declaration:product_search")
    assert rendered.endswith(TOOL_END)
    assert "description:" + QUOTE_TOKEN + "Search for products by name" + QUOTE_TOKEN in rendered
    assert "parameters:{" in rendered
    assert "query:" in rendered
    assert "limit:" in rendered
    assert "optional:true" in rendered
    assert "required" not in rendered


def test_render_tools_escapes_inner_quotes_in_descriptions() -> None:
    tool = FakeTool(
        name="echo",
        description='Says "hello" back',
    )
    rendered = render_tools([tool])
    assert 'description:' + QUOTE_TOKEN + 'Says <|"|>hello<|"|> back' + QUOTE_TOKEN in rendered


def test_render_tools_handles_array_type() -> None:
    tool = FakeTool(
        name="tagger",
        description="Tag items",
        input_model=MultiVariantInput,
    )
    rendered = render_tools([tool])
    assert "tags:" in rendered
    assert "type:" + QUOTE_TOKEN + "array" + QUOTE_TOKEN in rendered
    assert "items:" + QUOTE_TOKEN + "string" + QUOTE_TOKEN in rendered


def test_render_tools_handles_enum_type() -> None:
    class EnumInput(BaseModel):
        status: Literal["active", "archived"] = Field(description="Lifecycle state")

    tool = FakeTool(
        name="filter",
        description="Filter items",
        input_model=EnumInput,
    )
    rendered = render_tools([tool])
    assert "enum:[" in rendered
    assert QUOTE_TOKEN + "active" + QUOTE_TOKEN in rendered
    assert QUOTE_TOKEN + "archived" + QUOTE_TOKEN in rendered


def test_render_tool_definitions_includes_leading_instruction() -> None:
    tool = FakeTool(name="noop", description="No-op", input_model=ProductSearchInput)
    rendered = render_tool_definitions([tool])
    assert rendered.startswith("You have access to the following tools:\n")
    assert "declaration:noop" in rendered


def test_render_tools_handles_missing_input_model() -> None:
    tool = FakeTool(name="ping", description="Health check", input_model=None)
    rendered = render_tools([tool])
    assert "parameters:{}" in rendered


def test_parse_tool_calls_extracts_arguments() -> None:
    text = (
        "I will look up the order.\n"
        + TOOL_CALL_BEGIN
        + 'call:order_lookup{orderNumber:ORD-1,companyId:acme}'
        + TOOL_CALL_END
    )
    calls = parse_tool_calls(text)
    assert len(calls) == 1
    assert calls[0]["name"] == "order_lookup"
    assert calls[0]["arguments"]["orderNumber"] == "ORD-1"
    assert calls[0]["arguments"]["companyId"] == "acme"


def test_parse_tool_calls_round_trip_with_render() -> None:
    text = (
        "Calling now\n"
        + TOOL_CALL_BEGIN
        + 'call:product_search{query:'
        + QUOTE_TOKEN
        + 'red shoes' + QUOTE_TOKEN + ',limit:' + QUOTE_TOKEN + '5' + QUOTE_TOKEN + '}'
        + TOOL_CALL_END
    )
    calls = parse_tool_calls(text)
    assert len(calls) == 1
    args = calls[0]["arguments"]
    assert args["query"] == "red shoes"
    assert args["limit"] == "5"


def test_parse_tool_calls_preserves_commas_inside_quotes() -> None:
    text = (
        TOOL_CALL_BEGIN
        + 'call:note{body:'
        + QUOTE_TOKEN
        + 'hello, world, again' + QUOTE_TOKEN + '}'
        + TOOL_CALL_END
    )
    calls = parse_tool_calls(text)
    assert calls[0]["arguments"]["body"] == "hello, world, again"


def test_parse_tool_calls_returns_empty_for_no_calls() -> None:
    assert parse_tool_calls("just a plain message") == []


def test_parse_tool_calls_handles_multiple_calls() -> None:
    text = (
        TOOL_CALL_BEGIN + "call:a{x:1}" + TOOL_CALL_END
        + "\n"
        + TOOL_CALL_BEGIN + "call:b{y:2}" + TOOL_CALL_END
    )
    calls = parse_tool_calls(text)
    assert [c["name"] for c in calls] == ["a", "b"]


def test_parse_tool_calls_accepts_google_hosted_format() -> None:
    """Google's hosted Gemma 4 omits the ``call:`` prefix and uses raw
    ``"`` quotes instead of the ``<|"|>`` quote token. The parser must
    still extract name and arguments correctly."""
    text = TOOL_CALL_BEGIN + "get_weather{city: " + '"' + "Cairo" + '"' + "}" + TOOL_CALL_END
    calls = parse_tool_calls(text)
    assert calls == [{"name": "get_weather", "arguments": {"city": "Cairo"}}]


def test_parse_tool_calls_accepts_google_hosted_format_with_space() -> None:
    """Real Google output: ``<|tool_call>get_weather{city: "Cairo"}<tool_call|>``"""
    text = (
        "I should call it."
        + TOOL_CALL_BEGIN
        + 'get_weather{city: "Cairo"}'
        + TOOL_CALL_END
    )
    calls = parse_tool_calls(text)
    assert len(calls) == 1
    assert calls[0]["name"] == "get_weather"
    assert calls[0]["arguments"] == {"city": "Cairo"}


def test_parse_tool_calls_handles_google_format_with_multiple_args() -> None:
    text = (
        TOOL_CALL_BEGIN
        + 'search{query: "weather cairo", limit: 5, recursive: true}'
        + TOOL_CALL_END
    )
    calls = parse_tool_calls(text)
    assert len(calls) == 1
    assert calls[0]["name"] == "search"
    assert calls[0]["arguments"] == {
        "query": "weather cairo",
        "limit": "5",
        "recursive": "true",
    }


def test_parse_tool_calls_accepts_symmetric_end_token() -> None:
    """Google's hosted Gemma 4 emits the end token as ``<|tool_call|>``
    (symmetric) instead of the canonical vLLM ``<tool_call|>`` (asymmetric).
    The parser must accept both forms."""
    text = TOOL_CALL_BEGIN + 'get_weather{city: "Cairo"}' + "<|tool_call|>"
    calls = parse_tool_calls(text)
    assert calls == [{"name": "get_weather", "arguments": {"city": "Cairo"}}]


def test_parse_tool_responses_accepts_symmetric_end_token() -> None:
    text = (
        TOOL_RESPONSE_BEGIN
        + "response:get_weather{"
        + "name:" + QUOTE_TOKEN + "get_weather" + QUOTE_TOKEN
        + ",content:" + QUOTE_TOKEN + "{temp:32}" + QUOTE_TOKEN
        + "}"
        + "<|tool_response|>"
    )
    responses = parse_tool_responses(text)
    assert len(responses) == 1
    assert responses[0]["name"] == "get_weather"


def test_render_tool_response_format() -> None:
    rendered = render_tool_response("order_lookup", {"status": "ok", "id": 42})
    assert rendered.startswith(TOOL_RESPONSE_BEGIN + "response:order_lookup")
    assert rendered.endswith(TOOL_RESPONSE_END)
    assert "name:" + QUOTE_TOKEN + "order_lookup" + QUOTE_TOKEN in rendered
    assert "content:" in rendered


def test_render_tool_response_accepts_string_content() -> None:
    rendered = render_tool_response("ping", "pong")
    assert '"pong"' in rendered or "pong" in rendered


def test_parse_tool_responses_round_trip() -> None:
    rendered = render_tool_response("order_lookup", {"status": "shipped"})
    parsed = parse_tool_responses(rendered)
    assert len(parsed) == 1
    assert parsed[0]["name"] == "order_lookup"
    assert parsed[0]["content"] is not None


def test_strip_tool_blocks_removes_all_three_kinds() -> None:
    text = (
        "before "
        + TOOL_BEGIN + "declaration:x{}" + TOOL_END
        + " middle "
        + TOOL_CALL_BEGIN + "call:x{}" + TOOL_CALL_END
        + " after "
        + TOOL_RESPONSE_BEGIN + "response:x{}" + TOOL_RESPONSE_END
    )
    stripped = strip_tool_blocks(text)
    assert "declaration" not in stripped
    assert "call:" not in stripped
    assert "response:" not in stripped
    assert "before" in stripped
    assert "middle" in stripped
    assert "after" in stripped


def test_parse_tool_declarations_round_trip() -> None:
    tool = FakeTool(name="noop", description="test", input_model=ProductSearchInput)
    rendered = render_tools([tool])
    parsed = parse_tool_declarations(rendered)
    assert len(parsed) == 1
    assert parsed[0]["name"] == "noop"
    assert "description" in parsed[0]


@pytest.mark.parametrize(
    "model_name,expected",
    [
        ("gemma-4-31b-it", True),
        ("gemma-4-9b-it", True),
        ("gemma4-31b-it", True),
        ("GEMMA-4-31B-IT", True),
        ("google/gemma-4-31b-it", True),
        ("claude-sonnet-4-6", False),
        ("gemini-2.0-flash", False),
        ("gemma-2-9b-it", False),
        ("", False),
        (None, False),
    ],
)
def test_is_gemma_model(model_name: str | None, expected: bool) -> None:
    assert is_gemma_model(model_name) is expected
