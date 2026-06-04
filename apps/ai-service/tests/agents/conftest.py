from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest


@pytest.fixture
def mock_agent_run():
    """Fixture that mocks an agent's run() to return a simple response."""

    async def _make_mock_agent(response_text: str = "Test reply"):
        agent = MagicMock()
        agent.name = "maxp_support_agent"
        agent.instructions = "Test instructions"

        response = MagicMock()
        response.__str__ = MagicMock(return_value=response_text)
        agent.run = AsyncMock(return_value=response)
        agent.create_session = AsyncMock()
        return agent

    return _make_mock_agent


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test")
    monkeypatch.setenv("MAXP_API_URL", "https://test.maxp.com")
    monkeypatch.setenv("MAXP_SERVICE_TOKEN", "test-token")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
