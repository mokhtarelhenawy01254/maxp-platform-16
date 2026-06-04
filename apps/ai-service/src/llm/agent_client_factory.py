"""Provider-agnostic LLM client factory.

Resolves a chat-completion client for an agent based on the configured
``default_llm_provider`` and the model name. The Gemma 4 family is routed
through :class:`src.llm.gemma_client.GemmaClient` (native Gemini API with
Gemma chat-template injection) so we do not depend on the OpenAI-compat
shim translating tools correctly for Gemma.
"""

from __future__ import annotations

from typing import Any

import structlog

from src.llm.gemma_chat_template import is_gemma_model
from src.llm.gemma_client import build_gemma_client

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
        - Google Gemini                    -> ``OpenAIChatCompletionClient`` against
                                              the Google OpenAI-compat shim
        - OpenAI                           -> ``OpenAIChatCompletionClient``
        - Anthropic                        -> ``RawClaudeAgent`` is constructed
                                              by the caller; this factory still
                                              returns a usable OpenAI client
                                              only if a key is present.
    """
    resolved_model = model or settings.default_model

    if is_gemma_model(resolved_model):
        gemma = build_gemma_client(
            api_key=settings.google_api_key,
            model=resolved_model,
            tools=tools,
            system_prompt=system_prompt,
        )
        if gemma is not None:
            logger.info(
                "agent_client.routed",
                provider="gemma",
                model=resolved_model,
                n_tools=len(tools or []),
            )
            return gemma

    if settings.default_llm_provider == "google" or is_gemma_model(resolved_model):
        from agent_framework.openai import OpenAIChatCompletionClient

        api_key = settings.openai_api_key or settings.google_api_key or ""
        return OpenAIChatCompletionClient(
            api_key=api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            model=resolved_model,
        )

    if settings.default_llm_provider == "openai":
        from agent_framework.openai import OpenAIChatCompletionClient

        return OpenAIChatCompletionClient(
            api_key=settings.openai_api_key,
            model=resolved_model,
        )

    from agent_framework.openai import OpenAIChatCompletionClient

    return OpenAIChatCompletionClient(
        api_key=settings.openai_api_key or settings.google_api_key or "",
        model=resolved_model,
    )


__all__ = ["build_agent_client"]
