from __future__ import annotations

from typing import Any

from sqlalchemy import text

from src.tools.repositories.base import BaseRepository


class AuditRepository(BaseRepository):
    async def get_recent_activities(self, company_id: str, limit: int) -> list[dict[str, Any]]:
        rows = await self._session.execute(text("""
            SELECT action AS type, description, "createdAt", "userId"
            FROM activity_logs
            WHERE "companyId" = :cid
            ORDER BY "createdAt" DESC
            LIMIT :lim
        """), {"cid": company_id, "lim": limit})
        return [dict(r._mapping) for r in rows]

    async def record_activity(
        self,
        company_id: str,
        action: str,
        description: str,
        category: str = "AI_AGENT",
        severity: str = "INFO",
        metadata: dict[str, Any] | None = None,
        user_id: str | None = None,
    ) -> None:
        import json
        import uuid
        log_id = f"log_{uuid.uuid4().hex[:16]}"
        meta_str = json.dumps(metadata or {}, ensure_ascii=False)
        await self._session.execute(text("""
            INSERT INTO activity_logs (id, "companyId", action, category, description, severity, "isSuccess", "createdAt", "updatedAt", metadata, "userId")
            VALUES (:id, :cid, :act, :cat, :desc, :sev, true, NOW(), NOW(), :meta, :uid)
        """), {
            "id": log_id,
            "cid": company_id,
            "act": action,
            "cat": category,
            "desc": description,
            "sev": severity,
            "meta": meta_str,
            "uid": user_id,
        })
        await self._session.commit()


async def log_agent_audit_event(
    company_id: str,
    action: str,
    description: str,
    category: str = "AI_AGENT",
    severity: str = "INFO",
    metadata: dict[str, Any] | None = None,
) -> None:
    if not company_id:
        return
    try:
        import src.db.session as _db_mod
        async with _db_mod.async_session() as sess:
            repo = AuditRepository(sess)
            await repo.record_activity(
                company_id=company_id,
                action=action,
                description=description,
                category=category,
                severity=severity,
                metadata=metadata,
            )
    except Exception as exc:
        import structlog
        structlog.get_logger(__name__).warning(
            "failed_to_log_agent_audit_event",
            error=str(exc),
            company_id=company_id,
            action=action,
        )
