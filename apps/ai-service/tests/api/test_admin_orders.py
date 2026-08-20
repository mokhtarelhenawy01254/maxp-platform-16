from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.config import get_settings
from src.api.middleware import ServiceAuthMiddleware, TenantMiddleware


def _create_test_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(title="MaxP AI Service Test", version=settings.version)

    from src.api.admin.orders import router as orders_router

    app.add_middleware(ServiceAuthMiddleware)
    app.add_middleware(TenantMiddleware)
    app.include_router(orders_router, prefix="/admin")

    return app


@pytest.fixture
def client():
    with TestClient(_create_test_app()) as c:
        yield c


def test_order_created_requires_auth(client):
    resp = client.post(
        "/admin/orders/created",
        json={"company_id": "comp1", "order_number": "ORD-1"},
    )
    assert resp.status_code == 401


def test_order_created_missing_fields(client):
    resp = client.post(
        "/admin/orders/created",
        json={"company_id": "comp1"},
        headers={"Authorization": "Bearer test-service-token"},
    )
    assert resp.status_code == 422


def test_order_created_enqueues(client):
    with patch(
        "src.api.admin.orders.enqueue_agent_task",
        new_callable=AsyncMock,
        return_value="job-123",
    ) as mock_enqueue:
        resp = client.post(
            "/admin/orders/created",
            json={
                "company_id": "comp1",
                "order_number": "ORD-1",
                "customer_phone": "01012345678",
                "address_text": "┘à╪»┘è┘å╪⌐ ┘å╪╡╪▒ ╪┤╪º╪▒╪╣ 9",
                "governorate": "╪º┘ä┘é╪º┘ç╪▒╪⌐",
            },
            headers={"Authorization": "Bearer test-service-token"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["job_id"] == "job-123"
    mock_enqueue.assert_awaited_once()
    kwargs = mock_enqueue.await_args
    assert kwargs.kwargs["task_type"] == "order.created"
    payload = kwargs.kwargs["payload"]
    assert payload["company_id"] == "comp1"
    assert payload["order_number"] == "ORD-1"
    assert payload["address_text"] == "┘à╪»┘è┘å╪⌐ ┘å╪╡╪▒ ╪┤╪º╪▒╪╣ 9"
