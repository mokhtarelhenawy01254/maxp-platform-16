from __future__ import annotations

import pytest

from src.llm.gemma_chat_template import (
    TOOL_CALL_BEGIN,
    TOOL_CALL_END,
    TOOL_BEGIN,
    TOOL_END,
)
from src.llm.tool_parsers import get_parser, clear_parser_cache
from src.llm.tool_parsers.gemma4 import Gemma4ToolParser

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
