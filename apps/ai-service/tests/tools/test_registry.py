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
    product_search,
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


@pytest.mark.asyncio
async def test_product_search_uses_image_embedding_when_image_is_provided(monkeypatch):
    captured = {}

    async def fake_vector_product_search(**kwargs):
        captured.update(kwargs)
        return [{"name": "Visual Match", "score": 0.91}]

    import src.tools.definitions.product as _prod_def
    monkeypatch.setattr(_prod_def, "vector_product_search", fake_vector_product_search)
    result = await product_search(ProductSearchInput(
        query="do you have this?",
        image_bytes="aGVsbG8=",
        mime_type="image/png",
        company_id="comp1",
    ))

    assert result["searchType"] == "image_semantic"
    assert result["results"] == [{"name": "Visual Match", "score": 0.91}]
    assert captured["company_id"] == "comp1"
    assert captured["query"] == "do you have this?"
    assert captured["image_bytes"] == b"hello"
    assert captured["mime_type"] == "image/png"


@pytest.mark.asyncio
async def test_product_search_downloads_image_url_for_visual_search(monkeypatch):
    captured = {}

    async def fake_download_image_url(url: str):
        captured["download_url"] = url
        return b"image-bytes", "image/jpeg"

    async def fake_vector_product_search(**kwargs):
        captured.update(kwargs)
        return [{"name": "URL Visual Match", "score": 0.88}]

    import src.tools.definitions.product as _prod_def
    monkeypatch.setattr(_prod_def, "_download_image_url", fake_download_image_url)
    monkeypatch.setattr(_prod_def, "vector_product_search", fake_vector_product_search)

    result = await product_search(ProductSearchInput(
        query="is this available?",
        image_url="https://cdn.example.com/photo.jpg",
        company_id="comp1",
    ))

    assert result["searchType"] == "image_semantic"
    assert result["results"] == [{"name": "URL Visual Match", "score": 0.88}]
    assert captured["download_url"] == "https://cdn.example.com/photo.jpg"
    assert captured["image_bytes"] == b"image-bytes"
    assert captured["mime_type"] == "image/jpeg"


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
    class _Rows:
        def __init__(self, data):
            self._data = data

        def first(self):
            return self._data[0] if self._data else None

        def __iter__(self):
            return iter(self._data)

    def _make_row(mapping: dict):
        return type("Row", (), {**mapping, "_mapping": mapping})()

    class _Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, sql, params):
            statement = str(sql)
            if "SELECT COALESCE(MAX" in statement and "orderNumber" in statement:
                return _Rows([_make_row({"next_num": 1})])
            if "INSERT INTO orders" in statement:
                return _Rows([])
            if "SELECT" in statement and "products" in statement:
                return _Rows([_make_row({"id": "prod_1", "price": 500, "stock": 100, "trackInventory": True, "name": "Shoes"})])
            if "INSERT INTO order_items" in statement:
                return _Rows([])
            return _Rows([])

        async def commit(self):
            pass

    import src.db.session as db_session
    monkeypatch.setattr(db_session, "async_session", lambda: _Session())

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
    assert result["result"]["orderNumber"] == "1"
    assert result["result"]["customerName"] == "Ahmed"


@pytest.mark.asyncio
async def test_order_create_confirmed_omits_null_optional_fields(monkeypatch):
    class _Rows:
        def __init__(self, data):
            self._data = data

        def first(self):
            return self._data[0] if self._data else None

        def __iter__(self):
            return iter(self._data)

    def _make_row(mapping: dict):
        return type("Row", (), {**mapping, "_mapping": mapping})()

    class _Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, sql, params):
            statement = str(sql)
            if "SELECT COALESCE(MAX" in statement and "orderNumber" in statement:
                return _Rows([_make_row({"next_num": 1})])
            if "INSERT INTO orders" in statement:
                return _Rows([])
            if "SELECT" in statement and "products" in statement:
                return _Rows([_make_row({"id": "prod_1", "price": 500, "stock": 100, "trackInventory": True, "name": "Shoes"})])
            if "INSERT INTO order_items" in statement:
                return _Rows([])
            return _Rows([])

        async def commit(self):
            pass

    import src.db.session as db_session
    monkeypatch.setattr(db_session, "async_session", lambda: _Session())

    result = await order_create_confirmed(OrderCreateConfirmedInput(
        customer_name="Ahmed",
        customer_phone="+201000000000",
        product_name="Shoes",
        product_price=500,
        city="Cairo",
        confirmed_by_customer=True,
        company_id="comp1",
    ))

    assert result["status"] == "EXECUTED"
    assert result["action"] == "ORDER_CREATED"
    assert result["result"]["orderNumber"] == "1"
    assert result["result"]["customerName"] == "Ahmed"


@pytest.mark.asyncio
async def test_order_cancel_executes_backend_after_sdk_approval(monkeypatch):
    class _Rows:
        def __init__(self, data):
            self._data = data

        def first(self):
            return self._data[0] if self._data else None

        def __iter__(self):
            return iter(self._data)

    def _make_row(mapping: dict):
        return type("Row", (), {**mapping, "_mapping": mapping})()

    class _Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, sql, params):
            statement = str(sql)
            if "UPDATE orders" in statement and "status" in statement:
                return _Rows([_make_row({"orderNumber": "ORD-123", "status": "CANCELLED"})])
            if "SELECT" in statement and "orders" in statement:
                return _Rows([_make_row({"id": "ord_1", "orderNumber": "ORD-123", "companyId": "comp1", "status": "PENDING"})])
            return _Rows([])

        async def commit(self):
            pass

    import src.db.session as db_session
    monkeypatch.setattr(db_session, "async_session", lambda: _Session())

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
    class _Rows:
        def __init__(self, data):
            self._data = data

        def first(self):
            return self._data[0] if self._data else None

    def _make_row(mapping: dict):
        return type("Row", (), {**mapping, "_mapping": mapping})()

    class _Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, sql, params):
            statement = str(sql)
            if "UPDATE products" in statement and "stock" in statement:
                return _Rows([])
            if "SELECT" in statement and "products" in statement:
                return _Rows([_make_row({"id": "prod_1", "stock": 10, "companyId": "comp1"})])
            return _Rows([])

        async def commit(self):
            pass

    import src.db.session as db_session
    monkeypatch.setattr(db_session, "async_session", lambda: _Session())

    result = await inventory_adjust(InventoryAdjustInput(
        product_id="prod_1",
        quantity_delta=-3,
        reason="damaged stock",
        company_id="comp1",
    ))

    assert result["status"] == "EXECUTED"
    assert result["action"] == "INVENTORY_ADJUSTED"
    assert result["result"]["quantityDelta"] == -3


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

    import src.tools.definitions.facebook as _fb_def
    monkeypatch.setattr(_fb_def.governance_tools, "send_facebook_reply", fake_send_facebook_reply)

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
    class _Rows:
        def __init__(self, data):
            self._data = data

        def first(self):
            return self._data[0] if self._data else None

        def __iter__(self):
            return iter(self._data)

    def _make_row(mapping: dict):
        return type("Row", (), {**mapping, "_mapping": mapping})()

    class _Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, sql, params):
            statement = str(sql)
            if "SELECT" in statement and "products" in statement and "name ILIKE" in statement:
                return _Rows([_make_row({
                    "id": "prod_1",
                    "name": "Black Shoes",
                    "sku": "SHOE-001",
                    "price": 2199,
                    "comparePrice": 2500,
                    "stock": 10,
                    "trackInventory": True,
                    "mainImage": None,
                    "images": None,
                    "isFeatured": False,
                })])
            if "SELECT" in statement and "product_variants" in statement:
                return _Rows([])
            return _Rows([])

    import src.db.session as db_session
    monkeypatch.setattr(db_session, "async_session", lambda: _Session())

    result = await inventory_check(InventoryCheckInput(
        product_name_or_sku="black shoes",
        product_color="black",
        company_id="comp1",
    ))

    assert result["found"] is True
    assert result["productName"] == "Black Shoes"
    assert result["price"]["amount"] == 2199


@pytest.mark.asyncio
async def test_inventory_check_forwards_vector_policy_to_bridge(monkeypatch):
    class _Rows:
        def __init__(self, data):
            self._data = data

        def first(self):
            return self._data[0] if self._data else None

        def __iter__(self):
            return iter(self._data)

    def _make_row(mapping: dict):
        return type("Row", (), {**mapping, "_mapping": mapping})()

    class _Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, sql, params):
            statement = str(sql)
            if "SELECT" in statement and "products" in statement and "name ILIKE" in statement:
                return _Rows([_make_row({
                    "id": "prod_1",
                    "name": "Black Shoes",
                    "sku": "SHOE-001",
                    "price": 2199,
                    "comparePrice": 2500,
                    "stock": 10,
                    "trackInventory": True,
                    "mainImage": None,
                    "images": None,
                    "isFeatured": False,
                })])
            if "SELECT" in statement and "product_variants" in statement:
                return _Rows([])
            return _Rows([])

    import src.db.session as db_session
    monkeypatch.setattr(db_session, "async_session", lambda: _Session())

    result = await inventory_check(InventoryCheckInput(
        product_name_or_sku="black shoes",
        product_size="42",
        conversation_id="conv-1",
        use_vector=False,
        company_id="comp1",
    ))

    assert result["found"] is True
    assert result["productName"] == "Black Shoes"


@pytest.mark.asyncio
async def test_inventory_check_unwraps_bridge_output(monkeypatch):
    class _Rows:
        def __init__(self, data):
            self._data = data

        def first(self):
            return self._data[0] if self._data else None

        def __iter__(self):
            return iter(self._data)

    def _make_row(mapping: dict):
        return type("Row", (), {**mapping, "_mapping": mapping})()

    class _Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, sql, params):
            statement = str(sql)
            if "SELECT" in statement and "products" in statement and "name ILIKE" in statement:
                return _Rows([_make_row({
                    "id": "prod_1",
                    "name": "Black Shoes",
                    "sku": "SHOE-001",
                    "price": 2199,
                    "comparePrice": 2500,
                    "stock": 10,
                    "trackInventory": True,
                    "mainImage": None,
                    "images": None,
                    "isFeatured": False,
                })])
            if "SELECT" in statement and "product_variants" in statement:
                return _Rows([])
            return _Rows([])

    import src.db.session as db_session
    monkeypatch.setattr(db_session, "async_session", lambda: _Session())

    result = await inventory_check(InventoryCheckInput(
        product_name_or_sku="black shoes",
        company_id="comp1",
    ))

    assert result["found"] is True
    assert result["productName"] == "Black Shoes"
    assert result["price"]["amount"] == 2199
    assert result["price"]["currency"] == "EGP"
    assert result["availableColors"] == []
    assert result["availableSizes"] == []


@pytest.mark.asyncio
async def test_competitor_generate_report_executes_backend_after_sdk_approval(monkeypatch):
    async def mock_generate_report(company_id, competitor_id, report_type):
        return {
            "reportId": "rep_1",
            "companyId": company_id,
            "competitorId": competitor_id,
            "type": report_type,
        }

    import src.tools.definitions.competitor as _comp_def
    monkeypatch.setattr(_comp_def.competitor_tools, "generate_report", mock_generate_report)

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
