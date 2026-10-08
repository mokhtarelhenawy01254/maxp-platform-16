from __future__ import annotations

from typing import Any

from sqlalchemy import text

from src.tools.repositories.base import BaseRepository
from src.tools.definitions._helpers import period_date_range, period_start_date


import json

CARRIER_LABELS: dict[str, str] = {
    "QP_EXPRESS": "كيو بي إكسبريس (QP Express)",
    "QPEXPRESS": "كيو بي إكسبريس (QP Express)",
    "TURBO": "تربو للشحن (Turbo)",
    "BOSTA": "بوستا (Bosta)",
    "BOSTA_DEMO": "بوستا (Bosta)",
    "MYLERZ": "مايلرز (Mylerz)",
    "MYLERZ_DEMO": "مايلرز (Mylerz)",
    "ARAMEX": "أرامكس (Aramex)",
    "ARAMEX_DEMO": "أرامكس (Aramex)",
    "MANUAL": "توصيل داخلي / مندوب خاص",
}


def _carrier_display_name(
    carrier_code: str | None,
    company_name: str | None = None,
    courier_name: str | None = None,
) -> str:
    if company_name and str(company_name).strip():
        clean_name = str(company_name).strip()
        if clean_name.upper() in CARRIER_LABELS:
            return CARRIER_LABELS[clean_name.upper()]
        return clean_name
    code = str(carrier_code or "").strip().upper()
    if code == "MANUAL" and courier_name:
        return f"مندوب توصيل ({courier_name})"
    if code in CARRIER_LABELS:
        return CARRIER_LABELS[code]
    return code or ""


def _parse_json_safe(raw: Any) -> dict[str, Any]:
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _extract_shipping_info(
    order_row: dict[str, Any],
    shipments_rows: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Resolve canonical shipping company, tracking number, and shipment details from all sources."""
    meta = _parse_json_safe(order_row.get("metadata"))
    qp_meta = meta.get("qpExpress") if isinstance(meta.get("qpExpress"), dict) else {}
    qp_raw = qp_meta.get("raw") if isinstance(qp_meta.get("raw"), dict) else {}

    shipments_list: list[dict[str, Any]] = []
    seen_Input_keys: set[str] = set()

    for s in shipments_rows or []:
        c_type = str(s.get("carrierType") or s.get("providerKey") or "").strip().upper()
        c_name = _carrier_display_name(
            c_type,
            s.get("shippingCompanyName"),
            s.get("courierName"),
        )
        t_num = str(s.get("trackingNumber") or s.get("externalShipmentId") or "").strip()
        s_status = str(s.get("shipmentStatus") or s.get("status") or "").strip()
        s_date = str(s.get("shippedAt") or s.get("createdAt") or "").strip()
        key = f"{c_type}:{t_num}"
        seen_Input_keys.add(key)
        shipments_list.append({
            "shipmentId": str(s.get("id") or ""),
            "shippingCompany": c_name,
            "carrierCode": c_type,
            "trackingNumber": t_num,
            "status": s_status,
            "shippedAt": s_date,
            "courierName": str(s.get("courierName") or ""),
            "courierPhone": str(s.get("courierPhone") or ""),
            "cost": str(s.get("cost") or "") if s.get("cost") is not None else "",
        })

    # Check inline scalar subquery fields from get_recent_orders / get_orders_by_phone
    inline_carrier = str(order_row.get("shipmentCarrierType") or "").strip().upper()
    inline_company = str(order_row.get("shipmentCompanyName") or "").strip()
    inline_tracking = str(order_row.get("shipmentTrackingNumber") or "").strip()
    inline_status = str(order_row.get("shipmentStatus") or "").strip()
    inline_shipped_at = str(order_row.get("shipmentCreatedAt") or "").strip()
    if (inline_carrier or inline_company or inline_tracking) and f"{inline_carrier}:{inline_tracking}" not in seen_Input_keys:
        seen_Input_keys.add(f"{inline_carrier}:{inline_tracking}")
        shipments_list.append({
            "shipmentId": "",
            "shippingCompany": _carrier_display_name(inline_carrier, inline_company),
            "carrierCode": inline_carrier,
            "trackingNumber": inline_tracking,
            "status": inline_status,
            "shippedAt": inline_shipped_at,
            "courierName": "",
            "courierPhone": "",
            "cost": "",
        })

    # Check metadata (e.g. QP_EXPRESS / BOSTA stored in orders.metadata)
    meta_carrier = str(meta.get("shippingCarrier") or ("QP_EXPRESS" if qp_meta else "")).strip().upper()
    meta_tracking = str(
        meta.get("trackingNumber")
        or qp_meta.get("trackingNumber")
        or qp_meta.get("orderSerial")
        or qp_meta.get("serial")
        or ""
    ).strip()
    meta_shipped_at = str(qp_raw.get("order_date") or "").strip()
    if (meta_carrier or meta_tracking) and f"{meta_carrier}:{meta_tracking}" not in seen_Input_keys:
        seen_Input_keys.add(f"{meta_carrier}:{meta_tracking}")
        shipments_list.append({
            "shipmentId": str(qp_meta.get("serial") or ""),
            "shippingCompany": _carrier_display_name(meta_carrier),
            "carrierCode": meta_carrier,
            "trackingNumber": meta_tracking,
            "status": str(qp_meta.get("orderDeliveryStatus") or order_row.get("status") or ""),
            "shippedAt": meta_shipped_at,
            "courierName": "",
            "courierPhone": "",
            "cost": str(qp_meta.get("totalFees") or ""),
        })

    # Check Turbo columns on order
    turbo_tracking = str(order_row.get("turboTrackingNumber") or order_row.get("turboShipmentId") or "").strip()
    turbo_status = str(order_row.get("turboShipmentStatus") or "").strip()
    if turbo_tracking and f"TURBO:{turbo_tracking}" not in seen_Input_keys:
        seen_Input_keys.add(f"TURBO:{turbo_tracking}")
        shipments_list.append({
            "shipmentId": str(order_row.get("turboShipmentId") or ""),
            "shippingCompany": _carrier_display_name("TURBO"),
            "carrierCode": "TURBO",
            "trackingNumber": turbo_tracking,
            "status": turbo_status or str(order_row.get("status") or ""),
            "shippedAt": "",
            "courierName": str(order_row.get("turboCaptainName") or ""),
            "courierPhone": str(order_row.get("turboCaptainPhone") or ""),
            "cost": "",
        })

    primary = shipments_list[0] if shipments_list else {}
    shipping_company = primary.get("shippingCompany") or ""
    shipping_carrier = primary.get("carrierCode") or ""
    tracking_number = primary.get("trackingNumber") or ""
    shipment_status = primary.get("status") or turbo_status or ""
    shipped_at = primary.get("shippedAt") or meta_shipped_at or ""
    captain_name = str(order_row.get("turboCaptainName") or primary.get("courierName") or "").strip()
    captain_phone = str(order_row.get("turboCaptainPhone") or primary.get("courierPhone") or "").strip()
    branch_name = str(order_row.get("turboBranchName") or order_row.get("turboExpectedBranch") or "").strip()
    branch_phone = str(order_row.get("turboBranchPhone") or "").strip()
    delay_reason = str(order_row.get("turboDelayReason") or "").strip()
    return_reason = str(order_row.get("turboReturnReason") or "").strip()

    return {
        "shippingCompany": shipping_company,
        "shippingCarrier": shipping_carrier,
        "trackingNumber": tracking_number,
        "shipmentStatus": shipment_status,
        "shippedAt": shipped_at,
        "captainName": captain_name,
        "captainPhone": captain_phone,
        "branchName": branch_name,
        "branchPhone": branch_phone,
        "delayReason": delay_reason,
        "returnReason": return_reason,
        "shipments": shipments_list,
    }


class OrderRepository(BaseRepository):
    """Data access for orders, order items, and order statistics."""

    async def get_order(self, company_id: str, order_number: str) -> dict[str, Any] | None:
        clean_num = str(order_number or "").strip().lstrip("#").strip()
        if not clean_num:
            return None

        order_select_cols = """
            SELECT o.id, o."orderNumber", o.status, o."customStatusCode",
                   o."paymentStatus", o."paymentMethod",
                   o.total, o.subtotal, o.shipping, o.discount,
                   o."customerName", o."customerPhone", o."customerEmail",
                   o."createdAt", o."confirmedAt", o."updatedAt",
                   o."customerAddress", o."shippingAddress", o.city, o.governorate, o.notes,
                   o."customerId", o.metadata,
                   o."turboShipmentId", o."turboTrackingNumber", o."turboShipmentStatus",
                   o."turboCaptainName", o."turboCaptainPhone", o."turboBranchName",
                   o."turboBranchPhone", o."turboDelayReason", o."turboReturnReason",
                   o."turboExpectedBranch", o."turboLabelUrl"
            FROM orders o
        """

        # 1. Direct match by orderNumber or turboTrackingNumber
        sql = text(f"""
            {order_select_cols}
            WHERE o."companyId" = :cid
              AND (o."orderNumber" = :onum OR o."turboTrackingNumber" = :onum OR o."turboShipmentId" = :onum)
            LIMIT 1
        """)
        result = await self._session.execute(sql, {"cid": company_id, "onum": clean_num})
        row = result.first()

        # 2. Match via shipments table trackingNumber / externalShipmentId
        if not row:
            ship_lookup_sql = text(f"""
                {order_select_cols}
                JOIN shipments s ON s."orderId" = o.id
                WHERE o."companyId" = :cid
                  AND (s."trackingNumber" = :onum OR s."externalShipmentId" = :onum)
                ORDER BY s."createdAt" DESC
                LIMIT 1
            """)
            res2 = await self._session.execute(ship_lookup_sql, {"cid": company_id, "onum": clean_num})
            row = res2.first()

        # 3. Match via metadata trackingNumber
        if not row:
            meta_lookup_sql = text(f"""
                {order_select_cols}
                WHERE o."companyId" = :cid
                  AND o.metadata IS NOT NULL
                  AND o.metadata LIKE :meta_pat
                ORDER BY o."createdAt" DESC
                LIMIT 1
            """)
            res3 = await self._session.execute(
                meta_lookup_sql,
                {"cid": company_id, "meta_pat": f'%"{clean_num}"%'},
            )
            row = res3.first()

        if row:
            order_dict = dict(row._mapping)
            shipments_sql = text("""
                SELECT s.id, s."carrierType", s.status AS "shipmentStatus",
                       s."trackingNumber", s."externalShipmentId", s."labelUrl",
                       s.cost, s."deliveryNotes", s.metadata AS "shipmentMetadata",
                       s."createdAt" AS "shippedAt", s."updatedAt" AS "shipmentUpdatedAt",
                       sc.name AS "shippingCompanyName", sc."providerKey", sc.slug AS "shippingCompanySlug",
                       c.name AS "courierName", c.phone AS "courierPhone"
                FROM shipments s
                LEFT JOIN shipping_companies sc ON sc.id = s."shippingCompanyId"
                LEFT JOIN couriers c ON c.id = s."courierId"
                WHERE s."orderId" = :oid AND s."companyId" = :cid
                ORDER BY s."createdAt" DESC
            """)
            s_rows = await self._session.execute(shipments_sql, {"oid": order_dict["id"], "cid": company_id})
            shipments_list = [dict(r._mapping) for r in s_rows]
            order_dict.update(_extract_shipping_info(order_dict, shipments_list))
            return order_dict

        # 4. Fallback to guest_orders
        guest_sql = text("""
            SELECT g.id, g."orderNumber", g.status, 'PENDING' AS "paymentStatus",
                   g."paymentMethod", g.total, g."shippingCost" AS shipping,
                   g."discountAmount" AS discount,
                   g."guestName" AS "customerName", g."guestPhone" AS "customerPhone",
                   g."guestEmail" AS "customerEmail", g.items AS "guestItems",
                   g."createdAt", g."confirmationNotifiedAt" AS "confirmedAt", g."updatedAt",
                   g."shippingAddress" AS "customerAddress", g."shippingAddress",
                   '' AS city, '' AS governorate, g.notes, g.metadata,
                   g."turboShipmentId", g."turboTrackingNumber", g."turboShipmentStatus",
                   g."turboCaptainName", g."turboCaptainPhone", g."turboBranchName",
                   g."turboBranchPhone", g."turboDelayReason", g."turboReturnReason",
                   g."turboExpectedBranch", g."turboLabelUrl"
            FROM guest_orders g
            WHERE g."companyId" = :cid
              AND (g."orderNumber" = :onum OR g."turboTrackingNumber" = :onum OR g."turboShipmentId" = :onum)
            LIMIT 1
        """)
        g_res = await self._session.execute(guest_sql, {"cid": company_id, "onum": clean_num})
        g_row = g_res.first()
        if g_row:
            g_dict = dict(g_row._mapping)
            g_dict.update(_extract_shipping_info(g_dict, []))
            return g_dict

        return None

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
            SELECT o.id, o."orderNumber", o.status, o."customStatusCode", o."paymentStatus", o.total,
                   o."customerName", o."customerPhone", o."createdAt",
                   o."turboTrackingNumber", o."turboShipmentStatus", o.metadata,
                   (SELECT sc.name FROM shipments s LEFT JOIN shipping_companies sc ON sc.id = s."shippingCompanyId" WHERE s."orderId" = o.id ORDER BY s."createdAt" DESC LIMIT 1) AS "shipmentCompanyName",
                   (SELECT s."carrierType" FROM shipments s WHERE s."orderId" = o.id ORDER BY s."createdAt" DESC LIMIT 1) AS "shipmentCarrierType",
                   (SELECT s."trackingNumber" FROM shipments s WHERE s."orderId" = o.id ORDER BY s."createdAt" DESC LIMIT 1) AS "shipmentTrackingNumber",
                   (SELECT s.status FROM shipments s WHERE s."orderId" = o.id ORDER BY s."createdAt" DESC LIMIT 1) AS "shipmentStatus",
                   (SELECT s."createdAt" FROM shipments s WHERE s."orderId" = o.id ORDER BY s."createdAt" DESC LIMIT 1) AS "shipmentCreatedAt"
            FROM orders o
            WHERE o."companyId" = :cid
              AND ({phone_or})
              {status_where}
            ORDER BY o."createdAt" DESC
            LIMIT :lim
        """)
        rows = await self._session.execute(sql, params)
        regular = []
        for r in rows:
            d = dict(r._mapping)
            d.update(_extract_shipping_info(d))
            regular.append(d)

        guest_phone_or = " OR ".join([f'g."guestPhone" LIKE :g{i}' for i in range(len(patterns))])
        guest_params: dict[str, Any] = {"cid": company_id, "lim": max(1, min(limit, 50))}
        if status:
            guest_params["status"] = str(status).upper()
        for i, p in enumerate(patterns):
            guest_params[f"g{i}"] = p

        guest_sql = text(f"""
            SELECT g.id, g."orderNumber", g.status, g.total,
                   g."guestName" AS "customerName", g."guestPhone" AS "customerPhone",
                   g."createdAt", g."turboTrackingNumber", g."turboShipmentStatus", g.metadata
            FROM guest_orders g
            WHERE g."companyId" = :cid
              AND ({guest_phone_or})
              {guest_status_where}
            ORDER BY g."createdAt" DESC
            LIMIT :lim
        """)
        guest_rows = await self._session.execute(guest_sql, guest_params)
        guest = []
        for r in guest_rows:
            d = dict(r._mapping)
            d.update(_extract_shipping_info(d))
            guest.append(d)

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
            SELECT o.id, o."orderNumber", o."customerName", o."customerPhone",
                   o.status, o."customStatusCode", o."paymentStatus", o.total, o."createdAt" AS date,
                   o."confirmedAt", o.city, o.governorate,
                   o."turboTrackingNumber", o."turboShipmentStatus", o.metadata,
                   (SELECT sc.name FROM shipments s LEFT JOIN shipping_companies sc ON sc.id = s."shippingCompanyId" WHERE s."orderId" = o.id ORDER BY s."createdAt" DESC LIMIT 1) AS "shipmentCompanyName",
                   (SELECT s."carrierType" FROM shipments s WHERE s."orderId" = o.id ORDER BY s."createdAt" DESC LIMIT 1) AS "shipmentCarrierType",
                   (SELECT s."trackingNumber" FROM shipments s WHERE s."orderId" = o.id ORDER BY s."createdAt" DESC LIMIT 1) AS "shipmentTrackingNumber",
                   (SELECT s.status FROM shipments s WHERE s."orderId" = o.id ORDER BY s."createdAt" DESC LIMIT 1) AS "shipmentStatus",
                   (SELECT s."createdAt" FROM shipments s WHERE s."orderId" = o.id ORDER BY s."createdAt" DESC LIMIT 1) AS "shipmentCreatedAt"
            FROM orders o
            WHERE {where_orders}
            ORDER BY COALESCE(o."confirmedAt", o."createdAt") DESC
            LIMIT :lim
        """)
        rows = await self._session.execute(order_sql, params)
        regular = []
        for r in rows:
            row_dict = dict(r._mapping)
            ship_info = _extract_shipping_info(row_dict)
            regular.append({
                "orderNumber": r.orderNumber,
                "customerName": r.customerName or "",
                "phone": r.customerPhone or "",
                "status": r.status or "",
                "customStatusCode": getattr(r, "customStatusCode", "") or "",
                "paymentStatus": r.paymentStatus or "",
                "total": str(r.total or 0),
                "date": str(r.date or ""),
                "confirmedAt": str(r.confirmedAt or "") if getattr(r, "confirmedAt", None) else "",
                "city": r.city or "",
                "governorate": r.governorate or "",
                "shippingCompany": ship_info["shippingCompany"],
                "shippingCarrier": ship_info["shippingCarrier"],
                "trackingNumber": ship_info["trackingNumber"],
                "shipmentStatus": ship_info["shipmentStatus"],
            })

        where_guest = " AND ".join(guest_conditions)
        guest_sql = text(f"""
            SELECT g.id, g."orderNumber", g."guestName" AS "customerName", g."guestPhone" AS "customerPhone",
                   g.status, 'PENDING' AS "paymentStatus", g.total, g."createdAt" AS date,
                   g."confirmationNotifiedAt" AS "confirmedAt", '' AS city, '' AS governorate,
                   g."turboTrackingNumber", g."turboShipmentStatus", g.metadata
            FROM guest_orders g
            WHERE {where_guest}
            ORDER BY COALESCE(g."confirmationNotifiedAt", g."createdAt") DESC
            LIMIT :lim
        """)
        try:
            g_rows = await self._session.execute(guest_sql, params)
            guest = []
            for r in g_rows:
                row_dict = dict(r._mapping)
                ship_info = _extract_shipping_info(row_dict)
                guest.append({
                    "orderNumber": r.orderNumber,
                    "customerName": r.customerName or "",
                    "phone": r.customerPhone or "",
                    "status": r.status or "",
                    "customStatusCode": "",
                    "paymentStatus": r.paymentStatus or "",
                    "total": str(r.total or 0),
                    "date": str(r.date or ""),
                    "confirmedAt": str(r.confirmedAt or "") if getattr(r, "confirmedAt", None) else "",
                    "city": "",
                    "governorate": "",
                    "shippingCompany": ship_info["shippingCompany"],
                    "shippingCarrier": ship_info["shippingCarrier"],
                    "trackingNumber": ship_info["trackingNumber"],
                    "shipmentStatus": ship_info["shipmentStatus"],
                })
        except Exception:
            guest = []

        merged = regular + guest
        merged.sort(key=lambda o: o.get("confirmedAt") or o.get("date") or "", reverse=True)

        total_matching = len(merged)
        try:
            cnt_row = await self._session.execute(text(f"SELECT COUNT(*)::int AS cnt FROM orders o WHERE {where_orders}"), params)
            first_c = cnt_row.first()
            if first_c and first_c.cnt is not None:
                total_matching = int(first_c.cnt)
        except Exception:
            pass

        self.last_total_matching = total_matching
        return merged[:limit]

    async def get_recent_orders_with_count(
        self,
        company_id: str,
        limit: int = 25,
        status: str | None = None,
        period: str | None = None,
        date: str | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        orders = await self.get_recent_orders(
            company_id=company_id,
            limit=limit,
            status=status,
            period=period,
            date=date,
        )
        return orders, getattr(self, "last_total_matching", len(orders))

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
