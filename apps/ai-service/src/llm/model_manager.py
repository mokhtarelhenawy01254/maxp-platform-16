from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, ClassVar

import structlog
from sqlalchemy import String, cast, select, update

from src.config import get_settings
from src.db import session
from src.db.models.provider import AiKey, AiModelConfig, GlobalAiConfig
from src.services.redis_client import redis_client

logger = structlog.get_logger(__name__)

SUPPORTED_PROVIDER_ORDER = [
    "GOOGLE", "GROQ", "OPENROUTER", "NVIDIA", "DEEPSEEK",
    "OPENAI", "ANTHROPIC", "HUGGINGFACE", "OLLAMA",
    "CEREBRAS", "GITHUB", "SAMBANOVA", "MISTRAL"
]
DEFAULT_PROVIDER_PRIORITY = ["GOOGLE", "GROQ", "OPENROUTER", "DEEPSEEK"]

RETIRED_GEMINI_MODEL_NAMES = {
    "gemini-1.0-pro", "gemini-pro", "gemini-flash",
    "gemini-1.0-pro-001", "gemini-1.0-pro-latest",
    "gemini-1.0-pro-vision-latest", "gemini-pro-vision",
}
UNSTABLE_GEMINI_MODEL_ALIAS_NAMES = {
    "gemini-2.0-flash-exp", "gemini-2.5-flash-live",
    "gemini-2.0-flash-live", "gemini-2.5-flash-native-audio-dialog",
    "gemini-2.5-flash-tts",
}


def is_production_unsafe_model_name(model_name: str) -> bool:
    name = model_name.lower()
    return (
        name in RETIRED_GEMINI_MODEL_NAMES
        or name in UNSTABLE_GEMINI_MODEL_ALIAS_NAMES
        or name.startswith("gemma-3-")
    )


class ModelManagerError(Exception):
    def __init__(self, code: str, message: str, retry_after: float | None = None):
        self.code = code
        self.message = message
        self.retry_after = retry_after
        super().__init__(self.message)


@dataclass
class ModelLimit:
    model_name: str
    rpm: int = 10
    rph: int = 600
    rpd: int = 250
    tpm: int = 250_000
    max_tokens: int = 200_000


@dataclass
class RoutingResult:
    key_id: str
    api_key: str
    model: str
    provider: str
    base_url: str | None = None
    key_name: str | None = None


class ModelManager:
    """
    Simplified AI Model Manager. Selects the first active CENTRAL key with a
    matching enabled model. No round-robin, no cooldown, no circuit breaker.
    """

    _model_limits_cache: ClassVar[dict[str, ModelLimit]] = {}
    _limits_last_loaded: float = 0
    LIMITS_TTL_SECONDS = 5 * 60

    _global_config_cache: ClassVar[dict | None] = None
    _global_config_last_loaded: float = 0
    GLOBAL_CONFIG_TTL_MS = 30_000

    _config_version: int = 0
    _config_version_last_checked: float = 0
    CONFIG_VERSION_CHECK_INTERVAL_MS = 5_000

    def __init__(self) -> None:
        self.settings = get_settings()
        self.provider_priority = list(DEFAULT_PROVIDER_PRIORITY)

        self._metrics = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "average_response_time": 0.0,
        }
        self._key_usage_counts: dict[str, int] = {}
        self._model_usage_counts: dict[str, int] = {}
        self._error_counts: dict[str, int] = {}
        self._metrics_last_reset = time.time()

        self._usage_buffer: dict[str, dict[str, int]] = {}
        self._usage_buffer_lock = asyncio.Lock()

    def _clear_all_caches(self) -> None:
        self._model_limits_cache.clear()
        self._global_config_cache = None
        logger.info("all_caches_cleared")

    # -------------------------------------------------------------------------
    # Model limits (loaded from DB, cached in-memory)
    # -------------------------------------------------------------------------

    async def load_model_limits(self, force: bool = False) -> None:
        now = time.time()
        if (
            not force
            and self._model_limits_cache
            and (now - self._limits_last_loaded) < self.LIMITS_TTL_SECONDS
        ):
            return

        async with session.async_session() as db:
            try:
                from sqlalchemy import text
                limits_result = await db.execute(
                    text("SELECT model_name, rpm, rph, rpd, tpm, max_tokens FROM ai.ai_model_limits WHERE is_deprecated = false")
                )
                limits = limits_result.fetchall()
            except Exception:
                limits = []

        new_cache: dict[str, ModelLimit] = {}
        for row in limits:
            new_cache[row.model_name] = ModelLimit(
                model_name=row.model_name,
                rpm=row.rpm or 10,
                rph=row.rph or 600,
                rpd=row.rpd or 250,
                tpm=row.tpm or 250_000,
                max_tokens=row.max_tokens or 200_000,
            )

        self._model_limits_cache = new_cache
        self._limits_last_loaded = now
        logger.info("model_limits_loaded", count=len(new_cache))

    def get_model_defaults(self, model_name: str) -> ModelLimit:
        return self._model_limits_cache.get(
            model_name,
            ModelLimit(model_name=model_name),
        )

    # -------------------------------------------------------------------------
    # Global config cache with multi-process sync
    # -------------------------------------------------------------------------

    async def check_config_version(self) -> None:
        now = time.time()
        if (now - self._config_version_last_checked) < self.CONFIG_VERSION_CHECK_INTERVAL_MS:
            return

        if session.async_session is None:
            self._config_version_last_checked = now
            return

        try:
            async with session.async_session() as db_session:
                result = await db_session.execute(
                    select(GlobalAiConfig).where(GlobalAiConfig.id.isnot(None))
                )
                config = result.scalar_one_or_none()
                if config and config.updated_at:
                    current_version = int(config.updated_at.timestamp() * 1000)
                    if self._config_version > 0 and current_version > self._config_version:
                        self._clear_all_caches()
                    self._config_version = current_version
        except Exception as e:
            logger.warning("config_version_check_failed", error=str(e))

        self._config_version_last_checked = now

    async def get_global_ui_config(self) -> dict | None:
        now = time.time()
        if (
            self._global_config_cache is not None
            and (now - self._global_config_last_loaded) < self.GLOBAL_CONFIG_TTL_MS
        ):
            return self._global_config_cache

        if session.async_session is None:
            return None

        try:
            async with session.async_session() as db_session:
                result = await db_session.execute(select(GlobalAiConfig))
                config = result.scalar_one_or_none()
                if config:
                    raw_settings = config.settings or {}
                    if isinstance(raw_settings, str):
                        import json as _json
                        try:
                            raw_settings = _json.loads(raw_settings)
                        except Exception:
                            raw_settings = {}
                    priority_from_col = config.provider_priority or []
                    priority_from_settings = raw_settings.get("providerPriority") or []
                    cfg_dict = {
                        "id": str(config.id),
                        "default_provider": config.default_provider,
                        "enable_failover": config.enable_failover,
                        "provider_priority": priority_from_col or priority_from_settings,
                        "settings": raw_settings,
                    }
                    self._global_config_cache = cfg_dict
                    self._global_config_last_loaded = now
                    return cfg_dict
        except Exception as e:
            logger.error("get_global_config_failed", error=str(e))

        return None

    def resolve_provider_priority(
        self,
        global_config: dict | None,
        preferred_provider: str | None = None,
    ) -> list[str]:
        raw = (global_config or {}).get("provider_priority")
        ordered = []
        seen = set()

        def push(p: str) -> None:
            if p not in seen and p in SUPPORTED_PROVIDER_ORDER:
                ordered.append(p)
                seen.add(p)

        if preferred_provider:
            push(preferred_provider.upper())

        if isinstance(raw, list):
            for p in raw:
                push(str(p).strip().upper())

        for p in DEFAULT_PROVIDER_PRIORITY:
            push(p)

        for p in SUPPORTED_PROVIDER_ORDER:
            push(p)

        if not ordered:
            ordered = list(DEFAULT_PROVIDER_PRIORITY)

        return ordered

    # -------------------------------------------------------------------------
    # Health check / live key testing
    # -------------------------------------------------------------------------

    async def test_ai_key(
        self,
        key_id: str,
        timeout_ms: int = 20_000,
    ) -> dict[str, Any]:
        started_at = time.time()
        tested_at = datetime.now(UTC).isoformat()

        try:
            async with session.async_session() as db_session:
                result = await db_session.execute(
                    select(AiKey).where(AiKey.id == key_id)
                )
                key_record = result.scalar_one_or_none()
        except Exception as e:
            return self._key_test_result(
                key_id=key_id,
                started_at=started_at,
                tested_at=tested_at,
                ok=False,
                error=f"DB lookup failed: {e}",
            )

        if not key_record:
            return self._key_test_result(
                key_id=key_id,
                started_at=started_at,
                tested_at=tested_at,
                ok=False,
                error="Key not found",
            )

        if not key_record.is_active:
            return self._key_test_result(
                key_id=key_id,
                started_at=started_at,
                tested_at=tested_at,
                ok=False,
                error="Key is inactive",
                provider=key_record.provider,
            )

        try:
            async with session.async_session() as db_session:
                model_result = await db_session.execute(
                    select(AiModelConfig)
                    .where(AiModelConfig.key_id == key_id, AiModelConfig.is_enabled == True)  # noqa: E712
                    .order_by(AiModelConfig.priority)
                    .limit(1)
                )
                model_record = model_result.scalar_one_or_none()
        except Exception:
            model_record = None

        provider = key_record.provider.upper()
        model = (
            model_record.model_name
            if model_record
            else self._default_model_for_provider(provider)
        )

        try:
            from src.llm.client import OPENAI_COMPAT_PROVIDERS, LLMClient

            base_url = None if provider == "GOOGLE" else OPENAI_COMPAT_PROVIDERS.get(provider)
            client = LLMClient(
                provider=provider,
                model=model,
                api_key=key_record.api_key,
                base_url=key_record.base_url or base_url,
                company_id=key_record.company_id or "default",
                key_id=key_id,
            )

            response = await asyncio.wait_for(
                client.generate(
                    [{"role": "user", "content": "Reply with exactly: KEY_OK"}],
                    max_tokens=50,
                ),
                timeout=timeout_ms / 1000,
            )
            content = self._extract_provider_text(response)
            ok = bool(content and "KEY_OK" in content.upper())

            return self._key_test_result(
                key_id=key_id,
                started_at=started_at,
                tested_at=tested_at,
                ok=ok,
                error=None if ok else "Empty response",
                provider=provider,
                model=model,
                latency_ms=int((time.time() - started_at) * 1000),
            )
        except TimeoutError:
            return self._key_test_result(
                key_id=key_id,
                started_at=started_at,
                tested_at=tested_at,
                ok=False,
                error=f"Timeout after {timeout_ms}ms",
                provider=provider,
                model=model,
            )
        except Exception as e:
            return self._key_test_result(
                key_id=key_id,
                started_at=started_at,
                tested_at=tested_at,
                ok=False,
                error=self._sanitize_error(str(e)),
                provider=provider,
                model=model,
            )

    def _key_test_result(
        self,
        *,
        key_id: str,
        started_at: float,
        tested_at: str,
        ok: bool,
        error: str | None,
        provider: str = "UNKNOWN",
        model: str = "unknown",
        latency_ms: int = 0,
    ) -> dict[str, Any]:
        return {
            "ok": ok,
            "status": "success" if ok else "failed",
            "key_id": key_id,
            "provider": provider,
            "model": model,
            "tested_at": tested_at,
            "latency_ms": latency_ms or int((time.time() - started_at) * 1000),
            "error": error,
        }

    def _extract_provider_text(self, result: Any) -> str:
        if hasattr(result, "text"):
            if callable(result.text):
                return result.text()
            if isinstance(result.text, str):
                return result.text
        if isinstance(result, str):
            return result
        if isinstance(result, dict):
            return result.get("text", "") or result.get("content", "")
        return ""

    def _sanitize_error(self, error: str) -> str:
        import re
        return re.sub(
            r"(apiKey\s*[:=]\s*['\"]?)[^,'\"\s}]+",
            r"\1***REDACTED***",
            re.sub(
                r"(Bearer\s+)[^,'\"\s}]+",
                r"\1***REDACTED***",
                error[:500],
            ),
        )

    def _default_model_for_provider(self, provider: str) -> str:
        defaults = {
            "DEEPSEEK": "deepseek-flash",
            "OPENAI": "gpt-4o-mini",
            "ANTHROPIC": "claude-sonnet-4-20250514",
            "HUGGINGFACE": "mistralai/Mistral-7B-Instruct-v0.3",
            "OLLAMA": "llama3.2",
            "GROQ": "openai/gpt-oss-120b",
            "OPENROUTER": "openrouter/auto",
            "NVIDIA": "openai/gpt-oss-120b",
            "CEREBRAS": "qwen-3-235b-a22b-instruct-2507",
            "GITHUB": "gpt-4o",
            "SAMBANOVA": "DeepSeek-V3.1",
            "MISTRAL": "mistral-large-latest",
        }
        return defaults.get(provider, "deepseek-flash")

    # -------------------------------------------------------------------------
    # Core key selection — simple first active key
    # -------------------------------------------------------------------------

    async def get_next_key(
        self,
        model_name: str,
        company_id: str,
        preferred_provider: str | None = None,
        estimated_tokens: int = 0,
        key_id: str | None = None,
    ) -> RoutingResult:

        await self.check_config_version()
        global_config = await self.get_global_ui_config()

        provider_priority = self.resolve_provider_priority(
            global_config,
            preferred_provider=preferred_provider,
        )

        if session.async_session is None:
            raise ModelManagerError(
                "DB_UNINITIALIZED",
                "Database session factory is not initialized",
            )

        async with session.async_session() as db:
            for provider_type in provider_priority:
                model_candidates = [model_name]
                if model_name in ("deepseek-flash", "deepseek-v4-flash"):
                    model_candidates = ["deepseek-flash", "deepseek-v4-flash"]
                elif "deepseek" in model_name.lower() and provider_type == "DEEPSEEK":
                    model_candidates = [model_name, "deepseek-flash", "deepseek-v4-flash"]
                elif "gemma" in model_name.lower():
                    model_candidates = [model_name, "gemma-4-31b-it", "gemma-4-27b-it", "gemma4:31b-cloud", "gemma-4-26b-a4b-it", "gemma4"]

                stmt = (
                    select(AiKey, AiModelConfig.model_name)
                    .join(AiModelConfig, AiModelConfig.key_id == AiKey.id)
                    .where(
                        cast(AiKey.provider, String) == provider_type,
                        AiKey.is_active == True,  # noqa: E712
                        AiModelConfig.model_name.in_(model_candidates),
                        AiModelConfig.is_enabled == True,  # noqa: E712
                    )
                )
                if key_id:
                    stmt = stmt.where(AiKey.id == key_id)
                result = await db.execute(stmt)
                rows = result.all()
                for key, actual_model in rows:
                    if key.company_id and key.company_id != company_id and key.key_type != "CENTRAL":
                        continue
                    # Return first matching key — no round-robin, no cooldown
                    effective_model = actual_model if actual_model in model_candidates else model_name
                    return RoutingResult(
                        key_id=key.id,
                        api_key=key.api_key,
                        model=effective_model,
                        provider=key.provider,
                        base_url=key.base_url,
                        key_name=key.name,
                    )

        raise ModelManagerError(
            "ALL_KEYS_UNAVAILABLE",
            "No available API keys for the requested model",
        )

    # -------------------------------------------------------------------------
    # Usage recording (no circuit breaker)
    # -------------------------------------------------------------------------

    async def record_success(
        self,
        key_id: str,
        usage: dict[str, Any],
        response_time_ms: int | None = None,
    ) -> None:
        self._metrics["successful_requests"] += 1
        self._metrics["total_requests"] += 1

        total = usage.get("total_tokens", 0)
        now = datetime.now(UTC)
        minute_bucket = now.strftime("%Y%m%d%H%M")
        day_bucket = now.strftime("%Y%m%d")

        if redis_client.available:
            client = redis_client._client
            if client:
                await client.incrby(f"mm:usage:{key_id}:min:{minute_bucket}", total)
                await client.incrby(f"mm:usage:{key_id}:day:{day_bucket}", total)

        self._key_usage_counts[key_id] = self._key_usage_counts.get(key_id, 0) + 1

        async with self._usage_buffer_lock:
            current = self._usage_buffer.get(key_id, {"used": 0, "tpm": 0})
            self._usage_buffer[key_id] = {
                "used": current["used"] + 1,
                "tpm": current["tpm"] + total,
            }

    async def record_failure(
        self,
        key_id: str,
        error_type: str,
        retry_after_ms: int | None = None,
    ) -> None:
        self._metrics["failed_requests"] += 1
        self._metrics["total_requests"] += 1

        self._error_counts[key_id] = self._error_counts.get(key_id, 0) + 1
        logger.warning("key_failure_recorded", key_id=key_id, error=error_type)

    async def mark_key_exhausted(self, key_id: str, reason: str = "429") -> None:
        logger.info("mark_key_exhausted is no-op", key_id=key_id, reason=reason)

    async def invalidate_key(self, key_id: str, reason: str = "INVALID_KEY") -> bool:
        try:
            async with session.async_session() as db:
                await db.execute(
                    update(AiKey)
                    .where(AiKey.id == key_id)
                    .values(is_active=False)
                )
                await db.commit()
            self._clear_all_caches()
            return True
        except Exception as e:
            logger.error("invalidate_key_failed", key_id=key_id, error=str(e))
            return False

    # -------------------------------------------------------------------------
    # Status and metrics
    # -------------------------------------------------------------------------

    async def get_status(self) -> dict[str, Any]:
        return {
            "total_requests": self._metrics["total_requests"],
            "successful_requests": self._metrics["successful_requests"],
            "failed_requests": self._metrics["failed_requests"],
            "cache_hits": self._metrics["cache_hits"],
            "cache_misses": self._metrics["cache_misses"],
            "average_response_time": self._metrics["average_response_time"],
            "key_usage_counts": dict(self._key_usage_counts),
            "model_usage_counts": dict(self._model_usage_counts),
            "error_counts": dict(self._error_counts),
            "failures": [],
            "model_limits_loaded": len(self._model_limits_cache),
            "config_version": self._config_version,
            "uptime_seconds": time.time() - self._metrics_last_reset,
        }

    async def clear_all_failures(self) -> None:
        logger.info("all_key_failures_cleared (no-op)")

    # -------------------------------------------------------------------------
    # Utility
    # -------------------------------------------------------------------------

    def get_disabled_models(self) -> set[str]:
        return RETIRED_GEMINI_MODEL_NAMES | UNSTABLE_GEMINI_MODEL_ALIAS_NAMES

    # -------------------------------------------------------------------------
    # Backward compatibility wrappers
    # -------------------------------------------------------------------------

    async def get_next_key_simple(self, model_name: str, company_id: str) -> RoutingResult:
        return await self.get_next_key(model_name, company_id)

    def get_simple_routing_pools(self) -> dict:
        return {"primary": [], "failover": []}

    async def record_routing_success(
        self,
        key_id: str,
        model_name: str,
        response_time_ms: int | None = None,
    ) -> None:
        await self.record_success(key_id, {"total_tokens": 0}, response_time_ms)

    def get_provider_priority_order(self) -> list[str]:
        return list(self.provider_priority)


model_manager = ModelManager()
