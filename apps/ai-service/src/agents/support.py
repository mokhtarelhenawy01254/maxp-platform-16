from __future__ import annotations

from agent_framework import Agent
from agent_framework.anthropic import RawClaudeAgent  # type: ignore[attr-defined]
from agent_framework.openai import OpenAIChatCompletionClient

from src.config import get_settings
from src.prompts.template_registry import get_prompt_registry
from src.tools.registry import get_all_tools


def create_support_agent() -> Agent | RawClaudeAgent:
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
            tools=get_all_tools(),
            default_options={"model": settings.default_model},
        )

    if settings.default_llm_provider == "google":
        client = OpenAIChatCompletionClient(
            api_key=settings.google_api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            model=settings.google_gemini_model,
        )
        return Agent(
            client=client,
            name="maxp_support_agent",
            instructions=instructions,
            tools=get_all_tools(),
            default_options={"model": settings.google_gemini_model},
        )

    if settings.default_llm_provider == "openai":
        client = OpenAIChatCompletionClient(
            api_key=settings.openai_api_key,
            model=settings.default_model,
        )
        return Agent(
            client=client,
            name="maxp_support_agent",
            instructions=instructions,
            tools=get_all_tools(),
            default_options={"model": settings.default_model},
        )

    raise ValueError(f"Unsupported LLM provider: {settings.default_llm_provider}")
