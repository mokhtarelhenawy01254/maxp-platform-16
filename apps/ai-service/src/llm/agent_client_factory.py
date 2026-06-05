from __future__ import annotations

from typing import Any

import structlog

from src.config import get_settings
from src.llm.gemma_chat_template import is_gemma_model
from src.llm.gemma_client import build_gemma_client
from src.llm.providers.factory import get_provider_factory
from src.llm.providers.adapter import ProviderAdapter

logger = structlog.get_logger(__name__)


def build_agent_client(
    settings: Any,
    *,
    model: str | None = None,
    tools: list[Any] | None = None,
    system_prompt: str | None = None,
) -> Any:
    """Return a chat-completion client appropriate for ``model``.

    Routing rules:
        - Gemma 4 family (``gemma-4-*``)  -> ``GemmaClient`` (native Gemini API)
        - Model matched by provider system  -> ``ProviderAdapter`` wrapping the matched provider
        - Google Gemini                   -> ``OpenAIChatCompletionClient`` against the Google OpenAI-compat shim
        - OpenAI                          -> ``OpenAIChatCompletionClient``
        - Fallback                        -> ``ProviderAdapter`` with the best available provider
    """
    resolved_model = model or settings.default_model
    settings_obj = get_settings()

    if is_gemma_model(resolved_model):
        gemma = build_gemma_client(
            api_key=settings.google_api_key,
            model=resolved_model,
            tools=tools,
            system_prompt=system_prompt,
        )
        if gemma is not None:
            logger.info("agent_client.routed", provider="gemma", model=resolved_model)
            return gemma

    factory = get_provider_factory()

    if settings.default_llm_provider == "google":
        provider = factory.get_provider("GOOGLE", resolved_model)
        if provider:
            logger.info("agent_client.routed", provider="google", model=resolved_model)
            return ProviderAdapter(provider, tools=tools, system_prompt=system_prompt)

    if settings.default_llm_provider == "openai":
        provider = factory.get_provider("OPENAI", resolved_model)
        if provider:
            logger.info("agent_client.routed", provider="openai", model=resolved_model)
            return ProviderAdapter(provider, tools=tools, system_prompt=system_prompt)

    if settings.default_llm_provider == "groq":
        provider = factory.get_provider("GROQ", resolved_model)
        if provider:
            logger.info("agent_client.routed", provider="groq", model=resolved_model)
            return ProviderAdapter(provider, tools=tools, system_prompt=system_prompt)

    if settings.default_llm_provider == "openrouter":
        provider = factory.get_provider("OPENROUTER", resolved_model)
        if provider:
            logger.info("agent_client.routed", provider="openrouter", model=resolved_model)
            return ProviderAdapter(provider, tools=tools, system_prompt=system_prompt)

    if settings.default_llm_provider == "deepseek":
        provider = factory.get_provider("DEEPSEEK", resolved_model)
        if provider:
            logger.info("agent_client.routed", provider="deepseek", model=resolved_model)
            return ProviderAdapter(provider, tools=tools, system_prompt=system_prompt)

    active = factory.get_active_provider(resolved_model)
    if active:
        logger.info("agent_client.routed", provider=active.__class__.__name__, model=resolved_model)
        return ProviderAdapter(active, tools=tools, system_prompt=system_prompt)

    from agent_framework.openai import OpenAIChatCompletionClient
    logger.info("agent_client.routed", provider="openai-fallback", model=resolved_model)
    return OpenAIChatCompletionClient(
        api_key=settings.openai_api_key or settings.google_api_key or "",
        model=resolved_model,
    )


def build_provider_client(
    provider_type: str = "GOOGLE",
    *,
    model: str | None = None,
    tools: list[Any] | None = None,
    system_prompt: str | None = None,
) -> Any:
    """Build a client from a specific provider type, bypassing routing logic."""
    settings = get_settings()
    resolved_model = model or settings.default_model
    factory = get_provider_factory()
    provider = factory.get_provider(provider_type.upper(), resolved_model)
    if provider is None:
        raise ValueError(f"Provider '{provider_type}' is not configured")
    logger.info("agent_client.provider_client", provider=provider_type, model=resolved_model)
    return ProviderAdapter(provider, tools=tools, system_prompt=system_prompt)


__all__ = ["build_agent_client", "build_provider_client"]
