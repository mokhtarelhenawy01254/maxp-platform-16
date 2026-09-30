from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.db.session import get_session


def _create_test_app(mock_session: AsyncMock) -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="MaxP AI Service Test", version=settings.version)

    from src.api.health import router as health_router
    from src.api.middleware import ServiceAuthMiddleware, TenantMiddleware
    from src.api.resume import router as resume_router

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
    app.include_router(resume_router)

    @app.get("/")
    async def root() -> dict[str, str]:
        return {"service": settings.app_name, "version": settings.version, "status": "running"}

    app.dependency_overrides[get_session] = lambda: mock_session
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


@pytest.fixture
def valid_headers():
    return {
        "X-Company-Id": "comp1",
        "X-Customer-Id": "cust1",
        "Authorization": "Bearer test-service-token",
    }


def _make_mock_approval(status="pending"):
    approval = MagicMock()
    approval.company_id = "comp1"
    approval.draft_id = "draft_123"
    approval.action_type = "discount.create"
    approval.action_args = {"percent": 10}
    approval.thread_id = uuid.uuid4()
    approval.status = status
    return approval


def test_resume_missing_company_id(client):
    resp = client.post(
        "/resume",
        json={"thread_id": "t1", "draft_id": "d1", "approved": True},
        headers={"Authorization": "Bearer test-service-token"},
    )
    assert resp.status_code == 401


def test_resume_missing_auth(client):
    resp = client.post(
        "/resume",
        json={"thread_id": "t1", "draft_id": "d1", "approved": True},
        headers={"X-Company-Id": "comp1"},
    )
    assert resp.status_code == 401


def test_resume_invalid_draft_id(client, mock_session, valid_headers):
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=None)
    )

    resp = client.post(
        "/resume",
        json={"thread_id": "t1", "draft_id": "nonexistent", "approved": True},
        headers=valid_headers,
    )
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"]


def test_resume_cross_tenant_denied(client, mock_session, valid_headers):
    approval = _make_mock_approval()
    approval.company_id = "comp2"
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=approval)
    )

    resp = client.post(
        "/resume",
        json={"thread_id": "t1", "draft_id": "draft_123", "approved": True},
        headers=valid_headers,
    )
    assert resp.status_code == 403
    assert "denied" in resp.json()["detail"].lower()


def test_resume_approve_flow(client, mock_session, valid_headers):
    approval = _make_mock_approval()
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=approval)
    )

    from src.services.approval_service import ApprovalService
    with patch.object(ApprovalService, "approve", new_callable=AsyncMock) as mock_approve:
        mock_approve.return_value = {"status": "completed", "draft_id": "draft_123"}

        resp = client.post(
            "/resume",
            json={
                "thread_id": "t1",
                "draft_id": "draft_123",
                "approved": True,
                "decided_by": "merchant",
            },
            headers=valid_headers,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "تمت الموافقة" in data["reply"]
    assert data["thread_id"] == "t1"
    mock_approve.assert_awaited_once_with(draft_id="draft_123", decided_by="merchant")


def test_resume_approve_returns_action_type_and_summary(client, mock_session, valid_headers):
    """Approval Outcome Mirroring (SKILL 8.13-30): /resume must surface what was
    executed so the backend can mirror it into the chat session ledger."""
    approval = _make_mock_approval()
    approval.action_type = "manage_agent_skill"
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=approval)
    )

    from src.services.approval_service import ApprovalService
    with patch.object(ApprovalService, "approve", new_callable=AsyncMock) as mock_approve:
        mock_approve.return_value = {
            "status": "completed",
            "draft_id": "draft_123",
            "result": {
                "success": True,
                "action": "create",
                "skill": {"name": "مهارة الباقات", "message": "تم حفظ وتفعيل المهارة 'مهارة الباقات' بنجاح."},
            },
        }

        resp = client.post(
            "/resume",
            json={"thread_id": "t1", "draft_id": "draft_123", "approved": True},
            headers=valid_headers,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["action_type"] == "manage_agent_skill"
    assert "مهارة الباقات" in (data["result_summary"] or "")


def test_resume_approve_execution_failure_returns_action_type(client, mock_session, valid_headers):
    approval = _make_mock_approval()
    approval.action_type = "inventory_adjust"
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=approval)
    )

    from src.services.approval_service import ApprovalService
    with patch.object(ApprovalService, "approve", new_callable=AsyncMock) as mock_approve:
        mock_approve.return_value = {
            "status": "failed",
            "draft_id": "draft_123",
            "message": "qty must be positive",
        }

        resp = client.post(
            "/resume",
            json={"thread_id": "t1", "draft_id": "draft_123", "approved": True},
            headers=valid_headers,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "error"
    assert data["action_type"] == "inventory_adjust"
    assert "qty must be positive" in (data["result_summary"] or "")


def test_resume_approve_uses_sdk_workflow_before_manual_execution(client, mock_session, valid_headers):
    approval = _make_mock_approval()
    approval.approval_metadata = {"sdk_approval_id": "call-1"}
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=approval)
    )

    from src.services.approval_service import ApprovalService
    with (
        patch("src.api.resume.resume_sdk_approval_workflow", new_callable=AsyncMock) as sdk_resume,
        patch.object(ApprovalService, "approve", new_callable=AsyncMock) as mock_approve,
    ):
        mock_approve.return_value = {"status": "completed", "draft_id": "draft_123"}
        sdk_resume.return_value = MagicMock(final_reply="done")

        resp = client.post(
            "/resume",
            json={
                "thread_id": "t1",
                "draft_id": "draft_123",
                "approved": True,
                "decided_by": "merchant",
            },
            headers=valid_headers,
        )

    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
    sdk_resume.assert_awaited_once()
    mock_approve.assert_awaited_once()


def test_resume_approve_execution_failure(client, mock_session, valid_headers):
    approval = _make_mock_approval()
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=approval)
    )

    from src.services.approval_service import ApprovalService
    with patch.object(ApprovalService, "approve", new_callable=AsyncMock) as mock_approve:
        mock_approve.return_value = {"status": "error", "draft_id": "draft_123"}

        resp = client.post(
            "/resume",
            json={
                "thread_id": "t1",
                "draft_id": "draft_123",
                "approved": True,
            },
            headers=valid_headers,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "error"
    assert "خطأ" in data["reply"]


def test_resume_reject_flow(client, mock_session, valid_headers):
    approval = _make_mock_approval()
    mock_session.execute.return_value = MagicMock(
        scalar_one_or_none=MagicMock(return_value=approval)
    )

    resp = client.post(
        "/resume",
        json={
            "thread_id": "t1",
            "draft_id": "draft_123",
            "approved": False,
            "reason": "Customer not eligible",
            "decided_by": "admin",
        },
        headers=valid_headers,
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "رفض" in data["reply"]
    assert data["thread_id"] == "t1"
