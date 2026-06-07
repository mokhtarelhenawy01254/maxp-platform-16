from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from itertools import pairwise
from typing import Any

import structlog
from agent_framework import CheckpointStorage, Executor, WorkflowBuilder, WorkflowContext, handler

from src.pipeline.checkpointer import PipelineCheckpointer
from src.pipeline.context import TOKEN_BUDGET_DEFAULT, PipelineContext

logger = structlog.get_logger(__name__)

PipelineStage = Callable[[PipelineContext], Awaitable[PipelineContext]]


@dataclass
class PipelineWorkflowSnapshot:
    """Checkpointable message passed between SDK workflow executors.

    ``PipelineContext`` carries live runtime dependencies such as SQLAlchemy
    sessions, provider clients, and framework tools. The SDK workflow runtime
    deep-copies and checkpoints messages, so those live objects must stay on the
    executor side while graph messages remain serializable snapshots.
    """

    message: str
    thread_id: str
    company_id: str
    customer_id: str
    system_prompt: str | None = None
    relevance_plan: Any = None
    native_tools: list[dict[str, Any]] = field(default_factory=list)
    channel: str = "chat"
    is_customer_channel: bool = False
    conversation_id: str | None = None
    attachments: list[dict[str, Any]] = field(default_factory=list)
    rag_evidence: str = ""
    episodic_memories: list[dict[str, Any]] = field(default_factory=list)
    token_budget: int = TOKEN_BUDGET_DEFAULT
    original_history_tokens: int = 0
    compressed_history_tokens: int = 0
    session_state: dict[str, Any] = field(default_factory=dict)
    external_memory_context: dict[str, Any] = field(default_factory=dict)
    execution_plan: dict[str, Any] | None = None
    messages: list[dict[str, Any]] = field(default_factory=list)
    tool_context: str = ""
    executed_tools: list[dict[str, Any]] = field(default_factory=list)
    tool_evidence: list[dict[str, Any]] = field(default_factory=list)
    llm_response: str = ""
    final_reply: str | None = None
    rounds: int = 0
    repaired: bool = False
    early_return: dict[str, Any] | None = None
    last_checkpoint_id: str | None = None
    resumed_from_checkpoint: bool = False

    @classmethod
    def from_context(cls, ctx: PipelineContext) -> "PipelineWorkflowSnapshot":
        return cls(
            message=ctx.message,
            thread_id=ctx.thread_id,
            company_id=ctx.company_id,
            customer_id=ctx.customer_id,
            system_prompt=ctx.system_prompt,
            relevance_plan=ctx.relevance_plan,
            native_tools=_snapshot_tools(ctx.native_tools),
            channel=ctx.channel,
            is_customer_channel=ctx.is_customer_channel,
            conversation_id=ctx.conversation_id,
            attachments=list(ctx.attachments or []),
            rag_evidence=ctx.rag_evidence,
            episodic_memories=list(ctx.episodic_memories or []),
            token_budget=ctx.token_budget,
            original_history_tokens=ctx.original_history_tokens,
            compressed_history_tokens=ctx.compressed_history_tokens,
            session_state=dict(ctx.session_state or {}),
            external_memory_context=dict(ctx.external_memory_context or {}),
            execution_plan=ctx.execution_plan,
            messages=list(ctx.messages or []),
            tool_context=ctx.tool_context,
            executed_tools=list(ctx.executed_tools or []),
            tool_evidence=list(ctx.tool_evidence or []),
            llm_response=ctx.llm_response,
            final_reply=ctx.final_reply,
            rounds=ctx.rounds,
            repaired=ctx.repaired,
            early_return=ctx.early_return,
            last_checkpoint_id=ctx.last_checkpoint_id,
            resumed_from_checkpoint=ctx.resumed_from_checkpoint,
        )

    def to_context(
        self,
        *,
        agent: Any = None,
        session: Any = None,
        llm_client: Any = None,
    ) -> PipelineContext:
        ctx = PipelineContext(
            message=self.message,
            thread_id=self.thread_id,
            company_id=self.company_id,
            customer_id=self.customer_id,
            agent=agent,
            session=session,
            llm_client=llm_client if llm_client is not None else getattr(agent, "client", None),
            channel=self.channel,
            is_customer_channel=self.is_customer_channel,
            conversation_id=self.conversation_id,
            attachments=list(self.attachments or []),
            external_memory_context=dict(self.external_memory_context or {}),
        )
        ctx.system_prompt = self.system_prompt
        ctx.relevance_plan = self.relevance_plan
        ctx.native_tools = list(self.native_tools or [])
        ctx.rag_evidence = self.rag_evidence
        ctx.episodic_memories = list(self.episodic_memories or [])
        ctx.token_budget = self.token_budget
        ctx.original_history_tokens = self.original_history_tokens
        ctx.compressed_history_tokens = self.compressed_history_tokens
        ctx.session_state = dict(self.session_state or {})
        ctx.execution_plan = self.execution_plan
        ctx.messages = list(self.messages or [])
        ctx.tool_context = self.tool_context
        ctx.executed_tools = list(self.executed_tools or [])
        ctx.tool_evidence = list(self.tool_evidence or [])
        ctx.llm_response = self.llm_response
        ctx.final_reply = self.final_reply
        ctx.rounds = self.rounds
        ctx.repaired = self.repaired
        ctx.early_return = self.early_return
        ctx.last_checkpoint_id = self.last_checkpoint_id
        ctx.resumed_from_checkpoint = self.resumed_from_checkpoint
        return ctx


def _tool_name(tool: Any) -> str:
    if isinstance(tool, dict):
        return str(tool.get("name") or tool.get("tool") or "")
    return str(getattr(tool, "name", "") or getattr(tool, "__name__", "") or "")


def _snapshot_tools(tools: list[Any]) -> list[dict[str, Any]]:
    """Keep only stable tool metadata in workflow messages."""
    snapshots: list[dict[str, Any]] = []
    for tool in tools or []:
        name = _tool_name(tool)
        if not name:
            continue
        snapshots.append({
            "name": name,
            "description": str(
                (tool.get("description") if isinstance(tool, dict) else getattr(tool, "description", ""))
                or ""
            ),
            "approval_mode": str(
                (tool.get("approval_mode") if isinstance(tool, dict) else getattr(tool, "approval_mode", ""))
                or "never_require"
            ),
        })
    return snapshots


def _coerce_snapshot(message: PipelineContext | PipelineWorkflowSnapshot) -> PipelineWorkflowSnapshot:
    if isinstance(message, PipelineWorkflowSnapshot):
        return message
    if isinstance(message, PipelineContext):
        return PipelineWorkflowSnapshot.from_context(message)
    raise TypeError(f"Unexpected pipeline workflow message: {type(message).__name__}")


@dataclass
class _WorkflowRuntimeRefs:
    """Live runtime dependencies shared by SDK workflow executors."""

    agent: Any = None
    session: Any = None
    llm_client: Any = None


class PipelineStageExecutor(Executor):
    """SDK workflow executor adapter for one MaxP pipeline stage."""

    def __init__(
        self,
        *,
        stage: PipelineStage,
        runtime_agent: Any = None,
        runtime_session: Any = None,
        runtime_llm_client: Any = None,
        runtime_refs: _WorkflowRuntimeRefs | None = None,
        checkpointer: PipelineCheckpointer | None = None,
        terminal: bool = False,
    ) -> None:
        self.stage = stage
        self.stage_name = getattr(stage, "__name__", self.__class__.__name__)
        self._runtime_refs = runtime_refs or _WorkflowRuntimeRefs(
            agent=runtime_agent,
            session=runtime_session,
            llm_client=runtime_llm_client,
        )
        self._checkpointer = checkpointer
        self._terminal = terminal
        self._latest_ctx: PipelineContext | None = None
        super().__init__(id=self.stage_name)

    @handler
    async def run_stage(
        self,
        message: PipelineWorkflowSnapshot,
        workflow_ctx: WorkflowContext[PipelineWorkflowSnapshot, PipelineWorkflowSnapshot],
    ) -> None:
        logger.debug("executing sdk workflow stage", stage=self.stage_name)

        ctx = _coerce_snapshot(message).to_context(
            agent=self._runtime_refs.agent,
            session=self._runtime_refs.session,
            llm_client=self._runtime_refs.llm_client,
        )
        next_ctx = await self.stage(ctx)
        self._runtime_refs.llm_client = next_ctx.llm_client
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
            await workflow_ctx.yield_output(PipelineWorkflowSnapshot.from_context(next_ctx))
            return

        await workflow_ctx.send_message(PipelineWorkflowSnapshot.from_context(next_ctx))

    async def on_checkpoint_save(self) -> dict:
        if self._latest_ctx is None:
            return {}
        return {
            "thread_id": self._latest_ctx.thread_id,
            "company_id": self._latest_ctx.company_id,
            "customer_id": self._latest_ctx.customer_id,
            "message": self._latest_ctx.message,
            "attachments": self._latest_ctx.attachments,
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
        self._latest_ctx.attachments = list(state.get("attachments") or [])
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

    runtime_refs = _WorkflowRuntimeRefs(
        agent=context.agent,
        session=context.session,
        llm_client=context.llm_client,
    )
    executors = [
        PipelineStageExecutor(
            stage=stage,
            runtime_refs=runtime_refs,
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
        None if restore_checkpoint_id else PipelineWorkflowSnapshot.from_context(context),
        checkpoint_id=restore_checkpoint_id,
        checkpoint_storage=checkpoint_storage,
        responses=responses,
    )
    outputs = result.get_outputs()
    if not outputs:
        logger.warning("sdk workflow returned no pipeline output")
        return context

    final_output = outputs[-1]
    if isinstance(final_output, PipelineWorkflowSnapshot):
        final_ctx = final_output.to_context(
            agent=runtime_refs.agent,
            session=runtime_refs.session,
            llm_client=runtime_refs.llm_client,
        )
    elif isinstance(final_output, PipelineContext):
        final_ctx = final_output
    else:
        raise TypeError(f"Unexpected pipeline workflow output: {type(final_output).__name__}")

    if checkpointer:
        await checkpointer.save_checkpoint(final_ctx, "pipeline_done", status="completed")

    return final_ctx
