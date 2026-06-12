from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import text

import src.db.session as _db_mod

logger = structlog.get_logger(__name__)


def _period_start_date(period: str) -> datetime:
    now = datetime.utcnow()
    period = period.lower()
    if period == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "yesterday":
        return (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        return now - timedelta(days=7)
    elif period == "month":
        return now - timedelta(days=30)
    elif period == "all":
        return datetime(2000, 1, 1)
    return now - timedelta(days=30)


async def sales_revenue(
    company_id: str, period: str = "month"
) -> dict[str, Any]:
    if not company_id:
        return {"period": period, "revenue": "0", "ordersCount": 0, "totalOrders": 0, "avgOrderValue": "0", "byStatus": {}}

    start_date = _period_start_date(period)
    sf = _db_mod.async_session

    async with sf() as sess:
        agg_row = await sess.execute(text("""
            SELECT
              COUNT(*)::int AS total_orders,
              COUNT(*) FILTER (WHERE status = 'DELIVERED' OR paymentStatus = 'COMPLETED')::int AS paid_count,
              COALESCE(SUM(total) FILTER (WHERE status = 'DELIVERED' OR paymentStatus = 'COMPLETED'), 0) AS paid_revenue,
              COALESCE(AVG(total) FILTER (WHERE status = 'DELIVERED' OR paymentStatus = 'COMPLETED'), 0) AS avg_value
            FROM orders
            WHERE "companyId" = :cid AND "createdAt" >= :start
        """), {"cid": company_id, "start": start_date})
        _first = agg_row.first()
        agg = dict(_first._mapping) if _first else {}

        status_row = await sess.execute(text("""
            SELECT status, COUNT(*)::int AS cnt
            FROM orders
            WHERE "companyId" = :cid AND "createdAt" >= :start
            GROUP BY status
        """), {"cid": company_id, "start": start_date})
        by_status: dict[str, int] = {}
        for r in status_row:
            by_status[r.status.lower() if r.status else "unknown"] = r.cnt

    return {
        "period": period,
        "revenue": str(agg.get("paid_revenue", 0)),
        "ordersCount": agg.get("paid_count", 0),
        "avgOrderValue": str(agg.get("avg_value", 0)),
        "totalOrders": agg.get("total_orders", 0),
        "byStatus": by_status,
    }


async def company_snapshot(
    company_id: str
) -> dict[str, Any]:
    if not company_id:
        return {"todayOrders": 0, "pendingOrders": 0, "lowStockCount": 0, "todayRevenue": "0",
                "todayPending": 0, "todayConfirmed": 0, "todayShipped": 0,
                "todayDelivered": 0, "todayCancelled": 0}

    today_start = _period_start_date("today")
    sf = _db_mod.async_session

    async with sf() as sess:
        today_row = await sess.execute(text("""
            SELECT
              COUNT(*)::int AS total,
              COALESCE(SUM(total) FILTER (WHERE status = 'DELIVERED' OR paymentStatus = 'COMPLETED'), 0) AS revenue,
              COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
              COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS confirmed,
              COUNT(*) FILTER (WHERE status = 'SHIPPED')::int AS shipped,
              COUNT(*) FILTER (WHERE status = 'DELIVERED')::int AS delivered,
              COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled
            FROM orders
            WHERE "companyId" = :cid AND "createdAt" >= :start
        """), {"cid": company_id, "start": today_start})
        _first = today_row.first()
        today = dict(_first._mapping) if _first else {}

        pending_row = await sess.execute(text("""
            SELECT COUNT(*)::int AS cnt
            FROM orders
            WHERE "companyId" = :cid AND status = 'PENDING'
        """), {"cid": company_id})
        _p_first = pending_row.first()
        pending_total = _p_first.cnt if _p_first else 0

        low_stock_row = await sess.execute(text("""
            SELECT COUNT(*)::int AS cnt
            FROM products
            WHERE "companyId" = :cid
              AND "deletedAt" IS NULL
              AND "isActive" = TRUE
              AND "trackInventory" = TRUE
              AND stock <= 5
        """), {"cid": company_id})
        _ls_first = low_stock_row.first()
        low_stock_cnt = _ls_first.cnt if _ls_first else 0

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
