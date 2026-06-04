from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.workflows.approval import create_approval_draft, execute_approved_action


@pytest.fixture
def mock_session():
    session = AsyncMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.add = MagicMock()
    return session


@pytest.mark.asyncio
async def test_create_approval_draft_success(mock_session):
    thread_uuid = uuid.uuid4()
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=thread_uuid)
    )

    mock_client = AsyncMock()
    mock_client.create_draft = AsyncMock(
        return_value={"draft_id": "draft_456", "status": "pending"}
    )

    with patch("src.workflows.approval.get_maxp_client", return_value=mock_client):
        result = await create_approval_draft(
            action_type="discount.create",
            action_args={"percent": 15},
            company_id="comp1",
            customer_id="cust1",
            thread_id="comp1:cust1:chat",
            session=mock_session,
        )

    assert result["draft_id"] == "draft_456"
    assert result["status"] == "pending"
    mock_client.create_draft.assert_awaited_once_with(
        company_id="comp1",
        action_type="discount.create",
        action_args={"percent": 15},
        thread_id="comp1:cust1:chat",
    )


@pytest.mark.asyncio
async def test_create_approval_draft_no_draft_id(mock_session):
    mock_client = AsyncMock()
    mock_client.create_draft = AsyncMock(return_value={})

    with patch("src.workflows.approval.get_maxp_client", return_value=mock_client):
        with pytest.raises(RuntimeError, match="Failed to create draft"):
            await create_approval_draft(
                action_type="discount.create",
                action_args={},
                company_id="comp1",
                customer_id="cust1",
                thread_id="comp1:cust1:chat",
                session=mock_session,
            )


@pytest.mark.asyncio
async def test_execute_approved_action_success(mock_session):
    approval = MagicMock()
    approval.draft_id = "draft_123"
    approval.status = "approved"
    approval.company_id = "comp1"
    approval.action_type = "discount.create"
    approval.action_args = {"percent": 10}
    approval.thread_id = uuid.uuid4()

    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=approval)
    )

    mock_client = AsyncMock()
    mock_client.call_tool = AsyncMock(
        return_value={"status": "ok", "result": "discount applied"}
    )

    with patch("src.workflows.approval.get_maxp_client", return_value=mock_client):
        result = await execute_approved_action(
            draft_id="draft_123",
            session=mock_session,
        )

    assert result["status"] == "ok"
    assert result["result"] == "discount applied"
    mock_client.call_tool.assert_awaited_once()


@pytest.mark.asyncio
async def test_execute_approved_action_not_found(mock_session):
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=None)
    )

    with pytest.raises(ValueError, match="Approval not found"):
        await execute_approved_action(
            draft_id="nonexistent",
            session=mock_session,
        )


@pytest.mark.asyncio
async def test_execute_approved_action_not_approved(mock_session):
    approval = MagicMock()
    approval.draft_id = "draft_123"
    approval.status = "pending"

    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=approval)
    )

    with pytest.raises(ValueError, match="not approved"):
        await execute_approved_action(
            draft_id="draft_123",
            session=mock_session,
        )
