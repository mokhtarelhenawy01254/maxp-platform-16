from __future__ import annotations

import pytest
from src.llm.client import LLMClient, ProviderResponse


def test_sanitize_tools_enforces_strict_for_openai_and_deepseek():
    # Setup client with DEEPSEEK provider
    client_ds = LLMClient(provider="DEEPSEEK", model="deepseek-chat", api_key="test-key")
    # Setup client with OPENAI provider
    client_oa = LLMClient(provider="OPENAI", model="gpt-4o", api_key="test-key")
    # Setup client with another provider (e.g. GROQ)
    client_other = LLMClient(provider="GROQ", model="llama-3", api_key="test-key")

    dummy_tools = [
        {
            "function": {
                "name": "booking_reserve",
                "description": "Book a session",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "patientName": {"type": "string"}
                    },
                    "required": ["patientName"]
                }
            }
        }
    ]

    sanitized_ds = client_ds._sanitize_tools(dummy_tools)
    sanitized_oa = client_oa._sanitize_tools(dummy_tools)
    sanitized_other = client_other._sanitize_tools(dummy_tools)

    # DeepSeek should have strict: True
    assert sanitized_ds[0]["function"]["strict"] is True

    # OpenAI should have strict: True
    assert sanitized_oa[0]["function"]["strict"] is True

    # Other providers (e.g., Groq) should NOT have strict: True
    assert "strict" not in sanitized_other[0]["function"]


def test_provider_response_supports_reasoning_content():
    response = ProviderResponse(
        text="Hello",
        tool_calls=[],
        usage=None,
        model="deepseek-v4-flash",
        provider="DEEPSEEK",
        finish_reason="stop",
        reasoning_content="Thinking process here..."
    )

    assert response.text == "Hello"
    assert response.reasoning_content == "Thinking process here..."


def test_parse_dsml_tool_calls_xml_format():
    from src.llm.client import _parse_dsml_tool_calls
    import json

    # Standard XML format with fullwidth pipes
    text_standard = """
    <｜DSML｜tool_calls>
        <｜DSML｜invoke name="product_search">
            <｜DSML｜parameter name="query" string="true">sneakers</｜DSML｜parameter>
            <｜DSML｜parameter name="limit" string="false">5</｜DSML｜parameter>
        </｜DSML｜invoke>
    </｜DSML｜tool_calls>
    """
    calls_standard = _parse_dsml_tool_calls(text_standard)
    assert len(calls_standard) == 1
    assert calls_standard[0]["function"]["name"] == "product_search"
    args_standard = json.loads(calls_standard[0]["function"]["arguments"])
    assert args_standard == {"query": "sneakers", "limit": 5}

    # Spaced XML format with halfwidth pipes (bug from screenshot)
    text_spaced = """
    <DSML | | tool_calls | | >
     <DSML | | invoke name="inventory_check" | | >
     <DSML | | parameter name="sku" string="true" | | > كوتشي الاسكوتش من سوان <DSML | | parameter | />
     <DSML | | parameter name="size" string="false" | | >37<DSML | | parameter | />
     <DSML | | invoke | />
    <DSML | | tool_calls | />
    """
    calls_spaced = _parse_dsml_tool_calls(text_spaced)
    assert len(calls_spaced) == 1
    assert calls_spaced[0]["function"]["name"] == "inventory_check"
    args_spaced = json.loads(calls_spaced[0]["function"]["arguments"])
    assert args_spaced == {"sku": "كوتشي الاسكوتش من سوان", "size": 37}


def test_parse_dsml_tool_calls_types():
    from src.llm.client import _parse_dsml_tool_calls
    import json

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


def test_parse_dsml_tool_calls_legacy_json_fallback():
    from src.llm.client import _parse_dsml_tool_calls
    import json

    text_legacy = """
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
    calls = _parse_dsml_tool_calls(text_legacy)
    assert len(calls) == 1
    assert calls[0]["function"]["name"] == "legacy_tool"
    assert json.loads(calls[0]["function"]["arguments"]) == {"key": "val"}
