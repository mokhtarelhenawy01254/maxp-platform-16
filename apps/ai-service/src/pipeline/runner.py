from __future__ import annotations

from collections.abc import Callable, Sequence

import structlog

from src.pipeline.checkpointer import PipelineCheckpointer
from src.pipeline.context import PipelineContext

logger = structlog.get_logger(__name__)


async def execute_pipeline(
    context: PipelineContext,
    stages: Sequence[Callable],
    checkpointer: PipelineCheckpointer | None = None,
) -> PipelineContext:
    ctx = context
    for stage in stages:
        stage_name = stage.__name__

        logger.debug("executing pipeline stage", stage=stage_name)

        ctx = await stage(ctx)

        if checkpointer:
            status = "early_return" if ctx.early_return else "running"
            await checkpointer.save_checkpoint(ctx, stage_name, status=status)

        if ctx.early_return:
            logger.info("pipeline early return", stage=stage_name, reason=ctx.early_return.get("status", "unknown"))
            if checkpointer:
                await checkpointer.save_checkpoint(ctx, f"{stage_name}_done", status="completed")
            return ctx

    if checkpointer:
        await checkpointer.save_checkpoint(ctx, "pipeline_done", status="completed")

    return ctx
