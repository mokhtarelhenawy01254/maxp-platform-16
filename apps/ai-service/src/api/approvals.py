from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.repo.approval_repo import ApprovalRepository
from src.db.session import get_session
from src.deps import get_company_id

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/approvals")
async def list_approvals(
    request: Request,
    session: AsyncSession = Depends(get_session),  # noqa: B008
    status: str = Query("pending"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List approval drafts for the authenticated company."""
    company_id = get_company_id(request)
    repo = ApprovalRepository(session)
    # Lazy sweep: anything past its expires_at flips to 'expired' before we list,
    # so the queue the merchant sees is always actionable.
    await repo.expire_stale(company_id)
    approvals = await repo.list_by_company(company_id, status, limit, offset)

    return {
        "approvals": [
            {
                "id": a.draft_id,
                "draft_id": a.draft_id,
                "company_id": a.company_id,
                "thread_id": str(a.thread_id),
                "action_type": a.action_type,
                "action_args": a.action_args,
                "toolName": a.action_type,
                "params": a.action_args,
                "reasoning": (a.approval_metadata or {}).get("reasoning", ""),
                "estimatedImpact": (a.approval_metadata or {}).get("estimatedImpact", "Unknown"),
                "status": a.status,
                "channel": a.channel,
                "source": a.source,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "createdAt": a.created_at.isoformat() if a.created_at else None,
                "expiresAt": a.expires_at.isoformat() if a.expires_at else None,
                "conversationId": str(a.thread_id),
                "customerId": (a.approval_metadata or {}).get("customerId", None),
                "decided_by": a.decided_by,
                "decided_at": a.decided_at.isoformat() if a.decided_at else None,
                "agentId": (a.approval_metadata or {}).get("agentId", None),
            }
            for a in approvals
        ],
        "count": len(approvals),
    }
