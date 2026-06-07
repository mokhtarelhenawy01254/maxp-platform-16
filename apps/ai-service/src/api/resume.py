from __future__ import annotations

from typing import Literal

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.repo.approval_repo import ApprovalRepository
from src.db.session import get_session
from src.deps import get_company_id
from src.i18n import t
from src.workflows.approval import (
    create_sdk_approval_response,
    execute_approved_action,
    resume_sdk_approval_workflow,
)

logger = structlog.get_logger(__name__)
router = APIRouter()


class ResumeRequest(BaseModel):
    thread_id: str
    draft_id: str
    approved: bool
    reason: str | None = None
    decided_by: str | None = None


class ResumeResponse(BaseModel):
    status: Literal["ok", "error"]
    reply: str
    thread_id: str


@router.post("/resume", response_model=ResumeResponse)
async def resume(
    body: ResumeRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> ResumeResponse:
    """Resume a paused workflow with an approval decision."""
    company_id = get_company_id(request)

    repo = ApprovalRepository(session)
    approval = await repo.get_by_draft_id(body.draft_id)

    if not approval:
        raise HTTPException(status_code=404, detail=f"Draft {body.draft_id} not found")

    if approval.company_id != company_id:
        raise HTTPException(status_code=403, detail="Cross-tenant access denied")

    if body.approved:
        await repo.update_status(
            draft_id=body.draft_id,
            status="approved",
            decided_by=body.decided_by or "merchant",
        )
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

        try:
            sdk_result = await resume_sdk_approval_workflow(
                draft_id=body.draft_id,
                approved=True,
                thread_id=body.thread_id,
                customer_id=str(getattr(approval, "customer_id", "") or ""),
                session=session,
                is_merchant=False,
            )
            if sdk_result is not None:
                logger.info("sdk approval workflow resumed", draft_id=body.draft_id)
                return ResumeResponse(
                    status="ok",
                    reply=t("approval.executed", locale="ar"),
                    thread_id=body.thread_id,
                )
        except Exception as exc:
            logger.warning(
                "sdk approval workflow resume failed; falling back to manual execution",
                draft_id=body.draft_id,
                error=str(exc),
            )

        try:
            await execute_approved_action(
                draft_id=body.draft_id,
                session=session,
            )
            return ResumeResponse(
                status="ok",
                reply=t("approval.executed", locale="ar"),
                thread_id=body.thread_id,
            )
        except Exception as e:
            logger.error("approval execution failed", draft_id=body.draft_id, error=str(e))
            return ResumeResponse(
                status="error",
                reply=t("approval.execution_failed", locale="ar"),
                thread_id=body.thread_id,
            )
    else:
        await repo.update_status(
            draft_id=body.draft_id,
            status="rejected",
            decided_by=body.decided_by or "merchant",
        )
        sdk_response = await create_sdk_approval_response(
            draft_id=body.draft_id,
            approved=False,
            session=session,
        )
        logger.info(
            "sdk approval response created",
            draft_id=body.draft_id,
            sdk_approval_id=getattr(sdk_response, "id", None),
            approved=False,
        )
        try:
            await resume_sdk_approval_workflow(
                draft_id=body.draft_id,
                approved=False,
                thread_id=body.thread_id,
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
            thread_id=body.thread_id,
        )
