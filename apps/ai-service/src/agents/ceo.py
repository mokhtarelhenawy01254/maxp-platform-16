from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from agent_framework import Agent

from src.config import get_settings
from src.prompts.template_registry import get_prompt_registry
from src.tools.manager_tools import get_manager_tools


def create_ceo_agent(
    specialized_agents_tools: Sequence[Any] | None = None,
    is_merchant: bool = False,
) -> Agent:
    """
    Create the CEO Orchestrator agent using the dynamic template registry.

    Loads system prompt from the template registry instead of hardcoded strings.
    Falls back to registry generic if no specific template is available.
    """
    settings = get_settings()

    # Build via template registry (SOTA 2026 — no more hardcoded Arabic instructions)
    registry = get_prompt_registry()
    role_key = "CEO_MERCHANT" if is_merchant else "CEO"
    hydrated = registry.build_prompt(
        role=role_key,
        variables={
            "company_name": "MaxP",
            "agent_name": "maxp_ceo_agent",
            "role": "CEO Orchestrator",
        },
    )
    instructions = hydrated.text

    all_tools = list(get_manager_tools())
    if specialized_agents_tools:
        all_tools.extend(specialized_agents_tools)

    return Agent(
        client=None,
        name="maxp_ceo_agent",
        instructions=instructions,
        tools=all_tools,
        default_options={"model": settings.default_model},
    )
