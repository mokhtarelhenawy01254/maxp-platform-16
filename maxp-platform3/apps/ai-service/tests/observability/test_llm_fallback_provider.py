from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from src.observability.llm_fallback import LLMFallbackProvider


@pytest.mark.asyncio
async def test_llm_fallback_provider_uses_routed_provider_client(monkeypatch):
    provider_client = object()
    provider_builder = AsyncMock(return_value=provider_client)
    agent_builder = AsyncMock()

    monkeypatch.setattr(
        "src.llm.agent_client_factory.build_provider_client_async",
        provider_builder,
    )
    monkeypatch.setattr(
        "src.llm.agent_client_factory.build_agent_client_async",
        agent_builder,
    )

    client = await LLMFallbackProvider().get_client(
        company_id="comp1",
        model="openai/gpt-oss-120b",
        provider="GROQ",
    )

    assert client is provider_client
    provider_builder.assert_awaited_once_with(
        "GROQ",
        model="openai/gpt-oss-120b",
        system_prompt=None,
        company_id="comp1",
    )
    agent_builder.assert_not_awaited()
