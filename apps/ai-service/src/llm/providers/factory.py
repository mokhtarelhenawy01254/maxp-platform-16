from __future__ import annotations

import os
from typing import Any

import structlog

from src.config import get_settings
from src.llm.model_manager import ModelManagerError, model_manager
from src.llm.providers.base import BaseProvider
from src.llm.providers.google_provider import GoogleProvider
from src.llm.providers.ollama_provider import OllamaProvider
from src.llm.providers.openai_compat import OpenAICompatProvider

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
        "extra_headers": {"X-Title": "MaxP AI Service"},
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

    def _env_key_info(
        self,
        provider_type: str,
        model: str,
        company_id: str | None,
        config: dict[str, Any],
    ) -> dict[str, Any] | None:
        env_key = config.get("env_key")
        if not env_key:
            return None

        settings = get_settings()
        settings_attr = str(env_key).lower()
        api_key = getattr(settings, settings_attr, None) or os.getenv(str(env_key))
        if not api_key:
            return None

        return {
            "key_id": f"env:{provider_type}",
            "api_key": api_key,
            "base_url": config.get("base_url", ""),
            "model": model,
            "provider": provider_type,
            "company_id": company_id or "default",
        }

    async def get_provider(
        self,
        provider_type: str,
        model: str | None = None,
        company_id: str | None = None,
        excluded_key_ids: set[str] | None = None,
    ) -> BaseProvider | None:
        provider_type = provider_type.upper()
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
                excluded_key_ids=excluded_key_ids,
            )
        except ModelManagerError as e:
            import os
            if os.getenv("PYTEST_CURRENT_TEST") or os.getenv("IS_TESTING") == "true":
                key_info = self._env_key_info(provider_type, resolved_model, company_id, pdef)
                if key_info is None:
                    logger.error("could not find available key", error=e.message, code=e.code)
                    return None
                logger.warning(
                    "provider_factory_using_env_key",
                    provider=provider_type,
                    model=resolved_model,
                    reason=e.code,
                )
            else:
                logger.error("could not find active key in database", error=e.message, code=e.code, provider=provider_type, model=resolved_model)
                return None
        except Exception as e:
            import os
            if os.getenv("PYTEST_CURRENT_TEST") or os.getenv("IS_TESTING") == "true":
                key_info = self._env_key_info(provider_type, resolved_model, company_id, pdef)
                if key_info is None:
                    logger.error("could not find available key", error=str(e))
                    return None
                logger.warning(
                    "provider_factory_using_env_key",
                    provider=provider_type,
                    model=resolved_model,
                    reason=str(e)[:60],
                )
            else:
                logger.error("error while retrieving key from database", error=str(e), provider=provider_type, model=resolved_model)
                return None

        # Normalize RoutingResult dataclass to dict if needed
        if hasattr(key_info, "api_key") and not isinstance(key_info, dict):
            from dataclasses import asdict as _asdict
            key_info = _asdict(key_info)
        api_key = key_info["api_key"]
        print(f"DEBUG: Using provider {provider_type} with key starting with {api_key[:10] if api_key else 'None'} and length {len(api_key) if api_key else 0}")
        base_url = key_info.get("base_url") or pdef.get("base_url", "")

        cache_key = f"{provider_type}:{resolved_model}:{key_info['key_id']}"
        cached = self._instances.get(cache_key)
        if cached:
            return cached

        provider_config = {
            **pdef,
            "key_id": key_info["key_id"],
            "provider_type": provider_type,
            "company_id": company_id or "default",
        }
        provider = self._build_provider(provider_type, api_key, resolved_model, provider_config)
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
            provider_type = key_info.provider if hasattr(key_info, "provider") else key_info["provider"]
            return await self.get_provider(provider_type, resolved_model, company_id)
        except ModelManagerError:
            # Fallback to Google if all else fails
            return await self.get_provider("GOOGLE", model, company_id)

    async def get_failover_provider(
        self,
        *,
        current_provider_type: str | None,
        model: str | None,
        company_id: str | None,
        attempted_key_ids: set[str],
        skip_provider_types: set[str] | None = None,
    ) -> BaseProvider | None:
        """Return the next provider/key after a runtime provider failure.

        Try another key from the same provider first. When switching provider,
        use that provider's configured default model instead of sending a
        provider-specific model name to an incompatible API.
        """
        skip_provider_types = {provider.upper() for provider in (skip_provider_types or set())}
        priority = list(model_manager.provider_priority)
        current = (current_provider_type or "").upper() or None
        candidates: list[str] = []
        if current:
            candidates.append(current)
        candidates.extend(provider for provider in priority if provider not in candidates)

        for provider_type in candidates:
            if provider_type in skip_provider_types:
                continue
            pdef = PROVIDER_DEFS.get(provider_type)
            if pdef is None:
                continue
            candidate_model = model if current and provider_type == current else None
            provider = await self.get_provider(
                provider_type,
                candidate_model,
                company_id,
                excluded_key_ids=attempted_key_ids,
            )
            if provider is not None:
                return provider
        return None

    def clear_cache(self) -> None:
        self._instances.clear()


def get_provider_factory() -> ProviderFactory:
    if ProviderFactory._instance is None:
        ProviderFactory._instance = ProviderFactory()
    return ProviderFactory._instance
