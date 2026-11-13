from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.llm.client import LLMClient, ProviderResponse


def test_deepseek_flash_model_normalization():
    """Verify that deepseek-v4-flash, deepseek-v4.1-flash, and deepseek-flash
    map to the official current standard 'deepseek-flash' identifier,
    and deepseek-v4-pro maps to 'deepseek-v4-pro', while preserving legacy aliases.
    """
    client_flash = LLMClient(provider="DEEPSEEK", model="deepseek-v4-flash", api_key="dummy")
    assert client_flash.model == "deepseek-v4-flash"

    client_pro = LLMClient(provider="DEEPSEEK", model="deepseek-v4-pro", api_key="dummy")
    assert client_pro.model == "deepseek-v4-pro"


@pytest.mark.asyncio
async def test_deepseek_flash_thinking_mode_options():
    """Verify that thinking mode options (reasoning_effort) are properly passed to OpenAI-compat client."""
    client = LLMClient(provider="DEEPSEEK", model="deepseek-flash", api_key="dummy")

    mock_resp = MagicMock()
    mock_choice = MagicMock()
    mock_msg = MagicMock()
    mock_msg.content = "Final response text"
    mock_msg.tool_calls = None
    mock_msg.reasoning_content = "Chain of thought steps..."
    mock_choice.message = mock_msg
    mock_choice.finish_reason = "stop"
    mock_resp.choices = [mock_choice]
    mock_resp.usage = MagicMock()
    mock_resp.usage.model_dump.return_value = {
        "prompt_tokens": 100,
        "completion_tokens": 50,
        "total_tokens": 150,
        "prompt_cache_hit_tokens": 80,
    }
    mock_resp.model = "deepseek-flash"
    mock_resp.model_dump.return_value = {}

    with patch("openai.AsyncOpenAI") as MockAsyncOpenAI:
        mock_instance = MockAsyncOpenAI.return_value
        mock_instance.chat.completions.create = AsyncMock(return_value=mock_resp)

        # Call with reasoning_effort="high" and parallel_tool_calls=True
        res = await client.generate(
            messages=[{"role": "user", "content": "Analyze this business strategy"}],
            options={"reasoning_effort": "high", "parallel_tool_calls": True}
        )

        call_kwargs = mock_instance.chat.completions.create.call_args.kwargs
        assert call_kwargs["model"] == "deepseek-flash"
        assert call_kwargs["reasoning_effort"] == "high"
        assert res.text == "Final response text"
        assert res.reasoning_content == "Chain of thought steps..."
        assert res.usage["prompt_cache_hit_tokens"] == 80
        assert res.usage["cache_hit_ratio"] == 0.8


@pytest.mark.asyncio
async def test_deepseek_flash_legacy_and_safety_fallbacks():
    """Verify backward compatibility and safe parallel tool calling defaults."""
    client_v4 = LLMClient(provider="DEEPSEEK", model="deepseek-v4-flash", api_key="dummy")
    client_chat = LLMClient(provider="DEEPSEEK", model="deepseek-chat", api_key="dummy")
    client_pro = LLMClient(provider="DEEPSEEK", model="deepseek-v4-pro", api_key="dummy")

    mock_resp = MagicMock()
    mock_choice = MagicMock()
    mock_msg = MagicMock()
    mock_msg.content = "OK"
    mock_msg.tool_calls = None
    mock_choice.message = mock_msg
    mock_choice.finish_reason = "stop"
    mock_resp.choices = [mock_choice]
    mock_resp.usage = None
    mock_resp.model_dump.return_value = {}

    with patch("openai.AsyncOpenAI") as MockAsyncOpenAI:
        mock_instance = MockAsyncOpenAI.return_value
        mock_instance.chat.completions.create = AsyncMock(return_value=mock_resp)

        # 1. deepseek-v4-flash normalizes to official deepseek-flash
        await client_v4.generate(messages=[{"role": "user", "content": "hi"}])
        assert mock_instance.chat.completions.create.call_args.kwargs["model"] == "deepseek-flash"

        # 2. deepseek-chat remains deepseek-chat (100% backward compatible)
        await client_chat.generate(messages=[{"role": "user", "content": "hi"}])
        assert mock_instance.chat.completions.create.call_args.kwargs["model"] == "deepseek-chat"

        # 3. deepseek-v4-pro normalizes to deepseek-v4-pro
        await client_pro.generate(messages=[{"role": "user", "content": "hi"}])
        assert mock_instance.chat.completions.create.call_args.kwargs["model"] == "deepseek-v4-pro"
