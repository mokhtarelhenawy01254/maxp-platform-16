"""Merchant-key path tests: middleware capture + bridge forwarding.

These verify the two contracts of the public MCP mode:

1. ``MerchantAuthMiddleware`` captures the presented value per request and,
   when ``MCP_REQUIRE_MERCHANT_AUTH`` is enabled, rejects anonymous calls.
2. Tool calls made with a presented merchant key go to the bridge with that
   key forwarded and WITHOUT any company_id in the body — the tenant is
   derived server-side from the verified credential (IDOR guard).
"""
from __future__ import annotations

import json

import httpx
import pytest
import respx
from httpx import Response
from starlette.responses import PlainTextResponse

from maxp_mcp_catalog import auth_context
from maxp_mcp_catalog.auth_context import MerchantAuthMiddleware

MCP_EXECUTE_URL = "http://maxp-ai-service.test/mcp/tools/execute"


def _success(result: dict) -> dict:
    return {"success": True, "result": result}


@pytest.mark.asyncio
@respx.mock
async def test_merchant_key_forwards_key_and_omits_company(mcp_server) -> None:
    bridge = respx.post(MCP_EXECUTE_URL).mock(
        return_value=Response(200, json=_success({"products": [{"id": "prod_1"}]}))
    )

    reset = auth_context._inbound_value.set("mxp_mcp_demo123")
    try:
        result = await mcp_server.call_tool("search", {"query": "shoes", "limit": 5})
    finally:
        auth_context._inbound_value.reset(reset)

    assert result.isError is False
    assert bridge.call_count == 1
    request = bridge.calls.last.request
    assert request.headers["authorization"] == "Bearer mxp_mcp_demo123"
    body = json.loads(request.content)
    assert body == {"tool": "product.search", "params": {"query": "shoes", "limit": 5}}
    assert "company_id" not in body


@pytest.mark.asyncio
@respx.mock
async def test_merchant_key_rejection_surfaces_as_is_error(mcp_server) -> None:
    respx.post(MCP_EXECUTE_URL).mock(
        return_value=Response(401, json={"detail": "merchant_key_invalid"})
    )

    reset = auth_context._inbound_value.set("mxp_mcp_revoked")
    try:
        result = await mcp_server.call_tool("search", {"query": "ghost"})
    finally:
        auth_context._inbound_value.reset(reset)

    assert result.isError is True
    assert result.structuredContent is not None
    assert "401" in str(result.structuredContent.get("error"))


async def _send(app, presented: str | None) -> httpx.Response:
    headers = httpx.Headers(
        [("Accept", "application/json, text/event-stream"), ("Content-Type", "application/json")]
    )
    if presented is not None:
        headers.update([("Authorization", f"Bearer {presented}")])
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        return await client.post(
            "/mcp",
            json={"jsonrpc": "2.0", "id": 1, "method": "ping"},
            headers=headers,
        )


@pytest.mark.asyncio
async def test_require_mode_rejects_anonymous(monkeypatch) -> None:
    monkeypatch.setenv("MCP_REQUIRE_MERCHANT_AUTH", "true")

    async def inner(scope, receive, send) -> None:
        await PlainTextResponse("ok")(scope, receive, send)

    app = MerchantAuthMiddleware(inner)
    response = await _send(app, None)

    assert response.status_code == 401
    assert response.json()["error"] == "merchant_key_required"


@pytest.mark.asyncio
async def test_require_mode_accepts_merchant_key_and_captures_value(monkeypatch) -> None:
    monkeypatch.setenv("MCP_REQUIRE_MERCHANT_AUTH", "true")
    seen: dict[str, str] = {}

    async def inner(scope, receive, send) -> None:
        seen["value"] = auth_context.get_inbound_value()
        await PlainTextResponse("ok")(scope, receive, send)

    app = MerchantAuthMiddleware(inner)
    response = await _send(app, "mxp_mcp_demo123")

    assert response.status_code == 200
    assert seen["value"] == "mxp_mcp_demo123"


@pytest.mark.asyncio
async def test_capture_cleared_after_request(monkeypatch) -> None:
    monkeypatch.delenv("MCP_REQUIRE_MERCHANT_AUTH", raising=False)

    async def inner(scope, receive, send) -> None:
        assert auth_context.get_inbound_value() == "mxp_mcp_demo123"
        await PlainTextResponse("ok")(scope, receive, send)

    app = MerchantAuthMiddleware(inner)
    response = await _send(app, "mxp_mcp_demo123")

    assert response.status_code == 200
    # Outside the request the context is clean again.
    assert auth_context.get_inbound_value() == ""
