from unittest.mock import AsyncMock, patch

import pytest


@pytest.fixture(autouse=True)
def add_auth_header(client) -> None:
    client.headers.update({"Authorization": "Bearer test-service-token"})


def test_product_embeddings_sync_starts(client) -> None:
    """POST /admin/product-embeddings/sync returns started when idle."""
    with patch("src.api.admin.product_embeddings._run_backfill", new_callable=AsyncMock):
        response = client.post("/admin/product-embeddings/sync", json={})

    assert response.status_code == 200
    body = response.json()
    assert body["started"] is True


def test_product_embeddings_sync_rejects_if_running(client) -> None:
    """POST /admin/product-embeddings/sync returns started=False when already running."""
    from src.api.admin import product_embeddings as pe
    pe._state["status"] = "running"

    response = client.post("/admin/product-embeddings/sync", json={})

    assert response.status_code == 200
    body = response.json()
    assert body["started"] is False
    assert body["reason"] == "already_running"

    pe._state["status"] = "idle"


def test_product_embeddings_status_shape(client) -> None:
    """GET /admin/product-embeddings/status returns expected top-level keys."""
    from src.api.admin import product_embeddings as pe
    pe._state["status"] = "done"
    pe._state["total"] = 10
    pe._state["done"] = 10
    pe._state["errors"] = 0

    with patch("src.api.admin.product_embeddings._db_mod.async_session") as mock_sesh:
        mock_conn = AsyncMock()
        mock_result = AsyncMock()
        mock_result.fetchall.return_value = []
        mock_result.scalar.return_value = None
        mock_conn.execute.return_value = mock_result
        mock_sesh.return_value.__aenter__.return_value = mock_conn

        response = client.get("/admin/product-embeddings/status")

    assert response.status_code == 200
    body = response.json()
    assert "job" in body
    assert "summary" in body
    assert "companies" in body
    assert body["job"]["status"] == "done"
