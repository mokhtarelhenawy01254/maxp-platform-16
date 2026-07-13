from __future__ import annotations

from fastapi.testclient import TestClient

from src.main import app


def test_metrics_endpoint_returns_data():
    with TestClient(app) as client:
        resp = client.get("/metrics")
    assert resp.status_code == 200
    assert "http_requests_total" in resp.text


def test_metrics_records_http_requests():
    with TestClient(app) as client:
        client.get("/health")
        resp = client.get("/metrics")
    assert resp.status_code == 200
    assert resp.text.count("http_requests_total") >= 2
