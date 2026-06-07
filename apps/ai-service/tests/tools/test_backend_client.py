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
