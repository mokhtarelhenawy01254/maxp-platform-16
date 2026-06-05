from __future__ import annotations

from typing import Any

import structlog

from src.tools.backend_client import get_backend_client

logger = structlog.get_logger(__name__)


async def customer_info(
    company_id: str, query: str
) -> dict[str, Any]:
    """Look up a customer by phone number, name, or email."""
    client = get_backend_client()
    customers = await client.search_customers(company_id, query, limit=1)

    if not customers:
        return {
            "found": False,
            "code": "CUSTOMER_NOT_FOUND",
            "query": query,
        }

    c = customers[0]

    return {
        "found": True,
        "name": f"{c.get('firstName', '') or ''} {c.get('lastName', '') or ''}".strip(),
        "phone": c.get("phone"),
        "email": c.get("email") or "\u2014",
        "status": c.get("status"),
        "ordersCount": c.get("ordersCount") or c.get("_count", {}).get("orders", 0),
        "totalOrders": c.get("totalOrdersCount") or c.get("totalOrders", 0),
        "rating": c.get("customerRating") or "\u2014",
        "joinDate": c.get("joinDate") or c.get("createdAt"),
    }


async def top_buyers(
    company_id: str, limit: int = 5, period: str = "month"
) -> list[dict[str, Any]]:
    """List top buyers for a selected period."""
    client = get_backend_client()
    summary = await client.get_order_summary(company_id, period)

    top = summary.get("topCustomers") or []
    if not top:
        return []

    return [
        {
            "rank": i + 1,
            "customerName": c.get("customerName") or c.get("name", "unknown"),
            "ordersCount": c.get("ordersCount", 0) or c.get("_count", {}).get("id", 0),
            "totalSpent": str(c.get("totalSpent", 0) or c.get("_sum", {}).get("total", 0)),
        }
        for i, c in enumerate(top[:limit])
    ]
