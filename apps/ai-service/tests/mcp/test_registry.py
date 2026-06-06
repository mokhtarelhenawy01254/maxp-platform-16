from __future__ import annotations

import pytest
import respx
from httpx import Response

from src.mcp.registry import MCPRegistry


@pytest.mark.asyncio
@respx.mock
async def test_mcp_registry_discovers_namespaces_and_calls_tools():
    respx.post("https://mcp.example.test/mcp/v1/tools/list").mock(
        return_value=Response(
            200,
            json={
                "tools": [
                    {
                        "name": "search",
                        "description": "Search catalog",
                        "inputSchema": {
                            "type": "object",
                            "properties": {"query": {"type": "string"}},
                            "required": ["query"],
                        },
                    }
                ]
            },
        )
    )
    call_route = respx.post("https://mcp.example.test/mcp/v1/tools/call").mock(
        return_value=Response(200, json={"items": [{"id": "prod_1"}]})
    )

    registry = MCPRegistry()
    await registry.register_server("catalog", "https://mcp.example.test", api_key="secret")

    tool = registry.get_tool("mcp_catalog_search")
    assert tool is not None
    assert tool["server_name"] == "catalog"
    assert tool["original_name"] == "search"
    assert tool["input_schema"]["required"] == ["query"]

    result = await registry.call_tool("mcp_catalog_search", {"query": "shoes"})

    assert result == {
        "tool": "mcp_catalog_search",
        "success": True,
        "result": {"items": [{"id": "prod_1"}]},
    }
    request = call_route.calls.last.request
    assert request.headers["authorization"] == "Bearer secret"
    assert request.content == b'{"name":"search","arguments":{"query":"shoes"}}'

    await registry.disconnect_all()
