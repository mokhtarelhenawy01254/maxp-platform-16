from __future__ import annotations

from typing import Any

import structlog

import src.db.session as _db_mod
from src.tools.repositories.smart_seller_repository import SmartSellerRepository

logger = structlog.get_logger(__name__)


async def lead_score(
    company_id: str, limit: int = 10, period: str = "month"
) -> dict[str, Any]:
    if not company_id:
        return {"leads": [], "period": period}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = SmartSellerRepository(sess)
        leads = await repo.score_leads(company_id, limit, period)

    return {"leads": leads, "period": period}


async def abandoned_carts(
    company_id: str, hours: int = 24, limit: int = 10
) -> dict[str, Any]:
    if not company_id:
        return {"carts": [], "hours": hours}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = SmartSellerRepository(sess)
        carts = await repo.get_abandoned_carts(company_id, hours, limit)

    return {"carts": carts, "hours": hours}


async def pipeline_overview(company_id: str) -> dict[str, Any]:
    if not company_id:
        return {
            "pipeline": {},
            "pipelineTotalValue": "0",
            "todayRevenue": "0", "todayOrders": 0,
            "weekRevenue": "0", "weekOrders": 0,
            "monthRevenue": "0", "monthOrders": 0,
        }

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = SmartSellerRepository(sess)
        return await repo.get_pipeline_overview(company_id)


async def followup_suggestions(
    company_id: str, limit: int = 5
) -> dict[str, Any]:
    if not company_id:
        return {"suggestions": []}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = SmartSellerRepository(sess)
        suggestions = await repo.get_followup_suggestions(company_id, limit)

    return {"suggestions": suggestions}


async def deal_params(
    company_id: str, product_id: str | None = None
) -> dict[str, Any]:
    if not company_id:
        return {
            "productId": product_id,
            "avgDiscountPct": 0,
            "suggestedMaxDiscount": 0,
            "avgOrderValue": "0",
            "negotiationTip": "No data available",
        }

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = SmartSellerRepository(sess)
        return await repo.get_deal_params(company_id, product_id)


async def purchase_prediction(
    company_id: str, customer_id: str
) -> dict[str, Any]:
    """Predict purchase probability for a specific customer."""
    if not company_id or not customer_id:
        return {"found": False, "code": "MISSING_PARAMS"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = SmartSellerRepository(sess)
        leads = await repo.score_leads(company_id, limit=100, period="month")

    for lead in leads:
        if lead.get("customerId") == customer_id:
            return {
                "found": True,
                "customerId": customer_id,
                "name": lead.get("name", ""),
                "phone": lead.get("phone"),
                "email": lead.get("email"),
                "leadScore": lead.get("leadScore", 0),
                "tier": lead.get("tier", "cold"),
                "recentOrders": lead.get("recentOrders", 0),
                "recentSpent": lead.get("recentSpent", "0"),
            }

    return {"found": False, "code": "CUSTOMER_NOT_FOUND", "customerId": customer_id}
