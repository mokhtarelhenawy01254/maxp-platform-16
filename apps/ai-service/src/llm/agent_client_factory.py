from __future__ import annotations

from typing import Any

import structlog

from src.config import get_settings
from src.llm.gemma_chat_template import is_gemma_model
from src.llm.gemma_client import build_gemma_client
from src.llm.providers.adapter import ProviderAdapter
from src.llm.providers.factory import get_provider_factory
from src.llm.providers.google_provider import GoogleProvider
from src.llm.providers.openai_compat import OpenAICompatProvider

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
    if not model:
        raise ValueError("model is required for LLM client creation")
    resolved_model = model
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

    # Sync path — simple heuristic routing since DB is unreachable synchronously.
    # Production agents should use the async path (ensure_client).
    if "gemini" in resolved_model:
        logger.info("agent_client.routed.sync", provider="google", model=resolved_model)
        return ProviderAdapter(
            GoogleProvider(settings.google_api_key, resolved_model),
            tools=tools,
            system_prompt=system_prompt,
        )

    raise ValueError(f"cannot resolve model '{resolved_model}' synchronously; use async build_agent_client_async instead")


def build_provider_client(
    provider_type: str = "GOOGLE",
    *,
    model: str | None = None,
    tools: list[Any] | None = None,
    system_prompt: str | None = None,
) -> Any:
    """Build a client from a specific provider type, bypassing routing logic."""
    settings = get_settings()
    if not model:
        raise ValueError("model is required for LLM client creation")
    resolved_model = model
    if is_gemma_model(resolved_model):
        gemma = build_gemma_client(
            api_key=settings.google_api_key,
            model=resolved_model,
            tools=tools,
            system_prompt=system_prompt,
        )
        if gemma is not None:
            logger.info("agent_client.provider_client", provider="gemma", model=resolved_model)
            return gemma

    raise RuntimeError("build_provider_client requires async provider resolution; use build_provider_client_async")


async def build_agent_client_async(
    settings: Any,
    *,
    model: str | None = None,
    tools: list[Any] | None = None,
    system_prompt: str | None = None,
    company_id: str | None = None,
) -> Any:
    if not model:
        raise ValueError("model is required for LLM client creation")
    resolved_model = model
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

    provider = await factory.get_active_provider(resolved_model, company_id)
    if provider is None:
        logger.error("No active provider found in database for model", model=resolved_model)
        return None

    logger.info("agent_client.routed", provider=provider.__class__.__name__, model=resolved_model)
    return ProviderAdapter(provider, tools=tools, system_prompt=system_prompt)


async def build_provider_client_async(
    provider_type: str = "GOOGLE",
    *,
    model: str | None = None,
    tools: list[Any] | None = None,
    system_prompt: str | None = None,
    company_id: str | None = None,
    key_id: str | None = None,
) -> Any:
    if not model:
        raise ValueError("model is required for LLM client creation")
    resolved_model = model
    factory = get_provider_factory()
    provider = await factory.get_provider(
        provider_type.upper(),
        resolved_model,
        company_id,
        key_id=key_id,
    )
    if provider is None:
        raise ValueError(f"Provider '{provider_type}' is not configured")
    logger.info("agent_client.provider_client", provider=provider_type, model=resolved_model)
    return ProviderAdapter(
        provider,
        tools=tools,
        system_prompt=system_prompt,
        key_id=key_id,
    )


__all__ = [
    "build_agent_client",
    "build_agent_client_async",
    "build_provider_client",
    "build_provider_client_async",
]
