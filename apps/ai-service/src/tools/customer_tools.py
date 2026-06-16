from __future__ import annotations

from typing import Any

import structlog
from sqlalchemy import text

import src.db.session as _db_mod
from src.tools.definitions._helpers import period_start_date
from src.tools.repositories.customer_repository import CustomerRepository

logger = structlog.get_logger(__name__)


async def customer_info(
    company_id: str, query: str
) -> dict[str, Any]:
    if not company_id or not query:
        return {"found": False, "code": "MISSING_PARAMS", "query": query}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = CustomerRepository(sess)
        c = await repo.find_customer(company_id, query)

    if not c:
        return {"found": False, "code": "CUSTOMER_NOT_FOUND", "query": query}

    first = c.get("firstName") or ""
    last = c.get("lastName") or ""

    return {
        "found": True,
        "name": f"{first} {last}".strip(),
        "phone": c.get("phone"),
        "email": c.get("email") or "\u2014",
        "status": c.get("status"),
        "ordersCount": c.get("totalOrders", 0),
        "totalOrders": c.get("totalOrders", 0),
        "rating": c.get("customerRating") or "\u2014",
        "joinDate": str(c.get("joinDate") or ""),
    }


async def top_buyers(
    company_id: str, limit: int = 5, period: str = "month"
) -> list[dict[str, Any]]:
    if not company_id:
        return []

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = CustomerRepository(sess)
        return await repo.get_top_buyers(company_id, limit, period)
