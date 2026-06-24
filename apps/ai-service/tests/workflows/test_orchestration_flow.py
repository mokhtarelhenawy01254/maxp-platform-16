from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from src.db.models.agent import Agent
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


@pytest.mark.asyncio
async def test_orchestration_prefers_db_channel_assignment_over_stale_registry(monkeypatch):
    settings = MagicMock(enable_magentic_orchestration=False)
    final_ctx = MagicMock(
        final_reply="model reply",
        llm_response="",
        executed_tools=[],
    )
    pipeline_mock = AsyncMock(return_value=final_ctx)

    old_agent = MagicMock()
    old_agent.name = "Old WhatsApp Agent"
    old_agent.role = "SALES"
    old_agent.config = MagicMock(
        allowed_channels=["WHATSAPP"],
        provider="GOOGLE",
        key_id="old-key",
        model="gemini-2.5-flash",
    )
    old_agent.ensure_client = AsyncMock(return_value=MagicMock(name="old-client"))

    selected_agent = MagicMock()
    selected_agent.name = "Selected WhatsApp Agent"
    selected_agent.role = "SALES"
    selected_agent.config = MagicMock(
        allowed_channels=[],
        provider="DEEPSEEK",
        key_id="selected-key",
        model="deepseek-v4-flash",
    )
    selected_agent.ensure_client = AsyncMock(return_value=MagicMock(name="selected-client"))

    registry = MagicMock()
    registry.list_agents.return_value = [
        ("agent_old", old_agent, []),
        ("agent_selected", selected_agent, []),
    ]
    registry.get.side_effect = lambda company_id, agent_id: {
        "agent_old": old_agent,
        "agent_selected": selected_agent,
    }.get(agent_id)

    db_selected = Agent(
        id="agent_selected",
        company_id="company-1",
        name="Selected WhatsApp Agent",
        role="SALES",
        status="ACTIVE",
        model="deepseek-v4-flash",
        channels=["WHATSAPP"],
        config={"provider": "DEEPSEEK", "keyId": "selected-key"},
    )
    db_old = Agent(
        id="agent_old",
        company_id="company-1",
        name="Old WhatsApp Agent",
        role="SALES",
        status="ACTIVE",
        model="gemini-2.5-flash",
        channels=[],
        config={"provider": "GOOGLE", "keyId": "old-key"},
    )

    execute_result = MagicMock()
    execute_result.scalars.return_value.all.return_value = [db_selected, db_old]
    session = AsyncMock()
    session.execute = AsyncMock(return_value=execute_result)

    channel_agent_factory = AsyncMock(return_value=MagicMock(name="channel-agent"))

    monkeypatch.setattr("src.workflows.orchestration_flow.get_settings", lambda: settings)
    monkeypatch.setattr("src.workflows.orchestration_flow.execute_pipeline", pipeline_mock)
    monkeypatch.setattr("src.workflows.orchestration_flow.RunStateManager", lambda session: None)
    monkeypatch.setattr("src.workflows.orchestration_flow.PipelineCheckpointer", lambda session: None)
    monkeypatch.setattr("src.workflows.orchestration_flow.PostgresCheckpointStorage", lambda session: None)
    monkeypatch.setattr("src.workflows.orchestration_flow.get_agent_manager_service", lambda: MagicMock())
    monkeypatch.setattr("src.workflows.orchestration_flow.get_agent_registry", lambda: registry)
    monkeypatch.setattr("src.workflows.orchestration_flow.create_channel_agent", channel_agent_factory)

    result = await run_orchestration(
        message="hello",
        thread_id="thread-1",
        company_id="company-1",
        customer_id="customer-1",
        session=session,
        channel="WHATSAPP",
    )

    assert result["reply"] == "model reply"
    assert channel_agent_factory.await_args.kwargs["channel_agent"] is selected_agent
    old_agent.ensure_client.assert_not_awaited()
    selected_agent.ensure_client.assert_awaited_once()


@pytest.mark.asyncio
async def test_orchestration_loads_db_channel_assignment_when_registry_is_missing(monkeypatch):
    settings = MagicMock(enable_magentic_orchestration=False)
    final_ctx = MagicMock(
        final_reply="model reply",
        llm_response="",
        executed_tools=[],
    )
    pipeline_mock = AsyncMock(return_value=final_ctx)

    stale_agent = MagicMock()
    stale_agent.name = "Stale WhatsApp Agent"
    stale_agent.role = "SALES"
    stale_agent.config = MagicMock(
        allowed_channels=["WHATSAPP"],
        provider="GOOGLE",
        key_id="old-key",
        model="gemini-2.5-flash",
    )
    stale_agent.ensure_client = AsyncMock(return_value=MagicMock(name="stale-client"))

    selected_agent = MagicMock()
    selected_agent.name = "Selected WhatsApp Agent"
    selected_agent.role = "SALES"
    selected_agent.config = MagicMock(
        allowed_channels=["WHATSAPP"],
        provider="DEEPSEEK",
        key_id="selected-key",
        model="deepseek-v4-flash",
    )
    selected_agent.ensure_client = AsyncMock(return_value=MagicMock(name="selected-client"))

    registry = MagicMock()
    registry.list_agents.return_value = [("agent_stale", stale_agent, [])]
    registry.get.return_value = None

    db_selected = Agent(
        id="agent_selected",
        company_id="company-1",
        name="Selected WhatsApp Agent",
        role="SALES",
        status="ACTIVE",
        model="deepseek-v4-flash",
        channels=["WHATSAPP"],
        config={"provider": "DEEPSEEK", "keyId": "selected-key"},
    )

    execute_result = MagicMock()
    execute_result.scalars.return_value.all.return_value = [db_selected]
    session = AsyncMock()
    session.execute = AsyncMock(return_value=execute_result)

    channel_agent_factory = AsyncMock(return_value=MagicMock(name="channel-agent"))

    monkeypatch.setattr("src.workflows.orchestration_flow.get_settings", lambda: settings)
    monkeypatch.setattr("src.workflows.orchestration_flow.execute_pipeline", pipeline_mock)
    monkeypatch.setattr("src.workflows.orchestration_flow.RunStateManager", lambda session: None)
    monkeypatch.setattr("src.workflows.orchestration_flow.PipelineCheckpointer", lambda session: None)
    monkeypatch.setattr("src.workflows.orchestration_flow.PostgresCheckpointStorage", lambda session: None)
    monkeypatch.setattr("src.workflows.orchestration_flow.get_agent_manager_service", lambda: MagicMock())
    monkeypatch.setattr("src.workflows.orchestration_flow.get_agent_registry", lambda: registry)
    monkeypatch.setattr("src.workflows.orchestration_flow.create_channel_agent", channel_agent_factory)
    monkeypatch.setattr(
        "src.workflows.orchestration_flow._build_runtime_agent_from_db",
        lambda db_agent: (selected_agent, ["catalog_search"]),
    )

    result = await run_orchestration(
        message="hello",
        thread_id="thread-1",
        company_id="company-1",
        customer_id="customer-1",
        session=session,
        channel="WHATSAPP",
    )

    assert result["reply"] == "model reply"
    registry.register.assert_called_once_with(
        "company-1",
        "agent_selected",
        selected_agent,
        tool_names=["catalog_search"],
    )
    assert channel_agent_factory.await_args.kwargs["channel_agent"] is selected_agent
    stale_agent.ensure_client.assert_not_awaited()
    selected_agent.ensure_client.assert_awaited_once()
