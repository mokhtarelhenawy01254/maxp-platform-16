from __future__ import annotations

import pytest
from agent_framework import FunctionTool

from src.tools.registry import (
    CompetitorGenerateReportInput,
    DiscountCreateInput,
    FacebookReplyInput,
    InventoryAdjustInput,
    InventoryCheckInput,
    MessageBroadcastInput,
    OrderCancelInput,
    OrderCreateConfirmedInput,
    OrderLookupInput,
    ProductSearchInput,
    competitor_generate_report,
    discount_create,
    facebook_reply,
    get_all_tools,
    get_read_tools,
    get_tool,
    get_write_tools,
    inventory_adjust,
    inventory_check,
    message_broadcast,
    order_cancel,
    order_create_confirmed,
    order_create_confirmed_tool,
    resolve_tools_from_names,
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
    assert "order_create_confirmed" not in names
    assert "message_broadcast" in names
    assert "agent_spawn" in names
    assert all(t.approval_mode == "always_require" for t in tools)


def test_read_tools_do_not_require_approval():
    assert all(t.approval_mode == "never_require" for t in get_read_tools())


def test_confirmed_order_tool_executes_without_merchant_approval_gate():
    assert get_tool("order.create_confirmed") is order_create_confirmed_tool
    assert order_create_confirmed_tool.approval_mode == "never_require"


def test_get_all_tools_includes_discovered_mcp_tools(monkeypatch):
    class _Registry:
        def get_all_tools(self):
            return [
                {
                    "name": "mcp_catalog_search",
                    "description": "Search catalog through MCP",
                    "input_schema": {
                        "type": "object",
                        "properties": {"query": {"type": "string"}},
                    },
                }
            ]

    monkeypatch.setattr("src.tools.registry.get_mcp_registry", lambda: _Registry())

    tools = get_all_tools()

    mcp_tool = next(tool for tool in tools if tool.name == "mcp_catalog_search")
    assert isinstance(mcp_tool, FunctionTool)
    assert mcp_tool.approval_mode == "never_require"


def test_registry_resolves_dotted_tool_aliases():
    tools = resolve_tools_from_names(["product.search", "inventory.check", "product_search"])

    names = [tool.name for tool in tools]
    assert names == ["product_search", "inventory_check"]
    assert get_tool("product.search").name == "product_search"


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


def test_facebook_reply_input_allows_image_without_text_message():
    inp = FacebookReplyInput(
        recipient_id="psid_1",
        page_id="page_1",
        message_type="IMAGE",
        media_url="https://cdn.example.test/product.jpg",
    )

    assert inp.message is None
    assert inp.message_type == "IMAGE"
    assert inp.media_url == "https://cdn.example.test/product.jpg"


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
async def test_order_create_confirmed_executes_backend_after_sdk_approval(monkeypatch):
    class _Client:
        async def create_order(self, company_id, order_data):
            return {"id": "ord_1", "companyId": company_id, "payload": order_data}

    monkeypatch.setattr("src.tools.registry.get_backend_client", lambda: _Client())

    result = await order_create_confirmed(OrderCreateConfirmedInput(
        customer_name="Ahmed",
        customer_phone="+201000000000",
        product_name="Shoes",
        quantity=2,
        total=500,
        shipping_amount=35,
        address="Cairo",
        city="Cairo",
        company_id="comp1",
    ))

    assert result["status"] == "EXECUTED"
    assert result["action"] == "ORDER_CREATED"
    assert result["result"]["companyId"] == "comp1"
    assert result["result"]["payload"]["customerName"] == "Ahmed"
    assert result["result"]["payload"]["shippingAmount"] == 35


@pytest.mark.asyncio
async def test_order_create_confirmed_omits_null_optional_fields(monkeypatch):
    class _Client:
        async def create_order(self, company_id, order_data):
            return {"id": "ord_1", "companyId": company_id, "payload": order_data}

    monkeypatch.setattr("src.tools.registry.get_backend_client", lambda: _Client())

    result = await order_create_confirmed(OrderCreateConfirmedInput(
        customer_name="Ahmed",
        customer_phone="+201000000000",
        product_name="Shoes",
        product_price=500,
        city="Cairo",
        confirmed_by_customer=True,
        company_id="comp1",
    ))

    payload = result["result"]["payload"]
    assert "shippingAmount" not in payload
    assert "total" not in payload
    assert "address" not in payload


@pytest.mark.asyncio
async def test_order_cancel_executes_backend_after_sdk_approval(monkeypatch):
    class _Client:
        async def cancel_order(self, company_id, order_number, reason):
            return {"orderNumber": order_number, "companyId": company_id, "reason": reason}

    monkeypatch.setattr("src.tools.registry.get_backend_client", lambda: _Client())

    result = await order_cancel(OrderCancelInput(
        order_number="ORD-123",
        reason="customer request",
        company_id="comp1",
    ))

    assert result["status"] == "EXECUTED"
    assert result["action"] == "ORDER_CANCELLED"
    assert result["result"]["orderNumber"] == "ORD-123"


@pytest.mark.asyncio
async def test_inventory_adjust_executes_backend_after_sdk_approval(monkeypatch):
    class _Client:
        async def adjust_inventory(self, company_id, product_id, quantity, reason):
            return {
                "productId": product_id,
                "companyId": company_id,
                "quantity": quantity,
                "reason": reason,
            }

    monkeypatch.setattr("src.tools.registry.get_backend_client", lambda: _Client())

    result = await inventory_adjust(InventoryAdjustInput(
        product_id="prod_1",
        quantity_delta=-3,
        reason="damaged stock",
        company_id="comp1",
    ))

    assert result["status"] == "EXECUTED"
    assert result["action"] == "INVENTORY_ADJUSTED"
    assert result["result"]["quantity"] == -3


@pytest.mark.asyncio
async def test_facebook_reply_forwards_image_fields(monkeypatch):
    captured = {}

    async def fake_send_facebook_reply(
        company_id,
        recipient_id,
        message,
        page_id,
        message_type="TEXT",
        media_url=None,
    ):
        captured.update({
            "company_id": company_id,
            "recipient_id": recipient_id,
            "message": message,
            "page_id": page_id,
            "message_type": message_type,
            "media_url": media_url,
        })
        return {"success": True, "messageType": message_type}

    monkeypatch.setattr("src.tools.registry.governance_tools.send_facebook_reply", fake_send_facebook_reply)

    result = await facebook_reply(FacebookReplyInput(
        recipient_id="psid_1",
        page_id="page_1",
        message_type="IMAGE",
        media_url="https://cdn.example.test/product.jpg",
        company_id="comp1",
    ))

    assert result == {"success": True, "messageType": "IMAGE"}
    assert captured == {
        "company_id": "comp1",
        "recipient_id": "psid_1",
        "message": "",
        "page_id": "page_1",
        "message_type": "IMAGE",
        "media_url": "https://cdn.example.test/product.jpg",
    }


@pytest.mark.asyncio
async def test_inventory_check_omits_null_bridge_fields(monkeypatch):
    captured = {}

    class _Client:
        async def execute_bridge_tool(self, company_id, tool_name, input_data, thread_id=None):
            captured.update({
                "company_id": company_id,
                "tool_name": tool_name,
                "input_data": input_data,
                "thread_id": thread_id,
            })
            return {"success": True, "result": {"found": True, "productName": "Shoes"}}

    monkeypatch.setattr("src.tools.registry.get_backend_client", lambda: _Client())

    result = await inventory_check(InventoryCheckInput(
        product_name_or_sku="black shoes",
        product_color="black",
        company_id="comp1",
    ))

    assert result == {"found": True, "productName": "Shoes"}
    assert captured == {
        "company_id": "comp1",
        "tool_name": "inventory.check",
        "input_data": {
            "productNameOrSku": "black shoes",
            "productColor": "black",
            "useVector": True,
        },
        "thread_id": None,
    }


@pytest.mark.asyncio
async def test_inventory_check_forwards_vector_policy_to_bridge(monkeypatch):
    captured = {}

    class _Client:
        async def execute_bridge_tool(self, company_id, tool_name, input_data, thread_id=None):
            captured.update({
                "company_id": company_id,
                "tool_name": tool_name,
                "input_data": input_data,
                "thread_id": thread_id,
            })
            return {"success": True, "result": {"found": True, "productName": "Shoes"}}

    monkeypatch.setattr("src.tools.registry.get_backend_client", lambda: _Client())

    result = await inventory_check(InventoryCheckInput(
        product_name_or_sku="black shoes",
        product_size="42",
        conversation_id="conv-1",
        use_vector=False,
        company_id="comp1",
    ))

    assert result == {"found": True, "productName": "Shoes"}
    assert captured == {
        "company_id": "comp1",
        "tool_name": "inventory.check",
        "input_data": {
            "productNameOrSku": "black shoes",
            "productSize": "42",
            "conversationId": "conv-1",
            "useVector": False,
        },
        "thread_id": "conv-1",
    }


@pytest.mark.asyncio
async def test_inventory_check_unwraps_bridge_output(monkeypatch):
    class _Client:
        async def execute_bridge_tool(self, company_id, tool_name, input_data, thread_id=None):
            return {
                "success": True,
                "result": {
                    "success": True,
                    "status": "EXECUTED",
                    "toolName": "inventory.check",
                    "output": {
                        "found": True,
                        "productName": "Shoes",
                        "price": {"amount": 2199, "currency": "EGP"},
                    },
                },
            }

    monkeypatch.setattr("src.tools.registry.get_backend_client", lambda: _Client())

    result = await inventory_check(InventoryCheckInput(
        product_name_or_sku="black shoes",
        company_id="comp1",
    ))

    assert result == {
        "found": True,
        "productName": "Shoes",
        "price": {"amount": 2199, "currency": "EGP"},
    }


@pytest.mark.asyncio
async def test_competitor_generate_report_executes_backend_after_sdk_approval(monkeypatch):
    class _Client:
        async def generate_competitor_report(self, company_id, competitor_id, report_type):
            return {
                "reportId": "rep_1",
                "companyId": company_id,
                "competitorId": competitor_id,
                "type": report_type,
            }

    monkeypatch.setattr("src.tools.registry.get_backend_client", lambda: _Client())

    result = await competitor_generate_report(CompetitorGenerateReportInput(
        competitor_id="cmp_1",
        report_type="weekly",
        company_id="comp1",
    ))

    assert result["status"] == "EXECUTED"
    assert result["action"] == "COMPETITOR_REPORT_GENERATED"
    assert result["result"]["reportId"] == "rep_1"


@pytest.mark.asyncio
async def test_message_broadcast_returns_awaiting_approval():
    result = await message_broadcast(MessageBroadcastInput(
        message="Sale!",
        audience="all",
        company_id="comp1",
    ))
    assert result["status"] == "awaiting_approval"
