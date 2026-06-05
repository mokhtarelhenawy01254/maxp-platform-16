from __future__ import annotations

from typing import Any

import structlog

from src.tools.backend_client import get_backend_client

logger = structlog.get_logger(__name__)


async def order_summary(
    company_id: str, period: str = "today"
) -> dict[str, Any]:
    """Return order count, revenue, and status summary for a period."""
    client = get_backend_client()
    summary = await client.get_order_summary(company_id, period)

    return {
        "period": period,
        "totalOrders": summary.get("totalOrders", 0),
        "paidRevenue": summary.get("paidRevenue", "0"),
        "paidOrdersCount": summary.get("paidOrdersCount", 0),
        "avgOrderValue": summary.get("avgOrderValue", "0"),
        "byStatus": summary.get("byStatus", {
            "pending": 0, "confirmed": 0,
            "shipped": 0, "delivered": 0, "cancelled": 0,
        }),
    }


async def order_lookup(
    company_id: str, order_number: str
) -> dict[str, Any]:
    """Look up a specific order by order number."""
    client = get_backend_client()
    order = await client.get_order_by_number(company_id, order_number)

    if not order:
        return {
            "found": False,
            "code": "ORDER_NOT_FOUND",
            "orderNumber": order_number,
        }

    items = order.get("items") or order.get("orderItems") or []
    customer_data = order.get("customer") or {}

    return {
        "found": True,
        "orderNumber": str(order.get("orderNumber", order_number)),
        "status": order.get("status"),
        "paymentStatus": order.get("paymentStatus"),
        "total": str(order.get("total", 0)),
        "customer": (
            f"{customer_data.get('firstName', '')} {customer_data.get('lastName', '')}".strip()
            or order.get("customerName")
        ),
        "phone": customer_data.get("phone") or order.get("customerPhone"),
        "items": [
            {
                "name": i.get("product", {}).get("name") or i.get("name") or i.get("productName", ""),
                "qty": i.get("quantity") or i.get("qty", 1),
                "price": str(i.get("price", 0)),
            }
            for i in (items if isinstance(items, list) else [])
        ],
        "createdAt": order.get("createdAt"),
        "confirmedAt": order.get("confirmedAt"),
        "deliveredAt": order.get("deliveredAt"),
        "updatedAt": order.get("updatedAt"),
    }


async def recent_orders(
    company_id: str, limit: int = 5, status: str | None = None
) -> list[dict[str, Any]]:
    """List recent orders with optional status filtering."""
    client = get_backend_client()
    orders = await client.list_recent_orders(company_id, limit=limit, status=status)

    return [
        {
            "orderNumber": o.get("orderNumber"),
            "customerName": o.get("customerName"),
            "phone": o.get("phone") or o.get("customerPhone"),
            "status": o.get("status"),
            "paymentStatus": o.get("paymentStatus"),
            "total": str(o.get("total", 0)),
            "date": o.get("date") or o.get("createdAt"),
        }
        for o in (orders if isinstance(orders, list) else [])
    ]


async def get_shipping_rate(
    company_id: str, governorate: str, city: str | None = None, weight: float | None = None
) -> dict[str, Any]:
    """Look up shipping rates for a governorate or city."""
    client = get_backend_client()
    rate = await client.get_shipping_rate(company_id, governorate, city, weight)

    if not rate:
        return {
            "found": False,
            "code": "SHIPPING_RATE_NOT_FOUND",
            "governorate": governorate,
        }

    return {
        "found": True,
        "governorate": rate.get("governorate", governorate),
        "price": str(rate.get("price", 0)),
        "deliveryTime": rate.get("deliveryTime"),
        "isFlat": bool(rate.get("isFlat", False)),
    }
