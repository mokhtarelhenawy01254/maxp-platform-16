from __future__ import annotations

from typing import Any

import structlog
from sqlalchemy import text

import src.db.session as _db_mod
from src.tools.definitions._helpers import period_start_date
from src.tools.repositories.order_repository import OrderRepository

logger = structlog.get_logger(__name__)


def _period_start_date(period: str):
    return period_start_date(period)


async def order_summary(
    company_id: str, period: str = "today"
) -> dict[str, Any]:
    if not company_id:
        return {"period": period, "totalOrders": 0, "paidRevenue": "0", "paidOrdersCount": 0, "avgOrderValue": "0", "byStatus": {}}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = OrderRepository(sess)
        return await repo.get_order_summary(company_id, period)


async def order_lookup(
    company_id: str, order_number: str
) -> dict[str, Any]:
    if not company_id or not order_number:
        return {"found": False, "code": "MISSING_PARAMS", "orderNumber": order_number}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = OrderRepository(sess)
        order = await repo.get_order(company_id, order_number)

    if not order:
        return {"found": False, "code": "ORDER_NOT_FOUND", "orderNumber": order_number}

    items = await repo.get_order_items(order["id"])
    customer_name = order.get("customerName") or ""
    customer_phone = order.get("customerPhone") or ""

    return {
        "found": True,
        "orderNumber": str(order.get("orderNumber", order_number)),
        "status": order.get("status"),
        "paymentStatus": order.get("paymentStatus"),
        "total": str(order.get("total", 0)),
        "customer": customer_name,
        "phone": customer_phone,
        "items": [
            {"name": i.get("name", ""), "qty": i.get("qty", 1), "price": str(i.get("price", 0))}
            for i in items
        ],
        "createdAt": str(order.get("createdAt") or ""),
        "confirmedAt": str(order.get("confirmedAt") or ""),
        "deliveredAt": str(order.get("deliveredAt") or ""),
        "updatedAt": str(order.get("updatedAt") or ""),
    }


async def recent_orders(
    company_id: str, limit: int = 5, status: str | None = None
) -> list[dict[str, Any]]:
    if not company_id:
        return []

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = OrderRepository(sess)
        return await repo.get_recent_orders(company_id, limit, status)


async def cancel_order(
    company_id: str, order_number: str, reason: str | None = None
) -> dict[str, Any]:
    if not company_id or not order_number:
        return {"success": False, "error": "Missing company_id or order_number"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = OrderRepository(sess)
        return await repo.cancel_order(company_id, order_number)


async def create_order(
    company_id: str, order_data: dict[str, Any]
) -> dict[str, Any]:
    if not company_id:
        return {"success": False, "error": "Missing company_id"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = OrderRepository(sess)
        return await repo.create_order(company_id, order_data)
