"""
Tests for billing/ledger.py - Sprint 3 Budget Ledger Migration.
"""

from __future__ import annotations

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
import time

from src.billing.ledger import (
    BudgetLedgerService,
    budget_ledger,
    BudgetIdentity,
    WindowKeys,
    WindowUsage,
    CompanyBudgetLimits,
    ProviderLimits,
    AllowedStatus,
    BudgetSnapshot,
    UsageIncrementResult,
    LIMIT_ALIASES,
    PREFIX,
    SCORE_THRESHOLD,
    BASE_SCORE,
    PENALTY_DECAY,
    MAX_PENALTY_TTL_MS,
    get_model_cost,
)


@pytest.fixture
def ledger() -> BudgetLedgerService:
    service = BudgetLedgerService()
    yield service
    service.reset_for_tests()


class TestLimitAliases:
    def test_limit_aliases_defined(self):
        assert "rpm" in LIMIT_ALIASES
        assert "rpd" in LIMIT_ALIASES
        assert "tpm" in LIMIT_ALIASES
        assert "tpd" in LIMIT_ALIASES
        assert "rpm" in LIMIT_ALIASES["rpm"]
        assert "rpd" in LIMIT_ALIASES["rpd"]

    def test_limit_aliases_case_variations(self):
        aliases = LIMIT_ALIASES["rpm"]
        assert "requestsPerMinute" in aliases
        assert "requests_per_minute" in aliases
        assert "minuteRequests" in aliases


class TestBudgetIdentity:
    def test_budget_identity_generation(self, ledger: BudgetLedgerService):
        selection = {
            "provider": "openai",
            "modelName": "gpt-4o",
            "id": "key-123",
        }
        identity = ledger._get_budget_identity(selection)
        assert identity.provider == "OPENAI"
        assert identity.model == "gpt-4o"
        assert identity.key_id == "key-123"
        assert len(identity.hash) == 40
        assert identity.raw == "OPENAI:gpt-4o:key-123"

    def test_budget_identity_defaults(self, ledger: BudgetLedgerService):
        identity = ledger._get_budget_identity(None)
        assert identity.provider == "UNKNOWN"
        assert identity.model == "unknown-model"
        assert identity.key_id == "unknown-key"

    def test_budget_identity_hash_stability(self, ledger: BudgetLedgerService):
        selection = {"provider": "openai", "modelName": "gpt-4o", "id": "key-123"}
        id1 = ledger._get_budget_identity(selection)
        id2 = ledger._get_budget_identity(selection)
        assert id1.hash == id2.hash


class TestWindowKeys:
    def test_window_keys_generation(self, ledger: BudgetLedgerService):
        identity = BudgetIdentity(
            provider="OPENAI", model="gpt-4o", key_id="key-123",
            hash="abc123", raw="OPENAI:gpt-4o:key-123"
        )
        now_ms = int(time.time() * 1000)
        windows = ledger._get_window_keys(identity, now_ms)
        assert windows.minute.startswith(f"{PREFIX}:usage:abc123:minute:")
        assert windows.day.startswith(f"{PREFIX}:usage:abc123:day:")
        assert windows.minute_reset_at > now_ms
        assert windows.day_reset_at > now_ms
        assert windows.minute_bucket == now_ms // 60000

    def test_window_keys_different_buckets(self, ledger: BudgetLedgerService):
        identity = BudgetIdentity(
            provider="ANTHROPIC", model="claude-3", key_id="key-456",
            hash="def456", raw="ANTHROPIC:claude-3:key-456"
        )
        now1 = 1700000000000
        now2 = 1700000060000
        w1 = ledger._get_window_keys(identity, now1)
        w2 = ledger._get_window_keys(identity, now2)
        assert w1.minute_bucket != w2.minute_bucket


class TestNormalizeLimits:
    def test_normalize_limit_value_valid(self, ledger: BudgetLedgerService):
        assert ledger._normalize_limit_value(100) == 100
        assert ledger._normalize_limit_value("200") == 200
        assert ledger._normalize_limit_value(300.7) == 300

    def test_normalize_limit_value_invalid(self, ledger: BudgetLedgerService):
        assert ledger._normalize_limit_value(None) is None
        assert ledger._normalize_limit_value("") is None
        assert ledger._normalize_limit_value(-1) is None
        assert ledger._normalize_limit_value(0) is None
        assert ledger._normalize_limit_value("abc") is None

    def test_normalize_limits_from_object(self, ledger: BudgetLedgerService):
        source = {
            "rpm": 100,
            "rpd": 5000,
            "tokensPerMinute": 10000,
        }
        limits = ledger._normalize_limits_from_object(source)
        assert limits["rpm"] == 100
        assert limits["rpd"] == 5000
        assert limits["tpm"] == 10000

    def test_merge_limits(self, ledger: BudgetLedgerService):
        current = {"rpm": 200, "rpd": 5000}
        incoming = {"rpm": 100, "tpm": 50000}
        merged = ledger._merge_limits(current, incoming)
        assert merged["rpm"] == 100
        assert merged["rpd"] == 5000
        assert merged["tpm"] == 50000


class TestParseProviderLimits:
    def test_parse_limits_from_selection(self, ledger: BudgetLedgerService):
        selection = {
            "provider": "openai",
            "modelName": "gpt-4o",
            "limits": {"rpm": 100, "rpd": 5000},
        }
        limits = ledger.parse_provider_limits(selection)
        assert limits["rpm"] == 100
        assert limits["rpd"] == 5000

    def test_parse_limits_from_rate_limits(self, ledger: BudgetLedgerService):
        selection = {
            "provider": "anthropic",
            "rateLimits": {"tpm": 100000, "tpd": 1000000},
        }
        limits = ledger.parse_provider_limits(selection)
        assert limits["tpm"] == 100000
        assert limits["tpd"] == 1000000

    def test_parse_limits_from_nested_usage(self, ledger: BudgetLedgerService):
        selection = {
            "provider": "google",
            "usage": '{"rpm": 50, "requestsPerDay": 2000}',
        }
        limits = ledger.parse_provider_limits(selection)
        assert limits["rpm"] == 50
        assert limits["rpd"] == 2000

    def test_parse_limits_max_requests_per_day(self, ledger: BudgetLedgerService):
        selection = {"maxRequestsPerDay": 3000}
        limits = ledger.parse_provider_limits(selection)
        assert limits["rpd"] == 3000

    def test_parse_limits_empty_selection(self, ledger: BudgetLedgerService):
        assert ledger.parse_provider_limits(None) == {}
        assert ledger.parse_provider_limits({}) == {}


class TestHasLimits:
    def test_has_limits_true(self, ledger: BudgetLedgerService):
        assert ledger._has_limits({"rpm": 100}) is True
        assert ledger._has_limits({"rpm": 0}) is False

    def test_has_limits_false(self, ledger: BudgetLedgerService):
        assert ledger._has_limits(None) is False
        assert ledger._has_limits({}) is False
        assert ledger._has_limits({"rpm": 0, "rpd": 0}) is False


class TestCanRoute:
    @pytest.mark.asyncio
    async def test_can_route_no_limits(self, ledger: BudgetLedgerService):
        selection = {"provider": "openai", "modelName": "gpt-4o", "id": "key-1"}
        status = await ledger.can_route(selection, {})
        assert status.allowed is True
        assert status.limited is False

    @pytest.mark.asyncio
    async def test_can_route_rpm_exceeded(self, ledger: BudgetLedgerService):
        now_ms = int(time.time() * 1000)
        minute_bucket = now_ms // 60000
        identity = ledger._get_budget_identity({
            "provider": "openai", "modelName": "gpt-4o", "id": "key-rpm"
        })
        await ledger._write_cache(
            f"{PREFIX}:usage:{identity.hash}:minute:{minute_bucket}",
            {"requests": 99, "tokens": 5000},
            65,
        )
        selection = {
            "provider": "openai",
            "modelName": "gpt-4o",
            "id": "key-rpm",
            "limits": {"rpm": 100},
        }
        status = await ledger.can_route(selection, {"now": now_ms})
        assert status.allowed is False
        assert status.reason == "RPM_LIMIT"
        assert status.limited is True

    @pytest.mark.asyncio
    async def test_can_route_rpd_exceeded(self, ledger: BudgetLedgerService):
        now_ms = int(time.time() * 1000)
        day_bucket = "2024-01-01"
        identity = ledger._get_budget_identity({
            "provider": "openai", "modelName": "gpt-4o", "id": "key-rpd"
        })
        await ledger._write_cache(
            f"{PREFIX}:usage:{identity.hash}:day:{day_bucket}",
            {"requests": 9999, "tokens": 500000},
            90000,
        )
        selection = {
            "provider": "openai",
            "modelName": "gpt-4o",
            "id": "key-rpd",
            "limits": {"rpd": 10000},
        }
        status = await ledger.can_route(selection, {"now": now_ms})
        assert status.allowed is False
        assert status.reason == "RPD_LIMIT"

    @pytest.mark.asyncio
    async def test_can_route_tpm_exceeded(self, ledger: BudgetLedgerService):
        now_ms = int(time.time() * 1000)
        minute_bucket = now_ms // 60000
        identity = ledger._get_budget_identity({
            "provider": "google", "modelName": "gemini-pro", "id": "key-tpm"
        })
        await ledger._write_cache(
            f"{PREFIX}:usage:{identity.hash}:minute:{minute_bucket}",
            {"requests": 5, "tokens": 99000},
            65,
        )
        selection = {
            "provider": "google",
            "modelName": "gemini-pro",
            "id": "key-tpm",
            "limits": {"tpm": 100000},
        }
        status = await ledger.can_route(selection, {"now": now_ms, "estimatedTokens": 5000})
        assert status.allowed is False
        assert status.reason == "TPM_LIMIT"

    @pytest.mark.asyncio
    async def test_can_route_tpd_exceeded(self, ledger: BudgetLedgerService):
        now_ms = int(time.time() * 1000)
        day_bucket = "2024-01-01"
        identity = ledger._get_budget_identity({
            "provider": "anthropic", "modelName": "claude-3", "id": "key-tpd"
        })
        await ledger._write_cache(
            f"{PREFIX}:usage:{identity.hash}:day:{day_bucket}",
            {"requests": 100, "tokens": 990000},
            90000,
        )
        selection = {
            "provider": "anthropic",
            "modelName": "claude-3",
            "id": "key-tpd",
            "limits": {"tpd": 1000000},
        }
        status = await ledger.can_route(selection, {"now": now_ms, "estimatedTokens": 50000})
        assert status.allowed is False
        assert status.reason == "TPD_LIMIT"

    @pytest.mark.asyncio
    async def test_can_route_penalty_cooldown(self, ledger: BudgetLedgerService):
        selection = {
            "provider": "openai",
            "modelName": "gpt-4o",
            "id": "key-penalty",
            "limits": {"rpm": 100},
        }
        await ledger.record_penalty(selection, {"reason": "429", "retryAfterMs": 30000})
        status = await ledger.can_route(selection)
        assert status.allowed is False
        assert status.reason == "PENALTY_COOLDOWN"
        assert status.penalty_reason == "429"

    @pytest.mark.asyncio
    async def test_can_route_within_limits(self, ledger: BudgetLedgerService):
        selection = {
            "provider": "openai",
            "modelName": "gpt-4o",
            "id": "key-ok",
            "limits": {"rpm": 100, "tpm": 100000},
        }
        status = await ledger.can_route(selection, {"estimatedTokens": 1000})
        assert status.allowed is True
        assert status.limited is True


class TestIncrementUsage:
    @pytest.mark.asyncio
    async def test_increment_usage_basic(self, ledger: BudgetLedgerService):
        selection = {
            "provider": "openai",
            "modelName": "gpt-4o",
            "id": "key-inc",
            "limits": {"rpm": 1000},
        }
        result = await ledger.increment_usage(selection, {"requests": 1, "tokens": 500}, {})
        assert result.recorded is True
        assert result.tokens == 500
        assert result.requests == 1
        assert "minute" in result.usage
        assert "day" in result.usage

    @pytest.mark.asyncio
    async def test_increment_usage_no_limits(self, ledger: BudgetLedgerService):
        selection = {"provider": "openai", "modelName": "gpt-4o", "id": "key-nolimit"}
        result = await ledger.increment_usage(selection, {"requests": 1, "tokens": 100}, {})
        assert result.recorded is False
        assert result.reason == "NO_LIMITS_CONFIGURED"

    @pytest.mark.asyncio
    async def test_increment_usage_accumulates(self, ledger: BudgetLedgerService):
        selection = {
            "provider": "google",
            "modelName": "gemini",
            "id": "key-acc",
            "limits": {"rpm": 10000},
        }
        await ledger.increment_usage(selection, {"requests": 1, "tokens": 100}, {})
        result = await ledger.increment_usage(selection, {"requests": 1, "tokens": 200}, {})
        assert result.usage["minute"]["requests"] == 2
        assert result.usage["minute"]["tokens"] == 300


class TestRecordAttempt:
    @pytest.mark.asyncio
    async def test_record_attempt(self, ledger: BudgetLedgerService):
        selection = {
            "provider": "openai",
            "modelName": "gpt-4o",
            "id": "key-attempt",
            "limits": {"rpm": 1000},
        }
        result = await ledger.record_attempt(selection, {"estimatedTokens": 500})
        assert result.recorded is True
        assert result.requests == 1
        assert result.tokens == 500


class TestRecordUsage:
    @pytest.mark.asyncio
    async def test_record_usage_basic(self, ledger: BudgetLedgerService):
        selection = {
            "provider": "anthropic",
            "modelName": "claude-3",
            "id": "key-usage",
            "limits": {"rpm": 500},
        }
        result = await ledger.record_usage(selection, {
            "totalTokens": 1000,
            "estimatedTokens": 800,
        })
        assert result.recorded is True
        assert result.requests == 1

    @pytest.mark.asyncio
    async def test_record_usage_reserved_tokens(self, ledger: BudgetLedgerService):
        selection = {
            "provider": "openai",
            "modelName": "gpt-4o",
            "id": "key-reserved",
            "limits": {"rpm": 500},
            "budgetReservation": {"recorded": True, "totalTokens": 500},
        }
        result = await ledger.record_usage(selection, {
            "totalTokens": 1000,
            "reservedTokens": {"totalTokens": 500},
            "requestAlreadyRecorded": False,
        })
        assert result.recorded is True
        assert result.tokens == 500


class TestRecordPenalty:
    @pytest.mark.asyncio
    async def test_record_penalty_basic(self, ledger: BudgetLedgerService):
        selection = {
            "provider": "openai",
            "modelName": "gpt-4o",
            "id": "key-pen",
            "limits": {"rpm": 100},
        }
        result = await ledger.record_penalty(selection, {"reason": "429", "retryAfterMs": 30000})
        assert result["recorded"] is True
        assert result["score"] < BASE_SCORE
        assert "retryAt" in result

    @pytest.mark.asyncio
    async def test_record_penalty_no_limits(self, ledger: BudgetLedgerService):
        selection = {"provider": "openai", "modelName": "gpt-4o", "id": "key-nolimit-p"}
        result = await ledger.record_penalty(selection, {"reason": "429"})
        assert result["recorded"] is False
        assert result["reason"] == "NO_LIMITS_CONFIGURED"

    @pytest.mark.asyncio
    async def test_record_penalty_score_decay(self, ledger: BudgetLedgerService):
        selection = {
            "provider": "openai",
            "modelName": "gpt-4o",
            "id": "key-decay",
            "limits": {"rpm": 100},
        }
        r1 = await ledger.record_penalty(selection, {"reason": "429", "retryAfterMs": 30000})
        r2 = await ledger.record_penalty(selection, {"reason": "429", "retryAfterMs": 30000})
        assert r2["score"] < r1["score"]


class TestGetBudgetSnapshot:
    @pytest.mark.asyncio
    async def test_get_budget_snapshot_allowed(self, ledger: BudgetLedgerService):
        selection = {
            "provider": "openai",
            "modelName": "gpt-4o",
            "id": "key-snap",
            "limits": {"rpm": 1000},
        }
        snapshot = await ledger.get_budget_snapshot(selection, {"estimatedTokens": 500})
        assert snapshot.allowed is True
        assert snapshot.limited is True
        assert snapshot.reason is None
        assert snapshot.budget_key is not None

    @pytest.mark.asyncio
    async def test_get_budget_snapshot_denied(self, ledger: BudgetLedgerService):
        now_ms = int(time.time() * 1000)
        minute_bucket = now_ms // 60000
        identity = ledger._get_budget_identity({
            "provider": "openai", "modelName": "gpt-4o", "id": "key-snap-deny"
        })
        await ledger._write_cache(
            f"{PREFIX}:usage:{identity.hash}:minute:{minute_bucket}",
            {"requests": 99, "tokens": 5000},
            65,
        )
        selection = {
            "provider": "openai",
            "modelName": "gpt-4o",
            "id": "key-snap-deny",
            "limits": {"rpm": 100},
        }
        snapshot = await ledger.get_budget_snapshot(selection, {"now": now_ms})
        assert snapshot.allowed is False
        assert snapshot.reason == "RPM_LIMIT"
        assert snapshot.retry_after_seconds is not None


class TestGetCompanyLimits:
    @pytest.mark.asyncio
    async def test_get_company_limits_default(self, ledger: BudgetLedgerService):
        limits = await ledger.get_company_limits("company-xyz", db_session=None)
        assert limits.daily_token_limit == 500_000
        assert limits.daily_cost_limit == 50.0


class TestModelCost:
    def test_get_model_cost_known(self):
        cost = get_model_cost("gemini-2.5-flash")
        assert cost["input"] == 0.000075
        assert cost["output"] == 0.0003

    def test_get_model_cost_unknown(self):
        cost = get_model_cost("unknown-model-xyz")
        assert cost["input"] == 0.00001
        assert cost["output"] == 0.00003


class TestLocalCache:
    def test_local_cache_set_get(self, ledger: BudgetLedgerService):
        ledger._local_cache.set("test-key", {"value": 42}, 60)
        result = ledger._local_cache.get("test-key")
        assert result == {"value": 42}

    def test_local_cache_expiry(self, ledger: BudgetLedgerService):
        ledger._local_cache.set("expire-key", {"value": 1}, 0)
        import time
        time.sleep(0.02)
        assert ledger._local_cache.get("expire-key") is None

    def test_local_cache_clear(self, ledger: BudgetLedgerService):
        ledger._local_cache.set("k1", "v1", 60)
        ledger._local_cache.set("k2", "v2", 60)
        ledger._local_cache.clear()
        assert ledger._local_cache.get("k1") is None
        assert ledger._local_cache.get("k2") is None


class TestBudgetLedgerSingleton:
    def test_budget_ledger_singleton(self):
        assert budget_ledger is not None
        assert isinstance(budget_ledger, BudgetLedgerService)


class TestNormalizeTokenCount:
    def test_normalize_token_count_direct(self, ledger: BudgetLedgerService):
        assert ledger._normalize_token_count(500) == 500
        assert ledger._normalize_token_count(0) == 0

    def test_normalize_token_count_dict(self, ledger: BudgetLedgerService):
        assert ledger._normalize_token_count({"totalTokens": 1000}) == 1000
        assert ledger._normalize_token_count({"tokens": 500}) == 500

    def test_normalize_token_count_nested(self, ledger: BudgetLedgerService):
        assert ledger._normalize_token_count({"usage": {"totalTokens": 2000}}) == 2000
        assert ledger._normalize_token_count({"usage": {"tokens": 1500}}) == 1500

    def test_normalize_token_count_invalid(self, ledger: BudgetLedgerService):
        assert ledger._normalize_token_count(None) == 0
        assert ledger._normalize_token_count("abc") == 0
        assert ledger._normalize_token_count({}) == 0


class TestBudgetIdentityObject:
    def test_budget_identity_dataclass(self):
        identity = BudgetIdentity(
            provider="OPENAI",
            model="gpt-4o",
            key_id="key-123",
            hash="abc123",
            raw="OPENAI:gpt-4o:key-123",
        )
        assert identity.provider == "OPENAI"
        assert identity.model == "gpt-4o"
        assert identity.key_id == "key-123"


class TestWindowUsageDataclass:
    def test_window_usage_defaults(self):
        usage = WindowUsage()
        assert usage.requests == 0
        assert usage.tokens == 0

    def test_window_usage_custom(self):
        usage = WindowUsage(requests=10, tokens=5000)
        assert usage.requests == 10
        assert usage.tokens == 5000


class TestCompanyBudgetLimitsDataclass:
    def test_company_budget_defaults(self):
        limits = CompanyBudgetLimits()
        assert limits.daily_token_limit == 500_000
        assert limits.daily_cost_limit == 50.0


class TestGetPenaltyKey:
    def test_penalty_key_format(self, ledger: BudgetLedgerService):
        identity = BudgetIdentity(
            provider="OPENAI", model="gpt-4o", key_id="key-123",
            hash="abc123", raw="OPENAI:gpt-4o:key-123"
        )
        key = ledger._get_penalty_key(identity)
        assert key == f"{PREFIX}:penalty:abc123"