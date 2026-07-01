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
