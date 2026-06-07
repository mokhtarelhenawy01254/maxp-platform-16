from __future__ import annotations

import json
from typing import Any

import pytest
import respx
from httpx import Response
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

from maxp_mcp_catalog.server import _build_server

BRIDGE_URL = "http://maxp-backend.test/api/v1/ai-bridge/tools/execute"


def _bridge_response(result: dict[str, Any]) -> dict[str, Any]:
    return {"success": True, "result": result}


@pytest.mark.asyncio
@respx.mock(assert_all_mocked=False)
async def test_initialize_and_list_tools(live_mcp_url: str) -> None:
    respx.post(BRIDGE_URL).mock(return_value=Response(200, json=_bridge_response({"ok": True})))

    async with streamablehttp_client(url=live_mcp_url) as (read, write, _):
        async with ClientSession(read, write) as session:
            init_result = await session.initialize()
            assert init_result.server_info.name == "maxp-catalog"
            assert init_result.protocol_version

            listed = await session.list_tools()
            names = sorted(t.name for t in listed.tools)
            assert names == ["inventory_check", "product_get", "search"]

            search_tool = next(t for t in listed.tools if t.name == "search")
            assert "query" in search_tool.inputSchema["properties"]
            assert "limit" in search_tool.inputSchema["properties"]
            assert search_tool.inputSchema["properties"]["query"].get("type") == "string"
            assert "query" in search_tool.inputSchema.get("required", [])

            inventory_tool = next(t for t in listed.tools if t.name == "inventory_check")
            assert "product_id" in inventory_tool.inputSchema["properties"]
            assert "product_id" in inventory_tool.inputSchema.get("required", [])

            product_tool = next(t for t in listed.tools if t.name == "product_get")
            assert "product_id" in product_tool.inputSchema["properties"]
            assert "product_id" in product_tool.inputSchema.get("required", [])


@pytest.mark.asyncio
@respx.mock
async def test_search_calls_product_search_bridge(mcp_server) -> None:
    bridge = respx.post(BRIDGE_URL).mock(
        return_value=Response(
            200,
            json=_bridge_response(
                {
                    "products": [
                        {"id": "prod_1", "name": "Sneaker"},
                        {"id": "prod_2", "name": "Loafer"},
                    ]
                }
            ),
        )
    )

    result = await mcp_server.call_tool("search", {"query": "shoes", "limit": 5})

    assert result.structuredContent == {
        "result": {
            "products": [
                {"id": "prod_1", "name": "Sneaker"},
                {"id": "prod_2", "name": "Loafer"},
            ]
        }
    }
    assert result.isError is False
    body = json.loads(bridge.calls.last.request.content)
    assert bridge.call_count == 1
    assert bridge.calls.last.request.headers["authorization"] == "Bearer test-service-token"
    assert body == {
        "tool": "product.search",
        "params": {"query": "shoes", "limit": 5},
        "company_id": "company-1",
    }


@pytest.mark.asyncio
@respx.mock
async def test_inventory_check_returns_structured_result(mcp_server) -> None:
    bridge = respx.post(BRIDGE_URL).mock(
        return_value=Response(
            200,
            json=_bridge_response(
                {
                    "product_id": "prod_42",
                    "available": 7,
                    "low_stock_threshold": 5,
                    "warehouses": [{"id": "wh-1", "quantity": 7}],
                }
            ),
        )
    )

    result = await mcp_server.call_tool("inventory_check", {"product_id": "prod_42"})

    assert result.isError is False
    assert result.structuredContent == {
        "result": {
            "product_id": "prod_42",
            "available": 7,
            "low_stock_threshold": 5,
            "warehouses": [{"id": "wh-1", "quantity": 7}],
        }
    }
    body = json.loads(bridge.calls.last.request.content)
    assert body["tool"] == "inventory.check"
    assert body["params"] == {"product_id": "prod_42"}
    assert body["company_id"] == "company-1"


@pytest.mark.asyncio
@respx.mock
async def test_error_passes_through_as_is_error(mcp_server) -> None:
    bridge = respx.post(BRIDGE_URL).mock(
        side_effect=[
            Response(500, text="boom-1"),
            Response(500, text="boom-2"),
        ]
    )

    result = await mcp_server.call_tool("product_get", {"product_id": "prod_99"})

    assert result.isError is True
    assert result.structuredContent is not None
    assert "500" in str(result.structuredContent.get("error"))
    assert result.structuredContent.get("status_code") == 500
    assert bridge.call_count == 2
    body = json.loads(bridge.calls.last.request.content)
    assert body == {
        "tool": "product.get_by_id",
        "params": {"product_id": "prod_99"},
        "company_id": "company-1",
    }


@pytest.mark.asyncio
@respx.mock
async def test_bridge_success_false_returns_is_error(mcp_server) -> None:
    respx.post(BRIDGE_URL).mock(
        return_value=Response(200, json={"success": False, "error": "tool not allowed"})
    )

    result = await mcp_server.call_tool("product_get", {"product_id": "prod_99"})

    assert result.isError is True
    assert result.structuredContent is not None
    assert "tool not allowed" in str(result.structuredContent.get("error"))


@pytest.mark.asyncio
@respx.mock
async def test_4xx_does_not_retry(mcp_server) -> None:
    bridge = respx.post(BRIDGE_URL).mock(
        return_value=Response(404, text="not found")
    )

    result = await mcp_server.call_tool("search", {"query": "ghost"})

    assert result.isError is True
    assert result.structuredContent is not None
    assert "404" in str(result.structuredContent.get("error"))
    assert bridge.call_count == 1
