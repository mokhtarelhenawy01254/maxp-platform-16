from __future__ import annotations

import asyncio
import json
import time
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from typing import Any, ClassVar

import structlog
from sqlalchemy import select, update, cast, String

from src.config import get_settings
from src.db import session
from src.db.models.provider import AiKey, AiModelConfig, GlobalAiConfig
from src.services.redis_client import redis_client

logger = structlog.get_logger(__name__)

SUPPORTED_PROVIDER_ORDER = [
    "GOOGLE", "GROQ", "OPENROUTER", "NVIDIA", "DEEPSEEK",
    "OPENAI", "ANTHROPIC", "HUGGINGFACE", "OLLAMA"
]
DEFAULT_PROVIDER_PRIORITY = ["GOOGLE", "GROQ", "OPENROUTER", "NVIDIA"]

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
    """Exception raised by ModelManager when no suitable key can be found."""

    def __init__(self, code: str, message: str, retry_after: float | None = None):
        self.code = code
        self.message = message
        self.retry_after = retry_after
        super().__init__(self.message)


@dataclass
class ModelKey:
    """Mutable state for a single AI API key stored in Redis."""
    key_id: str
    model: str
    provider: str
    cooldown_until: float = 0.0
    status: str = "ACTIVE"  # ACTIVE | COOLDOWN | PERMANENTLY_DISABLED
    failure_reason: str | None = None


@dataclass
class ModelLimit:
    """Limits for a specific model, loaded from DB."""
    model_name: str
    rpm: int = 10
    rph: int = 600
    rpd: int = 250
    tpm: int = 250_000
    max_tokens: int = 200_000


@dataclass
class RoutingResult:
    """Result of key selection for a request."""
    key_id: str
    api_key: str
    model: str
    provider: str
    base_url: str | None = None
    key_name: str | None = None
    selected_pool: str = "primary"  # primary | failover | manual
    active_provider: str | None = None
    manual_override: bool = False


class ModelManager:
    """
    Advanced AI Model Manager for key rotation, quota tracking, and circuit breaking.

    Ports the core logic from Node.js modelManager.js (~3026 lines) into a
    lean, async Python implementation.
    """

    DEFAULT_COOLDOWN = 30  # seconds
    PERMANENT_COOLDOWN = 86400  # 24 hours

    CRITICAL_ERRORS: frozenset[str] = frozenset({
        "LEAKED", "403_INVALID", "PERMISSION_DENIED", "INVALID_KEY"
    })

    _model_limits_cache: ClassVar[dict[str, ModelLimit]] = {}
    _limits_last_loaded: float = 0
    LIMITS_TTL_SECONDS = 5 * 60  # 5 minutes

    _global_config_cache: ClassVar[dict | None] = None
    _global_config_last_loaded: float = 0
    GLOBAL_CONFIG_TTL_MS = 30_000  # 30 seconds

    _config_version: int = 0
    _config_version_last_checked: float = 0
    CONFIG_VERSION_CHECK_INTERVAL_MS = 5_000

    def __init__(self) -> None:
        self.settings = get_settings()
        self.provider_priority = list(DEFAULT_PROVIDER_PRIORITY)

        # Performance metrics
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

        # Usage buffer for batched writes
        self._usage_buffer: dict[str, dict[str, int]] = {}
        self._usage_buffer_lock = asyncio.Lock()

    # -------------------------------------------------------------------------
    # Redis key state helpers
    # -------------------------------------------------------------------------

    async def _get_key_state(self, key_id: str) -> ModelKey | None:
        state_json = await redis_client.get(f"mm:key_state:{key_id}")
        if not state_json:
            return None
        data = json.loads(state_json)
        return ModelKey(**data)

    async def _set_key_state(self, key: ModelKey) -> None:
        ttl = self.PERMANENT_COOLDOWN if key.status == "PERMANENTLY_DISABLED" else 3600
        await redis_client.set(
            f"mm:key_state:{key.key_id}",
            json.dumps(asdict(key)),
            ttl=ttl,
        )

    async def _get_round_robin_index(self, pool_name: str, pool_size: int) -> int:
        if pool_size == 0:
            return 0
        idx = await redis_client.incr(f"mm:rr_idx:{pool_name}")
        return ((idx or 0) - 1) % pool_size

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
            # ai_model_limits table may not exist; fall back gracefully
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
            logger.debug("config_version_check_skipped_db_uninitialized")
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
                        logger.info("config_updated_clearing_caches")
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
            logger.debug("global_config_skipped_db_uninitialized")
            return None

        try:
            async with session.async_session() as db_session:
                result = await db_session.execute(select(GlobalAiConfig))
                config = result.scalar_one_or_none()
                if config:
                    cfg_dict = {
                        "id": str(config.id),
                        "default_provider": config.default_provider,
                        "enable_failover": config.enable_failover,
                        "provider_priority": config.provider_priority or [],
                        "settings": config.settings or {},
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

        if not ordered:
            ordered = list(DEFAULT_PROVIDER_PRIORITY)

        return ordered

    def _clear_all_caches(self) -> None:
        self._model_limits_cache.clear()
        self._global_config_cache = None
        logger.info("all_caches_cleared")

    # -------------------------------------------------------------------------
    # Health check / live key testing
    # -------------------------------------------------------------------------

    async def test_ai_key(
        self,
        key_id: str,
        timeout_ms: int = 20_000,
    ) -> dict[str, Any]:
        """Test a key by sending a minimal request. Returns test result dict."""
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

        # Get the top-priority enabled model for this key
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

        # Attempt a live call via the provider factory
        try:
            from src.llm.providers.factory import get_provider_factory
            factory = get_provider_factory()
            client = await factory.get_provider(provider, model, key_id)

            if client is None:
                return self._key_test_result(
                    key_id=key_id,
                    started_at=started_at,
                    tested_at=tested_at,
                    ok=False,
                    error="Provider not available",
                    provider=provider,
                    model=model,
                )

            response = await asyncio.wait_for(
                client.chat([{"role": "user", "content": "Reply with exactly: KEY_OK"}]),
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
        if hasattr(result, "text") and callable(result.text):
            return result.text()
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
            "DEEPSEEK": "deepseek-chat",
            "OPENAI": "gpt-4o-mini",
            "OLLAMA": "llama3.2",
            "GROQ": "llama-3.3-70b-versatile",
            "OPENROUTER": "openrouter/auto",
            "NVIDIA": "openai/gpt-oss-120b",
        }
        return defaults.get(provider, "gemini-2.5-flash")

    # -------------------------------------------------------------------------
    # Core key selection
    # -------------------------------------------------------------------------

    async def get_next_key(
        self,
        model_name: str,
        company_id: str,
        preferred_provider: str | None = None,
        excluded_key_ids: set[str] | None = None,
        estimated_tokens: int = 0,
    ) -> RoutingResult:
        """
        Select the next available API key using reactive round-robin with failover.
        """
        excluded_key_ids = excluded_key_ids or set()

        await self.check_config_version()
        global_config = await self.get_global_ui_config()

        provider_priority = self.resolve_provider_priority(
            global_config,
            preferred_provider=preferred_provider,
        )
        enable_failover = (global_config or {}).get("enable_failover", True)

        if not enable_failover:
            provider_priority = provider_priority[:1]

        all_keys: list[dict] = []
        active_provider = provider_priority[0] if provider_priority else "GOOGLE"

        if session.async_session is None:
            raise ModelManagerError(
                "DB_UNINITIALIZED",
                "Database session factory is not initialized",
            )

        async with session.async_session() as db:
            for provider_type in provider_priority:
                result = await db.execute(
                    select(AiKey)
                    .join(AiModelConfig, AiModelConfig.key_id == AiKey.id)
                    .where(
                        cast(AiKey.provider, String) == provider_type,
                        AiKey.is_active == True,  # noqa: E712
                        AiModelConfig.model_name == model_name,
                        AiModelConfig.is_enabled == True,  # noqa: E712
                    )
                )
                keys = result.scalars().all()
                for key in keys:
                    if key.company_id and key.company_id != company_id and key.key_type != "CENTRAL":
                        continue
                    all_keys.append({
                        "id": key.id,
                        "api_key": key.api_key,
                        "name": key.name,
                        "provider": key.provider,
                        "base_url": key.base_url,
                        "key_type": key.key_type,
                    })

        now = time.time()
        available_keys: list[dict] = []

        for key in all_keys:
            if key["id"] in excluded_key_ids:
                continue
            state = await self._get_key_state(key["id"])
            if state and (
                state.status == "PERMANENTLY_DISABLED"
                or state.cooldown_until > now
            ):
                continue

            # Budget check
            budget_ok, budget_reason = await self._check_key_budget(key, estimated_tokens)
            if not budget_ok:
                logger.debug("key_skipped_budget", key_id=key["id"], reason=budget_reason)
                continue

            available_keys.append(key)

        if not available_keys:
            raise ModelManagerError(
                "ALL_KEYS_UNAVAILABLE",
                "No available API keys for the requested model",
            )

        # Round-robin within pool
        pool_name = f"{active_provider}:{model_name}"
        idx = await self._get_round_robin_index(pool_name, len(available_keys))
        selected = available_keys[idx]

        # Company-wide budget check
        budget_ok, budget_reason = await self._check_company_budget(company_id)
        if not budget_ok:
            raise ModelManagerError("BUDGET_EXCEEDED", budget_reason)

        return RoutingResult(
            key_id=selected["id"],
            api_key=selected["api_key"],
            model=model_name,
            provider=selected["provider"],
            base_url=selected.get("base_url"),
            key_name=selected.get("name"),
            selected_pool="primary",
            active_provider=active_provider,
        )

    async def _check_key_budget(self, key_info: dict, estimated_tokens: int) -> tuple[bool, str]:
        """Check if a specific key is within its rate limits. Returns (ok, reason)."""
        try:
            from src.billing.ledger import budget_ledger

            selection = {
                "id": key_info.get("id") or key_info.get("key_id"),
                "keyId": key_info.get("id") or key_info.get("key_id"),
                "provider": key_info.get("provider"),
                "modelName": key_info.get("model"),
                "apiKey": key_info.get("api_key"),
                "routingLimits": key_info.get("routingLimits"),
                "limits": key_info.get("limits"),
                "maxRequestsPerDay": key_info.get("maxRequestsPerDay"),
                "usage": key_info.get("usage"),
                "modelUsage": key_info.get("modelUsage"),
                "companyId": key_info.get("company_id"),
            }

            result = await budget_ledger.can_route(selection, {"estimatedTokens": estimated_tokens})
            if result.allowed:
                return True, ""
            return False, result.reason or "BUDGET_LIMIT_EXCEEDED"
        except Exception as e:
            logger.warning("budget_check_failed", error=str(e))
            return True, ""  # Fail open — don't block on budget check errors

    async def _check_company_budget(self, company_id: str) -> tuple[bool, str]:
        """Check if company has exceeded daily budget. Returns (ok, reason)."""
        try:
            from src.billing.ledger import budget_ledger

            result = await budget_ledger.can_route(
                {"companyId": company_id},
                {"companyId": company_id},
            )
            if result.allowed:
                return True, ""
            return False, result.reason or "COMPANY_BUDGET_EXCEEDED"
        except Exception as e:
            logger.warning("company_budget_check_failed", error=str(e))
            return True, ""  # Fail open
        # TODO: integrate with billing ledger for company-level budget
        return True, ""

    # -------------------------------------------------------------------------
    # Usage recording and circuit breaker
    # -------------------------------------------------------------------------

    async def record_success(
        self,
        key_id: str,
        usage: dict[str, Any],
        response_time_ms: int | None = None,
    ) -> None:
        """Record a successful request and reset circuit breaker."""
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

        # Reset cooldown if key was cooling down
        state = await self._get_key_state(key_id)
        if state and state.status == "COOLDOWN":
            state.status = "ACTIVE"
            state.cooldown_until = 0.0
            state.failure_reason = None
            await self._set_key_state(state)
            logger.info("key_circuit_reset", key_id=key_id)

        # Update in-memory usage counter
        self._key_usage_counts[key_id] = self._key_usage_counts.get(key_id, 0) + 1

        # Buffer usage for batch DB write
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
        """Trigger circuit breaker for a failed key."""
        self._metrics["failed_requests"] += 1
        self._metrics["total_requests"] += 1

        state = await self._get_key_state(key_id) or ModelKey(
            key_id=key_id,
            model="",
            provider="",
        )

        now = time.time()
        cooldown = self.DEFAULT_COOLDOWN

        if error_type in self.CRITICAL_ERRORS:
            state.status = "PERMANENTLY_DISABLED"
            cooldown = self.PERMANENT_COOLDOWN
            logger.error("key_permanently_disabled", key_id=key_id, error=error_type)
        elif error_type in ("429", "QUOTA"):
            cooldown = (retry_after_ms // 1000) if retry_after_ms else 60
            state.status = "COOLDOWN"
        else:
            state.status = "COOLDOWN"
            cooldown = self.DEFAULT_COOLDOWN

        state.cooldown_until = now + cooldown
        state.failure_reason = error_type
        await self._set_key_state(state)

        logger.warning(
            "key_tripped_circuit_breaker",
            key_id=key_id,
            error=error_type,
            cooldown=cooldown,
        )

    async def mark_key_exhausted(self, key_id: str, reason: str = "429") -> None:
        """Mark a key as temporarily exhausted (429 / quota error)."""
        await self.record_failure(key_id, reason)

    async def invalidate_key(self, key_id: str, reason: str = "INVALID_KEY") -> bool:
        """Permanently invalidate a key in the database and Redis."""
        state = await self._get_key_state(key_id) or ModelKey(
            key_id=key_id, model="", provider=""
        )
        state.status = "PERMANENTLY_DISABLED"
        state.failure_reason = reason
        state.cooldown_until = time.time() + self.PERMANENT_COOLDOWN
        await self._set_key_state(state)

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
        """Return current manager status including failed keys."""
        # Collect active key states from Redis (limited scan)
        failures = []
        if redis_client.available and redis_client._client:
            try:
                cursor = 0
                while True:
                    cursor, keys = await redis_client._client.scan(
                        cursor=cursor,
                        match="mm:key_state:*",
                        count=100,
                    )
                    for key in keys:
                        data = await redis_client.get(key)
                        if data:
                            state = json.loads(data)
                            if state.get("status") != "ACTIVE":
                                failures.append({
                                    "key_id": state.get("key_id"),
                                    "status": state.get("status"),
                                    "cooldown_until": state.get("cooldown_until"),
                                    "failure_reason": state.get("failure_reason"),
                                })
                    if cursor == 0:
                        break
            except Exception as e:
                logger.warning("get_status_scan_failed", error=str(e))

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
            "failures": failures,
            "model_limits_loaded": len(self._model_limits_cache),
            "config_version": self._config_version,
            "uptime_seconds": time.time() - self._metrics_last_reset,
        }

    async def clear_all_failures(self) -> None:
        """Clear all circuit breaker states. Use after restart or manual reset."""
        if redis_client.available and redis_client._client:
            try:
                cursor = 0
                while True:
                    cursor, keys = await redis_client._client.scan(
                        cursor=cursor,
                        match="mm:key_state:*",
                        count=100,
                    )
                    for key in keys:
                        await redis_client._client.delete(key)
                    if cursor == 0:
                        break
            except Exception as e:
                logger.warning("clear_all_failures_failed", error=str(e))
        logger.info("all_key_failures_cleared")

    # -------------------------------------------------------------------------
    # Utility
    # -------------------------------------------------------------------------

    def get_disabled_models(self) -> set[str]:
        return RETIRED_GEMINI_MODEL_NAMES | UNSTABLE_GEMINI_MODEL_ALIAS_NAMES

    # -------------------------------------------------------------------------
    # Backward compatibility / Migration validation wrappers
    # -------------------------------------------------------------------------

    async def get_next_key_simple(self, model_name: str, company_id: str) -> RoutingResult:
        """Wrapper around get_next_key for migration test compatibility."""
        return await self.get_next_key(model_name, company_id)

    def get_simple_routing_pools(self) -> dict:
        """Return simple routing pools dictionary for migration test compatibility."""
        return {"primary": [], "failover": []}

    async def record_routing_success(
        self,
        key_id: str,
        model_name: str,
        response_time_ms: int | None = None,
    ) -> None:
        """Wrapper around record_success for migration test compatibility."""
        await self.record_success(key_id, {"total_tokens": 0}, response_time_ms)

    def get_provider_priority_order(self) -> list[str]:
        """Return provider priority order for migration test compatibility."""
        return list(self.provider_priority)


# Singleton instance
model_manager = ModelManager()
