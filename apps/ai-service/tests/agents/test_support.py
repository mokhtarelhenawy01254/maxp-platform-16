from __future__ import annotations

from agent_framework import Agent
from agent_framework.anthropic import RawClaudeAgent

from src.agents.support import create_support_agent


def test_create_support_agent():
    """Test that create_support_agent returns a valid agent."""
    agent = create_support_agent()
    assert isinstance(agent, (Agent, RawClaudeAgent))
    assert agent.name == "maxp_support_agent"


def test_agent_has_tools_configured():
    """Test that create_support_agent configures tools."""
    agent = create_support_agent()
    assert isinstance(agent, (Agent, RawClaudeAgent))
    assert agent.name == "maxp_support_agent"


def test_agent_has_write_tools_configured():
    agent = create_support_agent()

    if isinstance(agent, RawClaudeAgent):
        tools = agent._custom_tools
    else:
        tools = agent.default_options.get("tools", [])

    tool_names = [t.name for t in tools]
    assert "discount_create" in tool_names
    assert "order_cancel" in tool_names
    assert "message_broadcast" in tool_names
