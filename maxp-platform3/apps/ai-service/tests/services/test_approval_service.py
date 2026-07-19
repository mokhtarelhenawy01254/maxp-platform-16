from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.services.approval_service import ApprovalService


@pytest.fixture
def mock_session():
    session = AsyncMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.add = MagicMock()
    return session


@pytest.fixture
def svc(mock_session):
    return ApprovalService(mock_session, approval_ttl_hours=24)


# ── request_approval ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_request_approval_creates_approval(svc, mock_session):
    thread_uuid = uuid.uuid4()
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=thread_uuid)
    )

    result = await svc.request_approval(
        action_type="discount.create",
        action_args={"product_id": "p1", "discount_percent": 15},
        company_id="comp1",
        customer_id="cust1",
        thread_id="comp1:cust1:chat",
    )

    assert result["status"] == "pending"
    assert "draft_id" in result
    assert "expires_at" in result
    mock_session.add.assert_called_once()
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_request_approval_with_ttl(svc, mock_session):
    thread_uuid = uuid.uuid4()
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=thread_uuid)
    )

    result = await svc.request_approval(
        action_type="order.cancel",
        action_args={"order_id": "o1"},
        company_id="comp1",
        customer_id="cust1",
        thread_id="comp1:cust1:chat",
    )

    approval_obj = mock_session.add.call_args.args[0]
    assert approval_obj.expires_at is not None
    # expires_at should be ~24 hours from now
    now = datetime.now(UTC)
    assert approval_obj.expires_at > now + timedelta(hours=23)
    assert approval_obj.expires_at < now + timedelta(hours=25)


@pytest.mark.asyncio
async def test_request_approval_dispatches_notification(mock_session):
    notifications = []

    async def handler(event_type, payload):
        notifications.append((event_type, payload))

    svc = ApprovalService(mock_session, notification_handler=handler)
    thread_uuid = uuid.uuid4()
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=thread_uuid)
    )

    await svc.request_approval(
        action_type="discount.create",
        action_args={"percent": 10},
        company_id="comp1",
        customer_id="cust1",
        thread_id="comp1:cust1:chat",
    )

    assert len(notifications) == 1
    assert notifications[0][0] == "approval.created"
    assert notifications[0][1]["action_type"] == "discount.create"


# ── approve ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_approve_transitions_and_executes(mock_session):
    svc = ApprovalService(mock_session, approval_ttl_hours=24)

    # Create a fake approved Approval object
    approved_approval = MagicMock()
    approved_approval.draft_id = "draft_123"
    approved_approval.action_type = "discount_create"
    approved_approval.action_args = {"product_id": "p1", "discount_percent": 10}
    approved_approval.company_id = "comp1"

    # Create a fake executing Approval object
    executing_approval = MagicMock()
    executing_approval.draft_id = "draft_123"
    executing_approval.action_type = "discount_create"
    executing_approval.action_args = {"product_id": "p1", "discount_percent": 10}
    executing_approval.company_id = "comp1"

    with patch.object(svc._repo, "transition_status", new_callable=AsyncMock) as mock_transition:
        # First call: pending -> approved; Second call: approved -> executing
        mock_transition.side_effect = [approved_approval, executing_approval]

        with patch.object(svc._repo, "update_status", new_callable=AsyncMock) as mock_update:
            mock_update.return_value = MagicMock()

            with patch("src.services.approval_service.get_tool") as mock_get_tool:
                mock_tool = MagicMock()
                mock_tool.input_model = MagicMock(return_value=MagicMock())
                mock_tool.func = AsyncMock(return_value={"status": "ok", "result": "done"})
                mock_get_tool.return_value = mock_tool

                with patch.object(svc, "_notify", new_callable=AsyncMock):
                    result = await svc.approve(draft_id="draft_123", decided_by="merchant_admin")

    assert result["status"] == "completed"
    mock_get_tool.assert_called_once()


@pytest.mark.asyncio
async def test_approve_tool_not_found(mock_session):
    svc = ApprovalService(mock_session, approval_ttl_hours=24)

    approved_approval = MagicMock()
    approved_approval.draft_id = "draft_123"
    approved_approval.action_type = "nonexistent_tool"
    approved_approval.action_args = {}
    approved_approval.company_id = "comp1"

    executing_approval = MagicMock()
    executing_approval.draft_id = "draft_123"
    executing_approval.action_type = "nonexistent_tool"
    executing_approval.action_args = {}
    executing_approval.company_id = "comp1"

    with patch.object(svc._repo, "transition_status", new_callable=AsyncMock) as mock_transition:
        mock_transition.side_effect = [approved_approval, executing_approval]

        with patch.object(svc._repo, "update_status", new_callable=AsyncMock) as mock_update:
            mock_update.return_value = MagicMock()

            with patch("src.services.approval_service.get_tool", return_value=None):
                with patch.object(svc, "_notify", new_callable=AsyncMock):
                    result = await svc.approve(draft_id="draft_123", decided_by="merchant")

    assert result["status"] == "error"
    assert "No tool handler found" in result["message"]


@pytest.mark.asyncio
async def test_approve_already_approved(svc, mock_session):
    existing = MagicMock()
    existing.draft_id = "draft_123"
    existing.status = "approved"

    # transition_status returns None (already approved by someone else)
    with patch.object(svc._repo, "transition_status", new_callable=AsyncMock) as mock_transition:
        mock_transition.return_value = None

        with patch.object(svc._repo, "get_by_draft_id", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = existing
            result = await svc.approve(draft_id="draft_123", decided_by="merchant")

    assert result["status"] == "already_approved"


# ── reject ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_reject_transitions_status(svc, mock_session):
    approval = MagicMock()
    approval.draft_id = "draft_123"
    approval.action_type = "order_cancel"
    approval.company_id = "comp1"
    approval.reason = None

    with patch.object(svc._repo, "transition_status", new_callable=AsyncMock) as mock_transition:
        mock_transition.return_value = approval

        with patch.object(svc, "_notify", new_callable=AsyncMock):
            result = await svc.reject(draft_id="draft_123", decided_by="merchant", reason="Too risky")

    assert result["status"] == "rejected"


@pytest.mark.asyncio
async def test_reject_not_found_or_already_resolved(svc, mock_session):
    existing = MagicMock()
    existing.draft_id = "draft_123"
    existing.status = "rejected"

    with patch.object(svc._repo, "transition_status", new_callable=AsyncMock) as mock_transition:
        mock_transition.return_value = None  # Already resolved

        with patch.object(svc._repo, "get_by_draft_id", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = existing
            with patch.object(svc, "_notify", new_callable=AsyncMock):
                result = await svc.reject(draft_id="draft_123", decided_by="merchant")

    assert result["status"] == "rejected"


# ── expire_stale_approvals ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_expire_stale_approvals_marks_expired(mock_session):
    svc = ApprovalService(mock_session, approval_ttl_hours=0)  # Immediate expiry for testing

    expired_approval = MagicMock()
    expired_approval.draft_id = "draft_expired"
    expired_approval.action_type = "discount_create"
    expired_approval.company_id = "comp1"
    expired_approval.expires_at = datetime.now(UTC) - timedelta(hours=1)  # Already expired

    with patch.object(svc._repo, "list_by_company", new_callable=AsyncMock) as mock_list:
        mock_list.return_value = [expired_approval]
        with patch.object(svc._repo, "transition_status", new_callable=AsyncMock) as mock_transition:
            with patch.object(svc, "_notify", new_callable=AsyncMock):
                count = await svc.expire_stale_approvals(company_id="comp1")

    assert count == 1
    mock_transition.assert_awaited_once_with(
        draft_id="draft_expired",
        current_status="pending",
        next_status="expired",
    )


@pytest.mark.asyncio
async def test_expire_stale_approvals_no_expired(mock_session):
    svc = ApprovalService(mock_session)

    with patch.object(svc._repo, "list_by_company", new_callable=AsyncMock) as mock_list:
        mock_list.return_value = []
        with patch.object(svc, "_notify", new_callable=AsyncMock):
            count = await svc.expire_stale_approvals(company_id="comp1")

    assert count == 0


@pytest.mark.asyncio
async def test_expire_stale_approvals_skips_valid(mock_session):
    svc = ApprovalService(mock_session)

    valid_approval = MagicMock()
    valid_approval.draft_id = "draft_valid"
    valid_approval.action_type = "discount_create"
    valid_approval.company_id = "comp1"
    valid_approval.expires_at = datetime.now(UTC) + timedelta(hours=12)  # Not expired yet

    with patch.object(svc._repo, "list_by_company", new_callable=AsyncMock) as mock_list:
        mock_list.return_value = [valid_approval]
        with patch.object(svc._repo, "transition_status", new_callable=AsyncMock) as mock_transition:
            with patch.object(svc, "_notify", new_callable=AsyncMock):
                count = await svc.expire_stale_approvals(company_id="comp1")

    assert count == 0
    mock_transition.assert_not_awaited()


# ── notification handler error handling ────────────────────────────────


@pytest.mark.asyncio
async def test_notification_handler_error_does_not_raise(mock_session):
    async def failing_handler(event_type, payload):
        raise RuntimeError("notification failed")

    svc = ApprovalService(mock_session, notification_handler=failing_handler)
    thread_uuid = uuid.uuid4()
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=thread_uuid)
    )

    # Should not raise despite handler failing
    result = await svc.request_approval(
        action_type="discount.create",
        action_args={"percent": 10},
        company_id="comp1",
        customer_id="cust1",
        thread_id="comp1:cust1:chat",
    )
    assert result["status"] == "pending"
