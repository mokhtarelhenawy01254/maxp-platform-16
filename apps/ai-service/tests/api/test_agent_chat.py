from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.db.session import get_session


def _create_test_app(mock_session: AsyncMock) -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="MaxP AI Service Agent Chat Test", version=settings.version)

    from src.api.admin import router as admin_router
    from src.api.middleware import ServiceAuthMiddleware

    app.add_middleware(ServiceAuthMiddleware)
    app.include_router(admin_router, prefix="/admin")
    app.dependency_overrides[get_session] = lambda: mock_session
    return app


def test_agent_chat_uses_selected_agent_config_when_db_agent_is_missing(monkeypatch):
    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_result.mappings().one_or_none.return_value = None
    mock_session.execute = AsyncMock(return_value=mock_result)

    captured: dict[str, object] = {}

    class _Agent:
        id = "agent_fb"
        role = "FACEBOOK_SALES_SUPPORT"
        _last_model_selection = None

        async def ensure_client(self):
            return object()

        async def process_task(self, task):
            captured["task"] = task
            return {
                "status": "SUCCESS",
                "result": {
                    "reply": "أنا شيرين",
                    "tools": [],
                    "draft_id": None,
                    "pipeline_trace": {
                        "toolExecutions": [{
                            "name": "inventory_check",
                            "params": {"product_name_or_sku": "black shoes"},
                            "output": {"status": "NOT_FOUND"},
                            "success": True,
                        }],
                    },
                },
            }

    async def fake_from_template(cls, template_slug, company_id, overrides=None, session=None):
        captured["template_slug"] = template_slug
        captured["company_id"] = company_id
        captured["overrides"] = overrides
        return _Agent()

    monkeypatch.setattr(
        "src.api.admin.agents.BaseAgent.from_template",
        classmethod(fake_from_template),
    )

    app = _create_test_app(mock_session)
    with TestClient(app) as client:
        response = client.post(
            "/admin/agents/chat",
            headers={"Authorization": "Bearer test-service-token"},
            json={
                "company_id": "comp_test",
                "agent_id": "agent_fb",
                "message": "انت اسمك ايه؟",
                "thread_id": "thread_1",
                "customer_id": "customer_1",
                "channel": "facebook",
                "attachments": [
                    {
                        "type": "image",
                        "mime_type": "image/png",
                        "base64_data": "iVBORw0KGgo=",
                        "detail": "low",
                    }
                ],
                "agent_config": {
                    "id": "agent_fb",
                    "name": "شيرين",
                    "role": "FACEBOOK_SALES_SUPPORT",
                    "templateSlug": "facebook-sales-support-agent",
                    "model": "llama-3.3-70b-versatile",
                    "allowedTools": ["product.search"],
                    "allowedSkills": [],
                    "persona": {
                        "soulInstructions": "اتكلمي بالعامية المصرية. اسمك شيرين.",
                        "agentInstructions": "Rules",
                        "toolsInstructions": "Tools",
                        "personaInstructions": "Persona",
                    },
                },
            },
        )

    assert response.status_code == 200
    assert response.json()["reply"] == "أنا شيرين"
    assert response.json()["pipeline_trace"]["toolExecutions"][0]["name"] == "inventory_check"
    assert captured["template_slug"] == "facebook-sales-support-agent"
    overrides = captured["overrides"]
    assert overrides["id"] == "agent_fb"
    assert overrides["name"] == "شيرين"
    assert overrides["role"] == "FACEBOOK_SALES_SUPPORT"
    assert overrides["instructions"]["soul"] == "اتكلمي بالعامية المصرية. اسمك شيرين."
    assert captured["task"]["channel"] == "facebook"
    assert captured["task"]["attachments"][0]["mime_type"] == "image/png"
    assert captured["task"]["attachments"][0]["detail"] == "low"


def test_sandbox_evaluate_response_uses_python_llm_client(monkeypatch):
    mock_session = AsyncMock(spec=AsyncSession)

    class _Response:
        text = """
        {
          "scores": {
            "accuracy": 91,
            "helpfulness": 90,
            "relevance": 89,
            "completeness": 88,
            "safety": 100
          },
          "overall": 91,
          "comment": "python evaluation"
        }
        """

    class _Client:
        async def get_response(self, messages, options=None):
            assert "Check inventory" in messages[-1]["content"]
            assert (options or {}).get("tools_enabled") is False
            return _Response()

    monkeypatch.setattr(
        "src.api.admin.agents.build_provider_client_async",
        AsyncMock(return_value=_Client()),
    )

    app = _create_test_app(mock_session)
    with TestClient(app) as client:
        response = client.post(
            "/admin/sandbox/evaluate-response",
            headers={"Authorization": "Bearer test-service-token"},
            json={
                "company_id": "comp_test",
                "message": "Check inventory",
                "response": "Need exact product model",
                "tool_calls": [{"name": "inventory.check", "input": {"product": "black shoes"}}],
                "provider": "GOOGLE",
                "model": "gemini-2.5-flash",
                "key_id": "key_google",
            },
        )

    assert response.status_code == 200
    assert response.json()["scores"]["accuracy"] == 91
    assert response.json()["overall"] == 91
    assert response.json()["comment"] == "python evaluation"
