from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.db.session import get_session
from src.db.models.agent import Agent, AgentTemplate


def _create_test_app(mock_session: AsyncMock) -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="MaxP AI Service Admin Test", version=settings.version)

    from src.api.admin import router as admin_router
    from src.api.middleware import ServiceAuthMiddleware

    app.add_middleware(ServiceAuthMiddleware)
    app.include_router(admin_router, prefix="/admin")
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
        "Authorization": "Bearer test-service-token",
    }


def _make_mock_agent(agent_id="agent_123", company_id="comp_123", role="SUPPORT"):
    agent = Agent(
        id=agent_id,
        company_id=company_id,
        name="Support Agent",
        role=role,
        template_slug="support-agent",
        status="ACTIVE",
        model="gpt-4o",
        persona={"soulInstructions": "You help customers."},
        allowed_tools=["get_product_details"],
        allowed_skills=[],
        guardrails={},
        budget={},
        parent_id=None,
        version="1.0.0",
        config={},
    )
    return agent


def _make_mock_template():
    return AgentTemplate(
        slug="support-agent",
        role="SUPPORT",
        name="Customer Support",
        version="1.0.0",
        model_policy={"default": "gpt-4o"},
        allowed_tools=["get_product_details"],
        allowed_skills=[],
        channels=["whatsapp"],
        guardrails={},
        persona_meta={},
        instructions_soul="Default soul",
        instructions_persona="Default persona",
        instructions_tools="Default tools",
        human_approval={},
        handoffs=[],
        mcp_servers=[],
        budget={},
        config={}
    )


def setup_execute_mock(mock_session, template_return=None, agent_return=None, list_agents_return=None):
    async def side_effect(query, *args, **kwargs):
        sql = str(query)
        mock_res = MagicMock()
        if "agent_templates" in sql:
            mock_res.scalar_one_or_none.return_value = template_return
        elif "agents" in sql:
            # We check if this is a list query by checking if list_agents_return is provided
            # or if order_by / limit exists in the query.
            if list_agents_return is not None and ("LIMIT" in sql or "ORDER BY" in sql or "agents" in sql):
                mock_res.scalars.return_value.all.return_value = list_agents_return
            else:
                mock_res.scalar_one_or_none.return_value = agent_return
        return mock_res
    mock_session.execute.side_effect = side_effect


def test_list_agents(client, mock_session, valid_headers):
    agent1 = _make_mock_agent(agent_id="agent_1")
    agent2 = _make_mock_agent(agent_id="agent_2")
    
    setup_execute_mock(mock_session, list_agents_return=[agent1, agent2])

    resp = client.get("/admin/agents", headers=valid_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["id"] == "agent_1"
    assert data[1]["id"] == "agent_2"


def test_get_agent(client, mock_session, valid_headers):
    agent = _make_mock_agent(agent_id="agent_123")
    setup_execute_mock(mock_session, agent_return=agent)

    resp = client.get("/admin/agents/agent_123", headers=valid_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "agent_123"
    assert data["name"] == "Support Agent"


def test_get_agent_not_found(client, mock_session, valid_headers):
    setup_execute_mock(mock_session, agent_return=None)

    resp = client.get("/admin/agents/nonexistent", headers=valid_headers)
    assert resp.status_code == 404


def test_spawn_agent_success(client, mock_session, valid_headers):
    # No template, no existing duplicate agent
    setup_execute_mock(mock_session, template_return=None, agent_return=None)

    resp = client.post(
        "/admin/agents/spawn",
        json={
            "company_id": "comp_123",
            "name": "New Support",
            "role": "SUPPORT",
            "model": "gpt-4o",
            "persona": {"soulInstructions": "Be nice"},
            "allowed_tools": ["search"],
        },
        headers=valid_headers
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["company_id"] == "comp_123"
    assert data["name"] == "New Support"
    assert data["role"] == "SUPPORT"
    assert data["model"] == "gpt-4o"
    assert data["persona"]["soulInstructions"] == "Be nice"
    assert data["allowed_tools"] == ["search"]


def test_spawn_agent_with_template(client, mock_session, valid_headers):
    template = _make_mock_template()
    setup_execute_mock(mock_session, template_return=template, agent_return=None)

    resp = client.post(
        "/admin/agents/spawn",
        json={
            "company_id": "comp_123",
            "template_slug": "support-agent",
        },
        headers=valid_headers
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["company_id"] == "comp_123"
    assert data["template_slug"] == "support-agent"
    assert data["model"] == "gpt-4o"
    assert data["allowed_tools"] == ["get_product_details"]


def test_spawn_agent_duplicate_conflict(client, mock_session, valid_headers):
    # Template lookup returns None (or doesn't crash), duplicate check returns existing agent
    existing = _make_mock_agent(agent_id="existing_id")
    setup_execute_mock(mock_session, template_return=None, agent_return=existing)

    resp = client.post(
        "/admin/agents/spawn",
        json={
            "company_id": "comp_123",
            "name": "Support Agent",
            "role": "SUPPORT",
        },
        headers=valid_headers
    )
    assert resp.status_code == 409
    assert "already exists" in resp.json()["detail"]


def test_update_agent_success(client, mock_session, valid_headers):
    agent = _make_mock_agent(agent_id="agent_123")
    setup_execute_mock(mock_session, agent_return=agent)

    resp = client.put(
        "/admin/agents/agent_123",
        json={
            "name": "Updated Name",
            "model": "claude-3-5-sonnet",
            "persona": {"soulInstructions": "Brand new soul"},
            "allowed_tools": ["custom_tool"],
        },
        headers=valid_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Updated Name"
    assert data["model"] == "claude-3-5-sonnet"
    assert data["persona"]["soulInstructions"] == "Brand new soul"
    assert data["allowed_tools"] == ["custom_tool"]


def test_archive_agent(client, mock_session, valid_headers):
    agent = _make_mock_agent(agent_id="agent_123", role="SUPPORT")
    setup_execute_mock(mock_session, agent_return=agent)

    resp = client.delete("/admin/agents/agent_123", headers=valid_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ARCHIVED"


def test_archive_ceo_denied(client, mock_session, valid_headers):
    agent = _make_mock_agent(agent_id="agent_ceo", role="CEO")
    setup_execute_mock(mock_session, agent_return=agent)

    resp = client.delete("/admin/agents/agent_ceo", headers=valid_headers)
    assert resp.status_code == 400
    assert "Cannot archive the CEO agent" in resp.json()["detail"]
