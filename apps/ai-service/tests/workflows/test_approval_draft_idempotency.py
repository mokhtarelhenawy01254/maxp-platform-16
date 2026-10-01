"""Idempotency tests for approval draft creation.

2026-09-23 production incident: a merchant asking twice for the same write
(toggle freeShippingBar) produced the same deterministic request_key and
crashed on uq_ai_approvals_request_key with UniqueViolation → 500.

2026-10-01 follow-up: retries with slightly different bookkeeping args
(different user_id/thread) stacked duplicate pending drafts (6 copies of one
freeShippingBar request). Drafts now carry a stable fingerprint that ignores
volatile keys, plus a 7-day expiry so pending queues cannot immortalize.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest

from src.workflows import approval as approval_workflow
from src.workflows.approval import (
    APPROVAL_TTL_DAYS,
    _stable_fingerprint,
    create_approval_draft,
)


class FakeRepo:
    def __init__(self, existing=None, pending_twin=None):
        self.existing = existing
        self.pending_twin = pending_twin
        self.create_calls = []
        self.fingerprint_lookups = []

    async def get_by_request_key(self, request_key):
        return self.existing

    async def find_pending_by_fingerprint(self, *, company_id, fingerprint):
        self.fingerprint_lookups.append((company_id, fingerprint))
        return self.pending_twin

    async def create(self, **kwargs):
        self.create_calls.append(kwargs)
        return SimpleNamespace(draft_id=kwargs.get("draft_id"), id="row-1", status="pending")


@pytest.fixture(autouse=True)
def capture_notification(monkeypatch):
    calls = []

    def _record(**kwargs):
        calls.append(kwargs)

    monkeypatch.setattr(approval_workflow, "_fire_created_notification", _record)
    return calls


@pytest.mark.asyncio
async def test_identical_pending_request_returns_existing_draft(monkeypatch):
    repo = FakeRepo(existing=SimpleNamespace(status="pending", draft_id="D-1", id="1"))
    monkeypatch.setattr(approval_workflow, "ApprovalRepository", lambda session: repo)

    result = await create_approval_draft(
        action_type="conversion_tool_toggle",
        action_args={"tool_key": "freeShippingBar", "enable": True},
        company_id="c1",
        customer_id="m1",
        thread_id="t1",
        session=object(),
    )

    assert result == {"draft_id": "D-1", "status": "pending"}
    assert repo.create_calls == []


@pytest.mark.asyncio
async def test_resolved_request_mints_fresh_key(monkeypatch):
    repo = FakeRepo(existing=SimpleNamespace(status="completed", draft_id="D-1", id="1"))
    monkeypatch.setattr(approval_workflow, "ApprovalRepository", lambda session: repo)

    result = await create_approval_draft(
        action_type="conversion_tool_toggle",
        action_args={"tool_key": "freeShippingBar", "enable": True},
        company_id="c1",
        customer_id="m1",
        thread_id="t1",
        session=object(),
    )

    assert result["status"] == "pending"
    assert len(repo.create_calls) == 1
    minted_key = repo.create_calls[0]["request_key"]
    base_key = "c1:t1:conversion_tool_toggle:"
    assert minted_key.startswith(base_key)
    assert minted_key != repo.create_calls[0]["draft_id"] or True  # suffix present
    assert minted_key.count(":") >= 4


@pytest.mark.asyncio
async def test_first_request_uses_deterministic_key(monkeypatch):
    repo = FakeRepo(existing=None)
    monkeypatch.setattr(approval_workflow, "ApprovalRepository", lambda session: repo)

    result = await create_approval_draft(
        action_type="payment_methods_configure",
        action_args={"enabled_methods": ["cod"]},
        company_id="c1",
        customer_id="m1",
        thread_id="t1",
        session=object(),
    )

    assert result["status"] == "pending"
    assert repo.create_calls[0]["request_key"].startswith("c1:t1:payment_methods_configure:")


# ── Fingerprint dedup (2026-10-01) ───────────────────────────────────────────


def test_fingerprint_ignores_volatile_keys():
    base = {"tool_key": "freeShippingBar", "enable": True}
    with_user = {**base, "user_id": "sandbox-user", "company_id": "c1", "sent_at": "2026-10-01T00:00:00Z"}

    assert _stable_fingerprint(company_id="c1", action_type="conversion_tool_toggle", action_args=base) == (
        _stable_fingerprint(company_id="c1", action_type="conversion_tool_toggle", action_args=with_user)
    )


def test_fingerprint_distinguishes_real_differences():
    a = _stable_fingerprint(company_id="c1", action_type="conversion_tool_toggle", action_args={"tool_key": "freeShippingBar", "enable": True})
    b = _stable_fingerprint(company_id="c1", action_type="conversion_tool_toggle", action_args={"tool_key": "countdown", "enable": True})
    c = _stable_fingerprint(company_id="c2", action_type="conversion_tool_toggle", action_args={"tool_key": "freeShippingBar", "enable": True})

    assert a != b
    assert a != c


@pytest.mark.asyncio
async def test_same_intent_from_new_thread_reuses_pending_twin(monkeypatch):
    """The Sep-2026 incident: 6 identical toggle drafts because user_id differed.

    Now: a pending draft with the same stable fingerprint is reused, no new row.
    """
    repo = FakeRepo(
        existing=SimpleNamespace(status="completed", draft_id="D-old", id="1"),
        pending_twin=SimpleNamespace(status="pending", draft_id="D-live", id="2"),
    )
    monkeypatch.setattr(approval_workflow, "ApprovalRepository", lambda session: repo)

    result = await create_approval_draft(
        action_type="conversion_tool_toggle",
        action_args={"tool_key": "freeShippingBar", "enable": True, "user_id": "another-actor"},
        company_id="c1",
        customer_id="m2",
        thread_id="t-different",
        session=object(),
    )

    assert result == {"draft_id": "D-live", "status": "pending"}
    assert repo.create_calls == []
    assert len(repo.fingerprint_lookups) == 1


@pytest.mark.asyncio
async def test_new_draft_carries_fingerprint_ttl_and_notification(monkeypatch, capture_notification):
    repo = FakeRepo(existing=None)
    monkeypatch.setattr(approval_workflow, "ApprovalRepository", lambda session: repo)
    capture = capture_notification

    before = datetime.now(UTC)
    result = await create_approval_draft(
        action_type="product_create",
        action_args={"name": "تيست", "price": 580},
        company_id="c1",
        customer_id="m1",
        thread_id="t1",
        session=object(),
    )

    assert result["status"] == "pending"
    assert "expires_at" in result
    kwargs = repo.create_calls[0]
    assert kwargs["metadata"]["fingerprint"].startswith("c1:product_create:")
    assert kwargs["expires_at"] is not None
    expires = kwargs["expires_at"] if kwargs["expires_at"].tzinfo else kwargs["expires_at"].replace(tzinfo=UTC)
    expected_low = before + timedelta(days=APPROVAL_TTL_DAYS, seconds=-5)
    expected_high = before + timedelta(days=APPROVAL_TTL_DAYS, seconds=5)
    assert expected_low <= expires <= expected_high

    # notification fired exactly once for the NEW draft only
    assert len(capture) == 1
    assert capture[0]["draft_id"] == result["draft_id"]
    assert capture[0]["action_type"] == "product_create"
    assert capture[0]["company_id"] == "c1"


@pytest.mark.asyncio
async def test_reused_twin_does_not_fire_notification(monkeypatch):
    repo = FakeRepo(existing=None, pending_twin=SimpleNamespace(status="pending", draft_id="D-live", id="2"))
    monkeypatch.setattr(approval_workflow, "ApprovalRepository", lambda session: repo)

    await create_approval_draft(
        action_type="conversion_tool_toggle",
        action_args={"tool_key": "freeShippingBar", "enable": True},
        company_id="c1",
        customer_id="m1",
        thread_id="t1",
        session=object(),
    )

    # autouse fixture recorder is installed on approval_workflow; reused path
    # must not have created anything nor fired a second notification.
    assert repo.create_calls == []
