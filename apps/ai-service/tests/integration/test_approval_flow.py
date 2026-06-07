from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from src.tools.registry import DiscountCreateInput, discount_create


@pytest.mark.asyncio
async def test_write_tool_returns_awaiting_approval():
    """Test that a write tool returns awaiting_approval status."""
    result = await discount_create(DiscountCreateInput(
        product_id="prod_1",
        discount_percent=15,
        reason="loyalty customer",
        company_id="comp1",
    ))
    assert result["status"] == "awaiting_approval"
    assert result["action_type"] == "discount.create"
    assert result["action_args"]["productId"] == "prod_1"


@pytest.mark.asyncio
async def test_approval_draft_creation():
    """Test complete approval flow: agent write tool draft creation."""
    from src.workflows.approval import create_approval_draft

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock()

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    with pytest.raises(ValueError, match="Thread not found"):
        await create_approval_draft(
            action_type="discount.create",
            action_args={"productId": "prod_1", "discountPercent": 15},
            company_id="comp1",
            customer_id="cust1",
            thread_id="comp1:cust1:chat",
            session=mock_session,
        )
