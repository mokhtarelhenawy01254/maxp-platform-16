from __future__ import annotations

from typing import Any

from sqlalchemy import text

from src.tools.repositories.base import BaseRepository
from src.tools.definitions._helpers import period_start_date


class OrderRepository(BaseRepository):
    """Data access for orders, order items, and order statistics."""

    async def get_order(self, company_id: str, order_number: str) -> dict[str, Any] | None:
        sql = text("""
            SELECT o.id, o."orderNumber", o.status, o."paymentStatus", o.total,
                   o."customerName", o."customerPhone", o."customerEmail",
                   o."createdAt", o."confirmedAt", o."updatedAt",
                   o."customerAddress", o.city, o.governorate, o.notes,
                   o."customerId"
            FROM orders o
            WHERE o."companyId" = :cid AND o."orderNumber" = :onum
            LIMIT 1
        """)
        result = await self._session.execute(sql, {"cid": company_id, "onum": order_number})
        row = result.first()
        return dict(row._mapping) if row else None

    async def get_order_items(self, order_id: str) -> list[dict[str, Any]]:
        sql = text("""
            SELECT oi."productName" AS name, oi.quantity AS qty, oi.price,
                   oi."productColor", oi."productSize", oi."productSku"
            FROM order_items oi
            WHERE oi."orderId" = :oid
        """)
        rows = await self._session.execute(sql, {"oid": order_id})
        return [dict(r._mapping) for r in rows]

    async def get_order_summary(self, company_id: str, period: str = "today") -> dict[str, Any]:
        start_date = period_start_date(period)
        sql = text("""
            SELECT
              COUNT(*)::int AS total_orders,
              COALESCE(SUM(total) FILTER (WHERE status = 'DELIVERED' OR paymentStatus = 'COMPLETED'), 0) AS paid_revenue,
              COUNT(*) FILTER (WHERE status = 'DELIVERED' OR paymentStatus = 'COMPLETED')::int AS paid_count,
              COALESCE(AVG(total) FILTER (WHERE status = 'DELIVERED' OR paymentStatus = 'COMPLETED'), 0) AS avg_value
            FROM orders
            WHERE "companyId" = :cid AND "createdAt" >= :start
        """)
        row = await self._session.execute(sql, {"cid": company_id, "start": start_date})
        first = row.first()
        agg = dict(first._mapping) if first else {}

        status_sql = text("""
            SELECT status, COUNT(*)::int AS cnt
            FROM orders
            WHERE "companyId" = :cid AND "createdAt" >= :start
            GROUP BY status
        """)
        status_rows = await self._session.execute(status_sql, {"cid": company_id, "start": start_date})
        by_status = {r.status.lower() if r.status else "unknown": r.cnt for r in status_rows}

        return {
            "period": period,
            "totalOrders": agg.get("total_orders", 0),
            "paidRevenue": str(agg.get("paid_revenue", 0)),
            "paidOrdersCount": agg.get("paid_count", 0),
            "avgOrderValue": str(agg.get("avg_value", 0)),
            "byStatus": by_status,
        }

    async def get_recent_orders(self, company_id: str, limit: int = 5, status: str | None = None) -> list[dict[str, Any]]:
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
        rows = await self._session.execute(sql, params)
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

    async def cancel_order(self, company_id: str, order_number: str) -> dict[str, Any]:
        row = await self._session.execute(text("""
            SELECT id, status FROM orders
            WHERE "companyId" = :cid AND "orderNumber" = :onum
            LIMIT 1
        """), {"cid": company_id, "onum": order_number})
        order = row.first()
        if not order:
            return {"success": False, "error": f"Order {order_number} not found"}

        await self._session.execute(text("""
            UPDATE orders SET status = 'CANCELLED', "updatedAt" = NOW()
            WHERE id = :oid
        """), {"oid": order.id})
        await self._session.commit()
        return {"success": True, "orderNumber": order_number, "newStatus": "CANCELLED"}

    async def create_order(self, company_id: str, order_data: dict[str, Any]) -> dict[str, Any]:
        import uuid
        order_id = str(uuid.uuid4())

        # Use regex filter to skip non-integer orderNumbers like "ORD-000862-984"
        num_row = await self._session.execute(text("""
            SELECT COALESCE(MAX(CASE WHEN "orderNumber" ~ '^[0-9]+$' THEN CAST("orderNumber" AS integer) ELSE 0 END), 0) + 1 AS next_num
            FROM orders WHERE "companyId" = :cid
        """), {"cid": company_id})
        _first = num_row.first()
        next_num = _first.next_num if _first else 1

        total = order_data.get("total") or 0
        product_name = order_data.get("productName") or ""
        qty = order_data.get("quantity", 1)
        customer_phone = order_data.get("customerPhone") or ""
        customer_name = order_data.get("customerName") or ""

        # Find or create customer so we can satisfy the NOT NULL customerId FK
        customer_id = None
        if customer_phone:
            cust_row = await self._session.execute(text("""
                SELECT id FROM customers
                WHERE "companyId" = :cid AND phone = :phone
                LIMIT 1
            """), {"cid": company_id, "phone": customer_phone})
            cust = cust_row.first()
            if cust:
                customer_id = cust.id
            else:
                customer_id = str(uuid.uuid4())
                name_parts = customer_name.split(" ", 1)
                first_name = name_parts[0]
                last_name = name_parts[1] if len(name_parts) > 1 else ""
                await self._session.execute(text("""
                    INSERT INTO customers (id, "firstName", "lastName", phone, status, "companyId", "createdAt", "updatedAt")
                    VALUES (:id, :fname, :lname, :phone, 'ACTIVE', :cid, NOW(), NOW())
                """), {
                    "id": customer_id,
                    "fname": first_name,
                    "lname": last_name,
                    "phone": customer_phone,
                    "cid": company_id,
                })

        await self._session.execute(text("""
            INSERT INTO orders (id, "orderNumber", "customerId", "customerName", "customerPhone",
                               total, subtotal, status, "paymentStatus",
                               notes, "companyId", "createdAt", "updatedAt")
            VALUES (:id, :onum, :cust_id, :cname, :cphone, :total, :subtotal, 'PENDING', 'PENDING',
                    :notes, :cid, NOW(), NOW())
        """), {
            "id": order_id,
            "onum": str(next_num),
            "cust_id": customer_id,
            "cname": customer_name,
            "cphone": customer_phone,
            "total": total,
            "subtotal": total,
            "notes": order_data.get("notes") or "",
            "cid": company_id,
        })

        item_id = str(uuid.uuid4())
        await self._session.execute(text("""
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
        await self._session.commit()

        return {
            "orderNumber": str(next_num),
            "status": "PENDING",
            "customerName": order_data.get("customerName", ""),
        }

    async def get_pending_count(self, company_id: str) -> int:
        row = await self._session.execute(text("""
            SELECT COUNT(*)::int AS cnt
            FROM orders
            WHERE "companyId" = :cid AND status = 'PENDING'
        """), {"cid": company_id})
        first = row.first()
        return first.cnt if first else 0
