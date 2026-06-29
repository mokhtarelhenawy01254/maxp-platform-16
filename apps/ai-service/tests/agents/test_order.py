from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from agent_framework import Agent
from agent_framework.anthropic import RawClaudeAgent

from src.agents.order import create_order_agent


def _mock_base_agent():
    """Create a mock BaseAgent with required attributes for order agent creation."""
    mock = MagicMock()
    mock.model = "gemini-2.5-flash"
    mock._agent_name.return_value = "maxp_order_agent"
    mock._get_system_prompt.return_value = "You are an order agent."
    mock._resolve_tools.return_value = []
    mock.allowed_tools = ["order_lookup", "order_cancel"]
    return mock


@pytest.mark.asyncio
async def test_create_order_agent():
    with patch("src.agents.order.BaseAgent.from_template", new_callable=AsyncMock, return_value=_mock_base_agent()), \
         patch("src.agents.order.build_agent_client") as mock_client:
        mock_client.return_value = MagicMock()
        agent = await create_order_agent()

        assert isinstance(agent, (Agent, RawClaudeAgent))
        assert agent.name == "maxp_order_agent"


@pytest.mark.asyncio
async def test_order_agent_uses_order_scoped_tools():
    mock_base = _mock_base_agent()
    # Simulate tools that wrap_tools_for_gateway would return
    mock_tool_lookup = MagicMock()
    mock_tool_lookup.name = "order_lookup"
    mock_tool_cancel = MagicMock()
    mock_tool_cancel.name = "order_cancel"

    with patch("src.agents.order.BaseAgent.from_template", new_callable=AsyncMock, return_value=mock_base), \
         patch("src.agents.order.wrap_tools_for_gateway", return_value=[mock_tool_lookup, mock_tool_cancel]), \
         patch("src.agents.order.build_agent_client") as mock_client:
        mock_client.return_value = MagicMock()
        agent = await create_order_agent()

        if isinstance(agent, RawClaudeAgent):
            tools = agent._custom_tools
        else:
            tools = agent.default_options.get("tools", [])

        tool_names = [tool.name for tool in tools]
        assert "order_lookup" in tool_names
        assert "order_cancel" in tool_names
        assert "product_create" not in tool_names
