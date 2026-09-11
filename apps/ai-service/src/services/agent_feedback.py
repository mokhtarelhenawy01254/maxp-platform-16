from __future__ import annotations

import time
import uuid
from typing import Any

import structlog
from opentelemetry import trace

logger = structlog.get_logger(__name__)

_tracer = trace.get_tracer("maxp.agent_feedback")

HANDOFF_SIGNALS = {
    "agent_handoff_to",
    "agent.handoff",
    "agent.run_task",
}


class AgentFeedbackTracker:
    """Tracks agent quality and feeds failures back into episodic memory.

    Uses OpenTelemetry GenAI semantic conventions span attributes
    (gen_ai.agent.name, gen_ai.agent.status, etc.) for compatibility
    with any GenAI observability backend.
    """

    def __init__(self, company_id: str, agent_role: str, agent_name: str, thread_id: str):
        self.company_id = company_id
        self.agent_role = agent_role
        self.agent_name = agent_name
        self.thread_id = thread_id
        self._span = None

    async def record_outcome(
        self,
        status: str,
        executed_tools: list[dict[str, Any]] | None = None,
        context_message: str = "",
    ) -> dict[str, Any] | None:
        """Record agent outcome and return a learning signal if failure detected."""
        is_handoff = self._detect_handoff(executed_tools)
        is_failure = status in ("PROVIDER_ERROR", "FAILED", "PAUSED")

        learning = None
        if is_handoff or is_failure:
            learning = self._build_learning_signal(status, executed_tools, context_message)
            await self._store_learning(learning)

        with _tracer.start_as_current_span("maxp.agent.feedback") as span:
            span.set_attribute("gen_ai.agent.name", self.agent_name)
            span.set_attribute("gen_ai.agent.status", status)
            span.set_attribute("gen_ai.agent.role", self.agent_role)
            span.set_attribute("gen_ai.tool.count", len(executed_tools or []))
            span.set_attribute("gen_ai.agent.handoff", str(is_handoff))
            if learning:
                span.set_attribute("gen_ai.agent.learning", learning.get("signal", ""))

        return learning

    def _detect_handoff(self, executed_tools: list[dict[str, Any]] | None) -> bool:
        if not executed_tools:
            return False
        return any(
            t.get("tool", "") in HANDOFF_SIGNALS
            for t in executed_tools
        )

    def _build_learning_signal(
        self,
        status: str,
        executed_tools: list[dict[str, Any]] | None,
        context_message: str,
    ) -> dict[str, Any]:
        signal = f"{self.agent_role}_FAILED"
        tools_used = [t.get("tool", "") for t in (executed_tools or [])]

        if self._detect_handoff(executed_tools):
            signal = f"{self.agent_role}_HANDED_OFF"
        elif status == "PROVIDER_ERROR":
            signal = f"{self.agent_role}_PROVIDER_ERROR"

        return {
            "type": signal,
            "agent_role": self.agent_role,
            "agent_name": self.agent_name,
            "company_id": self.company_id,
            "thread_id": self.thread_id,
            "tools_used": tools_used,
            "context_preview": context_message[:200] if context_message else "",
            "timestamp": time.time(),
        }

    async def _store_learning(self, learning: dict[str, Any]) -> None:
        """Store learning signal to .learnings/ERRORS.md via the file system
        and to the episodic memory DB for the CEO to find."""
        try:
            learning_id = str(uuid.uuid4())[:8]
            entry = (
                f"\n### {time.strftime('%Y-%m-%d %H:%M')} - "
                f"{learning['type']} - {self.agent_name}\n"
                f"- Agent: {self.agent_name} ({self.agent_role})\n"
                f"- Company: {self.company_id[:20]}...\n"
                f"- Thread: {self.thread_id}\n"
                f"- Tools: {', '.join(learning['tools_used'])}\n"
                f"- Context: {learning['context_preview']}\n"
                f"- Learning ID: {learning_id}\n"
            )
            import os
            learnings_path = os.path.join(
                os.environ.get("PROJECT_ROOT", os.path.expanduser("~")),
                ".learnings", "ERRORS.md",
            )
            os.makedirs(os.path.dirname(learnings_path), exist_ok=True)
            entry = (
                f"\n### {time.strftime('%Y-%m-%d %H:%M')} - "
                f"{learning['type']} - {self.agent_name}\n"
                f"- Agent: {self.agent_name} ({self.agent_role})\n"
                f"- Company: {self.company_id[:20]}...\n"
                f"- Thread: {self.thread_id}\n"
                f"- Tools: {', '.join(learning['tools_used'])}\n"
                f"- Context: {learning['context_preview']}\n"
                f"- Learning ID: {learning_id}\n"
            )
            import aiofiles
            async with aiofiles.open(learnings_path, mode="a", encoding="utf-8") as f:
                await f.write(entry)
        except Exception as exc:
            logger.warning("failed to write learning to file", error=str(exc))

        try:
            import src.db.session as _db_mod
            from src.memory.episodic_memory import episodic_memory_service
            fact_text = (
                f"Signal: {learning['type']}. "
                f"Agent {self.agent_name} ({self.agent_role}) "
                f"used tools [{', '.join(learning['tools_used'])}] "
                f"with context: {learning['context_preview']}"
            )
            sf = _db_mod.async_session
            if sf:
                async with sf() as db_session:
                    await episodic_memory_service.store_episode(
                        session=db_session,
                        company_id=self.company_id,
                        customer_id="__system__",
                        content=fact_text,
                        metadata={"source": "feedback_loop", "signal": learning["type"], "learning_id": learning_id},
                    )
        except Exception as exc:
            logger.warning("failed to store episodic memory", error=str(exc))
