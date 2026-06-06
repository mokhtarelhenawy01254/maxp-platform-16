from __future__ import annotations

from collections.abc import Awaitable, Callable
from itertools import pairwise

import structlog
from agent_framework import CheckpointStorage, Executor, WorkflowBuilder, WorkflowContext, handler

from src.pipeline.checkpointer import PipelineCheckpointer
from src.pipeline.context import PipelineContext

logger = structlog.get_logger(__name__)

PipelineStage = Callable[[PipelineContext], Awaitable[PipelineContext]]


class PipelineStageExecutor(Executor):
    """SDK workflow executor adapter for one MaxP pipeline stage."""

    def __init__(
        self,
        *,
        stage: PipelineStage,
        checkpointer: PipelineCheckpointer | None = None,
        terminal: bool = False,
    ) -> None:
        self.stage = stage
        self.stage_name = getattr(stage, "__name__", self.__class__.__name__)
        self._checkpointer = checkpointer
        self._terminal = terminal
        self._latest_ctx: PipelineContext | None = None
        super().__init__(id=self.stage_name)

    @handler
    async def run_stage(
        self,
        ctx: PipelineContext,
        workflow_ctx: WorkflowContext[PipelineContext, PipelineContext],
    ) -> None:
        logger.debug("executing sdk workflow stage", stage=self.stage_name)

        next_ctx = await self.stage(ctx)
        self._latest_ctx = next_ctx
        workflow_ctx.set_state("thread_id", next_ctx.thread_id)
        workflow_ctx.set_state("company_id", next_ctx.company_id)
        workflow_ctx.set_state("customer_id", next_ctx.customer_id)
        workflow_ctx.set_state("stage", self.stage_name)
        workflow_ctx.set_state("early_return", next_ctx.early_return)

        if self._checkpointer:
            status = "early_return" if next_ctx.early_return else "running"
            await self._checkpointer.save_checkpoint(next_ctx, self.stage_name, status=status)

        if next_ctx.early_return or self._terminal:
            if self._checkpointer and next_ctx.early_return:
                await self._checkpointer.save_checkpoint(
                    next_ctx,
                    f"{self.stage_name}_done",
                    status="completed",
                )
            await workflow_ctx.yield_output(next_ctx)
            return

        await workflow_ctx.send_message(next_ctx)

    async def on_checkpoint_save(self) -> dict:
        if self._latest_ctx is None:
            return {}
        return {
            "thread_id": self._latest_ctx.thread_id,
            "company_id": self._latest_ctx.company_id,
            "customer_id": self._latest_ctx.customer_id,
            "message": self._latest_ctx.message,
            "stage": self.stage_name,
            "final_reply": self._latest_ctx.final_reply,
            "llm_response": self._latest_ctx.llm_response,
            "executed_tools": self._latest_ctx.executed_tools,
            "early_return": self._latest_ctx.early_return,
        }

    async def on_checkpoint_restore(self, state: dict) -> None:
        if not state:
            return
        self._latest_ctx = PipelineContext(
            message=state.get("message", ""),
            thread_id=state.get("thread_id", ""),
            company_id=state.get("company_id", ""),
            customer_id=state.get("customer_id", ""),
        )
        self._latest_ctx.final_reply = state.get("final_reply")
        self._latest_ctx.llm_response = state.get("llm_response", "")
        self._latest_ctx.executed_tools = state.get("executed_tools", [])
        self._latest_ctx.early_return = state.get("early_return")


async def execute_pipeline_workflow(
    context: PipelineContext,
    stages: list[PipelineStage],
    checkpointer: PipelineCheckpointer | None = None,
    checkpoint_storage: CheckpointStorage | None = None,
    restore_checkpoint_id: str | None = None,
    responses: dict[str, object] | None = None,
) -> PipelineContext:
    """Execute MaxP pipeline stages through the agent-framework workflow runtime."""
    if not stages:
        return context

    executors = [
        PipelineStageExecutor(
            stage=stage,
            checkpointer=checkpointer,
            terminal=index == len(stages) - 1,
        )
        for index, stage in enumerate(stages)
    ]

    builder = WorkflowBuilder(
        name="maxp-orchestration-pipeline",
        description="MaxP guarded customer/merchant orchestration pipeline",
        start_executor=executors[0],
        checkpoint_storage=checkpoint_storage,
        output_from="all",
    )
    for source, target in pairwise(executors):
        builder.add_edge(source, target)
    workflow = builder.build()

    result = await workflow.run(
        None if restore_checkpoint_id else context,
        checkpoint_id=restore_checkpoint_id,
        checkpoint_storage=checkpoint_storage,
        responses=responses,
    )
    outputs = result.get_outputs()
    if not outputs:
        logger.warning("sdk workflow returned no pipeline output")
        return context

    final_ctx = outputs[-1]
    if not isinstance(final_ctx, PipelineContext):
        raise TypeError(f"Unexpected pipeline workflow output: {type(final_ctx).__name__}")

    if checkpointer:
        await checkpointer.save_checkpoint(final_ctx, "pipeline_done", status="completed")

    return final_ctx
