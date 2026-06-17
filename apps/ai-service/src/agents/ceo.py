from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from agent_framework import Agent

from src.agents.middleware import build_maxp_function_middleware
from src.config import get_settings
from src.prompts.template_registry import get_prompt_registry
from src.tools.manager_tools import get_manager_tools
from src.tools.registry import get_read_tools, get_write_tools


def create_ceo_agent(
    specialized_agents_tools: Sequence[Any] | None = None,
    is_merchant: bool = False,
    company_id: str = "",
    client: Any = None,
) -> Agent:
    settings = get_settings()

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

    # CEO agent needs all functional tools so the pipeline's intent classifier
    # can route to product_search, order_lookup, etc. directly, instead of only
    # having delegation tools that the classifier doesn't know how to route to.
    all_tools = list(get_manager_tools()) + get_read_tools() + get_write_tools()
    if specialized_agents_tools:
        all_tools.extend(specialized_agents_tools)

    return Agent(
        client=client,
        name="maxp_ceo_agent",
        instructions=instructions,
        tools=all_tools,
        middleware=build_maxp_function_middleware(company_id, "CEO"),
        default_options={"model": settings.default_model},
    )
