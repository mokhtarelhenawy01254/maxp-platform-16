from __future__ import annotations

from typing import Any

import pytest


@pytest.mark.asyncio
async def test_order_created_registered_in_handlers():
    """order.created must be wired to handle_order_created."""
    from src.workers import agent_worker

    assert "order.created" in agent_worker.TASK_HANDLERS
    assert agent_worker.TASK_HANDLERS["order.created"].__name__ == "handle_order_created"


@pytest.mark.asyncio
async def test_handle_order_created_skips_when_missing_fields(monkeypatch):
    """Missing company_id/order_number ΓåÆ skip, no agent resolution."""
    from src.workers import agent_worker

    resolved = []

    async def fake_resolve(company_id, session):
        resolved.append(company_id)
        return None, None

    monkeypatch.setattr(agent_worker, "_resolve_order_confirmation_agent", fake_resolve)

    await agent_worker.handle_order_created({"payload": {}})
    await agent_worker.handle_order_created({"payload": {"company_id": "comp1"}})
    assert resolved == []


@pytest.mark.asyncio
async def test_handle_order_created_runs_agent(monkeypatch):
    """With order_number + company_id, the resolved agent must process the task."""
    from src.workers import agent_worker

    processed: list[dict[str, Any]] = []

    class _FakeAgent:
        config = type("_C", (), {"id": "ag_1"})()

        async def process_task(self, task: dict[str, Any]) -> dict[str, Any]:
            processed.append(task)
            return {"result": {"reply": "╪¬┘à ╪º┘ä╪¬╪ú┘â┘è╪»"}}

    class _MockSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

    async def fake_resolve(company_id, session):
        assert company_id == "comp1"
        return "ag_1", _FakeAgent()

    monkeypatch.setattr(agent_worker, "_resolve_order_confirmation_agent", fake_resolve)
    monkeypatch.setattr(agent_worker, "async_session", lambda: _MockSession())

    await agent_worker.handle_order_created({
        "payload": {
            "company_id": "comp1",
            "order_number": "ORD-1",
            "address_text": "┘à╪»┘è┘å╪⌐ ┘å╪╡╪▒ ╪┤╪º╪▒╪╣ 9",
            "governorate": "╪º┘ä┘é╪º┘ç╪▒╪⌐",
            "customer_phone": "01012345678",
        }
    })

    assert len(processed) == 1
    task = processed[0]
    assert task["company_id"] == "comp1"
    assert task["channel"] == "whatsapp"
    assert "ORD-1" in task["description"]
    assert "search_area_by_text" in task["description"]


@pytest.mark.asyncio
async def test_handle_order_created_no_agent_skips(monkeypatch):
    """No resolvable agent ΓåÆ graceful skip."""
    from src.workers import agent_worker

    class _MockSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

    async def fake_resolve(company_id, session):
        return None, None

    monkeypatch.setattr(agent_worker, "_resolve_order_confirmation_agent", fake_resolve)
    monkeypatch.setattr(agent_worker, "async_session", lambda: _MockSession())

    await agent_worker.handle_order_created({
        "payload": {"company_id": "comp1", "order_number": "ORD-2"}
    })
