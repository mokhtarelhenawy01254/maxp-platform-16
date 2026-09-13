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
