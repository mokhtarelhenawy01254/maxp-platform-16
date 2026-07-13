from __future__ import annotations

from collections.abc import Callable, Sequence

from agent_framework import CheckpointStorage

from src.pipeline.checkpointer import PipelineCheckpointer
from src.pipeline.context import PipelineContext
from src.pipeline.sdk_workflow import execute_pipeline_workflow


async def execute_pipeline(
    context: PipelineContext,
    stages: Sequence[Callable],
    checkpointer: PipelineCheckpointer | None = None,
    checkpoint_storage: CheckpointStorage | None = None,
    restore_checkpoint_id: str | None = None,
    responses: dict[str, object] | None = None,
) -> PipelineContext:
    return await execute_pipeline_workflow(
        context,
        list(stages),
        checkpointer=checkpointer,
        checkpoint_storage=checkpoint_storage,
        restore_checkpoint_id=restore_checkpoint_id,
        responses=responses,
    )
