from __future__ import annotations

import time
import uuid

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.checkpoint import Checkpoint
from src.pipeline.context import PipelineContext

logger = structlog.get_logger(__name__)


class PipelineCheckpointer:
    """Saves pipeline state after each stage for fault tolerance.

    Enables resume from last successful stage if the process crashes.
    Checkpoints are stored in the ai.checkpoints table.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save_checkpoint(
        self,
        ctx: PipelineContext,
        stage_name: str,
        status: str = "running",
    ) -> str:
        checkpoint_id = f"pipeline:{ctx.thread_id}:{stage_name}:{int(time.time()*1000)}"

        state = {
            "thread_id": ctx.thread_id,
            "company_id": ctx.company_id,
            "customer_id": ctx.customer_id,
            "message": ctx.message,
            "stage": stage_name,
            "status": status,
            "system_prompt": ctx.system_prompt,
            "tool_context": ctx.tool_context,
            "executed_tools": [
                {k: v for k, v in t.items() if k != "result"}
                for t in ctx.executed_tools
            ],
            "llm_response": ctx.llm_response,
            "final_reply": ctx.final_reply,
            "rounds": ctx.rounds,
            "repaired": ctx.repaired,
            "early_return": ctx.early_return,
            "timestamp": time.time(),
        }

        t_id = uuid.UUID(str(ctx.thread_id)) if isinstance(ctx.thread_id, str) else ctx.thread_id
        cp = Checkpoint(
            thread_id=t_id,
            checkpoint_id=checkpoint_id,
            state=state,
        )
        await self._session.merge(cp)
        await self._session.commit()

        logger.debug("checkpoint saved", stage=stage_name, checkpoint_id=checkpoint_id)
        return checkpoint_id

    async def get_latest_checkpoint(
        self,
        thread_id: str | uuid.UUID,
    ) -> PipelineContext | None:
        from sqlalchemy import desc, select

        t_id = uuid.UUID(str(thread_id)) if isinstance(thread_id, str) else thread_id
        stmt = (
            select(Checkpoint)
            .where(Checkpoint.thread_id == t_id)
            .order_by(desc(Checkpoint.created_at))
            .limit(1)
        )
        result = await self._session.execute(stmt)
        cp = result.scalar_one_or_none()

        if not cp:
            return None

        state = cp.state

        ctx = PipelineContext(
            message=state.get("message", ""),
            thread_id=state.get("thread_id", str(thread_id)),
            company_id=state.get("company_id", ""),
            customer_id=state.get("customer_id", ""),
        )
        ctx.system_prompt = state.get("system_prompt")
        ctx.tool_context = state.get("tool_context", "")
        ctx.executed_tools = state.get("executed_tools", [])
        ctx.llm_response = state.get("llm_response", "")
        ctx.final_reply = state.get("final_reply")
        ctx.rounds = state.get("rounds", 0)
        ctx.repaired = state.get("repaired", False)
        ctx.early_return = state.get("early_return")

        logger.info("checkpoint restored", stage=state.get("stage"))
        return ctx
