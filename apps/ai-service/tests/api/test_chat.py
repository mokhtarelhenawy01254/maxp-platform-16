from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.chat import SAFE_FALLBACK_REPLY
from src.config import get_settings
from src.db.session import get_session


def _create_test_app(mock_session: AsyncMock) -> FastAPI:
    """Create app with init_db/close_db mocked and get_session overridden."""
    settings = get_settings()

    app = FastAPI(title="MaxP AI Service Test", version=settings.version)

    from src.api.chat import router as chat_router
    from src.api.health import router as health_router
    from src.api.middleware import ServiceAuthMiddleware, TenantMiddleware

    if settings.cors_origins:
        from fastapi.middleware.cors import CORSMiddleware

        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.add_middleware(ServiceAuthMiddleware)
    app.add_middleware(TenantMiddleware)
    app.include_router(health_router)
    app.include_router(chat_router)
    app.dependency_overrides[get_session] = lambda: mock_session

    @app.get("/")
    async def root() -> dict[str, str]:
        return {"service": settings.app_name, "version": settings.version, "status": "running"}

    return app


@pytest.fixture
def mock_session():
    session = AsyncMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.add = MagicMock()
    session.close = AsyncMock()
    return session


@pytest.fixture
def app(mock_session):
    return _create_test_app(mock_session)


@pytest.fixture
def client(app):
    with TestClient(app) as c:
        yield c


def test_chat_missing_company_id(client):
    resp = client.post(
        "/chat",
        json={"message": "hi"},
        headers={"Authorization": "Bearer test-service-token"},
    )
    assert resp.status_code == 401


def test_chat_missing_auth(client):
    resp = client.post(
        "/chat",
        json={"message": "hi"},
        headers={
            "X-Company-Id": "comp1",
            "X-Customer-Id": "cust1",
        },
    )
    assert resp.status_code == 401


def test_chat_valid_request(client, mock_session):
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=None)
    )

    import src.api.chat as chat_module

    original = chat_module.run_orchestration
    chat_module.run_orchestration = AsyncMock(
        return_value={
            "reply": "مرحباً! كيف يمكنني مساعدتك؟",
            "thread_id": "comp1:cust1:chat",
        }
    )

    try:
        resp = client.post(
            "/chat",
            json={"message": "مرحبا"},
            headers={
                "X-Company-Id": "comp1",
                "X-Customer-Id": "cust1",
                "Authorization": "Bearer test-service-token",
            },
        )
    finally:
        chat_module.run_orchestration = original

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["reply"] == "مرحباً! كيف يمكنني مساعدتك؟"
    assert data["thread_id"] == "comp1:cust1:chat"


def test_chat_strips_internal_thought_markers(client, mock_session):
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=None)
    )

    import src.api.chat as chat_module

    original = chat_module.run_orchestration
    chat_module.run_orchestration = AsyncMock(
        return_value={
            "reply": "<thought>internal reasoning must not leak</thought>\nخدمة الذكاء الصناعي تعمل.",
            "thread_id": "comp1:cust1:chat",
        }
    )

    try:
        resp = client.post(
            "/chat",
            json={"message": "اختبار"},
            headers={
                "X-Company-Id": "comp1",
                "X-Customer-Id": "cust1",
                "Authorization": "Bearer test-service-token",
            },
        )
    finally:
        chat_module.run_orchestration = original

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["reply"] == "خدمة الذكاء الصناعي تعمل."
    assert "<thought>" not in data["reply"]


def test_chat_uses_safe_reply_for_unclosed_thought_marker(client, mock_session):
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=None)
    )

    import src.api.chat as chat_module

    original = chat_module.run_orchestration
    chat_module.run_orchestration = AsyncMock(
        return_value={
            "reply": "<thought>internal reasoning without a closing tag",
            "thread_id": "comp1:cust1:chat",
        }
    )

    try:
        resp = client.post(
            "/chat",
            json={"message": "اختبار"},
            headers={
                "X-Company-Id": "comp1",
                "X-Customer-Id": "cust1",
                "Authorization": "Bearer test-service-token",
            },
        )
    finally:
        chat_module.run_orchestration = original

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["reply"] == SAFE_FALLBACK_REPLY
    assert "thought" not in data["reply"].lower()


def test_chat_error_handling(client, mock_session):
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=None)
    )

    import src.api.chat as chat_module

    original = chat_module.run_orchestration
    chat_module.run_orchestration = AsyncMock(side_effect=Exception("API failure"))

    try:
        resp = client.post(
            "/chat",
            json={"message": "مرحبا"},
            headers={
                "X-Company-Id": "comp1",
                "X-Customer-Id": "cust1",
                "Authorization": "Bearer test-service-token",
            },
        )
    finally:
        chat_module.run_orchestration = original

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "error"
    assert data["reply"] is not None
