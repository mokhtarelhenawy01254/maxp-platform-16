from __future__ import annotations

from agent_framework import Agent
from agent_framework.anthropic import RawClaudeAgent  # type: ignore[attr-defined]

from src.config import get_settings
from src.llm.agent_client_factory import build_agent_client
from src.prompts.template_registry import get_prompt_registry
from src.tools.registry import get_read_tools, get_write_tools
from src.tools.sdk_gateway import wrap_tools_for_gateway


def _support_tools(company_id: str | None = None) -> list:
    tools = [*get_read_tools(), *get_write_tools()]
    return wrap_tools_for_gateway(
        tools,
        company_id=company_id,
        agent_role="SUPPORT",
        allowed_tools=[tool.name for tool in tools],
    )


def create_support_agent(company_id: str | None = None) -> Agent | RawClaudeAgent:
    """Create the support agent with read-only tools using the template registry."""
    settings = get_settings()

    # Build via template registry (SOTA 2026 — no more hardcoded Arabic instructions)
    registry = get_prompt_registry()
    hydrated = registry.build_prompt(
        role="SUPPORT",
        variables={
            "company_name": "MaxP",
            "agent_name": "maxp_support_agent",
            "role": "customer support agent",
        },
    )
    instructions = hydrated.text

    if settings.default_llm_provider == "anthropic":
        return RawClaudeAgent(
            name="maxp_support_agent",
            instructions=instructions,
            tools=_support_tools(company_id),
            default_options={"model": settings.default_model},
        )

    tools = _support_tools(company_id)
    model = settings.google_gemini_model if settings.default_llm_provider == "google" else settings.default_model
    client = build_agent_client(
        settings,
        model=model,
        tools=tools,
        system_prompt=instructions,
    )
    return Agent(
        client=client,
        name="maxp_support_agent",
        instructions=instructions,
        tools=tools,
        default_options={"model": model, "tools": tools},
    )
