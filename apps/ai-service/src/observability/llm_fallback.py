from __future__ import annotations

from typing import Any

import structlog

from src.config import get_settings
from src.services.prompt_cache_service import prompt_cache_service

logger = structlog.get_logger(__name__)


class LLMFallbackProvider:
    """Provides the routed Python LLM client used by orchestration/classifiers.

    The historical class name is kept for compatibility, but this no longer
    builds a separate direct SDK client path. It delegates to the same provider
    adapter/model-manager stack used by runtime agents so options like
    ``tools_enabled=False`` and HTTP proxy isolation behave consistently.
    """

    def __init__(self) -> None:
        self._settings = get_settings()
        self._log = logger

    async def get_client(
        self,
        company_id: str | None = None,
        system_prompt: str | None = None,
        model: str | None = None,
        provider: str | None = None,
    ) -> Any | None:
        settings = self._settings

        if system_prompt and company_id:
            cached = await prompt_cache_service.get_or_create_cached_prompt(
                company_id=company_id,
                prompt_type="system",
                instructions=system_prompt,
                ttl=settings.prompt_cache_ttl,
            )
            if cached.cached_content_name:
                self._log.info("prompt cache active", name=cached.cached_content_name)

        try:
            from src.llm.agent_client_factory import (
                build_agent_client_async,
                build_provider_client_async,
            )

            resolved_model = model or settings.google_gemini_model or settings.default_model
            if provider:
                client = await build_provider_client_async(
                    provider,
                    model=resolved_model,
                    system_prompt=system_prompt,
                    company_id=company_id,
                )
            else:
                client = await build_agent_client_async(
                    settings,
                    model=resolved_model,
                    system_prompt=system_prompt,
                    company_id=company_id,
                )
            self._log.info("using routed LLM client", provider=provider, model=resolved_model)
            return client
        except Exception as exc:
            self._log.error("routed LLM client unavailable", error=str(exc))
            return None
