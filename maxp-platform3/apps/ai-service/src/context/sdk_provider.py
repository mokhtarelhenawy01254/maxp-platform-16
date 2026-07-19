from __future__ import annotations

from typing import Any

import structlog
from agent_framework import ContextProvider, Message

from src.context.assembler import ContextAssembler
from src.pipeline.context import PipelineContext

logger = structlog.get_logger(__name__)


class MaxPContextProvider(ContextProvider):
    """SDK context provider that injects MaxP profile, memory, and RAG context."""

    def __init__(
        self,
        *,
        company_id: str,
        customer_id: str = "anonymous",
        agent: Any | None = None,
        assembler: ContextAssembler | None = None,
        source_id: str = "maxp_context",
    ) -> None:
        super().__init__(source_id)
        self.company_id = company_id
        self.customer_id = customer_id
        self.agent = agent
        self.assembler = assembler or ContextAssembler()

    async def before_run(
        self,
        *,
        agent: Any,
        session: Any,
        context: Any,
        state: dict[str, Any],
    ) -> None:
        maxp_state = dict(getattr(session, "state", {}).get(self.source_id, {}) or {})
        thread_id = str(maxp_state.get("thread_id") or getattr(session, "session_id", None) or context.session_id or "")
        message = _latest_input_text(context)

        pipeline_ctx = PipelineContext(
            message=message,
            thread_id=thread_id,
            company_id=str(maxp_state.get("company_id") or self.company_id),
            customer_id=str(maxp_state.get("customer_id") or self.customer_id),
            agent=self.agent,
            session=maxp_state.get("db_session"),
        )
        pipeline_ctx.rag_evidence = str(maxp_state.get("rag_evidence") or "")
        pipeline_ctx.episodic_memories = list(maxp_state.get("episodic_memories") or [])
        pipeline_ctx.system_prompt = str(maxp_state.get("system_prompt") or "")

        try:
            instructions = await self.assembler.build_system_prompt(pipeline_ctx)
        except Exception as exc:
            logger.warning("sdk_context_provider_failed", error=str(exc), thread_id=thread_id)
            return

        if instructions:
            context.extend_instructions(self.source_id, instructions)

        history = await self._fetch_history(pipeline_ctx)
        if history:
            context.extend_messages(
                self,
                [
                    Message(role=str(item["role"]), contents=[str(item["content"])])
                    for item in history
                    if item.get("role") and item.get("content")
                ],
            )

        session.state[self.source_id] = {
            **maxp_state,
            "company_id": pipeline_ctx.company_id,
            "customer_id": pipeline_ctx.customer_id,
            "thread_id": pipeline_ctx.thread_id,
            "message": message,
        }
        state["last_thread_id"] = pipeline_ctx.thread_id

    async def _fetch_history(self, pipeline_ctx: PipelineContext) -> list[dict[str, Any]]:
        try:
            history = await self.assembler.fetch_message_history(pipeline_ctx, limit=15)
        except Exception as exc:
            logger.warning("sdk_context_history_failed", error=str(exc), thread_id=pipeline_ctx.thread_id)
            return []
        return list(history or [])


def _latest_input_text(context: Any) -> str:
    input_messages = list(getattr(context, "input_messages", []) or [])
    if not input_messages:
        return ""
    return str(getattr(input_messages[-1], "text", "") or "")
