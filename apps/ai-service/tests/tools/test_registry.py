from __future__ import annotations

import pytest
from agent_framework import FunctionTool

from src.tools.registry import (
    DiscountCreateInput,
    MessageBroadcastInput,
    OrderCancelInput,
    OrderLookupInput,
    ProductSearchInput,
    discount_create,
    get_read_tools,
    get_write_tools,
    message_broadcast,
    order_cancel,
)


def test_get_read_tools():
    tools = get_read_tools()
    assert len(tools) >= 2
    assert all(isinstance(t, FunctionTool) for t in tools)
    names = [t.name for t in tools]
    assert "product_search" in names
    assert "order_lookup" in names
    assert "company_snapshot" in names


def test_get_write_tools():
    tools = get_write_tools()
    assert len(tools) >= 3
    assert all(isinstance(t, FunctionTool) for t in tools)
    names = [t.name for t in tools]
    assert "discount_create" in names
    assert "order_cancel" in names
    assert "message_broadcast" in names
    assert "agent_spawn" in names


def test_product_search_input():
    inp = ProductSearchInput(query="test query")
    assert inp.query == "test query"
    assert inp.company_id is None


def test_order_lookup_input():
    inp = OrderLookupInput(order_number="ORD-123")
    assert inp.order_number == "ORD-123"
    assert inp.company_id is None


def test_discount_create_input():
    inp = DiscountCreateInput(product_id="prod_1", discount_percent=15, reason="customer loyalty")
    assert inp.product_id == "prod_1"
    assert inp.discount_percent == 15.0


def test_order_cancel_input():
    inp = OrderCancelInput(order_number="ORD-123", reason="customer request")
    assert inp.order_number == "ORD-123"


def test_message_broadcast_input():
    inp = MessageBroadcastInput(message="Hello", audience="all")
    assert inp.message == "Hello"


@pytest.mark.asyncio
async def test_discount_create_returns_awaiting_approval():
    result = await discount_create(DiscountCreateInput(
        product_id="prod_1",
        discount_percent=15,
        reason="loyalty",
        company_id="comp1",
    ))
    assert result["status"] == "awaiting_approval"
    assert result["action_type"] == "discount.create"


@pytest.mark.asyncio
async def test_order_cancel_returns_awaiting_approval():
    result = await order_cancel(OrderCancelInput(
        order_number="ORD-123",
        reason="customer request",
        company_id="comp1",
    ))
    assert result["status"] == "awaiting_approval"


@pytest.mark.asyncio
async def test_message_broadcast_returns_awaiting_approval():
    result = await message_broadcast(MessageBroadcastInput(
        message="Sale!",
        audience="all",
        company_id="comp1",
    ))
    assert result["status"] == "awaiting_approval"
