"""Tests for the guardrails admin API router."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.db.models.guardrail import AgentGuardrailRule
from src.db.session import get_session
from src.api.admin.auth import verify_admin_jwt


def _mock_guardrail(
    rule_id: str = "gr_test123",
    agent_id: str = "agent_1",
    company_id: str = "comp_1",
    excuse: str = "العميل يطلب خصم يوم الجمعة",
    rebuttal: str = "يوم الجمعة يوم العروض الثابتة",
    action: str = "وضح للعميل أن العروض ثابتة",
    source: str = "merchant_manual",
    is_active: bool = True,
    embedding: list | None = None,
) -> MagicMock:
    rule = MagicMock(spec=AgentGuardrailRule)
    rule.id = rule_id
    rule.agent_id = agent_id
    rule.company_id = company_id
    rule.excuse = excuse
    rule.rebuttal = rebuttal
    rule.action = action
    rule.source = source
    rule.is_active = is_active
    rule.embedding = embedding
    return rule


def _create_test_app(mock_session: AsyncMock) -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Guardrails Test", version=settings.version)

    from src.api.admin import router as admin_router
    from src.api.middleware import ServiceAuthMiddleware

    app.add_middleware(ServiceAuthMiddleware)
    app.include_router(admin_router, prefix="/admin")
    app.dependency_overrides[get_session] = lambda: mock_session
    # Skip JWT verification in tests
    app.dependency_overrides[verify_admin_jwt] = lambda: None
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
        "Authorization": "Bearer test-service-token",
    }


# ─── LIST ────────────────────────────────────────────────────────────────────


@patch("src.api.admin.guardrails.GuardrailRepository")
def test_list_guardrails_returns_rules(MockRepo, client, valid_headers):
    """GET /admin/agents/{id}/guardrails returns a list of active rules."""
    mock_repo_instance = AsyncMock()
    mock_repo_instance.list_rules = AsyncMock(return_value=[
        _mock_guardrail(rule_id="r1"),
        _mock_guardrail(rule_id="r2", excuse="طلب استرجاع"),
    ])
    MockRepo.return_value = mock_repo_instance

    response = client.get("/admin/agents/agent_1/guardrails", headers=valid_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["id"] == "r1"
    assert data[1]["id"] == "r2"


@patch("src.api.admin.guardrails.GuardrailRepository")
def test_list_guardrails_empty(MockRepo, client, valid_headers):
    """GET returns empty list when no rules exist."""
    mock_repo_instance = AsyncMock()
    mock_repo_instance.list_rules = AsyncMock(return_value=[])
    MockRepo.return_value = mock_repo_instance

    response = client.get("/admin/agents/agent_1/guardrails", headers=valid_headers)
    assert response.status_code == 200
    assert response.json() == []


# ─── CREATE ──────────────────────────────────────────────────────────────────


@patch("src.api.admin.guardrails.redis_client")
@patch("src.api.admin.guardrails.GuardrailTranslator")
@patch("src.api.admin.guardrails.GuardrailRepository")
def test_create_guardrail_success(MockRepo, MockTranslator, mock_redis, client, valid_headers):
    """POST /admin/agents/{id}/guardrails translates and creates a rule."""
    mock_translator_instance = AsyncMock()
    mock_translator_instance.translate_feedback = AsyncMock(return_value={
        "excuse": "العميل يطلب خصم",
        "rebuttal": "لا يوجد خصم متاح",
        "action": "اعرض البدائل",
    })
    mock_translator_instance.generate_embedding = AsyncMock(return_value=[0.1, 0.2, 0.3])
    MockTranslator.return_value = mock_translator_instance

    created_rule = _mock_guardrail(
        excuse="العميل يطلب خصم",
        rebuttal="لا يوجد خصم متاح",
        action="اعرض البدائل",
    )
    mock_repo_instance = AsyncMock()
    mock_repo_instance.create_rule = AsyncMock(return_value=created_rule)
    MockRepo.return_value = mock_repo_instance

    mock_redis.available = True
    mock_redis.delete = AsyncMock()

    response = client.post(
        "/admin/agents/agent_1/guardrails",
        headers=valid_headers,
        json={
            "feedbackText": "ممنوع ندي خصم يوم الجمعة",
            "companyId": "comp_1",
            "source": "merchant_manual",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["excuse"] == "العميل يطلب خصم"
    assert data["rebuttal"] == "لا يوجد خصم متاح"
    assert data["action"] == "اعرض البدائل"

    # Verify translator was called
    mock_translator_instance.translate_feedback.assert_called_once()
    mock_translator_instance.generate_embedding.assert_called_once()
    # Verify redis cache was invalidated
    mock_redis.delete.assert_called_once_with("guardrails:agent_1")


# ─── UPDATE ──────────────────────────────────────────────────────────────────


@patch("src.api.admin.guardrails.redis_client")
@patch("src.api.admin.guardrails.GuardrailRepository")
def test_update_guardrail_toggle_active(MockRepo, mock_redis, client, valid_headers):
    """PUT /admin/agents/{id}/guardrails/{rule_id} toggles isActive."""
    existing = _mock_guardrail()
    updated = _mock_guardrail(is_active=False)
    mock_repo_instance = AsyncMock()
    mock_repo_instance.get_rule = AsyncMock(return_value=existing)
    mock_repo_instance.update_rule = AsyncMock(return_value=updated)
    MockRepo.return_value = mock_repo_instance

    mock_redis.available = True
    mock_redis.delete = AsyncMock()

    response = client.put(
        "/admin/agents/agent_1/guardrails/gr_test123",
        headers=valid_headers,
        json={"isActive": False},
    )
    assert response.status_code == 200
    assert response.json()["isActive"] is False


@patch("src.api.admin.guardrails.GuardrailRepository")
def test_update_guardrail_not_found(MockRepo, client, valid_headers):
    """PUT returns 404 when rule doesn't exist."""
    mock_repo_instance = AsyncMock()
    mock_repo_instance.get_rule = AsyncMock(return_value=None)
    MockRepo.return_value = mock_repo_instance

    response = client.put(
        "/admin/agents/agent_1/guardrails/nonexistent",
        headers=valid_headers,
        json={"excuse": "Updated"},
    )
    assert response.status_code == 404


# ─── DELETE ──────────────────────────────────────────────────────────────────


@patch("src.api.admin.guardrails.redis_client")
@patch("src.api.admin.guardrails.GuardrailRepository")
def test_delete_guardrail_success(MockRepo, mock_redis, client, valid_headers):
    """DELETE /admin/agents/{id}/guardrails/{rule_id} soft deletes."""
    existing = _mock_guardrail()
    mock_repo_instance = AsyncMock()
    mock_repo_instance.get_rule = AsyncMock(return_value=existing)
    mock_repo_instance.deactivate_rule = AsyncMock()
    MockRepo.return_value = mock_repo_instance

    mock_redis.available = True
    mock_redis.delete = AsyncMock()

    response = client.delete(
        "/admin/agents/agent_1/guardrails/gr_test123",
        headers=valid_headers,
    )
    assert response.status_code == 204
    mock_repo_instance.deactivate_rule.assert_called_once_with("gr_test123")
    mock_redis.delete.assert_called_once_with("guardrails:agent_1")


@patch("src.api.admin.guardrails.GuardrailRepository")
def test_delete_guardrail_not_found(MockRepo, client, valid_headers):
    """DELETE returns 404 when rule doesn't exist."""
    mock_repo_instance = AsyncMock()
    mock_repo_instance.get_rule = AsyncMock(return_value=None)
    MockRepo.return_value = mock_repo_instance

    response = client.delete(
        "/admin/agents/agent_1/guardrails/nonexistent",
        headers=valid_headers,
    )
    assert response.status_code == 404


# ─── CONFLICT CHECK ─────────────────────────────────────────────────────────


@patch("src.api.admin.guardrails.GuardrailRepository")
@patch("src.api.admin.guardrails.GuardrailTranslator")
def test_conflict_check_no_conflict(MockTranslator, MockRepo, client, valid_headers):
    """POST conflict-check returns no conflict when vectors are orthogonal."""
    mock_translator_instance = AsyncMock()
    mock_translator_instance.translate_feedback = AsyncMock(return_value={
        "excuse": "طلب جديد",
        "rebuttal": "لا",
        "action": "ارفض",
    })
    mock_translator_instance.generate_embedding = AsyncMock(return_value=[1.0, 0.0])
    mock_translator_instance.check_conflict = AsyncMock(return_value=None)
    MockTranslator.return_value = mock_translator_instance

    mock_repo_instance = AsyncMock()
    mock_repo_instance.list_rules = AsyncMock(return_value=[
        _mock_guardrail(embedding=[0.0, 1.0]),
    ])
    MockRepo.return_value = mock_repo_instance

    response = client.post(
        "/admin/agents/agent_1/guardrails/conflict-check",
        headers=valid_headers,
        json={"feedbackText": "قاعدة جديدة", "companyId": "comp_1"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["conflictDetected"] is False


@patch("src.api.admin.guardrails.GuardrailRepository")
@patch("src.api.admin.guardrails.GuardrailTranslator")
def test_conflict_check_detected(MockTranslator, MockRepo, client, valid_headers):
    """POST conflict-check returns conflict when similarity exceeds threshold."""
    conflicting_rule = {
        "id": "r_existing",
        "excuse": "خصم الجمعة",
        "rebuttal": "لا يوجد",
        "action": "ارفض",
    }
    mock_translator_instance = AsyncMock()
    mock_translator_instance.translate_feedback = AsyncMock(return_value={
        "excuse": "خصم الجمعة مكرر",
        "rebuttal": "لا",
        "action": "ارفض",
    })
    mock_translator_instance.generate_embedding = AsyncMock(return_value=[0.9, 0.1])
    mock_translator_instance.check_conflict = AsyncMock(return_value=conflicting_rule)
    MockTranslator.return_value = mock_translator_instance

    mock_repo_instance = AsyncMock()
    mock_repo_instance.list_rules = AsyncMock(return_value=[
        _mock_guardrail(rule_id="r_existing", embedding=[0.9, 0.1]),
    ])
    MockRepo.return_value = mock_repo_instance

    response = client.post(
        "/admin/agents/agent_1/guardrails/conflict-check",
        headers=valid_headers,
        json={"feedbackText": "ممنوع خصم يوم الجمعة", "companyId": "comp_1"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["conflictDetected"] is True
    assert data["conflictingRule"]["id"] == "r_existing"


@patch("src.api.admin.guardrails.GuardrailRepository")
@patch("src.api.admin.guardrails.GuardrailTranslator")
def test_conflict_check_no_embedding_returns_safe(MockTranslator, MockRepo, client, valid_headers):
    """POST conflict-check returns no conflict when embedding generation fails."""
    mock_translator_instance = AsyncMock()
    mock_translator_instance.translate_feedback = AsyncMock(return_value={
        "excuse": "test",
        "rebuttal": "test",
        "action": "test",
    })
    mock_translator_instance.generate_embedding = AsyncMock(return_value=None)
    MockTranslator.return_value = mock_translator_instance

    response = client.post(
        "/admin/agents/agent_1/guardrails/conflict-check",
        headers=valid_headers,
        json={"feedbackText": "test feedback", "companyId": "comp_1"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["conflictDetected"] is False
