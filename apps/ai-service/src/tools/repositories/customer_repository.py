from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.tools.repositories.base import BaseRepository
from src.tools.definitions._helpers import period_start_date


class CustomerRepository(BaseRepository):
    """Data access for customer lookup and top buyers."""

    async def find_customer(self, company_id: str, query: str) -> dict[str, Any] | None:
        if not company_id or not query:
            return None
        clean_query = query.strip()
        pattern = f"%{clean_query}%"

        sql = text("""
            SELECT id, "firstName", "lastName", phone, email, status,
                   "totalOrdersCount" AS "totalOrders", "customerRating", "createdAt" AS "joinDate",
                   "successScore", "deliveryRate", "totalDelivered"
            FROM customers
            WHERE "companyId" = :cid
              AND (phone ILIKE :pattern OR email ILIKE :pattern
                   OR "firstName" ILIKE :pattern OR "lastName" ILIKE :pattern
                   OR "firstName" || ' ' || "lastName" ILIKE :pattern)
            ORDER BY
              CASE
                WHEN phone = :exact THEN 0
                WHEN email = :exact THEN 1
                WHEN "firstName" || ' ' || "lastName" = :exact THEN 2
                ELSE 3
              END,
              "updatedAt" DESC
            LIMIT 1
        """)
        row = await self._session.execute(sql, {"cid": company_id, "pattern": pattern, "exact": clean_query})
        result = row.first()
        return dict(result._mapping) if result else None

    async def get_top_buyers(
        self, company_id: str, limit: int = 5, period: str = "month"
    ) -> list[dict[str, Any]]:
        start = period_start_date(period)

        sql = text("""
            SELECT
              c.id, c."firstName", c."lastName", c.phone,
              COUNT(DISTINCT o.id)::int AS orders_count,
              COALESCE(SUM(o.total), 0) AS total_spent
            FROM customers c
            JOIN orders o ON o."customerId" = c.id
            WHERE c."companyId" = :cid
              AND o."createdAt" >= :start
              AND o.status != 'CANCELLED'
            GROUP BY c.id, c."firstName", c."lastName", c.phone
            ORDER BY total_spent DESC
            LIMIT :lim
        """)
        rows = await self._session.execute(sql, {"cid": company_id, "start": start, "lim": limit})
        return [
            {
                "rank": i + 1,
                "customerName": f"{(r.firstName or '')} {(r.lastName or '')}".strip(),
                "ordersCount": r.orders_count,
                "totalSpent": str(r.total_spent),
            }
            for i, r in enumerate(rows)
        ]
