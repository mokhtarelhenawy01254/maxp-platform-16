from __future__ import annotations

from typing import Any

import structlog

from src.memory.episodic_memory import episodic_memory_service

logger = structlog.get_logger(__name__)

FEEDBACK_SIGNAL_PREFIX = "Signal:"


async def get_ceo_lessons(company_id: str, session: Any, message: str) -> str:
    """Query episodic memory for past routing failures and return lessons for the CEO.

    Searches for __system__ feedback signals that match the current message context,
    and returns actionable routing suggestions.
    """
    if not session or not company_id:
        return ""

    try:
        memories = await episodic_memory_service.search_similar(
            session=session,
            company_id=company_id,
            customer_id="__system__",
            query_text=message,
            top_k=3,
        )
    except Exception as exc:
        logger.warning("failed to query feedback memory", error=str(exc))
        return ""

    signals = []
    for mem in memories:
        content = mem.get("content", "")
        if isinstance(content, dict):
            content = content.get("content", "") or content.get("text", "")
        if not content:
            continue
        if not content.startswith(FEEDBACK_SIGNAL_PREFIX):
            continue
        signals.append(content)

    if not signals:
        return ""

    lessons = "\n".join(f"- {s}" for s in signals)
    return (
        "\n\n[Feedback History]\n"
        "Based on past interactions, the following agent routing patterns were observed:\n"
        f"{lessons}\n"
        "Consider these patterns when choosing which specialist agent to delegate to.\n"
        "[/Feedback History]"
    )
