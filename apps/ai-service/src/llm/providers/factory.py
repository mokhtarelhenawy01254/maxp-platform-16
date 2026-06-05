from __future__ import annotations

import asyncio
import time
from typing import Any

import structlog

from src.config import get_settings
from src.llm.providers.base import BaseProvider, ProviderResponse
from src.llm.providers.google_provider import GoogleProvider
from src.llm.providers.openai_compat import OpenAICompatProvider
from src.llm.providers.ollama_provider import OllamaProvider

logger = structlog.get_logger(__name__)


class SimpleKeyRotator:
    _instance: SimpleKeyRotator | None = None

    def __init__(self) -> None:
        self._failures: dict[str, dict[str, Any]] = {}
        self._round_robin: dict[str, int] = {}

    def get_available_apis(self, apis: list[dict[str, Any]]) -> list[dict[str, Any]]:
        now = time.time()
        return [
            a for a in apis
            if self._is_available(a.get("id", a.get("key", "")), now)
        ]

    def get_next_api(self, apis: list[dict[str, Any]]) -> dict[str, Any] | None:
        available = self.get_available_apis(apis)
        if not available:
            return None
        provider_type = available[0].get("provider", "unknown")
        idx = self._round_robin.get(provider_type, 0)
        if idx >= len(available):
            idx = 0
        self._round_robin[provider_type] = idx + 1
        return available[idx]

    def mark_failed(self, api_key_id: str, reason: str, retry_after_ms: int = 30000) -> None:
        cooldown = 86400000 if reason in ("LEAKED", "403_INVALID", "PERMISSION_DENIED") else retry_after_ms
        self._failures[api_key_id] = {
            "until": time.time() + cooldown / 1000,
            "reason": reason,
        }

    def _is_available(self, api_key_id: str, now: float) -> bool:
        failure = self._failures.get(api_key_id)
        if failure is None:
            return True
        if now >= failure["until"]:
            del self._failures[api_key_id]
            return True
        return False


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
        self.rotator = SimpleKeyRotator()
        self._instances: dict[str, BaseProvider] = {}

    def _build_provider(
        self, provider_type: str, api_key: str, model: str, config: dict[str, Any]
    ) -> BaseProvider:
        cls_name = config.get("class", "OpenAICompatProvider")
        if cls_name == "GoogleProvider":
            return GoogleProvider(api_key, model, **config)
        if cls_name == "OllamaProvider":
            return OllamaProvider(model, base_url=config.get("base_url", ""), **config)
        return OpenAICompatProvider(
            api_key, model,
            base_url=config.get("base_url", ""),
            provider_name=config.get("provider_name", provider_type),
            extra_headers=config.get("extra_headers"),
            **config,
        )

    def get_provider(
        self, provider_type: str, model: str | None = None
    ) -> BaseProvider | None:
        pdef = PROVIDER_DEFS.get(provider_type)
        if not pdef:
            return None

        resolved_model = model or pdef["default_model"]
        cache_key = f"{provider_type}:{resolved_model}"

        cached = self._instances.get(cache_key)
        if cached:
            return cached

        api_key_name = pdef.get("env_key")
        api_key = ""
        if api_key_name:
            api_key = getattr(get_settings(), api_key_name.lower(), "") or ""

        provider = self._build_provider(provider_type, api_key, resolved_model, pdef)
        self._instances[cache_key] = provider
        return provider

    async def get_active_provider(self, model: str | None = None) -> BaseProvider | None:
        settings = get_settings()
        default_provider = (settings.default_llm_provider or "google").upper()

        for provider_type in sorted(PROVIDER_DEFS, key=lambda k: PROVIDER_DEFS[k].get("priority", 99)):
            pdef = PROVIDER_DEFS[provider_type]
            if pdef.get("env_key"):
                api_key = getattr(get_settings(), pdef["env_key"].lower(), "") or ""
                if not api_key:
                    continue

            provider = self.get_provider(provider_type)
            if provider:
                return provider

        return self.get_provider("GOOGLE")

    def clear_cache(self) -> None:
        self._instances.clear()


def get_provider_factory() -> ProviderFactory:
    if ProviderFactory._instance is None:
        ProviderFactory._instance = ProviderFactory()
    return ProviderFactory._instance
