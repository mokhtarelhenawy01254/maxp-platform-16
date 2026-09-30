from __future__ import annotations

from typing import Any, Literal

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_session
from src.deps import get_company_id
from src.i18n import t
from src.services.approval_service import ApprovalService
from src.workflows.approval import (
    create_sdk_approval_response,
    resume_sdk_approval_workflow,
)

logger = structlog.get_logger(__name__)
router = APIRouter()


class ResumeRequest(BaseModel):
    thread_id: str | None = None
    draft_id: str
    approved: bool
    reason: str | None = None
    decided_by: str | None = None


class ResumeResponse(BaseModel):
    status: Literal["ok", "error"]
    reply: str
    thread_id: str
    action_type: str | None = None
    result_summary: str | None = None


def _execution_result_summary(action_type: str | None, approve_result: dict[str, Any]) -> str | None:
    """Human-readable summary of an executed approval, for session mirroring."""
    if approve_result.get("status") != "completed":
        return str(approve_result.get("message") or "")[:500] or None

    result = approve_result.get("result")
    if not isinstance(result, dict):
        return None

    if result.get("message"):
        return str(result["message"])[:500]

    try:
        from src.tools.names import canonical_tool_name
        from src.tools.registry import get_tool

        tool = get_tool(canonical_tool_name(action_type)) if action_type else None
        formatter = getattr(tool, "format_result", None)
        if callable(formatter):
            formatted = formatter(result)
            if formatted:
                return str(formatted)[:500]
    except Exception as exc:
        logger.warning("approval result formatting failed", error=str(exc))
    return None


@router.post("/resume", response_model=ResumeResponse)
async def resume(
    body: ResumeRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> ResumeResponse:
    """Resume a paused workflow with an approval decision.

    Uses ApprovalService for persistence and execution,
    with SDK workflow resume as a fallback for checkpointed workflows.
    """
    company_id = get_company_id(request)
    svc = ApprovalService(session)

    approval = await svc.get_approval(body.draft_id)

    if not approval:
        raise HTTPException(status_code=404, detail=f"Draft {body.draft_id} not found")

    if approval.company_id != company_id:
        raise HTTPException(status_code=403, detail="Cross-tenant access denied")

    resolved_thread_id = body.thread_id or str(approval.thread_id)
    action_type = str(getattr(approval, "action_type", "") or "") or None

    if body.approved:
        result = await svc.approve(
            draft_id=body.draft_id,
            decided_by=body.decided_by or "merchant",
        )

        # Try SDK workflow resume first (for checkpointed agent workflows)
        if result.get("status") != "error":
            try:
                sdk_response = await create_sdk_approval_response(
                    draft_id=body.draft_id,
                    approved=True,
                    session=session,
                )
                logger.info(
                    "sdk approval response created",
                    draft_id=body.draft_id,
                    sdk_approval_id=getattr(sdk_response, "id", None),
                    approved=True,
                )

                sdk_result = await resume_sdk_approval_workflow(
                    draft_id=body.draft_id,
                    approved=True,
                    thread_id=resolved_thread_id,
                    customer_id=str(getattr(approval, "customer_id", "") or ""),
                    session=session,
                    is_merchant=False,
                )
                if sdk_result is not None:
                    logger.info("sdk approval workflow resumed", draft_id=body.draft_id)
            except Exception as exc:
                logger.warning(
                    "sdk approval workflow resume failed; approval already executed via service",
                    draft_id=body.draft_id,
                    error=str(exc),
                )

        if result.get("status") == "completed":
            return ResumeResponse(
                status="ok",
                reply=t("approval.executed", locale="ar"),
                thread_id=resolved_thread_id,
                action_type=action_type,
                result_summary=_execution_result_summary(action_type, result),
            )
        elif result.get("status") == "already_approved":
            return ResumeResponse(
                status="ok",
                reply=t("approval.executed", locale="ar"),
                thread_id=resolved_thread_id,
                action_type=action_type,
                result_summary=_execution_result_summary(action_type, result),
            )
        else:
            return ResumeResponse(
                status="error",
                reply=t("approval.execution_failed", locale="ar"),
                thread_id=resolved_thread_id,
                action_type=action_type,
                result_summary=str(result.get("message") or "")[:500] or None,
            )
    else:
        await svc.reject(
            draft_id=body.draft_id,
            decided_by=body.decided_by or "merchant",
            reason=body.reason,
        )

        try:
            await create_sdk_approval_response(
                draft_id=body.draft_id,
                approved=False,
                session=session,
            )
            await resume_sdk_approval_workflow(
                draft_id=body.draft_id,
                approved=False,
                thread_id=resolved_thread_id,
                customer_id=str(getattr(approval, "customer_id", "") or ""),
                session=session,
                is_merchant=False,
            )
        except Exception as exc:
            logger.warning(
                "sdk approval rejection resume failed",
                draft_id=body.draft_id,
                error=str(exc),
            )

        return ResumeResponse(
            status="ok",
            reply=t("approval.rejected", locale="ar"),
            thread_id=resolved_thread_id,
            action_type=action_type,
        )


@router.post("/approvals/expire")
async def expire_approvals(
    request: Request,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    company_id_param: str | None = None,
) -> dict[str, int]:
    """Mark stale pending approvals as expired.

    Can be called by a cron job or admin endpoint.
    Optionally scoped to a specific company_id.
    """
    company_id = get_company_id(request)
    svc = ApprovalService(session)
    count = await svc.expire_stale_approvals(company_id=company_id_param or company_id)
    return {"expired_count": count}
