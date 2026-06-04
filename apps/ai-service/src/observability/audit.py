from __future__ import annotations

import time
import uuid
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.tool_call import ToolCall
from src.tools.maxp_client import redact_pii

logger = structlog.get_logger(__name__)


def _resolve_thread_id(thread_id: str | uuid.UUID | None) -> uuid.UUID:
    """Convert a thread_id string to a stable UUID, or pass through UUID."""
    if thread_id is None:
        return uuid.UUID("00000000-0000-0000-0000-000000000000")
    if isinstance(thread_id, uuid.UUID):
        return thread_id
    return uuid.uuid5(uuid.NAMESPACE_DNS, thread_id)


async def log_tool_call(
    session: AsyncSession,
    company_id: str,
    tool_name: str,
    input_data: dict[str, Any],
    thread_id: str | uuid.UUID | None = None,
    output_data: dict[str, Any] | None = None,
    error_message: str | None = None,
    latency_ms: int | None = None,
) -> ToolCall:
    """Log a tool call to the ai.tool_calls table.

    PII is redacted from input and output before storing.
    Returns the created ToolCall record.
    """
    redacted_input = redact_pii(input_data)
    redacted_output = redact_pii(output_data) if output_data else None

    record = ToolCall(
        company_id=company_id,
        thread_id=_resolve_thread_id(thread_id),
        tool_name=tool_name,
        input=redacted_input,
        output=redacted_output,
        status="error" if error_message else "success",
        error_message=error_message,
        latency_ms=latency_ms,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


class AuditMiddleware:
    """Middleware that wraps tool execution with audit logging."""

    def __init__(self, session_factory) -> None:
        self._session_factory = session_factory

    async def __call__(self, ctx, next_fn):
        company_id = ctx.get("company_id", "unknown")
        thread_id = ctx.get("thread_id")
        tool_name = ctx.get("tool_name", "unknown")
        input_data = ctx.get("input", {})

        start = time.monotonic()
        try:
            result = await next_fn()
            latency = int((time.monotonic() - start) * 1000)

            async with self._session_factory() as db_session:
                await log_tool_call(
                    session=db_session,
                    company_id=company_id,
                    thread_id=thread_id,
                    tool_name=tool_name,
                    input_data=input_data,
                    output_data=result,
                    latency_ms=latency,
                )
            return result
        except Exception as e:
            latency = int((time.monotonic() - start) * 1000)
            async with self._session_factory() as db_session:
                await log_tool_call(
                    session=db_session,
                    company_id=company_id,
                    thread_id=thread_id,
                    tool_name=tool_name,
                    input_data=input_data,
                    error_message=str(e),
                    latency_ms=latency,
                )
            raise
