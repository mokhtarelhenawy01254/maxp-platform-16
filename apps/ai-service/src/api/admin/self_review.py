from __future__ import annotations

import csv
import io
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

import structlog
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from pydantic import BaseModel, Field

from src.db.models.agent import Agent
from src.db.repo.review_log_repo import ReviewLogRepo
from src.db.session import get_session

logger = structlog.get_logger(__name__)
router = APIRouter()
SessionDep = Annotated[AsyncSession, Depends(get_session)]

AVAILABLE_REVIEW_MODELS = [
    "deepseek-flash",
    "gemini-2.5-flash",
    "gpt-5.4-nano",
]


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
                    "metadata_": log.metadata_,
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


class ReviewModelUpdate(BaseModel):
    model: str = Field(pattern=r"^[a-zA-Z0-9_.-]+$")


@router.patch("/self-review/agents/{agent_id}/review-model")
async def set_review_model(
    agent_id: str,
    body: ReviewModelUpdate,
    session: SessionDep,
) -> dict[str, bool]:
    from sqlalchemy import select, update

    stmt = select(Agent).where(Agent.id == agent_id)
    result = await session.execute(stmt)
    agent = result.scalar_one_or_none()
    if not agent:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    cfg = dict(agent.config or {})
    if body.model == "__default__":
        cfg.pop("reviewModel", None)
    else:
        cfg["reviewModel"] = body.model
    await session.execute(
        update(Agent).where(Agent.id == agent_id).values(config=cfg)
    )
    await session.commit()
    logger.info("review_model_updated", agent_id=agent_id, model=body.model)
    return {"success": True}


class GlobalReviewSettings(BaseModel):
    global_review_model: str = Field(default="", pattern=r"^[a-zA-Z0-9_.-]*$")
    self_review_enabled: bool | None = Field(default=None)


@router.get("/self-review/settings")
async def get_review_settings(
    session: SessionDep,
) -> dict[str, Any]:
    from src.db.models.provider import GlobalAiConfig
    from sqlalchemy import select

    result = await session.execute(select(GlobalAiConfig))
    config = result.scalar_one_or_none()
    global_review_model = ""
    self_review_enabled = True
    if config:
        settings = config.settings or {}
        global_review_model = settings.get("reviewModel", "")
        self_review_enabled = settings.get("selfReviewEnabled", True)
    return {
        "success": True,
        "data": {
            "global_review_model": global_review_model,
            "self_review_enabled": self_review_enabled,
            "available_models": AVAILABLE_REVIEW_MODELS,
        },
    }


@router.patch("/self-review/settings")
async def set_review_settings(
    body: GlobalReviewSettings,
    session: SessionDep,
) -> dict[str, bool]:
    from src.db.models.provider import GlobalAiConfig
    from sqlalchemy import select, update

    result = await session.execute(select(GlobalAiConfig))
    config = result.scalar_one_or_none()
    if not config:
        return {"success": False}
    settings = dict(config.settings or {})
    if body.global_review_model:
        settings["reviewModel"] = body.global_review_model
    else:
        settings.pop("reviewModel", None)
    if body.self_review_enabled is not None:
        settings["selfReviewEnabled"] = body.self_review_enabled
    else:
        settings.pop("selfReviewEnabled", None)
    await session.execute(
        update(GlobalAiConfig).where(GlobalAiConfig.id == config.id).values(settings=settings)
    )
    await session.commit()
    logger.info("global_review_settings_updated", model=body.global_review_model, enabled=body.self_review_enabled)
    return {"success": True}
