from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from agent_framework import FunctionTool

from src.tools.registry import DiscountCreateInput, discount_create_tool, product_search_tool
from src.tools.sdk_gateway import is_gateway_managed_tool, requires_sdk_approval, wrap_tool_for_gateway


@pytest.mark.asyncio
async def test_wrapped_write_tool_returns_awaiting_approval():
    """Write tools routed through the gateway return awaiting_approval
    because approval_granted=False — they need merchant approval first."""
    wrapped = wrap_tool_for_gateway(
        discount_create_tool,
        company_id="comp1",
        agent_role="SALES",
        allowed_tools=["discount_create"],
    )

    result = await wrapped.func(
        DiscountCreateInput(
            product_id="prod_1",
            discount_percent=15,
            reason="loyalty customer",
        )
    )

    assert result["status"] == "awaiting_approval"
    assert result["action_type"] == "discount_create"
    assert result["action_args"]["product_id"] == "prod_1"
    assert result["company_id"] == "comp1"


@pytest.mark.asyncio
async def test_wrapped_write_tool_no_restriction():
    """Write tools without allowed_tools restriction still return awaiting_approval."""
    wrapped = wrap_tool_for_gateway(
        discount_create_tool,
        company_id="comp1",
        agent_role="SALES",
        allowed_tools=None,
    )

    result = await wrapped.func(
        DiscountCreateInput(
            product_id="prod_1",
            discount_percent=15,
        )
    )

    assert result["status"] == "awaiting_approval"


@pytest.mark.asyncio
async def test_wrapped_tool_accepts_dot_alias_allowlist():
    wrapped = wrap_tool_for_gateway(
        discount_create_tool,
        company_id="comp1",
        agent_role="SALES",
        allowed_tools=["discount.create"],
    )

    result = await wrapped.func(
        DiscountCreateInput(
            product_id="prod_1",
            discount_percent=15,
        )
    )

    # Still awaiting_approval — write tools are not auto-approved
    assert result["status"] == "awaiting_approval"


def test_registry_tools_are_gateway_managed():
    assert is_gateway_managed_tool(discount_create_tool) is True


def test_requires_sdk_approval_write_tools():
    """Write tools (approval_mode='always_require') need SDK approval."""
    assert requires_sdk_approval(discount_create_tool) is True


def test_requires_sdk_approval_read_tools():
    """Read tools (approval_mode='never_require') do not need SDK approval."""
    assert requires_sdk_approval(product_search_tool) is False


def test_wrapped_write_tools_use_sdk_approval_mode():
    wrapped = wrap_tool_for_gateway(
        discount_create_tool,
        company_id="comp1",
        agent_role="SALES",
        allowed_tools=["discount_create"],
    )

    assert wrapped.approval_mode == "always_require"


def test_wrapped_read_tools_do_not_require_sdk_approval():
    wrapped = wrap_tool_for_gateway(
        product_search_tool,
        company_id="comp1",
        agent_role="SALES",
        allowed_tools=["product_search"],
    )

    assert wrapped.approval_mode == "never_require"


def test_mcp_tools_are_gateway_managed(monkeypatch):
    monkeypatch.setattr("src.tools.sdk_gateway.get_tool", lambda name: None)

    tool = FunctionTool(
        name="mcp_catalog_search",
        description="Search catalog through MCP",
        input_model={"type": "object", "properties": {"query": {"type": "string"}}},
    )

    assert is_gateway_managed_tool(tool) is True


@pytest.mark.asyncio
async def test_wrapped_mcp_tool_routes_through_gateway(monkeypatch):
    gateway = AsyncMock()
    gateway.execute = AsyncMock(return_value={"status": "success", "result": {"ok": True}})
    monkeypatch.setattr("src.tools.sdk_gateway.ToolGateway", lambda: gateway)
    monkeypatch.setattr("src.tools.sdk_gateway.get_tool", lambda name: None)

    tool = FunctionTool(
        name="mcp_catalog_search",
        description="Search catalog through MCP",
        input_model={"type": "object", "properties": {"query": {"type": "string"}}},
    )

    wrapped = wrap_tool_for_gateway(
        tool,
        company_id="comp1",
        agent_role="SUPPORT",
        allowed_tools=["mcp_catalog_search"],
    )

    result = await wrapped.func({"query": "shoes"})

    assert result["status"] == "success"
    # MCP tools don't need approval, so approval_granted=True
    gateway.execute.assert_awaited_once_with(
        tool_name="mcp_catalog_search",
        company_id="comp1",
        agent_role="SUPPORT",
        allowed_tools=["mcp_catalog_search"],
        input_data={"query": "shoes"},
        approval_granted=True,
        ctx=None,
    )


@pytest.mark.asyncio
async def test_wrapped_write_tool_needs_approval(monkeypatch):
    """Write tools pass approval_granted=False to the gateway,
    which routes them to the approval flow instead of auto-executing."""
    gateway = AsyncMock()
    gateway.execute = AsyncMock(return_value={"status": "awaiting_approval", "action_type": "discount_create"})
    monkeypatch.setattr("src.tools.sdk_gateway.ToolGateway", lambda: gateway)

    wrapped = wrap_tool_for_gateway(
        discount_create_tool,
        company_id="comp1",
        agent_role="SALES",
        allowed_tools=["discount_create"],
    )

    result = await wrapped.func(
        DiscountCreateInput(
            product_id="prod_1",
            discount_percent=15,
            reason="loyalty customer",
        )
    )

    # Write tools pass approval_granted=False to the gateway
    gateway.execute.assert_awaited_once_with(
        tool_name="discount_create",
        company_id="comp1",
        agent_role="SALES",
        allowed_tools=["discount_create"],
        input_data={
            "product_id": "prod_1",
            "discount_percent": 15.0,
            "reason": "loyalty customer",
        },
        approval_granted=False,
        ctx=None,
    )
