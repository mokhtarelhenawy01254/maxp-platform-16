"""Integration tests for the 2026-pattern migration.

Covers:
- EpisodicMemoryService search_similar (pgvector + fallback)
- PromptCacheService create/retrieve
- QueueService enqueue/dequeue/priority (in-memory fallback path)
- RedisClient graceful degradation
- MCPRegistry tool discovery + invocation
- PipelineCheckpointer save + restore
- AgentWorker enqueue + handler dispatch
"""

from __future__ import annotations

import asyncio
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ─────────────────────────────────────────────────────────────────────────────
# pgvector: EpisodicMemoryService
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_episodic_memory_fallback_cosine_similarity():
    """Service provides client-side cosine similarity fallback."""
    from src.memory.episodic_memory import EpisodicMemoryService

    service = EpisodicMemoryService()

    vec_a = [1.0, 0.0, 0.0]
    vec_b = [1.0, 0.0, 0.0]
    vec_c = [0.0, 1.0, 0.0]

    assert abs(service.cosine_similarity(vec_a, vec_b) - 1.0) < 1e-6
    assert abs(service.cosine_similarity(vec_a, vec_c)) < 1e-6


@pytest.mark.asyncio
async def test_episodic_memory_pgvector_search_uses_cosine_sql():
    """search_similar runs SQL with pgvector cosine operator (always uses SQL)."""
    from src.memory.episodic_memory import EpisodicMemoryService

    service = EpisodicMemoryService()

    mock_session = AsyncMock()
    mock_result = MagicMock()
    # match the schema: (id, content, metadata_json, embedding_provider, similarity)
    mock_result.fetchall.return_value = [
        (uuid.uuid4(), "customer prefers XL", {}, "gemini", 0.92),
    ]
    mock_session.execute.return_value = mock_result

    results = await service.search_similar(
        session=mock_session,
        company_id="comp1",
        customer_id="cust1",
        query_text="customer wants XL",
        top_k=5,
    )

    assert len(results) == 1
    assert results[0]["content"] == "customer prefers XL"
    call_args = mock_session.execute.call_args
    sql_text = str(call_args[0][0])
    assert "<=>" in sql_text
    assert "ai.agentic_memory_fact" in sql_text


# ─────────────────────────────────────────────────────────────────────────────
# PromptCacheService
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_prompt_cache_creates_unique_key_per_company():
    """Same instructions for two companies should produce two different cache entries."""
    from src.services.prompt_cache_service import PromptCacheService

    service = PromptCacheService()

    with patch.object(
        service, "_create_cached_content", new=AsyncMock(return_value="cached_obj_1")
    ) as mock_create:
        await service.get_or_create_cached_prompt(
            company_id="comp1",
            prompt_type="system",
            instructions="You are a helpful agent",
        )
        await service.get_or_create_cached_prompt(
            company_id="comp2",
            prompt_type="system",
            instructions="You are a helpful agent",
        )

    assert mock_create.call_count == 2
    keys = list(service._cache.keys())
    assert keys[0] != keys[1]


@pytest.mark.asyncio
async def test_prompt_cache_reuses_existing_entry():
    """Same prompt + company + ttl window returns cached entry without re-creating."""
    from src.services.prompt_cache_service import PromptCacheService

    service = PromptCacheService()

    with patch.object(
        service, "_create_cached_content", new=AsyncMock(return_value="cached_obj_1")
    ) as mock_create:
        await service.get_or_create_cached_prompt(
            company_id="comp1",
            prompt_type="system",
            instructions="Same prompt",
        )
        await service.get_or_create_cached_prompt(
            company_id="comp1",
            prompt_type="system",
            instructions="Same prompt",
        )

        assert mock_create.call_count == 1


@pytest.mark.asyncio
async def test_prompt_cache_handles_missing_google_api_key():
    """When google_api_key is empty, cache creation is a no-op and returns empty name."""
    from src.config import get_settings
    from src.services.prompt_cache_service import PromptCacheService

    service = PromptCacheService()
    settings = get_settings()
    original = settings.google_api_key
    settings.google_api_key = None
    try:
        result = await service._create_cached_content(instructions="test", ttl=1800)
        assert result == ""
    finally:
        settings.google_api_key = original


# ─────────────────────────────────────────────────────────────────────────────
# RedisClient graceful degradation
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_redis_client_returns_none_when_not_connected():
    """Redis client returns None / False for operations when not connected."""
    from src.services.redis_client import RedisClient

    client = RedisClient()
    # not calling connect() - client remains None
    assert client.available is False

    val = await client.get("k")
    assert val is None

    flag = await client.set("k", "v")
    assert flag is False

    deleted = await client.delete("k")
    assert deleted is False

    incr = await client.incr("k")
    assert incr == 0


# ─────────────────────────────────────────────────────────────────────────────
# QueueService
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_queue_service_in_memory_round_trip():
    """Without Redis, QueueService should work in-memory."""
    # The module-level redis_client is not connected in tests, so available=False
    from src.services.queue_service import QueueService

    service = QueueService()
    service._in_memory = {}  # reset

    job_id = await service.enqueue(
        queue_name="default",
        task_type="memory.consolidate",
        payload={"company_id": "comp1"},
    )

    assert job_id is not None
    assert "default" in service._in_memory
    assert len(service._in_memory["default"]) == 1

    dequeued = await service.dequeue("default")
    assert dequeued is not None
    assert dequeued["type"] == "memory.consolidate"
    assert dequeued["payload"]["company_id"] == "comp1"


@pytest.mark.asyncio
async def test_queue_service_returns_none_when_empty():
    """Dequeue returns None when queue is empty."""
    from src.services.queue_service import QueueService

    service = QueueService()
    service._in_memory = {}
    result = await service.dequeue("nonexistent")
    assert result is None


@pytest.mark.asyncio
async def test_queue_service_records_attempts():
    """Enqueued jobs have attempts=0 and max_attempts=3."""
    from src.services.queue_service import QueueService

    service = QueueService()
    service._in_memory = {}
    await service.enqueue("q", "memory.consolidate", {"x": 1})
    job = await service.dequeue("q")

    assert job["attempts"] == 0
    assert job["max_attempts"] == 3
    assert job["status"] == "queued"


# ─────────────────────────────────────────────────────────────────────────────
# MCP Client + Registry
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_mcp_registry_registers_server_and_discovers_tools():
    """register_server should connect, list tools, and store them under mcp_<name>_<tool>."""
    from src.mcp_integration.client import MCPClient, MCPTool
    from src.mcp_integration.registry import MCPRegistry

    mock_client = MagicMock(spec=MCPClient)
    mock_client.list_tools = AsyncMock(
        return_value=[
            MCPTool(
                name="search_products",
                description="Search the catalog",
                input_schema={"type": "object"},
                server_name="catalog",
            )
        ]
    )
    mock_client.close = AsyncMock()

    with patch("src.mcp_integration.registry.MCPClient", return_value=mock_client):
        registry = MCPRegistry()
        await registry.register_server("catalog", "http://localhost:9999")

    assert "mcp_catalog_search_products" in registry._tools
    tool_info = registry._tools["mcp_catalog_search_products"]
    assert tool_info["server_name"] == "catalog"
    assert tool_info["original_name"] == "search_products"

    await registry.disconnect_all()
    mock_client.close.assert_awaited_once()


@pytest.mark.asyncio
async def test_mcp_registry_get_tool_returns_dict():
    """get_tool returns the full tool info dict, not the MCPTool instance."""
    from src.mcp_integration.client import MCPClient, MCPTool
    from src.mcp_integration.registry import MCPRegistry

    mock_client = MagicMock(spec=MCPClient)
    mock_client.list_tools = AsyncMock(
        return_value=[MCPTool(name="ping", description="ping", input_schema={}, server_name="ops")]
    )
    mock_client.close = AsyncMock()

    with patch("src.mcp_integration.registry.MCPClient", return_value=mock_client):
        registry = MCPRegistry()
        await registry.register_server("ops", "http://localhost:9999")

    tool = registry.get_tool("mcp_ops_ping")
    assert tool is not None
    assert tool["server_name"] == "ops"
    assert tool["name"] == "mcp_ops_ping"

    missing = registry.get_tool("mcp_does_not_exist")
    assert missing is None


@pytest.mark.asyncio
async def test_mcp_registry_call_tool_dispatches_to_correct_server():
    """call_tool should find the right server and invoke call_tool on it."""
    from src.mcp_integration.client import MCPClient, MCPTool
    from src.mcp_integration.registry import MCPRegistry

    mock_client = MagicMock(spec=MCPClient)
    mock_client.list_tools = AsyncMock(
        return_value=[MCPTool(name="search", description="x", input_schema={}, server_name="catalog")]
    )
    mock_client.call_tool = AsyncMock(
        return_value={"tool": "mcp_catalog_search", "success": True, "result": {"ok": True}}
    )
    mock_client.close = AsyncMock()

    with patch("src.mcp_integration.registry.MCPClient", return_value=mock_client):
        registry = MCPRegistry()
        await registry.register_server("catalog", "http://localhost:9999")

    result = await registry.call_tool("mcp_catalog_search", {"q": "shoes"})
    assert result["success"] is True
    mock_client.call_tool.assert_awaited_once_with("search", {"q": "shoes"})


# ─────────────────────────────────────────────────────────────────────────────
# PipelineCheckpointer
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_pipeline_checkpointer_saves_and_restores():
    """save_checkpoint persists state; get_latest_checkpoint rebuilds PipelineContext."""
    from src.pipeline.checkpointer import PipelineCheckpointer
    from src.pipeline.context import PipelineContext

    # Build a thread_id as uuid (Checkpoint FK is uuid)
    thread_uuid = uuid.uuid4()

    mock_session = AsyncMock()

    saved_state = {}

    class FakeCheckpoint:
        def __init__(self, **kw) -> None:
            for k, v in kw.items():
                setattr(self, k, v)
            self.id = uuid.uuid4()
            self.created_at = __import__("datetime").datetime.utcnow()

        def __setattr__(self, k, v):
            super().__setattr__(k, v)
            if k == "state":
                saved_state.update(v)

    with patch("src.pipeline.checkpointer.Checkpoint", FakeCheckpoint):
        cp = PipelineCheckpointer(mock_session)

        ctx = PipelineContext(
            company_id="comp1",
            customer_id="cust1",
            thread_id=str(thread_uuid),
            message="hello",
        )
        ctx.intent = "support.refund"
        ctx.tool_context = "ctx data"
        ctx.executed_tools = [{"tool": "order.get", "result": {"id": "ord_1"}}]
        ctx.llm_response = "thinking..."
        ctx.final_reply = "We refunded your order"
        ctx.rounds = 2
        ctx.repaired = False

        checkpoint_id = await cp.save_checkpoint(ctx, "tool_executed", status="completed")

    assert checkpoint_id is not None
    assert "tool_executed" in checkpoint_id
    assert saved_state["message"] == "hello"
    assert saved_state["final_reply"] == "We refunded your order"
    assert saved_state["executed_tools"][0]["tool"] == "order.get"
    # result should have been stripped before save
    assert "result" not in saved_state["executed_tools"][0]
    mock_session.merge.assert_awaited_once()
    mock_session.commit.assert_awaited_once()


# ─────────────────────────────────────────────────────────────────────────────
# AgentWorker
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_enqueue_agent_task_routes_to_correct_queue():
    """enqueue_agent_task should call queue_service.enqueue with queue='agent-tasks'."""
    from src.workers import agent_worker

    # reset module-level queue_service._in_memory for isolation
    agent_worker.queue_service._in_memory = {}

    task_id = await agent_worker.enqueue_agent_task(
        task_type="memory.consolidate",
        payload={"company_id": "comp1", "user_id": "u1"},
    )

    assert task_id is not None
    assert "agent-tasks" in agent_worker.queue_service._in_memory
    job = agent_worker.queue_service._in_memory["agent-tasks"][0]
    assert job["type"] == "memory.consolidate"
    assert job["payload"]["company_id"] == "comp1"


@pytest.mark.asyncio
async def test_register_worker_loop_processes_jobs(monkeypatch):
    """start_worker should poll and dispatch jobs to the right handler."""
    from src.workers import agent_worker

    # reset and enqueue one job
    agent_worker.queue_service._in_memory = {}
    await agent_worker.queue_service.enqueue(
        queue_name="agent-tasks",
        task_type="memory.consolidate",
        payload={"company_id": "comp1"},
    )

    processed = []

    async def mock_handler(job: dict) -> None:
        processed.append(job)

    # patch the actual handler in the registry
    monkeypatch.setitem(
        agent_worker.TASK_HANDLERS, "memory.consolidate", mock_handler
    )

    # start worker, give it ~0.5s, then cancel
    worker_task = asyncio.create_task(agent_worker.start_worker(poll_interval=0.1))
    await asyncio.sleep(0.4)
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass

    assert len(processed) == 1
    assert processed[0]["payload"]["company_id"] == "comp1"


@pytest.mark.asyncio
async def test_worker_logs_unknown_task_type():
    """When no handler is registered, worker should log a warning, not crash."""
    from src.workers import agent_worker

    agent_worker.queue_service._in_memory = {}
    await agent_worker.queue_service.enqueue(
        queue_name="agent-tasks",
        task_type="unknown.task_type",
        payload={},
    )

    worker_task = asyncio.create_task(agent_worker.start_worker(poll_interval=0.1))
    await asyncio.sleep(0.3)
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass

    # queue should be empty (the unknown job was dequeued then dropped via warning)
    assert agent_worker.queue_service._in_memory.get("agent-tasks", []) == []
