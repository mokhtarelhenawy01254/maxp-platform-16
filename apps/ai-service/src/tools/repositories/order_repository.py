from __future__ import annotations

from typing import Any

from sqlalchemy import text

from src.tools.repositories.base import BaseRepository
from src.tools.definitions._helpers import period_date_range, period_start_date


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

    async def get_orders_by_phone(
        self,
        company_id: str,
        phone: str,
        limit: int = 10,
        status: str | None = None,
    ) -> list[dict[str, Any]]:
        """Find orders for a customer by phone number.

        Matches customerPhone (regular orders) and guestPhone (storefront
        guest orders). Phone matching ignores +20/00/0 national-prefix
        differences so '01012345678' finds '+201012345678'.
        """
        clean_phone = str(phone).strip()
        if not clean_phone:
            return []

        digits = "".join(ch for ch in clean_phone if ch.isdigit())
        patterns = []
        if digits:
            patterns.append(f"%{digits}%")
        if digits.startswith("20"):
            patterns.append(f"%{digits[2:]}%")
        if digits.startswith("0"):
            patterns.append(f"%20{digits[1:]}%")
        if not patterns:
            patterns.append(f"%{clean_phone}%")

        status_where = ""
        guest_status_where = ""
        params: dict[str, Any] = {
            "cid": company_id,
            "lim": max(1, min(limit, 50)),
        }
        if status:
            status_where = 'AND o.status = :status'
            guest_status_where = 'AND g.status = :status'
            params["status"] = str(status).upper()

        phone_or = " OR ".join([f'o."customerPhone" LIKE :p{i}' for i in range(len(patterns))])
        for i, p in enumerate(patterns):
            params[f"p{i}"] = p

        sql = text(f"""
            SELECT o.id, o."orderNumber", o.status, o."paymentStatus", o.total,
                   o."customerName", o."customerPhone", o."createdAt"
            FROM orders o
            WHERE o."companyId" = :cid
              AND ({phone_or})
              {status_where}
            ORDER BY o."createdAt" DESC
            LIMIT :lim
        """)
        rows = await self._session.execute(sql, params)
        regular = [dict(r._mapping) for r in rows]

        guest_phone_or = " OR ".join([f'g."guestPhone" LIKE :g{i}' for i in range(len(patterns))])
        guest_params: dict[str, Any] = {"cid": company_id, "lim": max(1, min(limit, 50))}
        if status:
            guest_params["status"] = str(status).upper()
        for i, p in enumerate(patterns):
            guest_params[f"g{i}"] = p

        guest_sql = text(f"""
            SELECT g.id, g."orderNumber", g.status, g.total,
                   g."guestName" AS "customerName", g."guestPhone" AS "customerPhone",
                   g."createdAt"
            FROM guest_orders g
            WHERE g."companyId" = :cid
              AND ({guest_phone_or})
              {guest_status_where}
            ORDER BY g."createdAt" DESC
            LIMIT :lim
        """)
        guest_rows = await self._session.execute(guest_sql, guest_params)
        guest = [dict(r._mapping) for r in guest_rows]

        merged = regular + guest
        merged.sort(key=lambda o: o.get("createdAt") or "", reverse=True)
        return merged[:limit]

    async def get_order_summary(self, company_id: str, period: str = "today") -> dict[str, Any]:
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
              COALESCE(SUM(total) FILTER (WHERE status = 'DELIVERED' OR "paymentStatus" = 'COMPLETED'), 0) AS paid_revenue,
              COUNT(*) FILTER (WHERE status = 'DELIVERED' OR "paymentStatus" = 'COMPLETED')::int AS paid_count,
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
        by_status = {r.status.lower() if r.status else "unknown": r.cnt for r in status_rows}

        return {
            "period": period,
            "totalOrders": agg.get("total_orders", 0),
            "paidRevenue": str(agg.get("paid_revenue", 0)),
            "paidOrdersCount": agg.get("paid_count", 0),
            "avgOrderValue": str(agg.get("avg_value", 0)),
            "byStatus": by_status,
        }

    async def get_recent_orders(
        self,
        company_id: str,
        limit: int = 25,
        status: str | None = None,
        period: str | None = None,
        date: str | None = None,
    ) -> list[dict[str, Any]]:
        from datetime import datetime, timedelta

        start_date: datetime | None = None
        end_date: datetime | None = None

        raw_date = (date or "").strip()
        raw_period = (period or "").strip().lower()

        if raw_date:
            if raw_date.lower() == "yesterday":
                start_date, end_date = period_date_range("yesterday")
            elif raw_date.lower() == "today":
                start_date, end_date = period_date_range("today")
            else:
                try:
                    dt = datetime.strptime(raw_date, "%Y-%m-%d")
                    start_date = dt.replace(hour=0, minute=0, second=0, microsecond=0)
                    end_date = start_date + timedelta(days=1)
                except Exception:
                    start_date, end_date = period_date_range(raw_date)
        elif raw_period:
            start_date, end_date = period_date_range(raw_period)

        params: dict[str, Any] = {"cid": company_id, "lim": max(1, min(limit, 100))}
        if start_date:
            params["start"] = start_date
        if end_date:
            params["end"] = end_date

        order_conditions = ['o."companyId" = :cid']
        guest_conditions = ['g."companyId" = :cid']

        is_confirmed_query = False
        if status:
            st = status.strip().upper()
            if st == "CONFIRMED":
                is_confirmed_query = True
                order_conditions.append('(o.status = \'CONFIRMED\' OR o."confirmedAt" IS NOT NULL)')
                guest_conditions.append('(UPPER(g.status) = \'CONFIRMED\' OR g."confirmationNotifiedAt" IS NOT NULL)')
            else:
                params["status"] = st
                order_conditions.append('o.status = :status')
                guest_conditions.append('UPPER(g.status) = :status')

        if start_date:
            if is_confirmed_query:
                if end_date:
                    order_conditions.append(
                        '((o."confirmedAt" >= :start AND o."confirmedAt" < :end) '
                        'OR (o."createdAt" >= :start AND o."createdAt" < :end))'
                    )
                    guest_conditions.append(
                        '((g."confirmationNotifiedAt" >= :start AND g."confirmationNotifiedAt" < :end) '
                        'OR (g."createdAt" >= :start AND g."createdAt" < :end))'
                    )
                else:
                    order_conditions.append('(o."confirmedAt" >= :start OR o."createdAt" >= :start)')
                    guest_conditions.append('(g."confirmationNotifiedAt" >= :start OR g."createdAt" >= :start)')
            else:
                if end_date:
                    order_conditions.append('(o."createdAt" >= :start AND o."createdAt" < :end)')
                    guest_conditions.append('(g."createdAt" >= :start AND g."createdAt" < :end)')
                else:
                    order_conditions.append('o."createdAt" >= :start')
                    guest_conditions.append('g."createdAt" >= :start')

        where_orders = " AND ".join(order_conditions)
        order_sql = text(f"""
            SELECT o."orderNumber", o."customerName", o."customerPhone",
                   o.status, o."paymentStatus", o.total, o."createdAt" AS date,
                   o."confirmedAt", o.city, o.governorate
            FROM orders o
            WHERE {where_orders}
            ORDER BY COALESCE(o."confirmedAt", o."createdAt") DESC
            LIMIT :lim
        """)
        rows = await self._session.execute(order_sql, params)
        regular = [
            {
                "orderNumber": r.orderNumber,
                "customerName": r.customerName or "",
                "phone": r.customerPhone or "",
                "status": r.status or "",
                "paymentStatus": r.paymentStatus or "",
                "total": str(r.total or 0),
                "date": str(r.date or ""),
                "confirmedAt": str(r.confirmedAt or "") if getattr(r, "confirmedAt", None) else "",
                "city": r.city or "",
                "governorate": r.governorate or "",
            }
            for r in rows
        ]

        where_guest = " AND ".join(guest_conditions)
        guest_sql = text(f"""
            SELECT g."orderNumber", g."guestName" AS "customerName", g."guestPhone" AS "customerPhone",
                   g.status, 'PENDING' AS "paymentStatus", g.total, g."createdAt" AS date,
                   g."confirmationNotifiedAt" AS "confirmedAt", '' AS city, '' AS governorate
            FROM guest_orders g
            WHERE {where_guest}
            ORDER BY COALESCE(g."confirmationNotifiedAt", g."createdAt") DESC
            LIMIT :lim
        """)
        try:
            g_rows = await self._session.execute(guest_sql, params)
            guest = [
                {
                    "orderNumber": r.orderNumber,
                    "customerName": r.customerName or "",
                    "phone": r.customerPhone or "",
                    "status": r.status or "",
                    "paymentStatus": r.paymentStatus or "",
                    "total": str(r.total or 0),
                    "date": str(r.date or ""),
                    "confirmedAt": str(r.confirmedAt or "") if getattr(r, "confirmedAt", None) else "",
                    "city": "",
                    "governorate": "",
                }
                for r in g_rows
            ]
        except Exception:
            guest = []

        merged = regular + guest
        merged.sort(key=lambda o: o.get("confirmedAt") or o.get("date") or "", reverse=True)
        return merged[:limit]

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

        # Transaction-scoped advisory lock prevents duplicate order numbers during parallel agent creation
        await self._session.execute(
            text("SELECT pg_advisory_xact_lock(hashtext('order_seq:' || :cid))"),
            {"cid": company_id}
        )

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
        address = (order_data.get("address") or "").strip()
        city = (order_data.get("city") or "").strip()
        governorate = (order_data.get("governorate") or "").strip()
        shipping_amount = order_data.get("shippingAmount") or 0.0

        # Construct granular full shipping address
        address_parts = [p for p in [address, city, governorate] if p]
        full_shipping_address = " - ".join(address_parts) if address_parts else None

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
                name_parts = (customer_name or "").strip().split(" ", 1)
                first_name = name_parts[0] if name_parts[0] else "عميل"
                last_name = name_parts[1] if len(name_parts) > 1 else ""
                try:
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
                except Exception:
                    cust_retry = await self._session.execute(text("""
                        SELECT id FROM customers
                        WHERE "companyId" = :cid AND phone = :phone
                        LIMIT 1
                    """), {"cid": company_id, "phone": customer_phone})
                    matched = cust_retry.first()
                    if matched:
                        customer_id = matched.id

        await self._session.execute(text("""
            INSERT INTO orders (id, "orderNumber", "customerId", "customerName", "customerPhone",
                               "shippingAddress", "customerAddress", city, governorate, shipping,
                               total, subtotal, status, "paymentStatus",
                               notes, "companyId", "createdAt", "updatedAt")
            VALUES (:id, :onum, :cust_id, :cname, :cphone,
                    :saddr, :caddr, :city, :gov, :shipping,
                    :total, :subtotal, 'PENDING', 'PENDING',
                    :notes, :cid, NOW(), NOW())
        """), {
            "id": order_id,
            "onum": str(next_num),
            "cust_id": customer_id,
            "cname": customer_name,
            "cphone": customer_phone,
            "saddr": full_shipping_address,
            "caddr": full_shipping_address,
            "city": city or None,
            "gov": governorate or None,
            "shipping": shipping_amount,
            "total": total,
            "subtotal": total,
            "notes": order_data.get("notes") or "",
            "cid": company_id,
        })

        product_id = order_data.get("productId") or None
        variant_id = order_data.get("variantId") or None
        product_color = order_data.get("productColor") or None
        product_size = str(order_data.get("productSize")) if order_data.get("productSize") is not None else None
        product_sku = order_data.get("productSku") or order_data.get("sku") or None

        if not product_id and product_name:
            prod_row = await self._session.execute(text("""
                SELECT id, sku FROM products
                WHERE "companyId" = :cid AND (name ILIKE :pname OR sku ILIKE :pname)
                AND "deletedAt" IS NULL
                LIMIT 1
            """), {"cid": company_id, "pname": product_name.strip()})
            prod = prod_row.first()
            if prod:
                product_id = prod.id
                if not product_sku:
                    product_sku = prod.sku

        # Fallback extract color or size from product_name if missing
        if (not product_color or not product_size) and product_name:
            import re
            if not product_size:
                size_match = re.search(r'(\d{2,3}(?:\.\d+)?|\b(?:xxs|xs|s|m|l|xl|xxl|xxxl|[2-5]xl)\b)', product_name, re.IGNORECASE)
                if size_match:
                    product_size = size_match.group(1)
            if not product_color:
                colors_ar = ['أسود', 'أبيض', 'أحمر', 'أزرق', 'أخضر', 'أصفر', 'بني', 'رمادي', 'وردي', 'بنفسجي', 'بيج', 'كحلي', 'سماوي', 'برتقالي', 'فضي', 'ذهبي', 'نيلي']
                for c in colors_ar:
                    if c in product_name:
                        product_color = c
                        break

        item_id = str(uuid.uuid4())
        await self._session.execute(text("""
            INSERT INTO order_items (id, "orderId", "productId", "variantId", "productName", "productColor", "productSize", "productSku", quantity, price, total)
            VALUES (:id, :oid, :pid, :vid, :pname, :pcolor, :psize, :sku, :qty, :price, :total)
        """), {
            "id": item_id,
            "oid": order_id,
            "pid": product_id,
            "vid": variant_id,
            "pname": product_name,
            "pcolor": product_color,
            "psize": product_size,
            "sku": product_sku,
            "qty": qty,
            "price": order_data.get("productPrice") or 0,
            "total": total,
        })
        await self._session.commit()

        return {
            "orderNumber": str(next_num),
            "status": "PENDING",
            "customerName": order_data.get("customerName", ""),
            "productName": product_name,
            "productColor": product_color,
            "productSize": product_size,
            "shippingAddress": full_shipping_address,
            "shippingAmount": shipping_amount,
            "total": total,
        }

    async def get_pending_count(self, company_id: str) -> int:
        row = await self._session.execute(text("""
            SELECT COUNT(*)::int AS cnt
            FROM orders
            WHERE "companyId" = :cid AND status = 'PENDING'
        """), {"cid": company_id})
        first = row.first()
        return first.cnt if first else 0
