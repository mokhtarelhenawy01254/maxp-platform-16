from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import text

import src.db.session as _db_mod

logger = structlog.get_logger(__name__)


async def customer_info(
    company_id: str, query: str
) -> dict[str, Any]:
    if not company_id or not query:
        return {"found": False, "code": "MISSING_PARAMS", "query": query}

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

    sf = _db_mod.async_session
    async with sf() as sess:
        rows = await sess.execute(sql, {"cid": company_id, "pattern": pattern, "exact": clean_query})
        row = rows.first()

    if not row:
        return {"found": False, "code": "CUSTOMER_NOT_FOUND", "query": query}

    c = dict(row._mapping)
    first = c.get("firstName") or ""
    last = c.get("lastName") or ""

    return {
        "found": True,
        "name": f"{first} {last}".strip(),
        "phone": c.get("phone"),
        "email": c.get("email") or "\u2014",
        "status": c.get("status"),
        "ordersCount": c.get("totalOrders", 0),
        "totalOrders": c.get("totalOrders", 0),
        "rating": c.get("customerRating") or "\u2014",
        "joinDate": str(c.get("joinDate") or ""),
    }


async def top_buyers(
    company_id: str, limit: int = 5, period: str = "month"
) -> list[dict[str, Any]]:
    if not company_id:
        return []

    now = datetime.utcnow()
    if period == "week":
        start = now - timedelta(days=7)
    elif period == "month":
        start = now - timedelta(days=30)
    elif period == "all":
        start = datetime(2000, 1, 1)
    else:
        start = now - timedelta(days=30)

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

    sf = _db_mod.async_session
    async with sf() as sess:
        rows = await sess.execute(sql, {"cid": company_id, "start": start, "lim": limit})
        return [
            {
                "rank": i + 1,
                "customerName": f"{(r.firstName or '')} {(r.lastName or '')}".strip(),
                "ordersCount": r.orders_count,
                "totalSpent": str(r.total_spent),
            }
            for i, r in enumerate(rows)
        ]
