from __future__ import annotations

from agent_framework import Agent
from agent_framework.anthropic import RawClaudeAgent

from src.agents.order import create_order_agent


def test_create_order_agent():
    agent = create_order_agent()

    assert isinstance(agent, (Agent, RawClaudeAgent))
    assert agent.name == "maxp_order_agent"


def test_order_agent_uses_order_scoped_tools():
    agent = create_order_agent()

    if isinstance(agent, RawClaudeAgent):
        tools = agent._custom_tools
    else:
        tools = agent.default_options.get("tools", [])

    tool_names = [tool.name for tool in tools]
    assert "order_lookup" in tool_names
    assert "order_cancel" in tool_names
    assert "product_create" not in tool_names
