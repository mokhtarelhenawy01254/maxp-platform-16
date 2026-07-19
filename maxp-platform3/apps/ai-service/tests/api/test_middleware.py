from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src.config import get_settings
from src.main import create_app


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    get_settings.cache_clear()


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
def client(app):
    return TestClient(app)


def test_missing_company_id(client):
    resp = client.post("/chat", json={"message": "hi"})
    assert resp.status_code == 401


def test_missing_auth_token(client):
    resp = client.post(
        "/chat",
        json={"message": "hi"},
        headers={"X-Company-Id": "comp1"},
    )
    assert resp.status_code == 401


def test_valid_request_passes_auth(client):
    resp = client.post(
        "/nonexistent",
        json={"message": "hi"},
        headers={
            "X-Company-Id": "comp1",
            "Authorization": "Bearer test-service-token",
        },
    )
    assert resp.status_code in (404, 405)


def test_health_public_no_tenant(client):
    resp = client.get("/health")
    assert resp.status_code == 200
