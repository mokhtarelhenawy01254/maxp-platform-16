from __future__ import annotations

import hashlib
import re
import uuid
from contextlib import suppress
from typing import Any, Literal

import structlog
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.exc import IntegrityError

from src.db.models.thread import Thread
from src.db.session import get_session
from src.deps import get_company_id, get_customer_id
from src.i18n import t
from src.services.approval_service import ApprovalService
from src.workflows.orchestration_flow import run_orchestration

logger = structlog.get_logger(__name__)
_MAXP_NAMESPACE = uuid.UUID("e4b0113c-411a-4d24-912f-6825a0720448")

def _safe_thread_uuid(tid: str | uuid.UUID | None) -> uuid.UUID:
    if not tid:
        return uuid.uuid4()
    if isinstance(tid, uuid.UUID):
        return tid
    try:
        return uuid.UUID(str(tid))
    except ValueError:
        return uuid.uuid5(_MAXP_NAMESPACE, str(tid))

router = APIRouter()

SAFE_FALLBACK_REPLY = ""
THOUGHT_BLOCK_RE = re.compile(r"<thought\b[^>]*>.*?</thought>\s*", re.IGNORECASE | re.DOTALL)
THOUGHT_TAG_RE = re.compile(r"</?thought\b[^>]*>", re.IGNORECASE)
THINK_BLOCK_RE = re.compile(r"<think\b[^>]*>.*?</think>\s*", re.IGNORECASE | re.DOTALL)
THINK_TAG_RE = re.compile(r"</?think\b[^>]*>", re.IGNORECASE)


class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None
    channel: str | None = None
    agent_id: str | None = None
    memory_context: dict[str, Any] | None = None
    attachments: list[dict[str, Any]] | None = None
    request_id: str | None = None


class MerchantChatRequest(ChatRequest):
    pass


class ChatResponse(BaseModel):
    status: Literal["ok", "awaiting_approval", "error", "escalated"]
    thread_id: str
    reply: str | None = None
    draft_id: str | None = None
    tool_calls: list[dict[str, Any]] = []
    response_attachments: list[dict[str, Any]] = []  # Media attachments (e.g. branch landmark images)
    escalation: dict[str, Any] | None = None  # Silent escalation metadata
    request_id: str | None = None
    prompt_hash: str | None = None


def sanitize_model_reply(reply: Any) -> str:
    """Strip internal reasoning markers before returning model output to MaxP."""
    text = str(reply or "").strip()
    if not text:
        return ""

    text = THOUGHT_BLOCK_RE.sub("", text).strip()
    if THOUGHT_TAG_RE.search(text):
        text = THOUGHT_TAG_RE.split(text, maxsplit=1)[0].strip()

    text = THINK_BLOCK_RE.sub("", text).strip()
    if THINK_TAG_RE.search(text):
        text = THINK_TAG_RE.split(text, maxsplit=1)[0].strip()

    # Humanize output: strip markdown asterisks (**bold** / *italic*)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"(?<!\w)\*([^*]+)\*(?!\w)", r"\1", text)

    # Strip robotic list bullets at line starts
    text = re.sub(r"^\s*[-*•]\s+", "", text, flags=re.MULTILINE)

    # Strip marketing/bot spam emojis
    text = re.sub(r"[💰👇🛍️✨🔥🚀🎯🛒📦]", "", text)

    # Clean multiple consecutive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

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
        tool_calls=[{
            "tool": tool_result.get("tool", ""),
            "status": "awaiting_approval",
            "action_type": tool_result.get("action_type", ""),
        }],
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> ChatResponse:
    """Handle a customer chat message."""
    company_id = get_company_id(request)
    customer_id = get_customer_id(request)
    channel = body.channel or "chat"
    prompt_hash = hashlib.sha256((body.message or "").encode("utf-8")).hexdigest()[:12]
    req_id = body.request_id or request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex[:12]}"

    thread = None
    if body.thread_id:
        try:
            thread_uuid = _safe_thread_uuid(body.thread_id)
            stmt = select(Thread).where(
                Thread.id == thread_uuid,
                Thread.company_id == company_id,
            )
            result = await session.execute(stmt)
            thread = result.scalar_one_or_none()
            if not thread:
                # (company_id, customer_id, channel) is unique — the requested
                # thread_id may belong to a superseded conversation while an
                # older thread row for the same customer already exists.
                # Reuse it instead of violating the unique constraint.
                stmt = select(Thread).where(
                    Thread.company_id == company_id,
                    Thread.customer_id == customer_id,
                    Thread.channel == channel,
                )
                result = await session.execute(stmt)
                thread = result.scalar_one_or_none()
        except Exception as exc:
            logger.warning("thread_lookup_failed", error=str(exc))
            await session.rollback()

    if thread is None:
        try:
            stmt = select(Thread).where(
                Thread.company_id == company_id,
                Thread.customer_id == customer_id,
                Thread.channel == channel,
            )
            result = await session.execute(stmt)
            thread = result.scalar_one_or_none()
        except Exception as exc:
            logger.warning("thread_triple_lookup_failed", error=str(exc))
            await session.rollback()

    if thread is None:
        new_thread_id = thread_uuid if body.thread_id else uuid.uuid4()
        try:
            thread = Thread(
                id=new_thread_id,
                company_id=company_id,
                customer_id=customer_id,
                channel=channel,
                status="active",
            )
            session.add(thread)
            await session.commit()
            await session.refresh(thread)
        except IntegrityError:
            # Concurrent creation raced us — roll back the poisoned session
            # and reuse whichever thread won the race.
            await session.rollback()
            try:
                stmt = select(Thread).where(
                    Thread.company_id == company_id,
                    Thread.customer_id == customer_id,
                    Thread.channel == channel,
                )
                result = await session.execute(stmt)
                thread = result.scalar_one_or_none()
            except Exception as exc:
                logger.warning("thread_race_reselect_failed", error=str(exc))
                await session.rollback()
        except Exception as exc:
            logger.warning("thread_create_failed", error=str(exc))
            await session.rollback()

    thread_id = str(thread.id)
    logger.info(
        "chat_request_received",
        request_id=req_id,
        session_id=thread_id,
        prompt_hash=prompt_hash,
        message=(body.message or "")[:80],
    )

    try:
        outcome = await run_orchestration(
            message=body.message,
            thread_id=thread_id,
            company_id=company_id,
            customer_id=customer_id,
            session=session,
            channel=channel,
            agent_id=body.agent_id,
            memory_context=body.memory_context,
            conversation_id=body.thread_id,
            attachments=body.attachments or [],
        )

        # Paused agent → return a friendly notice instead of an empty reply.
        if outcome.get("paused"):
            reason = outcome.get("reply_hint")
            locale = "ar"
            if reason:
                pause_msg = f"{t('chat.agent_paused', locale=locale)} ({reason})"
            else:
                pause_msg = t("chat.agent_paused", locale=locale)
            return ChatResponse(
                status="ok",
                thread_id=thread_id,
                reply=pause_msg,
                tool_calls=[],
                response_attachments=[],
                request_id=req_id,
                prompt_hash=prompt_hash,
            )

        reply = sanitize_model_reply(outcome.get("reply", ""))
        tool_results = outcome.get("tool_results") or []
        response_attachments = outcome.get("response_attachments") or []

        # Silent Escalation: AI failed, return escalated status with no reply
        if outcome.get("escalation_requested"):
            logger.warning(
                "silent_escalation_triggered",
                thread_id=thread_id,
                reason=outcome.get("escalation_meta", {}).get("reason", "unknown"),
            )
            return ChatResponse(
                status="escalated",
                thread_id=thread_id,
                reply=None,
                escalation=outcome.get("escalation_meta"),
                request_id=req_id,
                prompt_hash=prompt_hash,
            )

        # Build tool_calls summary for the response
        tool_calls = []
        for tr in tool_results:
            if isinstance(tr, dict):
                info = {
                    "tool": tr.get("tool", ""),
                    "status": tr.get("status", ""),
                    "success": tr.get("success", False),
                }
                params = tr.get("params", {})
                if params:
                    # Include params for visibility but redact large values
                    safe_params = {}
                    for k, v in params.items():
                        if isinstance(v, str) and len(v) > 200:
                            safe_params[k] = v[:200] + "..."
                        else:
                            safe_params[k] = v
                    info["params"] = safe_params
                tool_calls.append(info)

        for tr in tool_results:
            approval_response = await _handle_approval(
                tr, company_id, customer_id, thread_id, session, channel
            )
            if approval_response:
                approval_response.reply = reply
                return approval_response

        logger.info(
            "chat_response_ready",
            thread_id=thread_id,
            reply_length=len(reply or ""),
            tool_calls=len(tool_calls),
            response_attachments=len(response_attachments),
        )
        return ChatResponse(
            status="ok",
            thread_id=thread_id,
            reply=reply,
            tool_calls=tool_calls,
            response_attachments=response_attachments,
            request_id=req_id,
            prompt_hash=prompt_hash,
        )
    except Exception as e:
        logger.error("chat failed", error=str(e), thread_id=thread_id)
        # Silent Escalation on unhandled exception: never expose AI errors to customer
        return ChatResponse(
            status="escalated",
            thread_id=thread_id,
            reply=None,
            escalation={"reason": f"unhandled_exception: {str(e)}", "channel": channel},
            request_id=req_id,
            prompt_hash=prompt_hash,
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
            conversation_id=body.thread_id,
        )

        reply = sanitize_model_reply(outcome.get("reply", ""))
        tool_results = outcome.get("tool_results") or []

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
        # Silent Escalation: never expose AI errors to merchants either.
        return ChatResponse(
            status="escalated",
            thread_id=thread_id,
            reply=None,
            escalation={"reason": f"merchant_unhandled_exception: {str(e)}"},
        )
