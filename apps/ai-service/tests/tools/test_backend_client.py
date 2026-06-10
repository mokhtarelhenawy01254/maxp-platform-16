from __future__ import annotations

import pytest

from src.tools.backend_client import BackendClient


@pytest.mark.asyncio
async def test_backend_client_does_not_trust_proxy_environment(monkeypatch):
    monkeypatch.setattr(
        "src.tools.backend_client.get_settings",
        lambda: type(
            "Settings",
            (),
            {
                "maxp_api_url": "http://localhost:3007",
                "maxp_service_token": "token",
            },
        )(),
    )
    client = BackendClient()
    http_client = await client._get_client()

    assert http_client._trust_env is False

    await http_client.aclose()


@pytest.mark.asyncio
async def test_backend_client_create_order_uses_service_bridge(monkeypatch):
    monkeypatch.setattr(
        "src.tools.backend_client.get_settings",
        lambda: type(
            "Settings",
            (),
            {
                "maxp_api_url": "http://localhost:3007",
                "maxp_service_token": "token",
            },
        )(),
    )
    client = BackendClient()
    calls = []

    async def fake_request(method, path, params=None, json_body=None):
        calls.append({
            "method": method,
            "path": path,
            "params": params,
            "json_body": json_body,
        })
        return {
            "success": True,
            "result": {
                "success": True,
                "status": "EXECUTED",
                "toolName": "order.create_confirmed",
                "output": {
                    "status": "ORDER_CREATED",
                    "orderNumber": "ORD-1001",
                },
            },
        }

    monkeypatch.setattr(client, "_request", fake_request)

    result = await client.create_order("comp1", {
        "customerName": "Test Customer",
        "productName": "Sprint X",
        "productPrice": 1499,
        "confirmedByCustomer": True,
    })

    assert result == {"status": "ORDER_CREATED", "orderNumber": "ORD-1001"}
    assert calls == [
        {
            "method": "POST",
            "path": "/api/v1/ai-bridge/tools/execute",
            "params": None,
            "json_body": {
                "companyId": "comp1",
                "toolName": "order.create_confirmed",
                "input": {
                    "customerName": "Test Customer",
                    "productName": "Sprint X",
                    "productPrice": 1499,
                    "confirmedByCustomer": True,
                    "companyId": "comp1",
                },
                "threadId": None,
            },
        },
    ]


@pytest.mark.asyncio
async def test_backend_client_send_facebook_message_forwards_media_fields(monkeypatch):
    monkeypatch.setattr(
        "src.tools.backend_client.get_settings",
        lambda: type(
            "Settings",
            (),
            {
                "maxp_api_url": "http://localhost:3007",
                "maxp_service_token": "token",
            },
        )(),
    )
    client = BackendClient()
    calls = []

    async def fake_request(method, path, params=None, json_body=None):
        calls.append({
            "method": method,
            "path": path,
            "params": params,
            "json_body": json_body,
        })
        return {
            "success": True,
            "data": {
                "success": True,
                "messageId": "mid.image123",
                "messageType": "IMAGE",
            },
        }

    monkeypatch.setattr(client, "_request", fake_request)

    result = await client.send_facebook_message(
        "comp1",
        "psid_1",
        "",
        "page_1",
        message_type="IMAGE",
        media_url="https://cdn.example.test/product.jpg",
    )

    assert result == {
        "success": True,
        "messageId": "mid.image123",
        "messageType": "IMAGE",
    }
    assert calls == [
        {
            "method": "POST",
            "path": "/api/v1/facebook/status/test-message",
            "params": None,
            "json_body": {
                "recipientId": "psid_1",
                "message": "",
                "pageId": "page_1",
                "companyId": "comp1",
                "messageType": "IMAGE",
                "mediaUrl": "https://cdn.example.test/product.jpg",
            },
        },
    ]
