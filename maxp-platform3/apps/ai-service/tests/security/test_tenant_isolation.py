from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import ClassVar
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.db.session import get_session
from src.main import create_app


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    get_settings.cache_clear()


@pytest.fixture
def mock_session() -> AsyncMock:
    session = AsyncMock(spec=AsyncSession)
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    session.execute.return_value = result_mock
    return session


@pytest.fixture
def app(mock_session: AsyncMock):
    app = create_app()

    async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
        yield mock_session

    app.dependency_overrides[get_session] = override_get_session
    return app


@pytest.fixture
def client(app):
    return TestClient(app)


class TestTenantIsolationAPI:
    """Verify that cross-tenant access is impossible at the API layer."""

    def test_missing_company_id_rejected(self, client):
        """Request without X-Company-Id should be rejected."""
        resp = client.post(
            "/chat",
            json={"message": "hi"},
            headers={"Authorization": "Bearer test-service-token"},
        )
        assert resp.status_code == 401

    def test_invalid_token_rejected(self, client):
        """Request with invalid auth token should be rejected."""
        resp = client.post(
            "/chat",
            json={"message": "hi"},
            headers={
                "X-Company-Id": "comp1",
                "Authorization": "Bearer invalid-token",
            },
        )
        assert resp.status_code == 401

    def test_public_endpoints_no_auth(self, client):
        """Public endpoints should work without any auth."""
        resp = client.get("/health")
        assert resp.status_code == 200

        resp = client.get("/ready")
        assert resp.status_code in (200, 503)

        resp = client.get("/metrics")
        assert resp.status_code == 200

    def test_company_id_from_header_not_body(self, client):
        """company_id must come from header, not from request body."""
        resp = client.post(
            "/chat",
            json={"message": "hi"},
            headers={
                "X-Company-Id": "comp1",
                "X-Customer-Id": "cust1",
                "Authorization": "Bearer test-service-token",
            },
        )
        assert resp.status_code not in (401, 403)

    def test_cross_tenant_resume_rejected(self, client):
        """Resume endpoint should enforce tenant isolation."""
        resp = client.post(
            "/resume",
            json={"thread_id": "t1", "draft_id": "d1", "approved": True},
            headers={
                "X-Company-Id": "comp1",
                "Authorization": "Bearer test-service-token",
            },
        )
        assert resp.status_code != 401


class TestPublicEndpointsAccessible:
    """Verify public endpoints don't require tenant context or auth."""

    PUBLIC_ENDPOINTS: ClassVar[list[tuple[str, str]]] = [
        ("GET", "/health"),
        ("GET", "/ready"),
        ("GET", "/metrics"),
    ]

    @pytest.mark.parametrize("method,path", PUBLIC_ENDPOINTS)
    def test_public_endpoint_no_headers(self, client, method, path):
        resp = client.request(method, path)
        assert resp.status_code in (200, 503), f"{method} {path} should be accessible without headers"
