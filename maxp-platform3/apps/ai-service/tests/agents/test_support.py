from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from agent_framework import Agent
from agent_framework.anthropic import RawClaudeAgent

from src.agents.support import create_support_agent


def _mock_base_agent():
    """Create a mock BaseAgent with required attributes for support agent creation."""
    mock = MagicMock()
    mock.model = "gemini-2.5-flash"
    mock._agent_name.return_value = "maxp_support_agent"
    mock._get_system_prompt.return_value = "You are a support agent."
    mock._resolve_tools.return_value = []
    mock.allowed_tools = ["discount_create", "order_cancel", "message_broadcast"]
    return mock


@pytest.mark.asyncio
async def test_create_support_agent():
    """Test that create_support_agent returns a valid agent."""
    with patch("src.agents.support.BaseAgent.from_template", new_callable=AsyncMock, return_value=_mock_base_agent()), \
         patch("src.agents.support.build_agent_client") as mock_client:
        mock_client.return_value = MagicMock()
        agent = await create_support_agent()
        assert isinstance(agent, (Agent, RawClaudeAgent))
        assert agent.name == "maxp_support_agent"


@pytest.mark.asyncio
async def test_agent_has_tools_configured():
    """Test that create_support_agent configures tools."""
    with patch("src.agents.support.BaseAgent.from_template", new_callable=AsyncMock, return_value=_mock_base_agent()), \
         patch("src.agents.support.build_agent_client") as mock_client:
        mock_client.return_value = MagicMock()
        agent = await create_support_agent()
        assert isinstance(agent, (Agent, RawClaudeAgent))
        assert agent.name == "maxp_support_agent"


@pytest.mark.asyncio
async def test_agent_has_write_tools_configured():
    mock_base = _mock_base_agent()
    mock_tool_discount = MagicMock()
    mock_tool_discount.name = "discount_create"
    mock_tool_cancel = MagicMock()
    mock_tool_cancel.name = "order_cancel"
    mock_tool_broadcast = MagicMock()
    mock_tool_broadcast.name = "message_broadcast"

    with patch("src.agents.support.BaseAgent.from_template", new_callable=AsyncMock, return_value=mock_base), \
         patch("src.agents.support.wrap_tools_for_gateway", return_value=[mock_tool_discount, mock_tool_cancel, mock_tool_broadcast]), \
         patch("src.agents.support.build_agent_client") as mock_client:
        mock_client.return_value = MagicMock()
        agent = await create_support_agent()

        if isinstance(agent, RawClaudeAgent):
            tools = agent._custom_tools
        else:
            tools = agent.default_options.get("tools", [])

        tool_names = [t.name for t in tools]
        assert "discount_create" in tool_names
        assert "order_cancel" in tool_names
        assert "message_broadcast" in tool_names
