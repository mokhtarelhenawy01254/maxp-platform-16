from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text

from src.tools.definitions._helpers import period_date_range
from src.tools.repositories.base import BaseRepository


class TargetRepository(BaseRepository):
    """Repository for managing merchant sales & order targets and calculating progress."""

    async def get_targets(self, company_id: str) -> dict[str, Any]:
        """Retrieve stored targets for a company from company settings."""
        if not company_id:
            return self._default_targets()

        row = await self._session.execute(
            text('SELECT settings FROM public.companies WHERE id = :cid LIMIT 1'),
            {"cid": company_id},
        )
        first = row.first()
        if not first or not first[0]:
            return self._default_targets()

        raw_settings = first[0]
        try:
            settings_dict = json.loads(raw_settings) if isinstance(raw_settings, str) else (raw_settings or {})
        except Exception:
            settings_dict = {}

        stored = settings_dict.get("order_targets", {})
        return {
            "daily_orders": int(stored.get("daily_orders", 0) or 0),
            "weekly_orders": int(stored.get("weekly_orders", 0) or 0),
            "daily_revenue": float(stored.get("daily_revenue", 0.0) or 0.0),
            "weekly_revenue": float(stored.get("weekly_revenue", 0.0) or 0.0),
            "min_stock_threshold": int(stored.get("min_stock_threshold", 5) or 5),
            "alert_phone": stored.get("alert_phone"),
            "notify_whatsapp": bool(stored.get("notify_whatsapp", True)),
            "updated_at": stored.get("updated_at"),
        }

    async def set_targets(self, company_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        """Persist updated targets into company settings."""
        if not company_id:
            return {"success": False, "error": "Missing company_id"}

        row = await self._session.execute(
            text('SELECT settings FROM public.companies WHERE id = :cid LIMIT 1'),
            {"cid": company_id},
        )
        first = row.first()
        raw_settings = first[0] if first else None

        try:
            settings_dict = json.loads(raw_settings) if isinstance(raw_settings, str) else (raw_settings or {})
        except Exception:
            settings_dict = {}

        targets = settings_dict.get("order_targets", {})
        for k, v in updates.items():
            if v is not None:
                targets[k] = v

        targets["updated_at"] = datetime.now(timezone.utc).isoformat()
        settings_dict["order_targets"] = targets

        new_settings_str = json.dumps(settings_dict, ensure_ascii=False)
        await self._session.execute(
            text('UPDATE public.companies SET settings = :settings, "updatedAt" = NOW() WHERE id = :cid'),
            {"settings": new_settings_str, "cid": company_id},
        )
        await self._session.commit()

        return {"success": True, "targets": targets}

    async def get_target_progress(
        self,
        company_id: str,
        period: str = "today",
        custom_target_orders: int | None = None,
        custom_target_revenue: float | None = None,
    ) -> dict[str, Any]:
        """Calculate real-time progress against daily/weekly targets with pacing velocity."""
        targets = await self.get_targets(company_id)
        norm_period = (period or "today").lower().strip()

        # Determine target orders & revenue
        if norm_period in ("today", "yesterday"):
            target_orders = custom_target_orders if custom_target_orders is not None else targets.get("daily_orders", 0)
            target_revenue = custom_target_revenue if custom_target_revenue is not None else targets.get("daily_revenue", 0.0)
        elif norm_period == "week":
            target_orders = custom_target_orders if custom_target_orders is not None else targets.get("weekly_orders", 0)
            target_revenue = custom_target_revenue if custom_target_revenue is not None else targets.get("weekly_revenue", 0.0)
        else:
            target_orders = custom_target_orders or 0
            target_revenue = custom_target_revenue or 0.0

        start_date, end_date = period_date_range(norm_period)
        where_clauses = ['"companyId" = :cid', '"createdAt" >= :start', 'status != \'CANCELLED\'']
        params: dict[str, Any] = {"cid": company_id, "start": start_date}
        if end_date:
            where_clauses.append('"createdAt" < :end')
            params["end"] = end_date
        where_sql = " AND ".join(where_clauses)

        sql = text(f"""
            SELECT
              COUNT(*)::int AS actual_orders,
              COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS confirmed_orders,
              COUNT(*) FILTER (WHERE status = 'SHIPPED')::int AS shipped_orders,
              COUNT(*) FILTER (WHERE status = 'DELIVERED')::int AS delivered_orders,
              COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_orders,
              COALESCE(SUM(total), 0) AS total_order_value,
              COALESCE(SUM(total) FILTER (WHERE status = 'DELIVERED' OR "paymentStatus" = 'COMPLETED'), 0) AS paid_revenue
            FROM orders
            WHERE {where_sql}
        """)

        res = await self._session.execute(sql, params)
        row = res.first()
        stats = dict(row._mapping) if row else {}

        actual_orders = stats.get("actual_orders", 0)
        total_order_value = float(stats.get("total_order_value", 0.0) or 0.0)
        paid_revenue = float(stats.get("paid_revenue", 0.0) or 0.0)

        # Achievement metrics
        achievement_orders_pct = round((actual_orders / target_orders * 100), 1) if target_orders > 0 else 0.0
        remaining_orders = max(0, target_orders - actual_orders) if target_orders > 0 else 0

        achievement_rev_pct = round((total_order_value / target_revenue * 100), 1) if target_revenue > 0 else 0.0
        remaining_revenue = max(0.0, target_revenue - total_order_value) if target_revenue > 0 else 0.0

        # Pacing calculation
        now = datetime.now(timezone.utc)
        if norm_period == "today":
            time_elapsed_ratio = min(1.0, max(0.05, now.hour / 24.0))
        elif norm_period == "week":
            # Monday=0, Sunday=6
            day_of_week = now.weekday()
            time_elapsed_ratio = min(1.0, max(0.1, (day_of_week + (now.hour / 24.0)) / 7.0))
        else:
            time_elapsed_ratio = 1.0

        expected_orders_now = round(target_orders * time_elapsed_ratio) if target_orders > 0 else 0

        # Pacing status evaluation
        if target_orders > 0:
            if actual_orders >= target_orders * 1.15:
                pacing_status = "OVERACHIEVED"
                pacing_label = "تجاوز الهدف بنجاح باهر"
            elif actual_orders >= target_orders:
                pacing_status = "GOAL_REACHED"
                pacing_label = "تم تحقيق الهدف بنسبة 100%"
            elif actual_orders >= expected_orders_now * 1.1:
                pacing_status = "AHEAD"
                pacing_label = "متقدم عن الجدول الزمني"
            elif actual_orders >= expected_orders_now * 0.85:
                pacing_status = "ON_TRACK"
                pacing_label = "في المسار الزمني الصحيح"
            else:
                pacing_status = "BEHIND"
                pacing_label = "متأخر عن المسار المطلوب"
        else:
            pacing_status = "NO_TARGET_SET"
            pacing_label = "لم يتم تحديد هدف بعد"

        # Milestones determination
        milestones = []
        if achievement_orders_pct >= 50.0:
            milestones.append("50%")
        if achievement_orders_pct >= 80.0:
            milestones.append("80%")
        if achievement_orders_pct >= 100.0:
            milestones.append("100%")
        if achievement_orders_pct >= 120.0:
            milestones.append("120%")

        return {
            "period": norm_period,
            "target": {
                "targetOrders": target_orders,
                "targetRevenue": target_revenue,
            },
            "actual": {
                "ordersCount": actual_orders,
                "totalOrderValue": round(total_order_value, 2),
                "paidRevenue": round(paid_revenue, 2),
                "confirmedOrders": stats.get("confirmed_orders", 0),
                "shippedOrders": stats.get("shipped_orders", 0),
                "deliveredOrders": stats.get("delivered_orders", 0),
                "pendingOrders": stats.get("pending_orders", 0),
            },
            "progress": {
                "ordersAchievementPercentage": achievement_orders_pct,
                "revenueAchievementPercentage": achievement_rev_pct,
                "remainingOrders": remaining_orders,
                "remainingRevenue": round(remaining_revenue, 2),
            },
            "pacing": {
                "status": pacing_status,
                "label": pacing_label,
                "timeElapsedPercentage": round(time_elapsed_ratio * 100, 1),
                "expectedOrdersAtThisHour": expected_orders_now,
            },
            "milestonesReached": milestones,
        }

    def _default_targets(self) -> dict[str, Any]:
        return {
            "daily_orders": 0,
            "weekly_orders": 0,
            "daily_revenue": 0.0,
            "weekly_revenue": 0.0,
            "min_stock_threshold": 5,
            "alert_phone": None,
            "notify_whatsapp": True,
            "updated_at": None,
        }
