from __future__ import annotations

import json

import pytest
import respx
from httpx import Response

try:
    from agent_framework import MCPSkillsSource  # type: ignore[attr-defined]
except ImportError:
    from src.agents.base import MCPSkillsSource  # type: ignore[attr-defined]
from src.mcp_integration.client import MCPClient
from src.mcp_integration.registry import MCPRegistry


@pytest.mark.asyncio
@respx.mock
async def test_mcp_registry_uses_streamable_http_json_rpc():
    rpc_route = respx.post("https://mcp.example.test/mcp").mock(
        side_effect=[
            Response(
                200,
                headers={"Mcp-Session-Id": "session-1"},
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "result": {
                        "protocolVersion": "2025-06-18",
                        "capabilities": {"tools": {}},
                        "serverInfo": {"name": "catalog", "version": "1.0.0"},
                    },
                },
            ),
            Response(
                200,
                json={
                    "jsonrpc": "2.0",
                    "id": 2,
                    "result": {
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
                },
            ),
            Response(
                200,
                json={
                    "jsonrpc": "2.0",
                    "id": 3,
                    "result": {
                        "structuredContent": {"items": [{"id": "prod_1"}]},
                        "content": [],
                    },
                },
            ),
        ]
    )

    registry = MCPRegistry()
    await registry.register_server("catalog", "https://mcp.example.test/mcp", api_key="secret")

    tool = registry.get_tool("mcp_catalog_search")
    assert tool is not None
    assert tool["server_name"] == "catalog"
    assert tool["original_name"] == "search"
    assert tool["input_schema"]["required"] == ["query"]

    result = await registry.call_tool("mcp_catalog_search", {"query": "shoes"})

    assert result == {
        "tool": "mcp_catalog_search",
        "success": True,
        "result": {
            "structuredContent": {"items": [{"id": "prod_1"}]},
            "content": [],
        },
    }
    assert rpc_route.call_count == 3
    initialize_request = json.loads(rpc_route.calls[0].request.content)
    list_request = json.loads(rpc_route.calls[1].request.content)
    call_request = json.loads(rpc_route.calls[2].request.content)
    assert initialize_request["method"] == "initialize"
    assert list_request["method"] == "tools/list"
    assert call_request["method"] == "tools/call"
    assert call_request["params"] == {"name": "search", "arguments": {"query": "shoes"}}
    assert rpc_route.calls[2].request.headers["authorization"] == "Bearer secret"
    assert rpc_route.calls[2].request.headers["mcp-session-id"] == "session-1"

    await registry.disconnect_all()


@pytest.mark.asyncio
@respx.mock
async def test_mcp_client_can_feed_agent_framework_mcp_skills_source():
    rpc_route = respx.post("https://mcp.example.test/mcp").mock(
        side_effect=[
            Response(
                200,
                headers={"Mcp-Session-Id": "session-1"},
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "result": {
                        "protocolVersion": "2025-06-18",
                        "capabilities": {"resources": {}},
                        "serverInfo": {"name": "catalog", "version": "1.0.0"},
                    },
                },
            ),
            Response(
                200,
                json={
                    "jsonrpc": "2.0",
                    "id": 2,
                    "result": {
                        "contents": [
                            {
                                "uri": "skill://index.json",
                                "mimeType": "application/json",
                                "text": json.dumps({
                                    "skills": [
                                        {
                                            "name": "catalog-search",
                                            "description": "Use catalog search data.",
                                            "type": "skill-md",
                                            "url": "skill://catalog-search/SKILL.md",
                                        }
                                    ]
                                }),
                            }
                        ]
                    },
                },
            ),
            Response(
                200,
                json={
                    "jsonrpc": "2.0",
                    "id": 3,
                    "result": {
                        "contents": [
                            {
                                "uri": "skill://catalog-search/SKILL.md",
                                "mimeType": "text/markdown",
                                "text": "# Catalog Search\nUse structured product data.",
                            }
                        ]
                    },
                },
            ),
        ]
    )

    client = MCPClient("https://mcp.example.test/mcp", "catalog", api_key="secret")
    source = MCPSkillsSource(client=client)

    skills = await source.get_skills()
    content = await skills[0].get_content()

    assert skills[0].frontmatter.name == "catalog-search"
    assert "structured product data" in content
    assert rpc_route.call_count == 3
    assert json.loads(rpc_route.calls[1].request.content)["method"] == "resources/read"
    assert json.loads(rpc_route.calls[2].request.content)["params"] == {
        "uri": "skill://catalog-search/SKILL.md"
    }

    await client.close()


@pytest.mark.asyncio
@respx.mock
async def test_mcp_registry_supports_explicit_legacy_rest_transport():
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
    await registry.register_server(
        "catalog",
        "https://mcp.example.test",
        api_key="secret",
        transport="legacy_rest",
    )

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
