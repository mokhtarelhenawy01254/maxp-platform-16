from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.repo.approval_repo import ApprovalRepository


@pytest.fixture
def mock_session():
    session = AsyncMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.add = MagicMock()
    return session


@pytest.fixture
def repo(mock_session):
    return ApprovalRepository(mock_session)


@pytest.mark.asyncio
async def test_create_approval(repo, mock_session):
    thread_uuid = uuid.uuid4()
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=thread_uuid)
    )

    approval = await repo.create(
        company_id="comp1",
        thread_id="comp1:cust1:chat",
        draft_id="draft_123",
        action_type="discount.create",
        action_args={"percent": 10, "reason": "customer loyalty"},
    )

    assert approval.company_id == "comp1"
    assert approval.draft_id == "draft_123"
    assert approval.action_type == "discount.create"
    assert approval.action_args == {"percent": 10, "reason": "customer loyalty"}
    assert approval.status == "pending"
    mock_session.add.assert_called_once()
    mock_session.commit.assert_awaited_once()
    mock_session.refresh.assert_awaited_once_with(approval)


@pytest.mark.asyncio
async def test_create_approval_thread_not_found(repo, mock_session):
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=None)
    )

    with pytest.raises(ValueError, match="Thread not found"):
        await repo.create(
            company_id="comp1",
            thread_id="comp1:cust1:chat",
            draft_id="draft_123",
            action_type="discount.create",
            action_args={},
        )


@pytest.mark.asyncio
async def test_get_by_draft_id_found(repo, mock_session):
    expected = MagicMock()
    expected.draft_id = "draft_123"
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=expected)
    )

    result = await repo.get_by_draft_id("draft_123")

    assert result is not None
    assert result.draft_id == "draft_123"


@pytest.mark.asyncio
async def test_get_by_draft_id_not_found(repo, mock_session):
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=None)
    )

    result = await repo.get_by_draft_id("nonexistent")

    assert result is None


@pytest.mark.asyncio
async def test_update_status_approved(repo, mock_session):
    expected = MagicMock()
    expected.draft_id = "draft_123"
    expected.status = "approved"
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=expected)
    )

    result = await repo.update_status(
        draft_id="draft_123",
        status="approved",
        decided_by="merchant",
    )

    assert result is not None
    assert result.status == "approved"
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_status_rejected(repo, mock_session):
    expected = MagicMock()
    expected.draft_id = "draft_123"
    expected.status = "rejected"
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=expected)
    )

    result = await repo.update_status(
        draft_id="draft_123",
        status="rejected",
        decided_by="admin",
    )

    assert result is not None
    assert result.status == "rejected"
    mock_session.commit.assert_awaited_once()
