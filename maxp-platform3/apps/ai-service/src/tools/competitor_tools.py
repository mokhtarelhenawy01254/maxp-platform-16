from __future__ import annotations

from datetime import datetime
from typing import Any

import structlog
from sqlalchemy import text

import src.db.session as _db_mod
from src.tools.definitions._helpers import period_start_date
from src.tools.repositories.competitor_repository import CompetitorRepository
from src.tools.repositories.customer_repository import CustomerRepository
from src.tools.repositories.order_repository import OrderRepository
from src.tools.repositories.sales_repository import SalesRepository

logger = structlog.get_logger(__name__)


async def search_competitors(
    company_id: str, query: str, limit: int = 10
) -> list[dict[str, Any]]:
    if not company_id or not query:
        return []
    sf = _db_mod.async_session
    async with sf() as sess:
        repo = CompetitorRepository(sess)
        return await repo.search_competitors(company_id, query, limit)


async def get_competitor_products(
    company_id: str, competitor_id: str, limit: int = 20
) -> list[dict[str, Any]]:
    if not company_id or not competitor_id:
        return []
    sf = _db_mod.async_session
    async with sf() as sess:
        repo = CompetitorRepository(sess)
        return await repo.get_competitor_products(competitor_id, limit)


async def competitor_price_compare(
    company_id: str, competitor_id: str
) -> dict[str, Any]:
    if not company_id or not competitor_id:
        return {"found": False, "error": "Missing params"}
    sf = _db_mod.async_session
    async with sf() as sess:
        repo = CompetitorRepository(sess)
        return await repo.get_price_comparison(company_id, competitor_id)


async def get_competitor_ads(
    company_id: str, competitor_id: str, limit: int = 10
) -> list[dict[str, Any]]:
    if not company_id or not competitor_id:
        return []
    sf = _db_mod.async_session
    async with sf() as sess:
        repo = CompetitorRepository(sess)
        return await repo.get_competitor_ads(competitor_id, limit)


async def generate_report(
    company_id: str, competitor_id: str, report_type: str = "weekly"
) -> dict[str, Any]:
    if not company_id or not competitor_id:
        return {"success": False, "error": "Missing params"}
    sf = _db_mod.async_session
    async with sf() as sess:
        repo = CompetitorRepository(sess)
        return await repo.generate_report(competitor_id, report_type)
