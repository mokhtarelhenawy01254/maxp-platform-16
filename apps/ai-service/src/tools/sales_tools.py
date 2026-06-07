from __future__ import annotations

from typing import Any

import structlog

from src.tools.backend_client import get_backend_client

logger = structlog.get_logger(__name__)


async def sales_revenue(
    company_id: str, period: str = "month"
) -> dict[str, Any]:
    """Return revenue and sales metrics for a period."""
    client = get_backend_client()
    summary = await client.get_order_summary(company_id, period)

    return {
        "period": period,
        "revenue": summary.get("paidRevenue", "0"),
        "ordersCount": summary.get("paidOrdersCount", 0),
        "avgOrderValue": summary.get("avgOrderValue", "0"),
        "totalOrders": summary.get("totalOrders", 0),
        "byStatus": summary.get("byStatus", {}),
    }


async def company_snapshot(
    company_id: str
) -> dict[str, Any]:
    """Return a quick operational snapshot for the company."""
    client = get_backend_client()

    today_summary = await client.get_order_summary(company_id, "today")
    pending_orders = await client.list_recent_orders(company_id, limit=50, status="PENDING")
    low_stock = await client.get_low_stock_products(company_id, threshold=5, limit=5)

    today_by_status = today_summary.get("byStatus", {})

    return {
        "todayOrders": today_summary.get("totalOrders", 0),
        "pendingOrders": len(pending_orders) if isinstance(pending_orders, list) else 0,
        "lowStockCount": len(low_stock) if isinstance(low_stock, list) else 0,
        "todayRevenue": today_summary.get("paidRevenue", "0"),
        "todayPending": today_by_status.get("pending", 0),
        "todayConfirmed": today_by_status.get("confirmed", 0),
        "todayShipped": today_by_status.get("shipped", 0),
        "todayDelivered": today_by_status.get("delivered", 0),
        "todayCancelled": today_by_status.get("cancelled", 0),
    }
