from __future__ import annotations

import pytest

from dataclasses import dataclass, field
from typing import Any

import pytest
from pydantic import BaseModel, Field

from src.llm.tool_parsers import get_parser, clear_parser_cache
from src.llm.tool_parsers.gemma4 import (
    QUOTE_TOKEN,
    TOOL_BEGIN,
    TOOL_CALL_BEGIN,
    TOOL_CALL_END,
    TOOL_END,
    Gemma4ToolParser,
    parse_tool_calls,
    render_tool_definitions,
    render_tools,
)

_SAMPLE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "product_search",
            "description": "Search for products",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_price",
            "description": "Get product price",
            "parameters": {
                "type": "object",
                "properties": {
                    "sku": {"type": "string"},
                },
                "required": ["sku"],
            },
        },
    },
]


def test_parser_contract():
    parser = Gemma4ToolParser()
    assert parser.supports_streaming is False
    assert parser.supports_required_and_named is True
    assert isinstance(parser.parse_calls(""), list)
    assert parser.parse_calls("") == []


def test_model_key():
    assert Gemma4ToolParser().model_key() == "gemma4"


def test_parse_stream_returns_empty():
    assert Gemma4ToolParser().parse_stream("a", "b", "c") == []


def test_render_tools_produces_special_tokens():
    parser = Gemma4ToolParser()
    rendered = parser.render_tools(_SAMPLE_TOOLS)
    assert rendered is not None
    assert "You have access to the following tools:" in rendered
    assert TOOL_BEGIN in rendered
    assert TOOL_END in rendered
    assert "product_search" in rendered
    assert "get_price" in rendered


def test_render_tools_empty_returns_none():
    parser = Gemma4ToolParser()
    assert parser.render_tools([]) is None
    assert parser.render_tools(None) is None


def test_render_tools_handles_single_tool():
    parser = Gemma4ToolParser()
    rendered = parser.render_tools([_SAMPLE_TOOLS[0]])
    assert rendered is not None
    assert "product_search" in rendered
    assert "get_price" not in rendered


def test_render_tools_dedup_names():
    parser = Gemma4ToolParser()
    tools = [_SAMPLE_TOOLS[0], _SAMPLE_TOOLS[0]]
    rendered = parser.render_tools(tools)
    assert rendered is not None
    # Same name maps to same safe name (dedup preserves mapping)
    assert rendered.count("product_search") == 2  # two declarations, same safe name


def test_render_tools_sanitizes_special_chars():
    parser = Gemma4ToolParser()
    tools = [{"type": "function", "function": {"name": "my-tool@2", "description": "", "parameters": {"type": "object"}}}]
    rendered = parser.render_tools(tools)
    assert rendered is not None
    assert "my_tool_2" in rendered


def test_parse_calls_single():
    text = (
        f"{TOOL_CALL_BEGIN}product_search{{query:{'<|\"|>'}'sneakers'{'<|\"|>'}'}}{TOOL_CALL_END}"
    )
    calls = Gemma4ToolParser().parse_calls(text)
    assert len(calls) == 1
    assert calls[0]["name"] == "product_search"


def test_parse_calls_multiple():
    text = (
        f"{TOOL_CALL_BEGIN}tool_a{{x:1}}{TOOL_CALL_END}"
        f"{TOOL_CALL_BEGIN}tool_b{{y:hello}}{TOOL_CALL_END}"
    )
    calls = Gemma4ToolParser().parse_calls(text)
    assert len(calls) == 2
    assert calls[0]["name"] == "tool_a"
    assert calls[1]["name"] == "tool_b"


def test_parse_calls_with_text_surrounding():
    text = f"Let me search for that.{TOOL_CALL_BEGIN}product_search{{query:sneakers}}{TOOL_CALL_END}I will find it."
    calls = Gemma4ToolParser().parse_calls(text)
    assert len(calls) == 1
    assert calls[0]["name"] == "product_search"


def test_parse_calls_empty_text():
    assert Gemma4ToolParser().parse_calls("") == []
    assert Gemma4ToolParser().parse_calls("Just regular text") == []


def test_parse_calls_handles_call_prefix_variant():
    text = f"{TOOL_CALL_BEGIN} call:product_search{{query:test}}{TOOL_CALL_END}"
    calls = Gemma4ToolParser().parse_calls(text)
    assert len(calls) == 1
    assert calls[0]["name"] == "product_search"


def test_get_parser_returns_gemma4_for_gemma_models():
    clear_parser_cache()
    parser = get_parser(model="gemma-4-27b-it", provider="GOOGLE")
    from src.llm.tool_parsers.gemma4 import Gemma4ToolParser
    assert isinstance(parser, Gemma4ToolParser)


def test_get_parser_returns_gemma4_for_short_name():
    clear_parser_cache()
    parser = get_parser(model="gemma4", provider="GOOGLE")
    from src.llm.tool_parsers.gemma4 import Gemma4ToolParser
    assert isinstance(parser, Gemma4ToolParser)


def test_get_parser_returns_openai_for_gemma_with_ollama_tag():
    clear_parser_cache()
    from src.llm.tool_parsers.openai_compat import OpenAIToolParser
    parser = get_parser(model="gemma4:31b-cloud", provider="OLLAMA")
    assert isinstance(parser, OpenAIToolParser)


def test_get_parser_returns_openai_for_non_gemma_google():
    clear_parser_cache()
    from src.llm.tool_parsers.openai_compat import OpenAIToolParser
    parser = get_parser(model="gemini-2.5-flash", provider="GOOGLE")
    assert isinstance(parser, OpenAIToolParser)


@dataclass
class _FakeTool:
    name: str
    description: str = ""
    input_model: type[BaseModel] | None = None
    extras: dict[str, Any] = field(default_factory=dict)


class _ProductSearchInput(BaseModel):
    query: str = Field(description="Search keyword")
    limit: int = Field(default=10, description="Max results")


class _MultiVariantInput(BaseModel):
    name: str
    tags: list[str] = Field(default_factory=list)
    status: str = Field(default="active")


def test_quote_token_constant_is_correct():
    assert QUOTE_TOKEN == '<|"|>'


def test_render_tools_empty_returns_empty_string():
    assert render_tools([]) == ""
    assert render_tool_definitions([]) == ""


def test_render_tools_produces_gemma_4_declaration_format():
    tool = _FakeTool(name="product_search", description="Search for products by name", input_model=_ProductSearchInput)
    rendered = render_tools([tool])
    assert rendered.startswith(TOOL_BEGIN + "declaration:product_search")
    assert rendered.endswith(TOOL_END)
    assert "description:" + QUOTE_TOKEN + "Search for products by name" + QUOTE_TOKEN in rendered
    assert "parameters:{" in rendered
    assert "optional:true" in rendered


def test_render_tools_escapes_inner_quotes():
    tool = _FakeTool(name="echo", description='Says "hello" back')
    rendered = render_tools([tool])
    assert 'description:' + QUOTE_TOKEN + 'Says <|"|>hello<|"|> back' + QUOTE_TOKEN in rendered


def test_render_tools_handles_array_type():
    tool = _FakeTool(name="tagger", description="Tag items", input_model=_MultiVariantInput)
    rendered = render_tools([tool])
    assert "type:" + QUOTE_TOKEN + "array" + QUOTE_TOKEN in rendered
    assert "items:" + QUOTE_TOKEN + "string" + QUOTE_TOKEN in rendered


def test_render_tool_definitions_includes_leading_instruction():
    tool = _FakeTool(name="noop", description="No-op", input_model=_ProductSearchInput)
    rendered = render_tool_definitions([tool])
    assert rendered.startswith("You have access to the following tools:\n")
    assert "declaration:noop" in rendered


def test_render_tools_handles_missing_input_model():
    tool = _FakeTool(name="ping", description="Health check", input_model=None)
    rendered = render_tools([tool])
    assert "parameters:{}" in rendered


def test_parse_tool_calls_extracts_arguments():
    text = f"I will look it up.\n{TOOL_CALL_BEGIN}call:order_lookup{{orderNumber:ORD-1,companyId:acme}}{TOOL_CALL_END}"
    calls = parse_tool_calls(text)
    assert len(calls) == 1
    assert calls[0]["name"] == "order_lookup"
    assert calls[0]["arguments"]["orderNumber"] == "ORD-1"
    assert calls[0]["arguments"]["companyId"] == "acme"


def test_parse_tool_calls_round_trip_with_render():
    text = f"Calling now\n{TOOL_CALL_BEGIN}call:product_search{{query:{QUOTE_TOKEN}red shoes{QUOTE_TOKEN},limit:{QUOTE_TOKEN}5{QUOTE_TOKEN}}}{TOOL_CALL_END}"
    calls = parse_tool_calls(text)
    assert len(calls) == 1
    assert calls[0]["arguments"]["query"] == "red shoes"
    assert calls[0]["arguments"]["limit"] == "5"


def test_parse_tool_calls_preserves_commas_inside_quotes():
    text = f"{TOOL_CALL_BEGIN}call:note{{body:{QUOTE_TOKEN}hello, world, again{QUOTE_TOKEN}}}{TOOL_CALL_END}"
    calls = parse_tool_calls(text)
    assert calls[0]["arguments"]["body"] == "hello, world, again"


def test_parse_tool_calls_empty_text():
    assert parse_tool_calls("just a plain message") == []


def test_parse_tool_calls_handles_multiple():
    text = f"{TOOL_CALL_BEGIN}call:a{{x:1}}{TOOL_CALL_END}\n{TOOL_CALL_BEGIN}call:b{{y:2}}{TOOL_CALL_END}"
    calls = parse_tool_calls(text)
    assert [c["name"] for c in calls] == ["a", "b"]


def test_parse_tool_calls_accepts_google_hosted_format():
    text = TOOL_CALL_BEGIN + 'get_weather{city: "Cairo"}' + TOOL_CALL_END
    calls = parse_tool_calls(text)
    assert calls == [{"name": "get_weather", "arguments": {"city": "Cairo"}}]


def test_parse_tool_calls_accepts_google_format_multiple_args():
    text = TOOL_CALL_BEGIN + 'search{query: "weather cairo", limit: 5, recursive: true}' + TOOL_CALL_END
    calls = parse_tool_calls(text)
    assert calls[0]["arguments"] == {"query": "weather cairo", "limit": "5", "recursive": "true"}


def test_parse_tool_calls_accepts_symmetric_end_token():
    text = TOOL_CALL_BEGIN + 'get_weather{city: "Cairo"}' + "<|tool_call|>"
    calls = parse_tool_calls(text)
    assert calls == [{"name": "get_weather", "arguments": {"city": "Cairo"}}]
