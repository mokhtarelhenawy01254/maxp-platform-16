from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import func, select, text, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.review_log import ReviewLog

logger = structlog.get_logger(__name__)


class ReviewLogRepo:
    """Repository for ai.self_review_log CRUD and aggregation queries."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        company_id: str,
        agent_id: str,
        status: str,
        agent_slug: str | None = None,
        reply_preview: str | None = None,
        model_used: str | None = None,
        latency_ms: int | None = None,
        violations: list[str] | None = None,
        reason: str | None = None,
        verdict_raw: dict[str, Any] | None = None,
        metadata_: dict[str, Any] | None = None,
    ) -> ReviewLog:
        log = ReviewLog(
            company_id=company_id,
            agent_id=agent_id,
            agent_slug=agent_slug,
            reply_preview=reply_preview[:300] if reply_preview else None,
            model_used=model_used,
            latency_ms=latency_ms,
            status=status,
            violations=violations,
            reason=reason,
            verdict_raw=verdict_raw,
            metadata_=metadata_,
        )
        self._session.add(log)
        await self._session.commit()
        await self._session.refresh(log)
        return log

    async def list(
        self,
        company_id: str,
        agent_id: str | None = None,
        status: str | None = None,
        since: datetime | None = None,
        until: datetime | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[ReviewLog]:
        where: list[Any] = []
        if company_id:
            where.append(ReviewLog.company_id == company_id)
        if agent_id:
            where.append(ReviewLog.agent_id == agent_id)
        if status:
            where.append(ReviewLog.status == status)
        if since:
            where.append(ReviewLog.created_at >= since)
        if until:
            where.append(ReviewLog.created_at <= until)
        stmt = (
            select(ReviewLog)
            .where(*where)
            .order_by(ReviewLog.created_at.desc(), ReviewLog.id.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def count(
        self,
        company_id: str,
        agent_id: str | None = None,
        status: str | None = None,
        since: datetime | None = None,
        until: datetime | None = None,
    ) -> int:
        where: list[Any] = []
        if company_id:
            where.append(ReviewLog.company_id == company_id)
        if agent_id:
            where.append(ReviewLog.agent_id == agent_id)
        if status:
            where.append(ReviewLog.status == status)
        if since:
            where.append(ReviewLog.created_at >= since)
        if until:
            where.append(ReviewLog.created_at <= until)
        stmt = select(func.count(ReviewLog.id)).where(*where)
        result = await self._session.execute(stmt)
        return result.scalar() or 0

    async def get_stats(
        self,
        company_id: str,
        agent_id: str | None = None,
        since: datetime | None = None,
    ) -> dict[str, Any]:
        where: list[Any] = []
        if company_id:
            where.append(ReviewLog.company_id == company_id)
        if agent_id:
            where.append(ReviewLog.agent_id == agent_id)
        if since:
            where.append(ReviewLog.created_at >= since)

        total = await self._session.scalar(
            select(func.count(ReviewLog.id)).where(*where)
        ) or 0

        if total == 0:
            return {
                "total": 0, "approved": 0, "rejected": 0, "corrected": 0,
                "skipped": 0, "approval_rate": 0.0, "avg_latency_ms": 0,
            }

        status_counts = (
            await self._session.execute(
                select(ReviewLog.status, func.count(ReviewLog.id).label("count"))
                .where(*where)
                .group_by(ReviewLog.status)
            )
        ).all()

        counts = {row.status: row.count for row in status_counts}
        avg_lat = (
            await self._session.scalar(
                select(func.avg(ReviewLog.latency_ms))
                .where(*where, ReviewLog.latency_ms.isnot(None))
            )
        ) or 0

        return {
            "total": total,
            "approved": counts.get("approved", 0),
            "rejected": counts.get("rejected", 0),
            "corrected": counts.get("corrected", 0),
            "skipped": counts.get("skipped", 0),
            "approval_rate": round(counts.get("approved", 0) / total * 100, 1),
            "avg_latency_ms": round(float(avg_lat)),
        }

    async def get_violations_summary(
        self,
        company_id: str,
        agent_id: str | None = None,
        since: datetime | None = None,
    ) -> list[dict[str, Any]]:
        """Most common violations by agent."""
        where: list[Any] = [
            ReviewLog.violations.isnot(None),
            func.jsonb_typeof(ReviewLog.violations) == "array",
        ]
        if company_id:
            where.append(ReviewLog.company_id == company_id)
        if agent_id:
            where.append(ReviewLog.agent_id == agent_id)
        if since:
            where.append(ReviewLog.created_at >= since)

        rows = (
            await self._session.execute(
                select(
                    ReviewLog.agent_id,
                    ReviewLog.agent_slug,
                    func.jsonb_array_elements_text(ReviewLog.violations).label("violation"),
                    func.count().label("count"),
                )
                .where(*where)
                .group_by(ReviewLog.agent_id, ReviewLog.agent_slug, text("violation"))
                .order_by(text("count desc"))
                .limit(20)
            )
        ).all()

        return [
            {
                "agent_id": r.agent_id,
                "agent_slug": r.agent_slug,
                "violation": r.violation,
                "count": r.count,
            }
            for r in rows
        ]

    async def get_agent_summary(
        self,
        company_id: str,
        since: datetime | None = None,
    ) -> list[dict[str, Any]]:
        """Per-agent review stats for dashboard (single query)."""
        from sqlalchemy import case, Integer

        where: list[Any] = []
        if company_id:
            where.append(ReviewLog.company_id == company_id)
        if since:
            where.append(ReviewLog.created_at >= since)

        rows = (
            await self._session.execute(
                select(
                    ReviewLog.agent_id,
                    ReviewLog.agent_slug,
                    func.count().label("total"),
                    func.sum(case((ReviewLog.status == "approved", 1), else_=0)).label("approved"),
                    func.sum(case((ReviewLog.status == "corrected", 1), else_=0)).label("corrected"),
                    func.sum(case((ReviewLog.status == "rejected", 1), else_=0)).label("rejected"),
                    func.sum(case((ReviewLog.status == "skipped", 1), else_=0)).label("skipped"),
                )
                .where(*where)
                .group_by(ReviewLog.agent_id, ReviewLog.agent_slug)
            )
        ).all()

        return sorted(
            [
                {
                    "agent_id": r.agent_id,
                    "agent_slug": r.agent_slug,
                    "total": r.total,
                    "approved": r.approved,
                    "rejected": r.rejected,
                    "corrected": r.corrected,
                    "skipped": r.skipped,
                }
                for r in rows
            ],
            key=lambda x: x["total"],
            reverse=True,
        )
