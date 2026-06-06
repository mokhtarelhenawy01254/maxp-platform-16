from __future__ import annotations

import asyncio
import time
from typing import Any
from dataclasses import dataclass

import structlog

from src.config import get_settings
from src.llm.providers.base import BaseProvider, ProviderResponse
from src.llm.providers.google_provider import GoogleProvider
from src.llm.providers.openai_compat import OpenAICompatProvider
from src.llm.providers.ollama_provider import OllamaProvider
from src.llm.model_manager import model_manager, ModelManagerError

logger = structlog.get_logger(__name__)

PROVIDER_DEFS: dict[str, dict[str, Any]] = {
    "GOOGLE": {
        "class": "GoogleProvider",
        "env_key": "GOOGLE_API_KEY",
        "default_model": "gemini-2.5-flash",
        "priority": 0,
    },
    "GROQ": {
        "class": "OpenAICompatProvider",
        "env_key": "GROQ_API_KEY",
        "base_url": "https://api.groq.com/openai/v1",
        "default_model": "llama-3.3-70b-versatile",
        "provider_name": "GROQ",
        "priority": 1,
    },
    "OPENROUTER": {
        "class": "OpenAICompatProvider",
        "env_key": "OPENROUTER_API_KEY",
        "base_url": "https://openrouter.ai/api/v1",
        "default_model": "openrouter/auto",
        "provider_name": "OPENROUTER",
        "extra_headers": {"HTTP-Referer": None, "X-Title": "MaxP AI Service"},
        "priority": 2,
    },
    "DEEPSEEK": {
        "class": "OpenAICompatProvider",
        "env_key": "DEEPSEEK_API_KEY",
        "base_url": "https://api.deepseek.com",
        "default_model": "deepseek-chat",
        "provider_name": "DEEPSEEK",
        "priority": 3,
    },
    "NVIDIA": {
        "class": "OpenAICompatProvider",
        "env_key": "NVIDIA_API_KEY",
        "base_url": "https://integrate.api.nvidia.com/v1",
        "default_model": "openai/gpt-oss-120b",
        "provider_name": "NVIDIA",
        "priority": 4,
    },
    "OLLAMA": {
        "class": "OllamaProvider",
        "env_key": None,
        "base_url": "https://ollama.maxp.online",
        "default_model": "llama3",
        "provider_name": "OLLAMA",
        "priority": 5,
    },
}


class ProviderFactory:
    _instance: ProviderFactory | None = None

    def __init__(self) -> None:
        self._instances: dict[str, BaseProvider] = {}

    def _build_provider(
        self, provider_type: str, api_key: str, model: str, config: dict[str, Any]
    ) -> BaseProvider:
        cls_name = config.get("class", "OpenAICompatProvider")
        if cls_name == "GoogleProvider":
            return GoogleProvider(api_key, model, **config)
        if cls_name == "OllamaProvider":
            return OllamaProvider(model, base_url=config.get("base_url", ""), **config)
        extra_config = {
            key: value
            for key, value in config.items()
            if key not in {"base_url", "provider_name", "extra_headers"}
        }
        return OpenAICompatProvider(
            api_key, model,
            base_url=config.get("base_url", ""),
            provider_name=config.get("provider_name", provider_type),
            extra_headers=config.get("extra_headers"),
            **extra_config,
        )

    async def get_provider(
        self, provider_type: str, model: str | None = None, company_id: str | None = None
    ) -> BaseProvider | None:
        pdef = PROVIDER_DEFS.get(provider_type)
        if not pdef:
            return None

        resolved_model = model or pdef["default_model"]
        
        # Use ModelManager to get the best key for this model and company
        try:
            key_info = await model_manager.get_next_key(
                resolved_model,
                company_id or "default",
                preferred_provider=provider_type,
            )
            api_key = key_info["api_key"]
            base_url = key_info.get("base_url") or pdef.get("base_url", "")
        except ModelManagerError as e:
            logger.error("could not find available key", error=e.message, code=e.code)
            return None

        cache_key = f"{provider_type}:{resolved_model}:{key_info['key_id']}"
        cached = self._instances.get(cache_key)
        if cached:
            return cached

        provider = self._build_provider(provider_type, api_key, resolved_model, pdef)
        # Override base_url if provided by key_info
        if base_url:
            provider.config["base_url"] = base_url
            if hasattr(provider, "base_url"):
                provider.base_url = base_url
            
        self._instances[cache_key] = provider
        return provider

    async def get_active_provider(self, model: str | None = None, company_id: str | None = None) -> BaseProvider | None:
        settings = get_settings()
        
        # The model_manager now handles priority-based failover internally in get_next_key
        # but we need a provider_type to call get_provider.
        # We'll let model_manager decide the provider.
        
        # We can modify model_manager.get_next_key to return the provider_type too.
        # For now, let's assume the manager returns the best key and its provider.
        
        try:
            resolved_model = model or settings.default_model
            key_info = await model_manager.get_next_key(resolved_model, company_id or "default")
            provider_type = key_info["provider"]
            
            return await self.get_provider(provider_type, resolved_model, company_id)
        except ModelManagerError:
            # Fallback to Google if all else fails
            return await self.get_provider("GOOGLE", model, company_id)

    def clear_cache(self) -> None:
        self._instances.clear()


def get_provider_factory() -> ProviderFactory:
    if ProviderFactory._instance is None:
        ProviderFactory._instance = ProviderFactory()
    return ProviderFactory._instance
