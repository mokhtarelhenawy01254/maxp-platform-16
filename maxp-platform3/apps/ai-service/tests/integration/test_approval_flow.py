from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from src.tools.definitions.sales import DiscountCreateInput
from src.tools.definitions._helpers import _write_result


@pytest.mark.asyncio
async def test_write_tool_returns_awaiting_approval():
    """Test that a write tool returns awaiting_approval status."""
    result = _write_result("discount.create", {"productId": "prod_1", "discountPercent": 15}, "comp1")
    assert result["status"] == "awaiting_approval"
    assert result["action_type"] == "discount.create"
    assert result["action_args"]["productId"] == "prod_1"


@pytest.mark.asyncio
async def test_approval_draft_creation():
    """Test complete approval flow: agent write tool draft creation."""
    from src.services.approval_service import ApprovalService

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock()

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    svc = ApprovalService(mock_session)
    with pytest.raises(ValueError, match="Thread not found"):
        await svc.request_approval(
            action_type="discount.create",
            action_args={"productId": "prod_1", "discountPercent": 15},
            company_id="comp1",
            customer_id="cust1",
            thread_id="comp1:cust1:chat",
        )
