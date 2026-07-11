from __future__ import annotations

import csv
import io
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

import structlog
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.repo.review_log_repo import ReviewLogRepo
from src.db.session import get_session

logger = structlog.get_logger(__name__)
router = APIRouter()
SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _parse_date(date_str: str | None) -> datetime | None:
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str)
    except (ValueError, TypeError):
        return None


@router.get("/self-review/logs")
async def list_logs(
    session: SessionDep,
    company_id: str = Query(default=""),
    agent_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
) -> dict[str, Any]:
    since = _parse_date(date_from)
    until = _parse_date(date_to)
    repo = ReviewLogRepo(session)
    logs = await repo.list(
        company_id=company_id,
        agent_id=agent_id,
        status=status,
        since=since,
        until=until,
        limit=limit,
        offset=(page - 1) * limit,
    )
    total = await repo.count(
        company_id=company_id,
        agent_id=agent_id,
        status=status,
        since=since,
        until=until,
    )
    return {
        "success": True,
        "data": {
            "logs": [
                {
                    "id": str(log.id),
                    "company_id": log.company_id,
                    "agent_id": log.agent_id,
                    "agent_slug": log.agent_slug,
                    "status": log.status,
                    "violations": log.violations,
                    "reason": log.reason,
                    "model_used": log.model_used,
                    "latency_ms": log.latency_ms,
                    "reply_preview": log.reply_preview,
                    "created_at": log.created_at.isoformat(),
                }
                for log in logs
            ],
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": max(1, (total + limit - 1) // limit),
        },
    }


@router.get("/self-review/stats")
async def get_stats(
    session: SessionDep,
    company_id: str = Query(default=""),
    days: int = Query(default=7, ge=1, le=90),
) -> dict[str, Any]:
    since = datetime.now(UTC) - timedelta(days=days)
    repo = ReviewLogRepo(session)
    stats = await repo.get_stats(company_id=company_id, since=since)
    violations = await repo.get_violations_summary(company_id=company_id, since=since)
    agents = await repo.get_agent_summary(company_id=company_id, since=since)
    return {
        "success": True,
        "data": {
            **stats,
            "violations": violations,
            "agents": agents,
            "days": days,
        },
    }


@router.get("/self-review/logs/export")
async def export_logs_csv(
    session: SessionDep,
    company_id: str = Query(default=""),
    agent_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
) -> StreamingResponse:
    since = _parse_date(date_from)
    until = _parse_date(date_to)
    repo = ReviewLogRepo(session)
    logs = await repo.list(
        company_id=company_id,
        agent_id=agent_id,
        status=status,
        since=since,
        until=until,
        limit=10_000,
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "timestamp", "company_id", "agent_id", "agent_slug",
        "status", "violations", "reason", "model_used",
        "latency_ms", "reply_preview",
    ])
    for log in logs:
        writer.writerow([
            log.created_at.isoformat(),
            log.company_id,
            log.agent_id,
            log.agent_slug,
            log.status,
            ", ".join(log.violations) if log.violations else "",
            log.reason or "",
            log.model_used or "",
            log.latency_ms or "",
            log.reply_preview or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=self-review-logs.csv"},
    )
