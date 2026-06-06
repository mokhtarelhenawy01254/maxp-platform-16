from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from src.workflows.orchestration_flow import run_orchestration
from src.workflows.postgres_checkpoint import PostgresCheckpointStorage


@pytest.mark.asyncio
async def test_customer_chat_skips_raw_magentic_path(monkeypatch):
    settings = MagicMock(enable_magentic_orchestration=True)
    client = MagicMock()
    fallback = MagicMock()
    fallback.get_client = AsyncMock(return_value=client)
    final_ctx = MagicMock(
        final_reply="model reply",
        llm_response="",
        executed_tools=[],
    )

    monkeypatch.setattr("src.workflows.orchestration_flow.get_settings", lambda: settings)
    monkeypatch.setattr("src.workflows.orchestration_flow.LLMFallbackProvider", lambda: fallback)
    monkeypatch.setattr(
        "src.workflows.orchestration_flow.MagenticOrchestrator",
        lambda llm_client: pytest.fail("customer chat must not use raw Magentic path"),
    )
    monkeypatch.setattr(
        "src.workflows.orchestration_flow._ensure_default_agents",
        AsyncMock(),
    )
    monkeypatch.setattr(
        "src.workflows.orchestration_flow.execute_pipeline",
        AsyncMock(return_value=final_ctx),
    )

    manager = MagicMock()
    registry = MagicMock()
    registry.list_agents.return_value = []
    monkeypatch.setattr("src.workflows.orchestration_flow.get_agent_manager_service", lambda: manager)
    monkeypatch.setattr("src.workflows.orchestration_flow.get_agent_registry", lambda: registry)

    result = await run_orchestration(
        message="hello",
        thread_id="thread-1",
        company_id="company-1",
        customer_id="customer-1",
        is_merchant=False,
    )

    assert result["reply"] == "model reply"


@pytest.mark.asyncio
async def test_orchestration_passes_sdk_checkpoint_storage(monkeypatch):
    settings = MagicMock(enable_magentic_orchestration=False)
    client = MagicMock()
    fallback = MagicMock()
    fallback.get_client = AsyncMock(return_value=client)
    final_ctx = MagicMock(
        final_reply="model reply",
        llm_response="",
        executed_tools=[],
    )
    pipeline_mock = AsyncMock(return_value=final_ctx)

    class _StateManager:
        async def get_latest_state(self, thread_id):
            return None

        async def save_state(self, *args, **kwargs):
            return "state-1"

    class _Checkpointer:
        async def get_latest_checkpoint(self, thread_id):
            return None

        async def save_checkpoint(self, *args, **kwargs):
            return "checkpoint-1"

    monkeypatch.setattr("src.workflows.orchestration_flow.get_settings", lambda: settings)
    monkeypatch.setattr("src.workflows.orchestration_flow.LLMFallbackProvider", lambda: fallback)
    monkeypatch.setattr("src.workflows.orchestration_flow._ensure_default_agents", AsyncMock())
    monkeypatch.setattr("src.workflows.orchestration_flow.execute_pipeline", pipeline_mock)
    monkeypatch.setattr("src.workflows.orchestration_flow.RunStateManager", lambda session: _StateManager())
    monkeypatch.setattr("src.workflows.orchestration_flow.PipelineCheckpointer", lambda session: _Checkpointer())

    manager = MagicMock()
    registry = MagicMock()
    registry.list_agents.return_value = []
    monkeypatch.setattr("src.workflows.orchestration_flow.get_agent_manager_service", lambda: manager)
    monkeypatch.setattr("src.workflows.orchestration_flow.get_agent_registry", lambda: registry)

    result = await run_orchestration(
        message="hello",
        thread_id="thread-1",
        company_id="company-1",
        customer_id="customer-1",
        session=MagicMock(),
        is_merchant=False,
    )

    assert result["reply"] == "model reply"
    assert isinstance(pipeline_mock.call_args.kwargs["checkpoint_storage"], PostgresCheckpointStorage)
