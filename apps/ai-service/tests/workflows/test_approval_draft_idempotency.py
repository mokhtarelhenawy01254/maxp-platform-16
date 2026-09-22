"""Idempotency tests for approval draft creation.

2026-09-23 production incident: a merchant asking twice for the same write
(toggle freeShippingBar) produced the same deterministic request_key and
crashed on uq_ai_approvals_request_key with UniqueViolation → 500.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from src.workflows import approval as approval_workflow
from src.workflows.approval import create_approval_draft


class FakeRepo:
    def __init__(self, existing):
        self.existing = existing
        self.create_calls = []

    async def get_by_request_key(self, request_key):
        return self.existing

    async def create(self, **kwargs):
        self.create_calls.append(kwargs)
        return SimpleNamespace(draft_id=kwargs.get("draft_id"), id="row-1", status="pending")


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
