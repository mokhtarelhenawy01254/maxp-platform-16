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


async def order_summary(
    company_id: str, period: str = "today"
) -> dict[str, Any]:
    if not company_id:
        return {"period": period, "totalOrders": 0, "paidRevenue": "0", "paidOrdersCount": 0, "avgOrderValue": "0", "byStatus": {}}

    start_date = _period_start_date(period)
    sf = _db_mod.async_session

    async with sf() as sess:
        row = await sess.execute(text("""
            SELECT
              COUNT(*)::int AS total_orders,
              COALESCE(SUM(total) FILTER (WHERE status = 'DELIVERED' OR paymentStatus = 'COMPLETED'), 0) AS paid_revenue,
              COUNT(*) FILTER (WHERE status = 'DELIVERED' OR paymentStatus = 'COMPLETED')::int AS paid_count,
              COALESCE(AVG(total) FILTER (WHERE status = 'DELIVERED' OR paymentStatus = 'COMPLETED'), 0) AS avg_value
            FROM orders
            WHERE "companyId" = :cid AND "createdAt" >= :start
        """), {"cid": company_id, "start": start_date})
        _first = row.first()
        agg = dict(_first._mapping) if _first else {}

        status_row = await sess.execute(text("""
            SELECT status, COUNT(*)::int AS cnt
            FROM orders
            WHERE "companyId" = :cid AND "createdAt" >= :start
            GROUP BY status
        """), {"cid": company_id, "start": start_date})
        by_status = {}
        for r in status_row:
            by_status[r.status.lower() if r.status else "unknown"] = r.cnt

    return {
        "period": period,
        "totalOrders": agg.get("total_orders", 0),
        "paidRevenue": str(agg.get("paid_revenue", 0)),
        "paidOrdersCount": agg.get("paid_count", 0),
        "avgOrderValue": str(agg.get("avg_value", 0)),
        "byStatus": by_status,
    }


async def order_lookup(
    company_id: str, order_number: str
) -> dict[str, Any]:
    if not company_id or not order_number:
        return {"found": False, "code": "MISSING_PARAMS", "orderNumber": order_number}

    sf = _db_mod.async_session

    async with sf() as sess:
        order_row = await sess.execute(text("""
            SELECT o.id, o."orderNumber", o.status, o."paymentStatus", o.total,
                   o."customerName", o."customerPhone", o."customerEmail",
                   o."createdAt", o."confirmedAt", o."deliveredAt", o."updatedAt",
                   o."customerAddress", o.city, o.governorate, o.notes,
                   o."customerId"
            FROM orders o
            WHERE o."companyId" = :cid AND o."orderNumber" = :onum
            LIMIT 1
        """), {"cid": company_id, "onum": order_number})
        order = order_row.first()

        if not order:
            return {"found": False, "code": "ORDER_NOT_FOUND", "orderNumber": order_number}

        o = dict(order._mapping)

        items_row = await sess.execute(text("""
            SELECT oi."productName" AS name, oi.quantity AS qty, oi.price,
                   oi."productColor", oi."productSize", oi."productSku"
            FROM order_items oi
            WHERE oi."orderId" = :oid
        """), {"oid": o["id"]})
        items = [dict(r._mapping) for r in items_row]

        customer_name = o.get("customerName") or ""
        customer_phone = o.get("customerPhone") or ""

    return {
        "found": True,
        "orderNumber": str(o.get("orderNumber", order_number)),
        "status": o.get("status"),
        "paymentStatus": o.get("paymentStatus"),
        "total": str(o.get("total", 0)),
        "customer": customer_name,
        "phone": customer_phone,
        "items": [
            {"name": i.get("name", ""), "qty": i.get("qty", 1), "price": str(i.get("price", 0))}
            for i in items
        ],
        "createdAt": str(o.get("createdAt") or ""),
        "confirmedAt": str(o.get("confirmedAt") or ""),
        "deliveredAt": str(o.get("deliveredAt") or ""),
        "updatedAt": str(o.get("updatedAt") or ""),
    }


async def recent_orders(
    company_id: str, limit: int = 5, status: str | None = None
) -> list[dict[str, Any]]:
    if not company_id:
        return []

    where_extra = 'AND o.status = :status' if status else ''
    params: dict[str, Any] = {"cid": company_id, "lim": min(limit, 100)}
    if status:
        params["status"] = status

    sql = text(f"""
        SELECT o."orderNumber", o."customerName", o."customerPhone",
               o.status, o."paymentStatus", o.total, o."createdAt" AS date
        FROM orders o
        WHERE o."companyId" = :cid {where_extra}
        ORDER BY o."createdAt" DESC
        LIMIT :lim
    """)

    sf = _db_mod.async_session
    async with sf() as sess:
        rows = await sess.execute(sql, params)
        return [
            {
                "orderNumber": r.orderNumber,
                "customerName": r.customerName,
                "phone": r.customerPhone,
                "status": r.status,
                "paymentStatus": r.paymentStatus,
                "total": str(r.total or 0),
                "date": str(r.date or ""),
            }
            for r in rows
        ]


async def cancel_order(
    company_id: str, order_number: str, reason: str | None = None
) -> dict[str, Any]:
    if not company_id or not order_number:
        return {"success": False, "error": "Missing company_id or order_number"}

    sf = _db_mod.async_session
    async with sf() as sess:
        row = await sess.execute(text("""
            SELECT id, status FROM orders
            WHERE "companyId" = :cid AND "orderNumber" = :onum
            LIMIT 1
        """), {"cid": company_id, "onum": order_number})
        order = row.first()

        if not order:
            return {"success": False, "error": f"Order {order_number} not found"}

        await sess.execute(text("""
            UPDATE orders SET status = 'CANCELLED', "updatedAt" = NOW()
            WHERE id = :oid
        """), {"oid": order.id})
        await sess.commit()

    return {"success": True, "orderNumber": order_number, "newStatus": "CANCELLED"}


async def create_order(
    company_id: str, order_data: dict[str, Any]
) -> dict[str, Any]:
    if not company_id:
        return {"success": False, "error": "Missing company_id"}

    import uuid
    order_id = str(uuid.uuid4())

    sf = _db_mod.async_session
    async with sf() as sess:
        # Get next order number
        num_row = await sess.execute(text("""
            SELECT COALESCE(MAX(CAST("orderNumber" AS integer)), 0) + 1 AS next_num
            FROM orders WHERE "companyId" = :cid
        """), {"cid": company_id})
        _n_first = num_row.first()
        next_num = _n_first.next_num if _n_first else 1

        total = order_data.get("total") or 0
        product_name = order_data.get("productName") or ""
        qty = order_data.get("quantity", 1)

        await sess.execute(text("""
            INSERT INTO orders (id, "orderNumber", "customerName", "customerPhone",
                               total, subtotal, status, "paymentStatus",
                               notes, "companyId", "createdAt", "updatedAt")
            VALUES (:id, :onum, :cname, :cphone, :total, :subtotal, 'PENDING', 'PENDING',
                    :notes, :cid, NOW(), NOW())
        """), {
            "id": order_id,
            "onum": str(next_num),
            "cname": order_data.get("customerName") or "",
            "cphone": order_data.get("customerPhone") or "",
            "total": total,
            "subtotal": total,
            "notes": order_data.get("notes") or "",
            "cid": company_id,
        })

        import uuid as _uuid
        item_id = str(_uuid.uuid4())
        await sess.execute(text("""
            INSERT INTO order_items (id, "orderId", "productName", quantity, price, total)
            VALUES (:id, :oid, :pname, :qty, :price, :total)
        """), {
            "id": item_id,
            "oid": order_id,
            "pname": product_name,
            "qty": qty,
            "price": order_data.get("productPrice") or 0,
            "total": total,
        })
        await sess.commit()

    return {
        "orderNumber": str(next_num),
        "status": "PENDING",
        "customerName": order_data.get("customerName", ""),
    }
