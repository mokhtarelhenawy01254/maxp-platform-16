from __future__ import annotations

from agent_framework import Agent
from agent_framework.anthropic import RawClaudeAgent  # type: ignore[attr-defined]

from src.agents.base import BaseAgent
from src.agents.middleware import build_maxp_function_middleware
from src.config import get_settings
from src.llm.agent_client_factory import build_agent_client
from src.tools.sdk_gateway import wrap_tools_for_gateway


async def create_order_agent(company_id: str | None = None) -> Agent | RawClaudeAgent:
    """Create order agent from template (single source of truth)."""
    settings = get_settings()

    # Single source: template
    base = await BaseAgent.from_template("order-agent", company_id or "")

    instructions = base._get_system_prompt()
    tools = wrap_tools_for_gateway(
        list(base._resolve_tools()),
        company_id=company_id,
        agent_role="ORDER",
        allowed_tools=list(base.allowed_tools),
    )

    if settings.default_llm_provider == "anthropic":
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
        middleware=build_maxp_function_middleware(company_id or "", "ORDER"),
        default_options={"model": base.model, "tools": tools},
    )
