from __future__ import annotations

import pytest
from agent_framework import FunctionTool

from src.tools.registry import (
    CORE_TOOLS,
    READ_TOOLS,
    WRITE_TOOLS,
    get_all_tools,
    get_read_tools,
    get_tool,
    get_tool_names_for_role,
    get_write_tools,
    resolve_tools_from_names,
    ROLE_TOOLS,
)
from src.tools.definitions.competitor import CompetitorGenerateReportInput, competitor_generate_report
from src.tools.definitions.sales import DiscountCreateInput, discount_create
from src.tools.definitions.facebook import FacebookReplyInput, facebook_reply
from src.tools.definitions.inventory import InventoryAdjustInput, inventory_check
from src.tools.definitions.governance import MessageBroadcastInput, message_broadcast
from src.tools.definitions.order import OrderCancelInput, OrderCreateConfirmedInput, order_cancel, order_create_confirmed, order_create_confirmed_tool
from src.tools.definitions.product import ProductSearchInput, product_search
from src.tools.definitions._helpers import _write_result, _executed_result


def test_get_read_tools():
    tools = get_read_tools()
    assert len(tools) >= 2
    assert all(isinstance(t, FunctionTool) for t in tools)
    names = [t.name for t in tools]
    assert "product_search" in names
    assert "order_lookup" in names
    assert "company_snapshot" in names


def test_get_write_tools():
    from src.tools.registry import DIRECT_WRITE_TOOL_NAMES

    tools = get_write_tools()
    assert len(tools) >= 3
    assert all(isinstance(t, FunctionTool) for t in tools)
    names = [t.name for t in tools]
    assert "discount_create" in names
    assert "order_cancel" in names
    assert "order_create_confirmed" not in names
    assert "message_broadcast" in names
    assert "agent_spawn" in names
    assert all(
        t.approval_mode == "always_require" for t in tools if t.name not in DIRECT_WRITE_TOOL_NAMES
    )


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
        query="do you have this?", image_bytes="aGVsbG8=", mime_type="image/png", company_id="comp1",
    ))
    assert result["searchType"] == "image_semantic"
    assert result["results"] == [{"name": "Visual Match", "score": 0.91}]


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
        query="is this available?", image_url="https://cdn.example.com/photo.jpg", company_id="comp1",
    ))
    assert result["searchType"] == "image_semantic"


@pytest.mark.asyncio
async def test_discount_create_returns_awaiting_approval():
    result = await discount_create(DiscountCreateInput(
        product_id="prod_1", discount_percent=10.0, reason="Spring sale", company_id="comp1",
    ))
    assert result["status"] == "awaiting_approval"


@pytest.mark.asyncio
async def test_facebook_reply_sends_message(monkeypatch):
    async def mock_send_facebook(*args, **kwargs):
        return {"success": True, "result": {"message_id": "msg_123"}}
    import src.tools.definitions.facebook as _fb_mod
    monkeypatch.setattr(_fb_mod, "send_facebook_reply", mock_send_facebook)
    result = await facebook_reply(FacebookReplyInput(
        recipient_id="123456", message="Hello!", page_id="pg_789", company_id="comp1",
    ))
    assert result["success"] is True


@pytest.mark.asyncio
async def test_message_broadcast_returns_awaiting_approval():
    result = await message_broadcast(MessageBroadcastInput(
        message="Sale!", audience="all", company_id="comp1",
    ))
    assert result["status"] == "awaiting_approval"


@pytest.mark.asyncio
async def test_order_create_confirmed_executes_backend_after_sdk_approval(monkeypatch):
    async def mock_create_order(self, company_id, order_data):
        return {"orderNumber": "ORD-1001", "status": "PENDING"}

    class _MockSession:
        call_count = 0
        async def __aenter__(self): return self
        async def __aexit__(self, exc_type, exc, tb): return False
        async def execute(self, sql, params=None): return type("Rows", (), {"first": lambda: None, "__iter__": lambda s: iter([])})()
    monkeypatch.setattr("src.db.session.async_session", lambda: _MockSession())

    from src.tools.repositories.order_repository import OrderRepository
    monkeypatch.setattr(OrderRepository, "create_order", mock_create_order)
    result = await order_create_confirmed(OrderCreateConfirmedInput(
        customer_name="Test Customer", customer_phone="01000000000", product_name="Sprint X",
        product_price=1499, quantity=1, address="10 Test Street", city="Cairo",
        confirmed_by_customer=True, company_id="comp1",
    ))
    assert result["status"] == "EXECUTED"


@pytest.mark.asyncio
async def test_order_cancel_executes_backend_after_sdk_approval(monkeypatch):
    async def mock_cancel_order(self, company_id, order_number):
        return {"success": True, "orderNumber": "ORD-1", "newStatus": "CANCELLED"}

    class _MockSession:
        async def __aenter__(self): return self
        async def __aexit__(self, exc_type, exc, tb): return False
        async def execute(self, sql, params=None): return type("Rows", (), {"first": lambda: None, "__iter__": lambda s: iter([])})()
    monkeypatch.setattr("src.db.session.async_session", lambda: _MockSession())

    from src.tools.repositories.order_repository import OrderRepository
    monkeypatch.setattr(OrderRepository, "cancel_order", mock_cancel_order)
    result = await order_cancel(OrderCancelInput(
        order_number="ORD-1", reason="Customer request", company_id="comp1",
    ))
    assert result["status"] == "EXECUTED"


@pytest.mark.asyncio
async def test_competitor_generate_report_executes_backend_after_sdk_approval(monkeypatch):
    async def mock_generate_report(self, competitor_id, report_type):
        return {"reportId": "rep_1", "competitorId": competitor_id, "type": report_type}

    class _MockSession:
        async def __aenter__(self): return self
        async def __aexit__(self, exc_type, exc, tb): return False
        async def execute(self, sql, params=None): return type("Rows", (), {"first": lambda: None, "__iter__": lambda s: iter([])})()
    monkeypatch.setattr("src.db.session.async_session", lambda: _MockSession())

    from src.tools.repositories.competitor_repository import CompetitorRepository
    monkeypatch.setattr(CompetitorRepository, "generate_report", mock_generate_report)
    result = await competitor_generate_report(CompetitorGenerateReportInput(
        competitor_id="cmp_1", report_type="weekly", company_id="comp1",
    ))
    assert result["status"] == "EXECUTED"


def test_auto_discovery_finds_all_domain_tools():
    """Auto-discovery should find tools from all definition modules."""
    expected_domains = {"product", "order", "shipping", "inventory", "customer",
                        "sales", "competitor", "facebook", "governance",
                        "agents", "audit", "hr"}
    from src.tools.registry import _DEFINITION_MODULE_NAMES
    assert expected_domains.issubset(set(_DEFINITION_MODULE_NAMES))


def test_smart_seller_role_exists():
    """SMART_SELLER role should be defined in role_tools.yaml."""
    assert "SMART_SELLER" in ROLE_TOOLS
    seller_tools = ROLE_TOOLS["SMART_SELLER"]
    assert "product_search" in seller_tools
    assert "order_create_draft" in seller_tools
    assert "sales_revenue" in seller_tools


def test_unknown_role_gets_core_tools_only():
    """Unknown roles should get core tools as a safe default, not all tools."""
    tools = get_tool_names_for_role("UNKNOWN_ROLE")
    assert "product_search" in tools
    assert "order_cancel" not in tools
    assert "discount_create" not in tools


def test_ceo_role_has_minimal_executive_tools():
    """CEO role is a minimal delegation cockpit, not an empty role."""
    ceo_tools = get_tool_names_for_role("CEO")
    assert "delegate_task" in ceo_tools
    assert "company_snapshot" in ceo_tools


def test_helpers_write_result():
    result = _write_result("order.create", {"product": "shoes"}, "comp1")
    assert result["status"] == "awaiting_approval"
    assert result["action_type"] == "order.create"
    assert result["company_id"] == "comp1"


def test_helpers_executed_result():
    result = _executed_result("ORDER_CREATED", {"orderNumber": "ORD-1"})
    assert result["status"] == "EXECUTED"
    assert result["action"] == "ORDER_CREATED"
    assert result["result"]["orderNumber"] == "ORD-1"


def test_registry_has_all_tools():
    """After auto-discovery, SkillRegistry should have all tools registered."""
    from src.skills.registry import get_skill_registry
    r = get_skill_registry()
    tools = r.get_all_tools()
    assert len(tools) >= 47  # domain tools + skill tools + unlock
    names = {t.name for t in tools}
    assert "product_search" in names
    assert "order_lookup" in names


def test_write_tool_approval_modes():
    """All write tools should require approval, except deliberate DIRECT_WRITE tools."""
    from src.tools.registry import DIRECT_WRITE_TOOL_NAMES

    for tool in get_write_tools():
        if tool.name in DIRECT_WRITE_TOOL_NAMES:
            continue
        assert tool.approval_mode == "always_require", f"{tool.name} should require approval"


def test_direct_write_tools_dont_require_approval():
    """Direct write tools (order_create_confirmed) should never require approval."""
    from src.skills.registry import get_skill_registry
    from src.tools.registry import DIRECT_WRITE_TOOL_NAMES
    r = get_skill_registry()
    for name in DIRECT_WRITE_TOOL_NAMES:
        tool = r.resolve(name)
        assert tool is not None, f"Direct write tool {name} should exist"
        assert tool.approval_mode == "never_require", f"{name} should not require approval"
