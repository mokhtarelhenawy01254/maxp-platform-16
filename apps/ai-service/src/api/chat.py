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
from src.services.approval_service import ApprovalService
from src.workflows.orchestration_flow import run_orchestration

logger = structlog.get_logger(__name__)
router = APIRouter()

SAFE_FALLBACK_REPLY = ""
THOUGHT_BLOCK_RE = re.compile(r"<thought\b[^>]*>.*?</thought>\s*", re.IGNORECASE | re.DOTALL)
THOUGHT_TAG_RE = re.compile(r"</?thought\b[^>]*>", re.IGNORECASE)


class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None
    channel: str | None = None
    memory_context: dict[str, Any] | None = None


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


async def _handle_approval(
    tool_result: dict[str, Any],
    company_id: str,
    customer_id: str,
    thread_id: str,
    session: AsyncSession,
    channel: str = "chat",
) -> ChatResponse | None:
    """Process an awaiting_approval tool result through the ApprovalService.

    Returns a ChatResponse if an approval was created, None otherwise.
    """
    if not isinstance(tool_result, dict) or tool_result.get("status") != "awaiting_approval":
        return None

    svc = ApprovalService(session)
    approval_info = await svc.request_approval(
        action_type=tool_result["action_type"],
        action_args=tool_result["action_args"],
        company_id=tool_result.get("company_id", company_id),
        customer_id=customer_id,
        thread_id=thread_id,
        channel=channel,
        sdk_approval_id=tool_result.get("sdk_approval_id"),
    )
    return ChatResponse(
        status="awaiting_approval",
        thread_id=thread_id,
        draft_id=approval_info["draft_id"],
    )


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
    channel = body.channel or "chat"

    thread = None
    if body.thread_id:
        try:
            thread_uuid = uuid.UUID(body.thread_id)
            stmt = select(Thread).where(
                Thread.id == thread_uuid,
                Thread.company_id == company_id,
                Thread.customer_id == customer_id,
                Thread.channel == channel,
            )
            result = await session.execute(stmt)
            thread = result.scalar_one_or_none()
        except ValueError:
            pass

    if not thread:
        stmt = select(Thread).where(
            Thread.company_id == company_id,
            Thread.customer_id == customer_id,
            Thread.channel == channel,
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
            channel=channel,
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
            channel=channel,
            memory_context=body.memory_context,
        )

        reply = sanitize_model_reply(outcome.get("reply", ""))
        tool_results = outcome.get("tool_results", [])

        for tr in tool_results:
            approval_response = await _handle_approval(
                tr, company_id, customer_id, thread_id, session, channel
            )
            if approval_response:
                approval_response.reply = reply
                return approval_response

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
            approval_response = await _handle_approval(
                tr, company_id, customer_id, thread_id, session, "merchant"
            )
            if approval_response:
                approval_response.reply = reply
                return approval_response

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
