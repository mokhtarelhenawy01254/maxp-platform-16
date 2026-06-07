from __future__ import annotations

from agent_framework import Agent
from agent_framework.anthropic import RawClaudeAgent  # type: ignore[attr-defined]

from src.config import get_settings
from src.llm.agent_client_factory import build_agent_client
from src.prompts.template_registry import get_prompt_registry
from src.tools.registry import get_tools_for_role
from src.tools.sdk_gateway import wrap_tools_for_gateway


def create_order_agent(company_id: str | None = None) -> Agent | RawClaudeAgent:
    """Create the Order specialized agent using the template registry."""
    settings = get_settings()
    registry = get_prompt_registry()
    hydrated = registry.build_prompt(
        role="ORDER",
        variables={
            "company_name": "MaxP",
            "agent_name": "maxp_order_agent",
            "role": "order management agent",
        },
    )
    instructions = hydrated.text
    raw_tools = get_tools_for_role("ORDER")
    tools = wrap_tools_for_gateway(
        raw_tools,
        company_id=company_id,
        agent_role="ORDER",
        allowed_tools=[tool.name for tool in raw_tools],
    )

    if settings.default_llm_provider == "anthropic":
        return RawClaudeAgent(
            name="maxp_order_agent",
            instructions=instructions,
            tools=tools,
            default_options={"model": settings.default_model},
        )

    client = build_agent_client(
        settings,
        model=settings.default_model,
        tools=tools,
        system_prompt=instructions,
    )
    return Agent(
        client=client,
        name="maxp_order_agent",
        instructions=instructions,
        tools=tools,
        default_options={"model": settings.default_model, "tools": tools},
    )
