from __future__ import annotations

import re
from typing import Any, Literal

import structlog
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.thread import Thread
from src.db.session import get_session
from src.deps import get_company_id, get_customer_id
from src.workflows.approval import create_approval_draft
from src.workflows.orchestration_flow import run_orchestration

logger = structlog.get_logger(__name__)
router = APIRouter()

SAFE_FALLBACK_REPLY = "تم استلام رسالتك، وسأساعدك حالاً."
THOUGHT_BLOCK_RE = re.compile(r"<thought\b[^>]*>.*?</thought>\s*", re.IGNORECASE | re.DOTALL)
THOUGHT_TAG_RE = re.compile(r"</?thought\b[^>]*>", re.IGNORECASE)


class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None


class MerchantChatRequest(ChatRequest):
    pass


class ChatResponse(BaseModel):
    status: Literal["ok", "awaiting_approval", "error"]
    thread_id: str
    reply: str | None = None
    draft_id: str | None = None
    tool_calls: list[dict[str, Any]] = []


def sanitize_model_reply(reply: Any) -> str:
    """Strip internal reasoning markers before returning model output to MaxP."""
    text = str(reply or "").strip()
    if not text:
        return ""

    text = THOUGHT_BLOCK_RE.sub("", text).strip()
    if THOUGHT_TAG_RE.search(text):
        text = THOUGHT_TAG_RE.split(text, maxsplit=1)[0].strip()

    return text or SAFE_FALLBACK_REPLY


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> ChatResponse:
    """Handle a customer chat message."""
    company_id = get_company_id(request)
    customer_id = get_customer_id(request)

    thread_id = body.thread_id or f"{company_id}:{customer_id}:chat"
    stmt = select(Thread).where(
        Thread.company_id == company_id,
        Thread.customer_id == customer_id,
        Thread.channel == "chat",
    )
    result = await session.execute(stmt)
    thread = result.scalar_one_or_none()

    if not thread:
        thread = Thread(
            company_id=company_id,
            customer_id=customer_id,
            channel="chat",
            status="active",
        )
        session.add(thread)
        await session.commit()
        await session.refresh(thread)

    try:
        outcome = await run_orchestration(
            message=body.message,
            thread_id=thread_id,
            company_id=company_id,
            customer_id=customer_id,
            session=session,
        )

        reply = sanitize_model_reply(outcome.get("reply", ""))
        tool_results = outcome.get("tool_results", [])

        for tr in tool_results:
            if isinstance(tr, dict) and tr.get("status") == "awaiting_approval":
                draft_info = await create_approval_draft(
                    action_type=tr["action_type"],
                    action_args=tr["action_args"],
                    company_id=tr.get("company_id", company_id),
                    customer_id=customer_id,
                    thread_id=thread_id,
                    session=session,
                )
                return ChatResponse(
                    status="awaiting_approval",
                    thread_id=thread_id,
                    draft_id=draft_info["draft_id"],
                    reply=reply,
                )

        return ChatResponse(
            status="ok",
            thread_id=thread_id,
            reply=reply,
        )
    except Exception as e:
        logger.error("chat failed", error=str(e), thread_id=thread_id)
        return ChatResponse(
            status="error",
            thread_id=thread_id,
            reply="عذراً، حدث خطأ في معالجة طلبك. الرجاء المحاولة مرة أخرى.",
        )


@router.post("/chat/merchant", response_model=ChatResponse)
async def chat_merchant(
    body: MerchantChatRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> ChatResponse:
    """Handle a merchant chat message (Admin/CEO level)."""
    company_id = get_company_id(request)
    customer_id = "merchant_admin"

    thread_id = body.thread_id or f"{company_id}:merchant:chat"
    stmt = select(Thread).where(
        Thread.company_id == company_id,
        Thread.customer_id == customer_id,
        Thread.channel == "merchant",
    )
    result = await session.execute(stmt)
    thread = result.scalar_one_or_none()

    if not thread:
        thread = Thread(
            company_id=company_id,
            customer_id=customer_id,
            channel="merchant",
            status="active",
        )
        session.add(thread)
        await session.commit()
        await session.refresh(thread)

    try:
        outcome = await run_orchestration(
            message=body.message,
            thread_id=thread_id,
            company_id=company_id,
            customer_id=customer_id,
            session=session,
            is_merchant=True,
        )

        reply = sanitize_model_reply(outcome.get("reply", ""))
        tool_results = outcome.get("tool_results", [])

        for tr in tool_results:
            if isinstance(tr, dict) and tr.get("status") == "awaiting_approval":
                draft_info = await create_approval_draft(
                    action_type=tr["action_type"],
                    action_args=tr["action_args"],
                    company_id=tr.get("company_id", company_id),
                    customer_id=customer_id,
                    thread_id=thread_id,
                    session=session,
                )
                return ChatResponse(
                    status="awaiting_approval",
                    thread_id=thread_id,
                    draft_id=draft_info["draft_id"],
                    reply=reply,
                )

        return ChatResponse(
            status="ok",
            thread_id=thread_id,
            reply=reply,
        )
    except Exception as e:
        logger.error("merchant chat failed", error=str(e), thread_id=thread_id)
        return ChatResponse(
            status="error",
            thread_id=thread_id,
            reply="عذراً، حدث خطأ في معالجة طلبك كتاجر. الرجاء المحاولة مرة أخرى.",
        )
