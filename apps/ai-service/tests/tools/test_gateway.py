from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from agent_framework import FunctionTool
from pydantic import BaseModel

from src.tools.gateway import ToolGateway


class _WriteInput(BaseModel):
    value: str
    company_id: str | None = None


@pytest.mark.asyncio
async def test_gateway_executes_allowed_mcp_tool(monkeypatch):
    registry = MagicMock()
    registry.get_tool.return_value = {
        "name": "mcp_catalog_search",
        "server_name": "catalog",
        "original_name": "search",
    }
    registry.call_tool = AsyncMock(
        return_value={"tool": "mcp_catalog_search", "success": True, "result": {"items": []}}
    )

    monkeypatch.setattr("src.tools.gateway.get_mcp_registry", lambda: registry)

    result = await ToolGateway().execute(
        tool_name="mcp_catalog_search",
        company_id="comp1",
        agent_role="SUPPORT",
        allowed_tools=["mcp_catalog_search"],
        input_data={"query": "shoes"},
    )

    assert result == {"status": "success", "result": {"items": []}}
    registry.call_tool.assert_awaited_once_with(
        "mcp_catalog_search",
        {"query": "shoes", "company_id": "comp1"},
    )


@pytest.mark.asyncio
async def test_gateway_blocks_mcp_tool_not_in_allowlist(monkeypatch):
    registry = MagicMock()
    registry.get_tool.return_value = {
        "name": "mcp_catalog_search",
        "server_name": "catalog",
        "original_name": "search",
    }
    registry.call_tool = AsyncMock()

    monkeypatch.setattr("src.tools.gateway.get_mcp_registry", lambda: registry)

    result = await ToolGateway().execute(
        tool_name="mcp_catalog_search",
        company_id="comp1",
        agent_role="SUPPORT",
        allowed_tools=["order_lookup"],
        input_data={"query": "shoes"},
    )

    assert result["status"] == "forbidden"
    registry.call_tool.assert_not_awaited()


@pytest.mark.asyncio
async def test_gateway_skips_approval_gate_when_sdk_approval_granted(monkeypatch):
    tool_func = AsyncMock(return_value={"updated": True})
    tool = FunctionTool(
        name="sample_write",
        description="Sample write",
        func=tool_func,
        input_model=_WriteInput,
        approval_mode="always_require",
    )
    monkeypatch.setattr("src.tools.gateway.get_tool", lambda name: tool)

    result = await ToolGateway().execute(
        tool_name="sample_write",
        company_id="comp1",
        agent_role="ADMIN",
        allowed_tools=["sample_write"],
        input_data={"value": "x"},
        approval_granted=True,
    )

    assert result == {"status": "success", "result": {"updated": True}}
    tool_func.assert_awaited_once()
