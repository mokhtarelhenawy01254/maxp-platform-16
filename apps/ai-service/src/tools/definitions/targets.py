from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

import src.db.session as _db_mod
from src.tools.definitions._helpers import _executed_result
from src.tools.repositories.target_repository import TargetRepository


class OrderTargetSettingsInput(BaseModel):
    action: str = Field(default="get", description="Action to perform: 'get' to read targets, 'set' to update targets")
    daily_orders: int | None = Field(default=None, description="Daily orders target (e.g. 50)")
    weekly_orders: int | None = Field(default=None, description="Weekly orders target (e.g. 300)")
    daily_revenue: float | None = Field(default=None, description="Daily revenue target in EGP (e.g. 25000.0)")
    weekly_revenue: float | None = Field(default=None, description="Weekly revenue target in EGP (e.g. 150000.0)")
    min_stock_threshold: int | None = Field(default=None, description="Alert threshold for low stock (default 5)")
    alert_phone: str | None = Field(default=None, description="Phone number to receive target and stock alerts via WhatsApp")
    notify_whatsapp: bool | None = Field(default=None, description="Enable or disable WhatsApp alert notifications")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class OrderTargetProgressInput(BaseModel):
    period: str = Field(default="today", description="Evaluation period: 'today', 'yesterday', 'week', 'month'")
    custom_target_orders: int | None = Field(default=None, description="Optional custom orders target to evaluate against instead of stored target")
    custom_target_revenue: float | None = Field(default=None, description="Optional custom revenue target to evaluate against")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def order_target_settings(input_data: OrderTargetSettingsInput) -> dict[str, Any]:
    """Retrieve or configure store daily and weekly order/revenue targets."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "Missing company_id"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = TargetRepository(sess)
        if input_data.action.lower() == "set":
            updates = {
                "daily_orders": input_data.daily_orders,
                "weekly_orders": input_data.weekly_orders,
                "daily_revenue": input_data.daily_revenue,
                "weekly_revenue": input_data.weekly_revenue,
                "min_stock_threshold": input_data.min_stock_threshold,
                "alert_phone": input_data.alert_phone,
                "notify_whatsapp": input_data.notify_whatsapp,
            }
            # filter out None
            filtered_updates = {k: v for k, v in updates.items() if v is not None}
            res = await repo.set_targets(company_id, filtered_updates)
            return _executed_result("TARGETS_UPDATED", res)
        else:
            targets = await repo.get_targets(company_id)
            return {"success": True, "targets": targets}


async def order_target_progress(input_data: OrderTargetProgressInput) -> dict[str, Any]:
    """Calculate live progress against daily or weekly targets, measuring pacing velocity and milestone achievements."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "Missing company_id"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = TargetRepository(sess)
        return await repo.get_target_progress(
            company_id=company_id,
            period=input_data.period,
            custom_target_orders=input_data.custom_target_orders,
            custom_target_revenue=input_data.custom_target_revenue,
        )


def _format_target_progress(result: dict) -> str:
    target_data = result.get("target", {})
    actual_data = result.get("actual", {})
    progress_data = result.get("progress", {})
    pacing_data = result.get("pacing", {})

    target_orders = target_data.get("targetOrders", 0)
    actual_orders = actual_data.get("ordersCount", 0)
    pct = progress_data.get("ordersAchievementPercentage", 0.0)
    status_label = pacing_data.get("label", "")

    if target_orders > 0:
        return f"تحقق {actual_orders} من {target_orders} أوردر ({pct}%) — الحالة: {status_label}"
    return f"إجمالي أوردرات الفترة: {actual_orders} أوردر (لم يُحدد تارجت رقمي)."


order_target_settings_tool = FunctionTool(
    name="order_target_settings",
    description="Retrieve or configure store daily and weekly order targets, revenue targets, and alert settings.",
    func=order_target_settings,
    input_model=OrderTargetSettingsInput,
)

order_target_progress_tool = FunctionTool(
    name="order_target_progress",
    description="Check real-time order and revenue progress against daily/weekly targets with pacing velocity and milestone triggers (50%, 80%, 100%, 120%).",
    func=order_target_progress,
    input_model=OrderTargetProgressInput,
    format_result=_format_target_progress,
)

__all_tools__ = [
    order_target_settings_tool,
    order_target_progress_tool,
]
