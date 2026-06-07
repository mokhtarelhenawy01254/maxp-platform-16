from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from src.pipeline.context import PipelineContext
from src.pipeline.runner import execute_pipeline
from src.pipeline.sdk_workflow import PipelineStageExecutor, execute_pipeline_workflow


class _CheckpointStorage:
    def __init__(self) -> None:
        self.saved = []

    async def save(self, checkpoint):
        self.saved.append(checkpoint)
        return checkpoint.checkpoint_id


def _ctx() -> PipelineContext:
    return PipelineContext(
        message="hello",
        thread_id="thread-1",
        company_id="company-1",
        customer_id="customer-1",
    )


@pytest.mark.asyncio
async def test_execute_pipeline_uses_sdk_workflow_chain():
    calls: list[str] = []

    async def first(ctx: PipelineContext) -> PipelineContext:
        calls.append("first")
        ctx.rounds += 1
        return ctx

    async def second(ctx: PipelineContext) -> PipelineContext:
        calls.append("second")
        ctx.final_reply = "done"
        return ctx

    result = await execute_pipeline(_ctx(), [first, second])

    assert calls == ["first", "second"]
    assert result.rounds == 1
    assert result.final_reply == "done"


@pytest.mark.asyncio
async def test_execute_pipeline_sdk_workflow_stops_on_early_return():
    calls: list[str] = []

    async def first(ctx: PipelineContext) -> PipelineContext:
        calls.append("first")
        ctx.early_return = {"status": "blocked"}
        return ctx

    async def second(ctx: PipelineContext) -> PipelineContext:
        calls.append("second")
        return ctx

    result = await execute_pipeline(_ctx(), [first, second])

    assert calls == ["first"]
    assert result.early_return == {"status": "blocked"}


def test_pipeline_stage_executor_is_sdk_executor():
    async def stage(ctx: PipelineContext) -> PipelineContext:
        return ctx

    executor = PipelineStageExecutor(stage=stage)

    assert executor.id == "stage"


@pytest.mark.asyncio
async def test_execute_pipeline_workflow_uses_sdk_checkpoint_storage():
    storage = _CheckpointStorage()

    async def stage(ctx: PipelineContext) -> PipelineContext:
        ctx.final_reply = "done"
        return ctx

    result = await execute_pipeline_workflow(
        _ctx(),
        [stage],
        checkpoint_storage=storage,
    )

    assert result.final_reply == "done"
    assert storage.saved
    assert storage.saved[-1].state["thread_id"] == "thread-1"
    assert storage.saved[-1].state["_executor_state"]["stage"]["final_reply"] == "done"


@pytest.mark.asyncio
async def test_execute_pipeline_workflow_keeps_runtime_objects_out_of_messages():
    class _RuntimeRef:
        def __deepcopy__(self, memo):
            raise TypeError("runtime object must not be deep-copied")

    runtime_agent = _RuntimeRef()
    runtime_session = _RuntimeRef()
    ctx = _ctx()
    ctx.agent = runtime_agent
    ctx.session = runtime_session

    async def stage(stage_ctx: PipelineContext) -> PipelineContext:
        assert stage_ctx.agent is runtime_agent
        assert stage_ctx.session is runtime_session
        stage_ctx.final_reply = "snapshot ok"
        return stage_ctx

    result = await execute_pipeline_workflow(ctx, [stage])

    assert result.agent is runtime_agent
    assert result.session is runtime_session
    assert result.final_reply == "snapshot ok"


@pytest.mark.asyncio
async def test_execute_pipeline_workflow_preserves_task_scoped_llm_client_across_stages():
    default_client = object()
    task_scoped_client = object()

    class _Agent:
        client = default_client

    ctx = _ctx()
    ctx.agent = _Agent()
    ctx.llm_client = task_scoped_client

    seen_clients: list[object] = []

    async def first(stage_ctx: PipelineContext) -> PipelineContext:
        seen_clients.append(stage_ctx.llm_client)
        stage_ctx.rounds += 1
        return stage_ctx

    async def second(stage_ctx: PipelineContext) -> PipelineContext:
        seen_clients.append(stage_ctx.llm_client)
        stage_ctx.final_reply = "done"
        return stage_ctx

    result = await execute_pipeline_workflow(ctx, [first, second])

    assert seen_clients == [task_scoped_client, task_scoped_client]
    assert result.llm_client is task_scoped_client
    assert result.final_reply == "done"


@pytest.mark.asyncio
async def test_execute_pipeline_workflow_passes_sdk_resume_responses(monkeypatch):
    captured: dict = {}

    class _Result:
        def get_outputs(self):
            ctx = _ctx()
            ctx.final_reply = "resumed"
            return [ctx]

    class _Workflow:
        async def run(self, message, **kwargs):
            captured["message"] = message
            captured.update(kwargs)
            return _Result()

    class _Builder:
        def __init__(self, **kwargs):
            captured["builder"] = kwargs

        def add_edge(self, source, target, condition=None):
            captured.setdefault("edges", []).append((source, target, condition))

        def build(self):
            return _Workflow()

    monkeypatch.setattr("src.pipeline.sdk_workflow.WorkflowBuilder", _Builder)

    async def stage(ctx: PipelineContext) -> PipelineContext:
        return ctx

    sdk_response = object()
    result = await execute_pipeline_workflow(
        _ctx(),
        [stage],
        checkpoint_storage=AsyncMock(),
        restore_checkpoint_id="cp-1",
        responses={"req-1": sdk_response},
    )

    assert result.final_reply == "resumed"
    assert captured["message"] is None
    assert captured.get("edges", []) == []
    assert captured["checkpoint_id"] == "cp-1"
    assert captured["responses"] == {"req-1": sdk_response}


@pytest.mark.asyncio
async def test_execute_pipeline_workflow_builds_explicit_graph_edges(monkeypatch):
    captured: dict = {"edges": []}

    class _Result:
        def get_outputs(self):
            ctx = _ctx()
            ctx.final_reply = "done"
            return [ctx]

    class _Workflow:
        async def run(self, message, **kwargs):
            return _Result()

    class _Builder:
        def __init__(self, **kwargs):
            captured["builder"] = kwargs

        def add_edge(self, source, target, condition=None):
            captured["edges"].append((source.id, target.id, condition))

        def add_chain(self, executors):
            raise AssertionError("workflow should use explicit graph edges")

        def build(self):
            return _Workflow()

    monkeypatch.setattr("src.pipeline.sdk_workflow.WorkflowBuilder", _Builder)

    async def first(ctx: PipelineContext) -> PipelineContext:
        return ctx

    async def second(ctx: PipelineContext) -> PipelineContext:
        return ctx

    async def third(ctx: PipelineContext) -> PipelineContext:
        return ctx

    result = await execute_pipeline_workflow(_ctx(), [first, second, third])

    assert result.final_reply == "done"
    assert captured["edges"] == [
        ("first", "second", None),
        ("second", "third", None),
    ]
