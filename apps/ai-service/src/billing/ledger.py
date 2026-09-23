"""
@module billing.ledger
@description Provider Budget Ledger - tracks provider usage limits and company budgets.

Tracks:
- Provider limits: RPM (requests/minute), RPD (requests/day), TPM (tokens/minute), TPD (tokens/day)
- Company budget: dailyTokenLimit, dailyCostLimit
- Penalty/cooldown system for rate limiting
- Budget notifications

Python counterpart to Node.js providerBudgetLedgerService.js.
"""

from __future__ import annotations

import asyncio
import hashlib
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

LIMIT_ALIASES: dict[str, list[str]] = {
    "rpm": ["rpm", "requestsPerMinute", "requests_per_minute", "minuteRequests"],
    "rpd": ["rpd", "requestsPerDay", "requests_per_day", "dailyRequests", "maxRequestsPerDay"],
    "tpm": ["tpm", "tokensPerMinute", "tokens_per_minute", "minuteTokens"],
    "tpd": ["tpd", "tokensPerDay", "tokens_per_day", "dailyTokens"],
}

PREFIX = "provider_budget"
BUDGET_EXCEEDED_NOTIFICATION_TYPE = "BUDGET_EXCEEDED"
PENALTY_DECAY = 0.4
RECOVERY_RATE = 0.1
MAX_PENALTY_TTL_MS = 5 * 60 * 1000
SCORE_THRESHOLD = 0.3
BASE_SCORE = 1.0


def get_model_cost(model: str) -> dict[str, float]:
    """Get cost per token for model. Simplified version - in production, load from config."""
    FALLBACK_COST = {"input": 0.00001, "output": 0.00003}
    MODEL_COSTS = {
        "gemini-2.5-flash": {"input": 0.000075, "output": 0.0003},
        "gemini-2.5-pro": {"input": 0.00125, "output": 0.005},
        "claude-sonnet-4-6": {"input": 0.003, "output": 0.015},
        "claude-3-5-sonnet": {"input": 0.003, "output": 0.015},
        "gpt-4o": {"input": 0.005, "output": 0.015},
        "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
        "deepseek-flash": {"input": 0.00000015, "cache_input": 0.000000003, "output": 0.0000006},
        "deepseek-v4-flash": {"input": 0.00000015, "cache_input": 0.000000003, "output": 0.0000006},
        "deepseek-v4-pro": {"input": 0.000000435, "cache_input": 0.000000003625, "output": 0.00000087},
        "openai/gpt-oss-120b": {"input": 0.00000015, "cache_input": 0.000000075, "output": 0.0000006},
        "openai/gpt-oss-20b": {"input": 0.000000075, "cache_input": 0.0000000375, "output": 0.0000003},
    }
    return MODEL_COSTS.get(model, FALLBACK_COST)


@dataclass
class BudgetIdentity:
    provider: str
    model: str
    key_id: str
    hash: str
    raw: str


@dataclass
class WindowKeys:
    minute: str
    day: str
    minute_bucket: int
    day_bucket: str
    minute_reset_at: int
    day_reset_at: int


@dataclass
class WindowUsage:
    requests: int = 0
    tokens: int = 0


@dataclass
class CompanyBudgetLimits:
    daily_token_limit: int = 500_000
    daily_cost_limit: float = 50.0


@dataclass
class ProviderLimits:
    rpm: int | None = None
    rpd: int | None = None
    tpm: int | None = None
    tpd: int | None = None


@dataclass
class AllowedStatus:
    allowed: bool
    limited: bool
    reason: str | None
    limits: dict[str, Any]
    usage: dict[str, Any]
    budget_key: str
    reset_at: int | None = None
    retry_after_seconds: int | None = None
    company_id: str | None = None
    error: str | None = None
    estimated_tokens: int | None = None
    penalty_reason: str | None = None
    penalty_score: float | None = None


@dataclass
class BudgetSnapshot:
    limited: bool
    allowed: bool
    reason: str | None
    retry_after_seconds: int | None
    limits: dict[str, Any]
    usage: dict[str, Any]
    penalty: dict[str, Any] | None
    budget_key: str


@dataclass
class UsageIncrementResult:
    recorded: bool
    limits: dict[str, Any]
    usage: dict[str, Any]
    budget_key: str
    tokens: int = 0
    requests: int = 0
    reason: str | None = None


class LocalCache:
    """Simple in-memory cache with TTL."""

    def __init__(self) -> None:
        self._cache: dict[str, dict[str, Any]] = {}

    def get(self, key: str) -> Any | None:
        cached = self._cache.get(key)
        if not cached:
            return None
        if cached.get("expires_at") and cached["expires_at"] <= time.time() * 1000:
            del self._cache[key]
            return None
        return cached.get("value")

    def set(self, key: str, value: Any, ttl_seconds: int) -> bool:
        self._cache[key] = {
            "value": value,
            "expires_at": time.time() * 1000 + ttl_seconds * 1000,
        }
        return True

    def clear(self) -> None:
        self._cache.clear()


class BudgetLedgerService:
    """
    Provider and company budget tracking service.

    Tracks:
    - Per-provider/model/key usage (RPM, RPD, TPM, TPD)
    - Per-company daily budget (token limit, cost limit)
    - Penalty/cooldown for rate limit violations
    - Budget notification triggering
    """

    def __init__(self) -> None:
        self._local_cache = LocalCache()
        self._redis_client = None
        self._log = logger

    def _get_redis(self) -> Any | None:
        """Get Redis client if available."""
        if self._redis_client is None:
            try:
                from src.services.redis_client import redis_client
                self._redis_client = redis_client
            except Exception:
                pass
        return self._redis_client

    def _normalize_limit_value(self, value: Any) -> int | None:
        """Normalize a limit value to positive integer."""
        if value is None or value == "":
            return None
        try:
            numeric = float(value) if not isinstance(value, (int, float)) else value
        except (ValueError, TypeError):
            return None
        if not isinstance(numeric, (int, float)) or not (numeric > 0):
            return None
        return int(numeric)

    def _read_alias(self, source: dict[str, Any] | None, aliases: list[str]) -> int | None:
        """Read a value from source using alias names."""
        if not source or not isinstance(source, dict):
            return None
        for alias in aliases:
            value = self._normalize_limit_value(source.get(alias))
            if value:
                return value
        return None

    def _normalize_limits_from_object(self, source: dict[str, Any] | None) -> dict[str, int]:
        """Extract normalized limits from an object."""
        if not source or not isinstance(source, dict):
            return {}
        limits: dict[str, int] = {}
        for name, aliases in LIMIT_ALIASES.items():
            value = self._read_alias(source, aliases)
            if value:
                limits[name] = value
        return limits

    def _get_limit_candidates(self, source: dict[str, Any] | None) -> list[dict[str, Any]]:
        """Get all possible limit sources from an object."""
        if not source or not isinstance(source, dict):
            return []
        candidates = [
            source,
            source.get("limits"),
            source.get("rateLimits"),
            source.get("routingLimits"),
            source.get("providerBudget"),
            source.get("providerBudgetLimits"),
            source.get("budgetLimits"),
            source.get("quota"),
        ]
        return [c for c in candidates if c and isinstance(c, dict)]

    def _merge_limits(
        self, current: dict[str, int], incoming: dict[str, int] | None
    ) -> dict[str, int]:
        """Merge incoming limits with current, taking minimum for conflicts."""
        merged = dict(current)
        for name, value in (incoming or {}).items():
            numeric = self._normalize_limit_value(value)
            if not numeric:
                continue
            if name in merged:
                merged[name] = min(merged[name], numeric)
            else:
                merged[name] = numeric
        return merged

    def parse_provider_limits(self, selection: dict[str, Any] | None = None) -> dict[str, int]:
        """Parse provider limits from selection object with multiple source formats."""
        if not selection:
            return {}

        def parse_json(value: Any) -> dict[str, Any]:
            if not value:
                return {}
            if isinstance(value, dict):
                return value
            if isinstance(value, str):
                import json
                try:
                    parsed = json.loads(value)
                    return parsed if isinstance(parsed, dict) else {}
                except (json.JSONDecodeError, TypeError):
                    return {}
            return {}

        sources: list[dict[str, Any]] = [
            selection,
            selection.get("routingLimits") or {},
            selection.get("rateLimits") or {},
            selection.get("limits") or {},
            selection.get("providerBudget") or {},
            parse_json(selection.get("usage")),
            parse_json(selection.get("modelUsage")),
            parse_json(selection.get("configuredModel", {}).get("usage")),
        ]

        limits: dict[str, int] = {}
        for source in sources:
            for candidate in self._get_limit_candidates(source):
                limits = self._merge_limits(limits, self._normalize_limits_from_object(candidate))

        max_requests_per_day = self._normalize_limit_value(selection.get("maxRequestsPerDay"))
        if max_requests_per_day:
            limits = self._merge_limits(limits, {"rpd": max_requests_per_day})

        return limits

    def _has_limits(self, limits: dict[str, int] | None) -> bool:
        """Check if any limits are configured."""
        if not limits:
            return False
        return any(
            isinstance(v, (int, float)) and v > 0
            for v in limits.values()
        )

    def _normalize_token_count(self, value: Any) -> int:
        """Extract and normalize token count from response."""
        if isinstance(value, (int, float)):
            return int(value) if value > 0 else 0
        if not value or not isinstance(value, dict):
            return 0
        return self._normalize_token_count(
            value.get("totalTokens")
            or value.get("tokens")
            or value.get("estimatedTokens")
            or (value.get("usage") or {}).get("totalTokens")
            or (value.get("usage") or {}).get("tokens")
            or 0
        )

    def _get_budget_identity(self, selection: dict[str, Any] | None = None) -> BudgetIdentity:
        """Generate unique identity for a provider/model/key combination."""
        selection = selection or {}
        provider = str(selection.get("provider") or selection.get("activeProvider") or "UNKNOWN").upper()
        model = str(
            selection.get("modelName")
            or selection.get("model")
            or selection.get("modelId")
            or "unknown-model"
        )
        key_id = str(selection.get("id") or selection.get("keyId") or selection.get("apiKeyId") or "unknown-key")
        raw = f"{provider}:{model}:{key_id}"
        hash_val = hashlib.sha1(raw.encode()).hexdigest()
        return BudgetIdentity(provider=provider, model=model, key_id=key_id, hash=hash_val, raw=raw)

    def _get_penalty_key(self, identity: BudgetIdentity) -> str:
        """Get Redis key for penalty state."""
        return f"{PREFIX}:penalty:{identity.hash}"

    def _get_window_keys(self, identity: BudgetIdentity, now_ms: int | None = None) -> WindowKeys:
        """Generate Redis keys for usage windows."""
        now = now_ms or int(time.time() * 1000)
        minute_bucket = now // 60000
        day_bucket = datetime.fromtimestamp(now / 1000, tz=UTC).strftime("%Y-%m-%d")
        minute_key = f"{PREFIX}:usage:{identity.hash}:minute:{minute_bucket}"
        day_key = f"{PREFIX}:usage:{identity.hash}:day:{day_bucket}"
        return WindowKeys(
            minute=minute_key,
            day=day_key,
            minute_bucket=minute_bucket,
            day_bucket=day_bucket,
            minute_reset_at=(minute_bucket + 1) * 60000,
            day_reset_at=int(
                datetime.fromisoformat(f"{day_bucket}T00:00:00.000Z").timestamp() * 1000
                + 24 * 60 * 60 * 1000
            ),
        )

    async def _read_cache(self, key: str) -> dict[str, Any] | None:
        """Read value from Redis or local cache."""
        redis = self._get_redis()
        if redis and redis.available:
            try:
                value = await redis.get(key)
                if value and isinstance(value, str):
                    import json
                    return json.loads(value)
                return value
            except Exception as exc:
                self._log.warning("redis read failed", key=key, error=str(exc))

        return self._local_cache.get(key)

    async def _write_cache(self, key: str, value: Any, ttl_seconds: int) -> bool:
        """Write value to Redis or local cache."""
        ttl = max(1, int(ttl_seconds or 60))
        redis = self._get_redis()
        if redis and redis.available:
            try:
                import json
                await redis.set(key, json.dumps(value), ttl=ttl)
                return True
            except Exception as exc:
                self._log.warning("redis write failed", key=key, error=str(exc))

        self._local_cache.set(key, value, ttl)
        return True

    def _normalize_window_usage(self, value: Any) -> WindowUsage:
        """Normalize usage data structure."""
        usage = value if isinstance(value, dict) else {}
        return WindowUsage(
            requests=int(usage.get("requests") or 0),
            tokens=int(usage.get("tokens") or 0),
        )

    async def _get_usage(
        self, selection: dict[str, Any] | None, windows: WindowKeys | None = None
    ) -> dict[str, Any]:
        """Get current usage for provider."""
        identity = self._get_budget_identity(selection)
        if windows is None:
            windows = self._get_window_keys(identity)
        minute_raw = await self._read_cache(windows.minute)
        day_raw = await self._read_cache(windows.day)
        return {
            "identity": identity,
            "windows": windows,
            "minute": self._normalize_window_usage(minute_raw),
            "day": self._normalize_window_usage(day_raw),
        }

    def _build_allowed_status(
        self,
        selection: dict[str, Any],
        limits: dict[str, int],
        usage: dict[str, Any] | None,
    ) -> AllowedStatus:
        """Build allowed status response."""
        return AllowedStatus(
            allowed=True,
            limited=self._has_limits(limits),
            reason=None,
            limits=limits,
            usage={
                "minute": (usage or {}).get("minute", {}),
                "day": (usage or {}).get("day", {}),
            },
            budget_key=getattr((usage or {}).get("identity"), "hash", None) or self._get_budget_identity(selection).hash,
        )

    def _build_denied_status(
        self,
        reason: str,
        limits: dict[str, int],
        usage: dict[str, Any],
        reset_at: int | None,
        extra: dict[str, Any] | None = None,
    ) -> AllowedStatus:
        """Build denied status response."""
        retry_after = int((reset_at - time.time() * 1000) / 1000) if reset_at else None
        return AllowedStatus(
            allowed=False,
            limited=True,
            reason=reason,
            limits=limits,
            usage={
                "minute": (usage or {}).get("minute", {}),
                "day": (usage or {}).get("day", {}),
            },
            budget_key=getattr((usage or {}).get("identity"), "hash", None) or "",
            reset_at=reset_at,
            retry_after_seconds=max(1, retry_after) if retry_after else None,
            **(extra or {}),
        )

    async def _get_penalty(self, selection: dict[str, Any] | None, options: dict[str, Any] | None = None) -> dict[str, Any] | None:
        """Get penalty state if active."""
        identity = self._get_budget_identity(selection)
        penalty = await self._read_cache(self._get_penalty_key(identity))
        if not penalty:
            return None

        now = (options or {}).get("now") or time.time() * 1000
        score = float(penalty.get("score", 1.0))
        recorded_at = int(penalty.get("recordedAt") or now)
        elapsed = now - recorded_at
        recovered = elapsed * RECOVERY_RATE / MAX_PENALTY_TTL_MS
        effective_score = min(1.0, score + recovered)

        if effective_score > SCORE_THRESHOLD:
            return None

        return {
            "identity": identity,
            "score": effective_score,
            "reason": penalty.get("reason") or "PENALTY_COOLDOWN",
            "retryAt": penalty.get("retryAt"),
            "retryAfterMs": penalty.get("retryAfterMs"),
        }

    async def get_company_limits(self, company_id: str, db_session: Any | None = None) -> CompanyBudgetLimits:
        """Get company-specific budget limits from database."""
        daily_token_limit = 500_000
        daily_cost_limit = 50.0

        if db_session is not None:
            try:
                from sqlalchemy import text
                result = await db_session.execute(
                    text("""
                        SELECT "modelSettings"
                        FROM ai.ai_settings
                        WHERE "companyId" = :company_id
                    """),
                    {"company_id": company_id},
                )
                row = result.fetchone()
                if row and row.model_settings:
                    import json
                    parsed = json.loads(row.model_settings) if isinstance(row.model_settings, str) else row.model_settings
                    if parsed:
                        daily_token_limit = int(parsed.get("dailyTokenLimit", 500000))
                        daily_cost_limit = float(parsed.get("dailyCostLimit", 50.0))
            except Exception as exc:
                self._log.warning("failed to read company limits", company_id=company_id, error=str(exc))

        return CompanyBudgetLimits(daily_token_limit=daily_token_limit, daily_cost_limit=daily_cost_limit)

    async def _is_within_daily_budget(
        self,
        company_id: str,
        estimated_tokens: int,
        now_ms: int | None = None,
        db_session: Any | None = None,
    ) -> dict[str, Any]:
        """Check if company is within daily budget."""
        if not company_id:
            return {"allowed": True}

        limits = await self.get_company_limits(company_id, db_session)
        windows = self._get_window_keys(BudgetIdentity(provider="", model="", key_id="", hash=f"company:{company_id}", raw=""), now_ms)
        company_key = f"{PREFIX}:company:{company_id}:day:{windows.day_bucket}"

        current_raw = await self._read_cache(company_key)
        usage = {
            "requests": int((current_raw or {}).get("requests") or 0),
            "tokens": int((current_raw or {}).get("tokens") or 0),
            "cost": float((current_raw or {}).get("cost") or 0.0),
        } if current_raw else {"requests": 0, "tokens": 0, "cost": 0.0}

        if limits.daily_token_limit and usage["tokens"] + estimated_tokens > limits.daily_token_limit:
            return {
                "allowed": False,
                "reason": "DAILY_TOKEN_LIMIT_EXCEEDED",
                "limit": limits.daily_token_limit,
                "current": usage["tokens"],
                "reset_at": windows.day_reset_at,
            }

        if limits.daily_cost_limit and usage["cost"] > limits.daily_cost_limit:
            return {
                "allowed": False,
                "reason": "DAILY_COST_LIMIT_EXCEEDED",
                "limit": limits.daily_cost_limit,
                "current": usage["cost"],
                "reset_at": windows.day_reset_at,
            }

        return {"allowed": True, "usage": usage, "limits": limits}

    async def _increment_company_usage(
        self,
        company_id: str,
        increments: dict[str, int],
        options: dict[str, Any] | None = None,
    ) -> None:
        """Increment company usage counters."""
        request_increment = max(0, int(increments.get("requests") or 0))
        token_increment = max(0, int(increments.get("tokens") or 0))

        provider = str((options or {}).get("provider") or "UNKNOWN").upper()
        model = str((options or {}).get("model") or "default")
        price = get_model_cost(model)
        cached_tokens = max(0, int(increments.get("cached_tokens") or increments.get("prompt_cache_hit_tokens") or 0))
        standard_tokens = max(0, token_increment - cached_tokens)
        cache_price = price.get("cache_input", price["input"] * 0.1)
        estimated_cost = (standard_tokens * price["input"]) + (cached_tokens * cache_price)

        now = int((options or {}).get("now") or time.time() * 1000)
        windows = self._get_window_keys(BudgetIdentity(provider="", model="", key_id="", hash=f"company:{company_id}", raw=""), now)
        company_key = f"{PREFIX}:company:{company_id}:day:{windows.day_bucket}"

        current_raw = await self._read_cache(company_key)
        current = {
            "requests": int((current_raw or {}).get("requests") or 0),
            "tokens": int((current_raw or {}).get("tokens") or 0),
            "cost": float((current_raw or {}).get("cost") or 0.0),
        } if current_raw else {"requests": 0, "tokens": 0, "cost": 0.0}

        day_usage = {
            "requests": current["requests"] + request_increment,
            "tokens": current["tokens"] + token_increment,
            "cost": round(current["cost"] + estimated_cost, 6),
        }

        ttl_seconds = int((windows.day_reset_at - now) / 1000) + 60
        await self._write_cache(company_key, day_usage, ttl_seconds)

    async def _trigger_budget_notification(
        self,
        company_id: str,
        status: dict[str, Any],
        now_ms: int | None = None,
        db_session: Any | None = None,
    ) -> None:
        """Send budget exceeded notification to company."""
        try:
            now = now_ms or int(time.time() * 1000)
            windows = self._get_window_keys(BudgetIdentity(provider="", model="", key_id="", hash=f"company:{company_id}", raw=""), now)
            lock_key = f"{PREFIX}:company:{company_id}:notified:{windows.day_bucket}"

            already_notified = await self._read_cache(lock_key)
            if already_notified:
                return

            if db_session is not None:
                from sqlalchemy import text
                await db_session.execute(
                    text("""
                        INSERT INTO ai.ai_notification
                        (company_id, type, severity, title, message, metadata, created_at)
                        VALUES (:company_id, :type, :severity, :title, :message, :metadata, NOW())
                    """),
                    {
                        "company_id": company_id,
                        "type": BUDGET_EXCEEDED_NOTIFICATION_TYPE,
                        "severity": "high",
                        "title": "تجميد باقة الذكاء الاصطناعي - تجاوز الميزانية اليومية",
                        "message": f"تم تجميد استهلاك باقة الذكاء الاصطناعي للشركة لتجاوزها الميزانية المحددة يومياً ({status.get('limit')} وحدة). يرجى شحن الرصيد أو زيادة الحدود من لوحة التحكم.",
                        "metadata": __import__("json").dumps({
                            "reason": status.get("reason"),
                            "limit": status.get("limit"),
                            "current": status.get("current"),
                            "resetAt": datetime.fromtimestamp(status.get("resetAt", 0) / 1000, tz=UTC).isoformat() if status.get("resetAt") else None,
                        }),
                    },
                )
                await db_session.commit()

            ttl_seconds = int((windows.day_reset_at - now) / 1000) + 60
            await self._write_cache(lock_key, True, ttl_seconds)
            self._log.info("budget notification sent", company_id=company_id)

        except Exception as exc:
            self._log.warning("budget notification failed", company_id=company_id, error=str(exc))

    async def can_route(self, selection: dict[str, Any] | None, options: dict[str, Any] | None = None) -> AllowedStatus:
        """
        Main entry point: check if a request can be routed based on budget.

        Checks:
        1. Company daily budget (token limit, cost limit)
        2. Provider limits (RPM, RPD, TPM, TPD)
        3. Penalty/cooldown state
        """
        options = options or {}
        selection = selection or {}
        company_id = selection.get("companyId") or options.get("companyId")

        if company_id:
            estimated_tokens = self._normalize_token_count(options)
            now = options.get("now") or time.time() * 1000
            budget_status = await self._is_within_daily_budget(company_id, estimated_tokens, now)
            if not budget_status.get("allowed"):
                await self._trigger_budget_notification(company_id, budget_status, now)
                limits = {"dailyTokenLimit": budget_status.get("limit")}
                usage = {
                    "minute": {"requests": 0, "tokens": 0},
                    "day": {"tokens": budget_status.get("current", 0), "requests": 0},
                    "identity": {"hash": f"company:{company_id}"},
                }
                return self._build_denied_status(
                    "BUDGET_EXCEEDED",
                    limits,
                    usage,
                    budget_status.get("reset_at"),
                    {"company_id": company_id, "error": "BUDGET_EXCEEDED"},
                )

        limits = self.parse_provider_limits(selection)
        if not self._has_limits(limits):
            return self._build_allowed_status(selection, limits, None)

        estimated_tokens = self._normalize_token_count(options)
        now = options.get("now")
        identity = self._get_budget_identity(selection)
        windows = self._get_window_keys(identity, now) if now else None
        usage = await self._get_usage(selection, windows=windows)
        penalty = await self._get_penalty(selection, options)

        if penalty:
            return self._build_denied_status(
                "PENALTY_COOLDOWN",
                limits,
                usage,
                penalty.get("retryAt"),
                {"penalty_reason": penalty.get("reason"), "penalty_score": penalty.get("score")},
            )

        w = usage["windows"]

        if limits.get("rpm") and usage["minute"].requests + 1 >= limits["rpm"]:
            return self._build_denied_status("RPM_LIMIT", limits, usage, w.minute_reset_at)

        if limits.get("rpd") and usage["day"].requests + 1 >= limits["rpd"]:
            return self._build_denied_status("RPD_LIMIT", limits, usage, w.day_reset_at)

        if limits.get("tpm") and usage["minute"].tokens + estimated_tokens >= limits["tpm"]:
            return self._build_denied_status(
                "TPM_LIMIT", limits, usage, w.minute_reset_at, {"estimated_tokens": estimated_tokens}
            )

        if limits.get("tpd") and usage["day"].tokens + estimated_tokens >= limits["tpd"]:
            return self._build_denied_status(
                "TPD_LIMIT", limits, usage, w.day_reset_at, {"estimated_tokens": estimated_tokens}
            )

        return self._build_allowed_status(selection, limits, usage)

    async def get_budget_snapshot(
        self, selection: dict[str, Any] | None, options: dict[str, Any] | None = None
    ) -> BudgetSnapshot:
        """Get full budget status snapshot."""
        limits = self.parse_provider_limits(selection)
        usage = await self._get_usage(selection)
        penalty = await self._get_penalty(selection, options)
        route_status = await self.can_route(selection, {**(options or {}), "estimatedTokens": (options or {}).get("estimatedTokens", 0)})

        return BudgetSnapshot(
            limited=self._has_limits(limits),
            allowed=route_status.allowed,
            reason=route_status.reason,
            retry_after_seconds=route_status.retry_after_seconds,
            limits=limits,
            usage={
                "minute": usage["minute"],
                "day": usage["day"],
            },
            penalty={
                "reason": penalty.get("reason"),
                "retryAt": penalty.get("retryAt"),
                "retryAfterMs": penalty.get("retryAfterMs"),
            } if penalty else None,
            budget_key=usage["identity"].hash,
        )

    async def increment_usage(
        self, selection: dict[str, Any] | None, increments: dict[str, int], options: dict[str, Any] | None = None
    ) -> UsageIncrementResult:
        """Record usage increments for a provider."""
        options = options or {}
        selection = selection or {}
        limits = self.parse_provider_limits(selection)
        company_id = selection.get("companyId") or options.get("companyId")

        if company_id:
            await self._increment_company_usage(
                company_id,
                increments,
                {
                    **options,
                    "provider": selection.get("provider") or options.get("provider"),
                    "model": selection.get("modelName") or selection.get("model") or options.get("model"),
                },
            )

        if not self._has_limits(limits):
            return UsageIncrementResult(recorded=False, reason="NO_LIMITS_CONFIGURED", limits={}, usage={"minute": {}, "day": {}}, budget_key="")

        request_increment = max(0, int(increments.get("requests") or 0))
        token_increment = max(0, int(increments.get("tokens") or 0))
        usage = await self._get_usage(selection)
        minute = {
            "requests": usage["minute"].requests + request_increment,
            "tokens": usage["minute"].tokens + token_increment,
        }
        day = {
            "requests": usage["day"].requests + request_increment,
            "tokens": usage["day"].tokens + token_increment,
        }
        now = int(options.get("now") or time.time() * 1000)
        w = usage["windows"]

        await asyncio.gather(
            self._write_cache(w.minute, minute, int((w.minute_reset_at - now) / 1000) + 5),
            self._write_cache(w.day, day, int((w.day_reset_at - now) / 1000) + 60),
        )

        return UsageIncrementResult(
            recorded=True,
            limits=limits,
            usage={"minute": minute, "day": day},
            budget_key=usage["identity"].hash,
            tokens=token_increment,
            requests=request_increment,
        )

    async def record_attempt(self, selection: dict[str, Any] | None, context: dict[str, Any] | None = None) -> UsageIncrementResult:
        """Record an attempt (request + estimated tokens)."""
        context = context or {}
        estimated_tokens = self._normalize_token_count(context)
        return await self.increment_usage(selection, {"requests": 1, "tokens": estimated_tokens}, context)

    async def record_usage(self, selection: dict[str, Any] | None, context: dict[str, Any] | None = None) -> UsageIncrementResult:
        """Record actual usage from response."""
        context = context or {}
        total_tokens = self._normalize_token_count(context)
        reserved = self._normalize_token_count((selection or {}).get("budgetReservation") or context.get("reservedTokens") or {})
        request_already_recorded = bool(context.get("requestAlreadyRecorded") or (selection or {}).get("budgetReservation", {}).get("recorded"))
        token_increment = total_tokens - reserved if request_already_recorded else total_tokens

        return await self.increment_usage(
            selection,
            {"requests": 0 if request_already_recorded else 1, "tokens": max(0, token_increment)},
            context,
        )

    async def record_penalty(self, selection: dict[str, Any] | None, context: dict[str, Any] | None = None) -> dict[str, Any]:
        """Record a penalty (rate limit violation)."""
        context = context or {}
        limits = self.parse_provider_limits(selection)
        if not self._has_limits(limits):
            return {"recorded": False, "reason": "NO_LIMITS_CONFIGURED"}

        retry_after_ms = max(1000, int(context.get("retryAfterMs") if context.get("retryAfterMs") is not None else 30000))
        now = int(context.get("now") or time.time() * 1000)
        retry_at = now + retry_after_ms

        identity = self._get_budget_identity(selection)
        existing = await self._read_cache(self._get_penalty_key(identity))

        score = BASE_SCORE
        if existing and isinstance(existing, dict) and "score" in existing:
            recorded_at = int(existing.get("recordedAt") or now)
            elapsed = max(0, now - recorded_at)
            recovered = elapsed * RECOVERY_RATE / MAX_PENALTY_TTL_MS
            score = min(BASE_SCORE, existing["score"] + recovered)

        score = max(0, score - PENALTY_DECAY)
        effective_ttl_ms = min(retry_after_ms, MAX_PENALTY_TTL_MS)
        new_retry_at = retry_at if score <= SCORE_THRESHOLD else None

        await self._write_cache(
            self._get_penalty_key(identity),
            {
                "reason": context.get("reason") or "429",
                "retryAfterMs": effective_ttl_ms,
                "retryAt": new_retry_at,
                "score": score,
                "recordedAt": now,
            },
            int(max(effective_ttl_ms, 60000) / 1000),
        )

        return {
            "recorded": True,
            "budgetKey": identity.hash,
            "retryAt": new_retry_at,
            "retryAfterMs": effective_ttl_ms if new_retry_at else None,
            "score": score,
            "recordedAt": now,
        }

    def reset_for_tests(self) -> None:
        """Clear local cache (for testing)."""
        self._local_cache.clear()


budget_ledger = BudgetLedgerService()
