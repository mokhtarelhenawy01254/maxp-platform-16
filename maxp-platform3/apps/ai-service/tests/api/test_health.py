from __future__ import annotations

from src.config import get_settings


def test_health_endpoint_returns_ok(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "maxp-ai-service" in body["service"]


def test_health_endpoint_includes_version_and_env(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert "version" in body
    assert "environment" in body


def test_root_endpoint_returns_service_info(client) -> None:
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert "maxp-ai-service" in body["service"]
    assert body["status"] == "running"
    assert "version" in body


def test_ready_endpoint_accepts_google_provider(client, monkeypatch) -> None:
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("DEFAULT_LLM_PROVIDER", "google")
    monkeypatch.setenv("GOOGLE_API_KEY", "test-google-key")
    get_settings.cache_clear()

    response = client.get("/ready")

    assert response.status_code == 200
    assert response.json()["status"] == "ready"
