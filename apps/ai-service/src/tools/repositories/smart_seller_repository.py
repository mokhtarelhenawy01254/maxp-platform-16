from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.tools.repositories.base import BaseRepository
from src.tools.definitions._helpers import period_start_date


class SmartSellerRepository(BaseRepository):
    """Data access for smart seller analytics: lead scoring, cart abandonment, pipeline."""

    # ── Lead scoring ────────────────────────────────────────────────────

    async def score_leads(
        self, company_id: str, limit: int = 10, period: str = "month"
    ) -> list[dict[str, Any]]:
        """Score customers by purchase probability based on recent activity."""
        start = period_start_date(period)

        sql = text("""
            SELECT
                c.id,
                c."firstName",
                c."lastName",
                c.phone,
                c.email,
                c."totalOrdersCount",
                c."customerRating",
                c."successScore",
                COUNT(o.id)::int AS recent_orders,
                COALESCE(SUM(o.total), 0) AS recent_spent,
                MAX(o."createdAt") AS last_order_date,
                c."createdAt" AS join_date
            FROM customers c
            LEFT JOIN orders o ON o."customerId" = c.id
                AND o."createdAt" >= :start
                AND o.status != 'CANCELLED'
            WHERE c."companyId" = :cid
            GROUP BY c.id, c."firstName", c."lastName", c.phone, c.email,
                     c."totalOrdersCount", c."customerRating", c."successScore", c."createdAt"
            ORDER BY
                COALESCE(SUM(o.total), 0) DESC,
                c."successScore" DESC NULLS LAST,
                COUNT(o.id) DESC
            LIMIT :lim
        """)
        rows = await self._session.execute(
            sql, {"cid": company_id, "start": start, "lim": limit}
        )

        results = []
        for i, r in enumerate(rows):
            recency_days = 999
            if r.last_order_date:
                delta = datetime.utcnow() - r.last_order_date
                recency_days = delta.days if delta.days >= 0 else 0

            # Lead score: weighted combination of recency, frequency, monetary
            frequency_score = min((r.recent_orders or 0) / 5.0, 1.0) * 30
            monetary_score = min(float(r.recent_spent or 0) / 1000.0, 1.0) * 40
            recency_score = max(0, 1.0 - recency_days / 90.0) * 30
            total_score = round(frequency_score + monetary_score + recency_score, 1)

            results.append({
                "rank": i + 1,
                "customerId": str(r.id),
                "name": f"{(r.firstName or '')} {(r.lastName or '')}".strip(),
                "phone": r.phone,
                "email": r.email,
                "recentOrders": r.recent_orders,
                "recentSpent": str(r.recent_spent or 0),
                "lastOrderDate": str(r.last_order_date or ""),
                "leadScore": total_score,
                "tier": _score_tier(total_score),
            })
        return results

    # ── Abandoned carts ─────────────────────────────────────────────────

    async def get_abandoned_carts(
        self, company_id: str, hours: int = 24, limit: int = 10
    ) -> list[dict[str, Any]]:
        """Find customers who added items to cart but did not complete the order."""
        cutoff = datetime.utcnow() - timedelta(hours=hours)

        sql = text("""
            SELECT
                c.id AS customer_id,
                c."firstName",
                c."lastName",
                c.phone,
                c.email,
                COUNT(o.id)::int AS draft_count,
                MAX(o."createdAt") AS last_draft_date,
                COALESCE(SUM(o.total), 0) AS total_draft_value
            FROM customers c
            JOIN orders o ON o."customerId" = c.id
                AND o."createdAt" >= :cutoff
                AND o.status IN ('PENDING', 'DRAFT')
            WHERE c."companyId" = :cid
            GROUP BY c.id, c."firstName", c."lastName", c.phone, c.email
            ORDER BY total_draft_value DESC
            LIMIT :lim
        """)
        rows = await self._session.execute(
            sql, {"cid": company_id, "cutoff": cutoff, "lim": limit}
        )

        results = []
        for i, r in enumerate(rows):
            hours_since = 999
            if r.last_draft_date:
                delta = datetime.utcnow() - r.last_draft_date
                hours_since = round(delta.total_seconds() / 3600, 1)

            results.append({
                "rank": i + 1,
                "customerId": str(r.customer_id),
                "name": f"{(r.firstName or '')} {(r.lastName or '')}".strip(),
                "phone": r.phone,
                "email": r.email,
                "draftCount": r.draft_count,
                "totalDraftValue": str(r.total_draft_value),
                "hoursSinceLastDraft": hours_since,
                "recoveryPotential": _recovery_tier(hours_since, float(r.total_draft_value or 0)),
            })
        return results

    # ── Pipeline overview ───────────────────────────────────────────────

    async def get_pipeline_overview(self, company_id: str) -> dict[str, Any]:
        """Get sales pipeline breakdown by order status."""
        today_start = period_start_date("today")
        week_start = period_start_date("week")
        month_start = period_start_date("month")

        # Current pipeline by status
        pipeline_sql = text("""
            SELECT status, COUNT(*)::int AS cnt, COALESCE(SUM(total), 0) AS total_value
            FROM orders
            WHERE "companyId" = :cid AND status NOT IN ('CANCELLED', 'DELIVERED')
            GROUP BY status
        """)
        pipeline_rows = await self._session.execute(
            pipeline_sql, {"cid": company_id}
        )
        pipeline = {}
        pipeline_total_value = 0
        for r in pipeline_rows:
            status = r.status.lower() if r.status else "unknown"
            pipeline[status] = {"count": r.cnt, "value": str(r.total_value)}
            pipeline_total_value += float(r.total_value or 0)

        # Revenue trends
        today_sql = text("""
            SELECT COALESCE(SUM(total), 0) AS revenue,
                   COUNT(*)::int AS orders
            FROM orders
            WHERE "companyId" = :cid
              AND "createdAt" >= :start
              AND status NOT IN ('CANCELLED')
        """)
        today_row = await self._session.execute(
            today_sql, {"cid": company_id, "start": today_start}
        )
        today = today_row.first()

        week_row = await self._session.execute(
            today_sql, {"cid": company_id, "start": week_start}
        )
        week = week_row.first()

        month_row = await self._session.execute(
            today_sql, {"cid": company_id, "start": month_start}
        )
        month = month_row.first()

        return {
            "pipeline": pipeline,
            "pipelineTotalValue": str(round(pipeline_total_value, 2)),
            "todayRevenue": str(today.revenue if today else 0),
            "todayOrders": today.orders if today else 0,
            "weekRevenue": str(week.revenue if week else 0),
            "weekOrders": week.orders if week else 0,
            "monthRevenue": str(month.revenue if month else 0),
            "monthOrders": month.orders if month else 0,
        }

    # ── Follow-up suggestions ────────────────────────────────────────────

    async def get_followup_suggestions(
        self, company_id: str, limit: int = 5
    ) -> list[dict[str, Any]]:
        """Suggest customers who need follow-up based on inactivity or draft orders."""
        cutoff = datetime.utcnow() - timedelta(days=3)

        sql = text("""
            SELECT
                c.id,
                c."firstName",
                c."lastName",
                c.phone,
                c.email,
                c."totalOrdersCount",
                c."customerRating",
                c."successScore",
                MAX(o."createdAt") AS last_order_date,
                COUNT(o.id)::int AS total_orders
            FROM customers c
            LEFT JOIN orders o ON o."customerId" = c.id
                AND o.status NOT IN ('CANCELLED')
            WHERE c."companyId" = :cid
              AND (c."totalOrdersCount" > 0 OR c."successScore" > 0.5)
            GROUP BY c.id, c."firstName", c."lastName", c.phone, c.email,
                     c."totalOrdersCount", c."customerRating", c."successScore"
            ORDER BY
                CASE
                    WHEN MAX(o."createdAt") IS NULL THEN 0
                    WHEN MAX(o."createdAt") < :cutoff THEN EXTRACT(EPOCH FROM (:now - MAX(o."createdAt"))) / 86400
                    ELSE 0
                END DESC,
                c."successScore" DESC NULLS LAST
            LIMIT :lim
        """)
        rows = await self._session.execute(
            sql, {"cid": company_id, "cutoff": cutoff, "lim": limit, "now": datetime.utcnow()}
        )

        results = []
        for i, r in enumerate(rows):
            days_since_last = None
            if r.last_order_date:
                delta = datetime.utcnow() - r.last_order_date
                days_since_last = delta.days

            reason = "new_lead"
            if days_since_last is None:
                reason = "no_purchase_yet"
            elif days_since_last > 7:
                reason = "inactive_over_week"
            elif days_since_last > 3:
                reason = "inactive_3_days"

            results.append({
                "rank": i + 1,
                "customerId": str(r.id),
                "name": f"{(r.firstName or '')} {(r.lastName or '')}".strip(),
                "phone": r.phone,
                "email": r.email,
                "totalOrders": r.total_orders or 0,
                "lastOrderDate": str(r.last_order_date or ""),
                "daysSinceLastOrder": days_since_last,
                "suggestedAction": _followup_action(reason, r.total_orders or 0),
                "reason": reason,
            })
        return results

    # ── Deal negotiation parameters ──────────────────────────────────────

    async def get_deal_params(
        self, company_id: str, product_id: str | None = None
    ) -> dict[str, Any]:
        """Get negotiation parameters: margin, discount history, price elasticity."""
        product_filter = 'AND oi."productId" = :pid' if product_id else ''
        params: dict[str, Any] = {"cid": company_id}
        if product_id:
            params["pid"] = product_id

        # Average discount used
        discount_sql = text(f"""
            SELECT
                COALESCE(AVG(
                    CASE
                        WHEN oi.price > 0 AND oi.quantity > 0
                        THEN (1.0 - (oi.total / (oi.price * oi.quantity))) * 100
                        ELSE 0
                    END
                ), 0) AS avg_discount_pct,
                COUNT(*)::int AS total_items
            FROM order_items oi
            JOIN orders o ON o.id = oi."orderId"
            WHERE o."companyId" = :cid
              AND o.status NOT IN ('CANCELLED')
              AND o."createdAt" >= NOW() - INTERVAL '30 days'
              {product_filter}
        """)
        d_row = await self._session.execute(discount_sql, params)
        discount = d_row.first()

        # Average order value
        aov_sql = text(f"""
            SELECT
                COALESCE(AVG(total), 0) AS avg_order_value,
                COALESCE(MIN(total), 0) AS min_order,
                COALESCE(MAX(total), 0) AS max_order,
                COUNT(*)::int AS order_count
            FROM orders
            WHERE "companyId" = :cid
              AND status NOT IN ('CANCELLED')
              AND "createdAt" >= NOW() - INTERVAL '30 days'
        """)
        aov_row = await self._session.execute(aov_sql, {"cid": company_id})
        aov = aov_row.first()

        avg_discount = float(discount.avg_discount_pct or 0) if discount else 0
        avg_order_value = float(aov.avg_order_value or 0) if aov else 0

        return {
            "productId": product_id,
            "avgDiscountPct": round(avg_discount, 1),
            "suggestedMaxDiscount": round(min(avg_discount * 1.5, 30), 1),
            "avgOrderValue": str(round(avg_order_value, 2)),
            "minOrder": str(aov.min_order or 0) if aov else "0",
            "maxOrder": str(aov.max_order or 0) if aov else "0",
            "orderCountLast30Days": discount.total_items if discount else 0,
            "negotiationTip": _negotiation_tip(avg_discount, avg_order_value),
        }


def _score_tier(score: float) -> str:
    if score >= 70:
        return "hot"
    if score >= 40:
        return "warm"
    return "cold"


def _recovery_tier(hours: float, value: float) -> str:
    if hours <= 2 and value > 200:
        return "high"
    if hours <= 6:
        return "medium"
    return "low"


def _followup_action(reason: str, total_orders: int) -> str:
    if reason == "no_purchase_yet":
        return "send_welcome_offer"
    if reason == "inactive_over_week":
        return "send_reengagement_message"
    if reason == "inactive_3_days":
        return "send_cart_reminder" if total_orders > 2 else "send_personal_offer"
    return "check_satisfaction"
