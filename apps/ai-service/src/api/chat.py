from __future__ import annotations

import re
from contextlib import suppress
from typing import Any, Literal

import structlog
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.thread import Thread
from src.db.session import get_session
from src.deps import get_company_id, get_customer_id
from src.i18n import t
from src.workflows.approval import create_approval_draft
from src.workflows.orchestration_flow import run_orchestration

logger = structlog.get_logger(__name__)
router = APIRouter()

SAFE_FALLBACK_REPLY = ""
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

    return text


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> ChatResponse:
    """Handle a customer chat message."""
    import uuid

    company_id = get_company_id(request)
    customer_id = get_customer_id(request)

    thread = None
    if body.thread_id:
        try:
            thread_uuid = uuid.UUID(body.thread_id)
            stmt = select(Thread).where(
                Thread.id == thread_uuid,
                Thread.company_id == company_id,
                Thread.customer_id == customer_id,
                Thread.channel == "chat",
            )
            result = await session.execute(stmt)
            thread = result.scalar_one_or_none()
        except ValueError:
            pass

    if not thread:
        stmt = select(Thread).where(
            Thread.company_id == company_id,
            Thread.customer_id == customer_id,
            Thread.channel == "chat",
        )
        result = await session.execute(stmt)
        thread = result.scalar_one_or_none()

    if not thread:
        new_id = uuid.uuid4()
        if body.thread_id:
            with suppress(ValueError):
                new_id = uuid.UUID(body.thread_id)
        thread = Thread(
            id=new_id,
            company_id=company_id,
            customer_id=customer_id,
            channel="chat",
            status="active",
        )
        session.add(thread)
        await session.commit()
        await session.refresh(thread)

    thread_id = str(thread.id)

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
                    sdk_approval_id=tr.get("sdk_approval_id"),
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
            reply=None,
        )


@router.post("/chat/merchant", response_model=ChatResponse)
async def chat_merchant(
    body: MerchantChatRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> ChatResponse:
    """Handle a merchant chat message (Admin/CEO level)."""
    import uuid

    company_id = get_company_id(request)
    customer_id = "merchant_admin"

    thread = None
    if body.thread_id:
        try:
            thread_uuid = uuid.UUID(body.thread_id)
            stmt = select(Thread).where(
                Thread.id == thread_uuid,
                Thread.company_id == company_id,
                Thread.customer_id == customer_id,
                Thread.channel == "merchant",
            )
            result = await session.execute(stmt)
            thread = result.scalar_one_or_none()
        except ValueError:
            pass

    if not thread:
        stmt = select(Thread).where(
            Thread.company_id == company_id,
            Thread.customer_id == customer_id,
            Thread.channel == "merchant",
        )
        result = await session.execute(stmt)
        thread = result.scalar_one_or_none()

    if not thread:
        new_id = uuid.uuid4()
        if body.thread_id:
            with suppress(ValueError):
                new_id = uuid.UUID(body.thread_id)
        thread = Thread(
            id=new_id,
            company_id=company_id,
            customer_id=customer_id,
            channel="merchant",
            status="active",
        )
        session.add(thread)
        await session.commit()
        await session.refresh(thread)

    thread_id = str(thread.id)

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
                    sdk_approval_id=tr.get("sdk_approval_id"),
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
            reply=t("error.chat.merchant", locale="ar"),
        )
