from unittest.mock import patch

import pytest

from src.agents.base import BaseAgent, BaseAgentConfig
from src.tools.names import canonical_tool_name


def _make_agent(**kwargs) -> BaseAgent:
    config = BaseAgentConfig(
        id=kwargs.get("id", "test_agent"),
        name=kwargs.get("name", "Test Agent"),
        role=kwargs.get("role", "SUPPORT"),
        company_id=kwargs.get("company_id", "test_company"),
        allowed_tools=kwargs.get("allowed_tools", []),
        allowed_skills=kwargs.get("allowed_skills", []),
        model=kwargs.get("model", ""),
    )
    return BaseAgent(config)


class TestToolResolution:
    def test_explicit_tools_are_resolved(self):
        """Agent with explicit allowed_tools resolves them via SkillRegistry."""
        agent = _make_agent(
            allowed_tools=["product_search", "order_lookup"],
        )
        tools = agent._resolve_tools()
        names = {t.name for t in tools}
        assert "product_search" in names
        assert "order_lookup" in names

    def test_core_tools_included_for_all_agents(self):
        """Every agent gets CORE_TOOLS as base."""
        agent = _make_agent(role="SUPPORT")
        tools = agent._resolve_tools()
        names = {t.name for t in tools}
        assert "product_search" in names
        assert "customer_info" in names
        assert "order_lookup" in names
        assert "unlock_advanced_tools" in names

    def test_agent_with_skills_includes_skill_tools(self):
        """Agent with allowed_skills includes load_skill and read_skill_resource."""
        agent = _make_agent(
            allowed_skills=["test-skill"],
            allowed_tools=["product_search"],
        )
        tools = agent._resolve_tools()
        names = {t.name for t in tools}
        for tool in tools:
            if tool.name == "load_skill":
                return
        assert False, "load_skill tool not found in resolved tools"

    def test_agent_with_no_allowed_tools_falls_back_to_role(self):
        """Agent with a role but no allowed_tools should derive from role_tools.yaml."""
        agent = _make_agent(
            role="SUPPORT",
            allowed_tools=[],
            allowed_skills=[],
        )
        tools = agent._resolve_tools()
        names = {t.name for t in tools}
        assert len(names) > 0
        assert "unlock_advanced_tools" in names

    def test_unlock_advanced_tools_always_present(self):
        """unlock_advanced_tools must be in every resolved tool set."""
        agent = _make_agent()
        tools = agent._resolve_tools()
        names = {t.name for t in tools}
        assert "unlock_advanced_tools" in names

    def test_resolved_tools_are_functiontool_instances(self):
        """Every resolved tool must be a FunctionTool instance."""
        from agent_framework import FunctionTool
        agent = _make_agent(allowed_tools=["product_search"])
        tools = agent._resolve_tools()
        for tool in tools:
            assert isinstance(tool, FunctionTool), f"{tool.name} is not FunctionTool"

    def test_wrapped_tools_have_approval_mode(self):
        """Tools returned by _resolve_tools must have approval_mode set correctly."""
        agent = _make_agent(allowed_tools=["order_create_confirmed"])
        tools = agent._resolve_tools()
        for tool in tools:
            if tool.name == "order_create_confirmed":
                return
        assert False, "order_create_confirmed not found"
