from __future__ import annotations

import os
from unittest.mock import AsyncMock, patch, MagicMock
import pytest

# Ensure environments are mocked
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test")

from src.agents.base import BaseAgent, BaseAgentConfig
from src.services.agent_registry import AgentRegistry


@pytest.mark.asyncio
async def test_ensure_client_primary_success() -> None:
    """Test that ensure_client successfully builds the primary model client."""
    config = BaseAgentConfig(
        id="test_agent",
        name="Test Agent",
        role="TEST",
        company_id="company_123",
        model="primary-gemini",
        policies={
            "model_policy": {
                "default": "primary-gemini",
                "fallback": [
                    {"provider": "OPENAI", "model": "gpt-4o-mini"},
                ]
            }
        }
    )
    agent = BaseAgent(config)

    # Mock success on build_agent_client_async
    mock_client = MagicMock()
    with patch("src.agents.base.build_agent_client_async", AsyncMock(return_value=mock_client)) as mock_build, \
         patch("src.agents.base.BaseAgent._resolve_tools", return_value=[]):
        client = await agent.ensure_client()
        assert client == mock_client
        assert agent._last_model_selection["model"] == "primary-gemini"
        assert agent._last_model_selection["source"] == "primary"
        assert agent.model == "primary-gemini"
        mock_build.assert_called_once()


@pytest.mark.asyncio
async def test_ensure_client_fallback_success() -> None:
    """Test that ensure_client falls back to the configured backup model on primary failure."""
    config = BaseAgentConfig(
        id="test_agent",
        name="Test Agent",
        role="TEST",
        company_id="company_123",
        model="broken-model",
        policies={
            "model_policy": {
                "default": "broken-model",
                "fallback": [
                    {"provider": "OPENAI", "model": "gpt-4o-mini"},
                    {"provider": "GOOGLE", "model": "gemini-2.5-flash"},
                ]
            }
        }
    )
    agent = BaseAgent(config)

    mock_client = MagicMock()

    # Side effect: primary fails, fallback 0 (gpt-4o-mini) succeeds
    async def build_client_side_effect(settings, *, model, **kwargs):
        if model == "broken-model":
            raise RuntimeError("Primary model API Key limit reached")
        return mock_client

    async def build_provider_side_effect(provider, *, model, **kwargs):
        if model == "broken-model":
            raise RuntimeError("Primary model API Key limit reached")
        return mock_client

    with patch("src.agents.base.build_agent_client_async", AsyncMock(side_effect=build_client_side_effect)), \
         patch("src.agents.base.build_provider_client_async", AsyncMock(side_effect=build_provider_side_effect)), \
         patch("src.agents.base.BaseAgent._resolve_tools", return_value=[]):
        client = await agent.ensure_client()
        assert client == mock_client
        assert agent._last_model_selection["model"] == "gpt-4o-mini"
        assert agent._last_model_selection["source"] == "fallback-0"
        assert agent._last_model_selection["original_model"] == "broken-model"
        # The active model is updated to the fallback model
        assert agent.model == "gpt-4o-mini"


@pytest.mark.asyncio
async def test_ensure_client_all_fail() -> None:
    """Test that ensure_client raises RuntimeError if primary and all fallbacks fail."""
    config = BaseAgentConfig(
        id="test_agent",
        name="Test Agent",
        role="TEST",
        company_id="company_123",
        model="broken-model",
        policies={
            "model_policy": {
                "default": "broken-model",
                "fallback": [
                    {"provider": "OPENAI", "model": "gpt-4o-mini"},
                ]
            }
        }
    )
    agent = BaseAgent(config)

    with patch("src.agents.base.build_agent_client_async", AsyncMock(side_effect=Exception("API Error"))), \
         patch("src.agents.base.BaseAgent._resolve_tools", return_value=[]):
        with pytest.raises(RuntimeError) as exc_info:
            await agent.ensure_client()
        assert "No LLM client available" in str(exc_info.value)
