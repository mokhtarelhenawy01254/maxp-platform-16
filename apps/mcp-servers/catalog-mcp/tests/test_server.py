from __future__ import annotations

import json
from typing import Any

import httpx
import pytest
import respx
from httpx import Response

BRIDGE_URL = "http://maxp-backend.test/api/v1/ai-bridge/tools/execute"
JSONRPC_HEADERS = {
    "Accept": "application/json, text/event-stream",
    "Content-Type": "application/json",
}


def _bridge_response(result: dict[str, Any]) -> dict[str, Any]:
    return {"success": True, "result": result}


@pytest.mark.asyncio
async def test_initialize_and_list_tools(live_mcp_url: str) -> None:
    async with httpx.AsyncClient(timeout=10.0) as client:
        init_payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2025-06-18",
                "capabilities": {},
                "clientInfo": {"name": "catalog-mcp-tests", "version": "0.1.0"},
            },
        }
        init_response = await client.post(live_mcp_url, json=init_payload, headers=JSONRPC_HEADERS)
        assert init_response.status_code == 200, f"init status={init_response.status_code} body={init_response.text!r}"
        assert init_response.content, f"init body empty, headers={dict(init_response.headers)!r}"
        init_body = init_response.json()
        assert init_body["jsonrpc"] == "2.0"
        assert init_body["id"] == 1
        init_result = init_body["result"]
        assert init_result["serverInfo"]["name"] == "maxp-catalog"
        assert init_result["protocolVersion"]

        list_payload = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list",
            "params": {},
        }
        list_response = await client.post(live_mcp_url, json=list_payload, headers=JSONRPC_HEADERS)
        assert list_response.status_code == 200
        list_body = list_response.json()
        assert list_body["id"] == 2
        tools = list_body["result"]["tools"]
        names = sorted(t["name"] for t in tools)
        assert names == ["inventory_check", "product_get", "search"]

        search_tool = next(t for t in tools if t["name"] == "search")
        assert "query" in search_tool["inputSchema"]["properties"]
        assert "limit" in search_tool["inputSchema"]["properties"]
        assert search_tool["inputSchema"]["properties"]["query"]["type"] == "string"
        assert "query" in search_tool["inputSchema"].get("required", [])

        inventory_tool = next(t for t in tools if t["name"] == "inventory_check")
        assert "product_id" in inventory_tool["inputSchema"]["properties"]
        assert "product_id" in inventory_tool["inputSchema"].get("required", [])

        product_tool = next(t for t in tools if t["name"] == "product_get")
        assert "product_id" in product_tool["inputSchema"]["properties"]
        assert "product_id" in product_tool["inputSchema"].get("required", [])


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
