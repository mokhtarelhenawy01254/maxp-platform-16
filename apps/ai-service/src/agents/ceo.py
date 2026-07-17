from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from agent_framework import Agent

from src.agents.base import BaseAgent
from src.agents.middleware import build_maxp_function_middleware


async def create_channel_agent(
    channel_agent: BaseAgent,
    specialized_agents_tools: Sequence[Any] | None = None,
    company_id: str = "",
    client: Any = None,
) -> Agent:
    """Create orchestrating agent from the channel-assigned agent's own config.

    Instead of the generic CEO template, uses the agent's persona, rules, tools,
    and model — so the configured agent IS the one responding, not a generic CEO.
    """
    instructions = channel_agent._get_system_prompt()
    tools = list(channel_agent._resolve_tools())

    if specialized_agents_tools:
        for tool in specialized_agents_tools:
            if tool not in tools:
                tools.append(tool)

    role = getattr(channel_agent, "role", "AGENT")
    default_opts = {"model": channel_agent.model}
    agent = Agent(
        client=client,
        name=channel_agent._agent_name(),
        instructions=instructions,
        tools=tools,
        middleware=build_maxp_function_middleware(company_id, role),
        default_options=default_opts,
    )
    return agent


async def create_ceo_agent(
    specialized_agents_tools: Sequence[Any] | None = None,
    is_merchant: bool = False,
    company_id: str = "",
    client: Any = None,
) -> Agent:
    """Create CEO agent from template (single source of truth) + runtime tool injection."""
    # Always use manager-ceo template for orchestration (full tool access + A2A injection)
    template_slug = "manager-ceo"
    base = await BaseAgent.from_template(
        template_slug,
        company_id,
    )

    instructions = base._get_system_prompt()
    tools = list(base._resolve_tools())

    if specialized_agents_tools:
        for tool in specialized_agents_tools:
            if tool not in tools:
                tools.append(tool)

    return Agent(
        client=client,
        name=base._agent_name(),
        instructions=instructions,
        tools=tools,
        middleware=build_maxp_function_middleware(company_id, "CEO"),
        default_options={"model": base.model},
    )
