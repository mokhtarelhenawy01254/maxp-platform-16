from __future__ import annotations

from typing import Any

import structlog

import src.db.session as _db_mod
from src.tools.definitions._helpers import period_start_date
from src.tools.repositories.sales_repository import SalesRepository

logger = structlog.get_logger(__name__)


def _period_start_date(period: str):
    return period_start_date(period)


async def sales_revenue(
    company_id: str, period: str = "month"
) -> dict[str, Any]:
    if not company_id:
        return {"period": period, "revenue": "0", "ordersCount": 0, "totalOrders": 0, "avgOrderValue": "0", "byStatus": {}}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = SalesRepository(sess)
        return await repo.get_revenue_summary(company_id, period)


async def company_snapshot(
    company_id: str
) -> dict[str, Any]:
    if not company_id:
        return {"todayOrders": 0, "pendingOrders": 0, "lowStockCount": 0, "todayRevenue": "0",
                "todayPending": 0, "todayConfirmed": 0, "todayShipped": 0,
                "todayDelivered": 0, "todayCancelled": 0}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = SalesRepository(sess)
        return await repo.get_company_snapshot(company_id)
