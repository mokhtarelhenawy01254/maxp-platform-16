from __future__ import annotations

import json

import pytest

from src.llm.tool_parsers import get_parser, clear_parser_cache
from src.llm.tool_parsers.deepseek_v4 import DeepSeekV4ToolParser, _parse_dsml_tool_calls


# ---------------------------------------------------------------------------
# Contract
# ---------------------------------------------------------------------------

def test_parser_contract():
    parser = DeepSeekV4ToolParser()
    assert parser.supports_streaming is False
    assert parser.supports_required_and_named is True
    assert parser.render_tools([{"type": "function", "function": {"name": "x"}}]) is None
    assert isinstance(parser.parse_calls(""), list)
    assert parser.parse_calls("") == []


def test_model_key():
    assert DeepSeekV4ToolParser().model_key() == "DeepSeekV4ToolParser"


def test_parse_stream_returns_empty():
    assert DeepSeekV4ToolParser().parse_stream("a", "b", "c") == []


# ---------------------------------------------------------------------------
# XML format (standard fullwidth pipes ｜)
# ---------------------------------------------------------------------------

def test_parse_xml_standard():
    text = """
    <｜DSML｜tool_calls>
        <｜DSML｜invoke name="product_search">
            <｜DSML｜parameter name="query" string="true">sneakers</｜DSML｜parameter>
            <｜DSML｜parameter name="limit" string="false">5</｜DSML｜parameter>
        </｜DSML｜invoke>
    </｜DSML｜tool_calls>
    """
    calls = _parse_dsml_tool_calls(text)
    assert len(calls) == 1
    assert calls[0]["function"]["name"] == "product_search"
    args = json.loads(calls[0]["function"]["arguments"])
    assert args == {"query": "sneakers", "limit": 5}


def test_parse_xml_spaced_halfwidth_pipes():
    text = """
    <DSML | | tool_calls | | >
     <DSML | | invoke name="inventory_check" | | >
     <DSML | | parameter name="sku" string="true" | | > كوتشي الاسكوتش من سوان <DSML | | parameter | />
     <DSML | | parameter name="size" string="false" | | >37<DSML | | parameter | />
     <DSML | | invoke | />
    <DSML | | tool_calls | />
    """
    calls = _parse_dsml_tool_calls(text)
    assert len(calls) == 1
    assert calls[0]["function"]["name"] == "inventory_check"
    args = json.loads(calls[0]["function"]["arguments"])
    assert args == {"sku": "كوتشي الاسكوتش من سوان", "size": 37}


def test_parse_multiple_invokes():
    text = """
    <｜DSML｜tool_calls>
        <｜DSML｜invoke name="tool_a">
            <｜DSML｜parameter name="x" string="false">1</｜DSML｜parameter>
        </｜DSML｜invoke>
        <｜DSML｜invoke name="tool_b">
            <｜DSML｜parameter name="y" string="true">hello</｜DSML｜parameter>
        </｜DSML｜invoke>
    </｜DSML｜tool_calls>
    """
    calls = _parse_dsml_tool_calls(text)
    assert len(calls) == 2
    assert calls[0]["function"]["name"] == "tool_a"
    assert calls[1]["function"]["name"] == "tool_b"


# ---------------------------------------------------------------------------
# Type inference
# ---------------------------------------------------------------------------

def test_parse_type_inference():
    text = """
    <｜DSML｜tool_calls>
        <｜DSML｜invoke name="test_types">
            <｜DSML｜parameter name="str_param" string="true">true</｜DSML｜parameter>
            <｜DSML｜parameter name="bool_true" string="false">true</｜DSML｜parameter>
            <｜DSML｜parameter name="bool_false" string="false">false</｜DSML｜parameter>
            <｜DSML｜parameter name="num_int" string="false">42</｜DSML｜parameter>
            <｜DSML｜parameter name="num_float" string="false">3.14</｜DSML｜parameter>
            <｜DSML｜parameter name="null_val" string="false">null</｜DSML｜parameter>
            <｜DSML｜parameter name="auto_bool">true</｜DSML｜parameter>
            <｜DSML｜parameter name="auto_num">123</｜DSML｜parameter>
        </｜DSML｜invoke>
    </｜DSML｜tool_calls>
    """
    calls = _parse_dsml_tool_calls(text)
    assert len(calls) == 1
    args = json.loads(calls[0]["function"]["arguments"])
    assert args["str_param"] == "true"
    assert args["bool_true"] is True
    assert args["bool_false"] is False
    assert args["num_int"] == 42
    assert args["num_float"] == 3.14
    assert args["null_val"] is None
    assert args["auto_bool"] is True
    assert args["auto_num"] == 123


# ---------------------------------------------------------------------------
# Legacy JSON fallback
# ---------------------------------------------------------------------------

def test_parse_legacy_json():
    text = """
    <｜｜DSML｜｜tool_calls>
    [
        {
            "id": "dsml_12345",
            "type": "function",
            "function": {
                "name": "legacy_tool",
                "arguments": {"key": "val"}
            }
        }
    ]
    <｜｜DSML｜｜tool_calls>
    """
    calls = _parse_dsml_tool_calls(text)
    assert len(calls) == 1
    assert calls[0]["function"]["name"] == "legacy_tool"
    assert json.loads(calls[0]["function"]["arguments"]) == {"key": "val"}


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("text", ["", "  ", "hello world", "<not_dsml>text</not_dsml>"])
def test_parse_empty_or_no_match(text):
    assert _parse_dsml_tool_calls(text) == []


def test_parse_no_parameters():
    text = """
    <｜DSML｜tool_calls>
        <｜DSML｜invoke name="noop">
        </｜DSML｜invoke>
    </｜DSML｜tool_calls>
    """
    calls = _parse_dsml_tool_calls(text)
    assert len(calls) == 1
    assert calls[0]["function"]["name"] == "noop"
    args = json.loads(calls[0]["function"]["arguments"])
    assert args == {}


# ---------------------------------------------------------------------------
# Routing via get_parser()
# ---------------------------------------------------------------------------

def test_get_parser_returns_deepseek_for_deepseek_models():
    clear_parser_cache()
    parser = get_parser(model="deepseek-v4-flash", provider="DEEPSEEK")
    assert isinstance(parser, DeepSeekV4ToolParser)


def test_get_parser_returns_deepseek_by_model_name_fallback():
    clear_parser_cache()
    parser = get_parser(model="deepseek-chat", provider=None)
    assert isinstance(parser, DeepSeekV4ToolParser)


def test_get_parser_returns_openai_for_non_deepseek():
    clear_parser_cache()
    from src.llm.tool_parsers.openai_compat import OpenAIToolParser
    parser = get_parser(model="gpt-4o", provider="OPENAI")
    assert isinstance(parser, OpenAIToolParser)


# ---------------------------------------------------------------------------
# Parser class wraps _parse_dsml_tool_calls correctly
# ---------------------------------------------------------------------------

def test_parser_class_delegates_to_module_function():
    parser = DeepSeekV4ToolParser()
    text = '<｜DSML｜tool_calls><｜DSML｜invoke name="foo"><｜DSML｜parameter name="x" string="false">1</｜DSML｜parameter></｜DSML｜invoke></｜DSML｜tool_calls>'
    parser_calls = parser.parse_calls(text)
    module_calls = _parse_dsml_tool_calls(text)
    assert len(parser_calls) == len(module_calls)
    assert parser_calls[0]["function"]["name"] == module_calls[0]["function"]["name"]
