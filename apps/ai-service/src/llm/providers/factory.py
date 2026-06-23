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
        "default_model": "deepseek-v4-flash",
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
        "default_model": "llama3.2",
        "provider_name": "OLLAMA",
        "priority": 5,
    },
    "OPENAI": {
        "class": "OpenAICompatProvider",
        "env_key": "OPENAI_API_KEY",
        "base_url": "https://api.openai.com/v1",
        "default_model": "gpt-4o-mini",
        "provider_name": "OPENAI",
        "priority": 6,
    },
    "ANTHROPIC": {
        "class": "OpenAICompatProvider",
        "env_key": "ANTHROPIC_API_KEY",
        "base_url": "https://api.anthropic.com/v1",
        "default_model": "claude-sonnet-4-20250514",
        "provider_name": "ANTHROPIC",
        "extra_headers": {"anthropic-version": "2023-06-01"},
        "priority": 7,
    },
    "HUGGINGFACE": {
        "class": "OpenAICompatProvider",
        "env_key": "HUGGINGFACE_API_KEY",
        "base_url": "https://api-inference.huggingface.co/v1",
        "default_model": "mistralai/Mistral-7B-Instruct-v0.3",
        "provider_name": "HUGGINGFACE",
        "priority": 8,
    },
    "CEREBRAS": {
        "class": "OpenAICompatProvider",
        "env_key": "CEREBRAS_API_KEY",
        "base_url": "https://api.cerebras.ai/v1",
        "default_model": "qwen-3-235b-a22b-instruct-2507",
        "provider_name": "CEREBRAS",
        "priority": 9,
    },
    "GITHUB": {
        "class": "OpenAICompatProvider",
        "env_key": "GITHUB_API_KEY",
        "base_url": "https://models.github.ai/inference",
        "default_model": "gpt-4o",
        "provider_name": "GITHUB",
        "priority": 10,
    },
    "SAMBANOVA": {
        "class": "OpenAICompatProvider",
        "env_key": "SAMBANOVA_API_KEY",
        "base_url": "https://api.sambanova.ai/v1",
        "default_model": "DeepSeek-V3.1",
        "provider_name": "SAMBANOVA",
        "priority": 11,
    },
    "MISTRAL": {
        "class": "OpenAICompatProvider",
        "env_key": "MISTRAL_API_KEY",
        "base_url": "https://api.mistral.ai/v1",
        "default_model": "mistral-large-latest",
        "provider_name": "MISTRAL",
        "priority": 12,
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
        *,
        key_id: str | None = None,
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
                key_id=key_id,
            )
        except ModelManagerError as e:
            import os
            if key_id:
                logger.error(
                    "selected key is unavailable",
                    error=e.message,
                    code=e.code,
                    provider=provider_type,
                    model=resolved_model,
                    key_id=key_id,
                )
                return None
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
            if key_id:
                logger.error(
                    "selected key lookup failed",
                    error=str(e),
                    provider=provider_type,
                    model=resolved_model,
                    key_id=key_id,
                )
                return None
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
        base_url = key_info.get("base_url") or pdef.get("base_url", "")
        selected_key_id = key_info["key_id"]

        cache_key = f"{provider_type}:{resolved_model}:{selected_key_id}"
        cached = self._instances.get(cache_key)
        if cached:
            return cached

        provider_config = {
            **pdef,
            "key_id": selected_key_id,
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
        if not model:
            return None
        try:
            key_info = await model_manager.get_next_key(model, company_id or "default")
            provider_type = key_info.provider if hasattr(key_info, "provider") else key_info["provider"]
            return await self.get_provider(provider_type, resolved_model, company_id)
        except ModelManagerError:
            return None

    def clear_cache(self) -> None:
        self._instances.clear()


def get_provider_factory() -> ProviderFactory:
    if ProviderFactory._instance is None:
        ProviderFactory._instance = ProviderFactory()
    return ProviderFactory._instance
