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

    result = await create_approval_draft(
        action_type="discount.create",
        action_args={"percent": 15},
        company_id="comp1",
        customer_id="cust1",
        thread_id="comp1:cust1:chat",
        session=mock_session,
    )

    assert "draft_id" in result
    assert result["status"] == "pending"


@pytest.mark.asyncio
async def test_execute_approved_action_success(mock_session):
    approval = MagicMock()
    approval.draft_id = "draft_123"
    approval.status = "approved"
    approval.company_id = "comp1"
    approval.action_type = "discount.create"
    approval.action_args = {"product_id": "prod_1", "discount_percent": 10, "reason": "test", "company_id": "comp1"}
    approval.thread_id = uuid.uuid4()

    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=approval)
    )

    with patch("src.tools.registry.get_tool") as mock_get_tool:
        mock_tool = MagicMock()
        mock_tool.params_schema = MagicMock(return_value=MagicMock())
        mock_tool.action = AsyncMock(
            return_value={"status": "awaiting_approval"}
        )
        mock_get_tool.return_value = mock_tool

        result = await execute_approved_action(
            draft_id="draft_123",
            session=mock_session,
        )

    assert result["status"] == "awaiting_approval"


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