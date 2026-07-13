from __future__ import annotations

from agent_framework import Agent
from agent_framework.anthropic import RawClaudeAgent  # type: ignore[attr-defined]

from src.agents.base import BaseAgent
from src.agents.middleware import build_maxp_function_middleware
from src.config import get_settings
from src.llm.agent_client_factory import build_agent_client
from src.tools.sdk_gateway import wrap_tools_for_gateway


async def create_support_agent(company_id: str | None = None) -> Agent | RawClaudeAgent:
    """Create support agent from template (single source of truth)."""
    settings = get_settings()
    base = await BaseAgent.from_template("support-agent", company_id or "")

    instructions = base._get_system_prompt()
    tools = wrap_tools_for_gateway(
        list(base._resolve_tools()),
        company_id=company_id,
        agent_role="SUPPORT",
        allowed_tools=list(base.allowed_tools),
    )

    if base.model.startswith("claude"):
        return RawClaudeAgent(
            name=base._agent_name(),
            instructions=instructions,
            tools=tools,
            default_options={"model": base.model},
        )

    client = build_agent_client(
        settings,
        model=base.model,
        tools=tools,
        system_prompt=instructions,
    )
    return Agent(
        client=client,
        name=base._agent_name(),
        instructions=instructions,
        tools=tools,
        middleware=build_maxp_function_middleware(company_id or "", "SUPPORT"),
        default_options={"model": base.model, "tools": tools},
    )
