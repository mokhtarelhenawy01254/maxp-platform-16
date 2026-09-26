from __future__ import annotations

from typing import Any

from sqlalchemy import text

from src.tools.repositories.base import BaseRepository
from src.tools.definitions._helpers import period_date_range, period_start_date


class SalesRepository(BaseRepository):

    async def get_revenue_summary(
        self, company_id: str, period: str = "month"
    ) -> dict[str, Any]:
        start_date, end_date = period_date_range(period)
        where_clauses = ['"companyId" = :cid', '"createdAt" >= :start']
        params: dict[str, Any] = {"cid": company_id, "start": start_date}
        if end_date:
            where_clauses.append('"createdAt" < :end')
            params["end"] = end_date
        where_sql = " AND ".join(where_clauses)

        sql = text(f"""
            SELECT
              COUNT(*)::int AS total_orders,
              COUNT(*) FILTER (WHERE status = 'DELIVERED' OR "paymentStatus" = 'COMPLETED')::int AS paid_count,
              COALESCE(SUM(total) FILTER (WHERE status = 'DELIVERED' OR "paymentStatus" = 'COMPLETED'), 0) AS paid_revenue,
              COALESCE(AVG(total) FILTER (WHERE status = 'DELIVERED' OR "paymentStatus" = 'COMPLETED'), 0) AS avg_value
            FROM orders
            WHERE {where_sql}
        """)
        row = await self._session.execute(sql, params)
        first = row.first()
        agg = dict(first._mapping) if first else {}

        status_sql = text(f"""
            SELECT status, COUNT(*)::int AS cnt
            FROM orders
            WHERE {where_sql}
            GROUP BY status
        """)
        status_rows = await self._session.execute(status_sql, params)
        by_status = {}
        for r in status_rows:
            by_status[r.status.lower() if r.status else "unknown"] = r.cnt

        return {
            "period": period,
            "revenue": str(agg.get("paid_revenue", 0)),
            "ordersCount": agg.get("paid_count", 0),
            "avgOrderValue": str(agg.get("avg_value", 0)),
            "totalOrders": agg.get("total_orders", 0),
            "byStatus": by_status,
        }

    async def get_company_snapshot(self, company_id: str) -> dict[str, Any]:
        today_start = period_start_date("today")

        today_row = await self._session.execute(text("""
            SELECT
              COUNT(*)::int AS total,
              COALESCE(SUM(total) FILTER (WHERE status = 'DELIVERED' OR "paymentStatus" = 'COMPLETED'), 0) AS revenue,
              COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
              COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS confirmed,
              COUNT(*) FILTER (WHERE status = 'SHIPPED')::int AS shipped,
              COUNT(*) FILTER (WHERE status = 'DELIVERED')::int AS delivered,
              COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled
            FROM orders
            WHERE "companyId" = :cid AND "createdAt" >= :start
        """), {"cid": company_id, "start": today_start})
        first = today_row.first()
        today = dict(first._mapping) if first else {}

        pending_res = await self._session.execute(text("""
            SELECT COUNT(*)::int AS cnt
            FROM orders
            WHERE "companyId" = :cid AND status = 'PENDING'
        """), {"cid": company_id})
        p_row = pending_res.first()
        pending_total = p_row.cnt if p_row else 0

        low_stock_res = await self._session.execute(text("""
            SELECT COUNT(DISTINCT p.id)::int AS cnt
            FROM products p
            LEFT JOIN product_variants pv ON pv."productId" = p.id AND pv."isActive" = TRUE AND pv."trackInventory" = TRUE
            WHERE p."companyId" = :cid
              AND p."deletedAt" IS NULL
              AND p."isActive" = TRUE
              AND p."trackInventory" = TRUE
              AND (p.stock <= 5 OR (pv.id IS NOT NULL AND pv.stock <= 5))
        """), {"cid": company_id})
        l_row = low_stock_res.first()
        low_stock_cnt = l_row.cnt if l_row else 0

        return {
            "todayOrders": today.get("total", 0),
            "pendingOrders": pending_total,
            "lowStockCount": low_stock_cnt,
            "todayRevenue": str(today.get("revenue", 0)),
            "todayPending": today.get("pending", 0),
            "todayConfirmed": today.get("confirmed", 0),
            "todayShipped": today.get("shipped", 0),
            "todayDelivered": today.get("delivered", 0),
            "todayCancelled": today.get("cancelled", 0),
        }
