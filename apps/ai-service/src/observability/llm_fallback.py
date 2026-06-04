from __future__ import annotations

from typing import Any

import structlog

from src.config import get_settings
from src.services.prompt_cache_service import prompt_cache_service

logger = structlog.get_logger(__name__)


class LLMFallbackProvider:
    """Provides LLM client fallback if primary provider is rate-limited.

    Supports prompt caching via Google Gemini cachedContent API
    to reduce costs by 75-90% on repeated system prompts.
    """

    def __init__(self) -> None:
        self._settings = get_settings()
        self._log = logger

    async def get_client(
        self,
        company_id: str | None = None,
        system_prompt: str | None = None,
    ) -> Any | None:
        settings = self._settings

        if settings.anthropic_api_key:
            from agent_framework.anthropic import AnthropicClient

            self._log.info("using primary LLM", provider="anthropic", model=settings.default_model)
            client = AnthropicClient(
                api_key=settings.anthropic_api_key,
                model=settings.default_model,
            )
            if system_prompt and company_id:
                cached = await prompt_cache_service.get_or_create_cached_prompt(
                    company_id=company_id,
                    prompt_type="system",
                    instructions=system_prompt,
                    ttl=settings.prompt_cache_ttl,
                )
                if cached.cached_content_name:
                    self._log.info("prompt cache active", name=cached.cached_content_name)
            return client

        if settings.google_api_key:
            from agent_framework.openai import OpenAIChatCompletionClient

            model = settings.google_gemini_model
            self._log.info("using Google Gemini", provider="google", model=model)

            if system_prompt and company_id:
                cached = await prompt_cache_service.get_or_create_cached_prompt(
                    company_id=company_id,
                    prompt_type="system",
                    instructions=system_prompt,
                    ttl=settings.prompt_cache_ttl,
                )

            return OpenAIChatCompletionClient(
                api_key=settings.google_api_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                model=model,
            )

        if settings.openai_api_key:
            from agent_framework.openai import OpenAIChatCompletionClient

            self._log.info("falling back to OpenAI", model=settings.default_model)
            return OpenAIChatCompletionClient(
                api_key=settings.openai_api_key,
                model=settings.default_model,
            )

        self._log.error("no LLM provider configured")
        return None
