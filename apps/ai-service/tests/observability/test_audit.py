from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from src.observability.audit import log_tool_call


@pytest.mark.asyncio
async def test_log_tool_call_success():
    session = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()

    record = await log_tool_call(
        session=session,
        company_id="comp1",
        tool_name="product_search",
        input_data={"query": "test"},
        output_data={"results": []},
        latency_ms=150,
    )

    assert record.tool_name == "product_search"
    assert record.status == "success"
    session.add.assert_called_once()
    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(record)


@pytest.mark.asyncio
async def test_log_tool_call_error():
    session = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()

    record = await log_tool_call(
        session=session,
        company_id="comp1",
        tool_name="order_lookup",
        input_data={"order_number": "ORD-123"},
        error_message="Order not found",
        latency_ms=200,
    )

    assert record.tool_name == "order_lookup"
    assert record.status == "error"
    assert record.error_message == "Order not found"
    session.add.assert_called_once()
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_log_tool_call_with_thread_id():
    session = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()

    record = await log_tool_call(
        session=session,
        company_id="comp1",
        thread_id="comp1:cust1:chat",
        tool_name="product_search",
        input_data={"query": "shoes"},
    )

    assert record.company_id == "comp1"
    assert str(record.thread_id) is not None
