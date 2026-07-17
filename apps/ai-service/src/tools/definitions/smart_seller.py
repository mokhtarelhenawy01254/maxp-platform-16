from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

import src.db.session as _db_mod
from src.tools.definitions._helpers import _write_result
from src.tools.repositories.smart_seller_repository import SmartSellerRepository


class LeadScoreInput(BaseModel):
    limit: int = Field(default=10, description="Maximum number of leads to return")
    period: str = Field(default="month", description="Period for scoring: today, week, month, all")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class AbandonedCartsInput(BaseModel):
    hours: int = Field(default=24, description="Look-back window in hours for abandoned carts")
    limit: int = Field(default=10, description="Maximum number of carts to return")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class PipelineOverviewInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class FollowupSuggestionsInput(BaseModel):
    limit: int = Field(default=5, description="Maximum number of suggestions to return")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class DealParamsInput(BaseModel):
    product_id: str | None = Field(default=None, description="Optional product ID to scope negotiation data")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class PurchasePredictionInput(BaseModel):
    customer_id: str = Field(description="Customer ID to predict purchase probability for")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def lead_score(input_data: LeadScoreInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"leads": [], "period": input_data.period}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = SmartSellerRepository(sess)
        leads = await repo.score_leads(company_id, input_data.limit, input_data.period)
    return {"leads": leads, "period": input_data.period}


async def abandoned_carts(input_data: AbandonedCartsInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"carts": [], "hours": input_data.hours}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = SmartSellerRepository(sess)
        carts = await repo.get_abandoned_carts(company_id, input_data.hours, input_data.limit)
    return {"carts": carts, "hours": input_data.hours}


async def pipeline_overview(input_data: PipelineOverviewInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"pipeline": {}, "pipelineTotalValue": "0",
                "todayRevenue": "0", "todayOrders": 0,
                "weekRevenue": "0", "weekOrders": 0,
                "monthRevenue": "0", "monthOrders": 0}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = SmartSellerRepository(sess)
        return await repo.get_pipeline_overview(company_id)


async def followup_suggestions(input_data: FollowupSuggestionsInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"suggestions": []}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = SmartSellerRepository(sess)
        suggestions = await repo.get_followup_suggestions(company_id, input_data.limit)
    return {"suggestions": suggestions}


async def deal_params(input_data: DealParamsInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"productId": input_data.product_id, "avgDiscountPct": 0,
                "suggestedMaxDiscount": 0, "avgOrderValue": "0",
                "negotiationTip": "No data available"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = SmartSellerRepository(sess)
        return await repo.get_deal_params(company_id, input_data.product_id)


async def purchase_prediction(input_data: PurchasePredictionInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id or not input_data.customer_id:
        return {"found": False, "code": "MISSING_PARAMS"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = SmartSellerRepository(sess)
        leads = await repo.score_leads(company_id, limit=100, period="month")

    for lead in leads:
        if lead.get("customerId") == input_data.customer_id:
            return {
                "found": True,
                "customerId": input_data.customer_id,
                "name": lead.get("name", ""),
                "phone": lead.get("phone"),
                "email": lead.get("email"),
                "leadScore": lead.get("leadScore", 0),
                "tier": lead.get("tier", "cold"),
                "recentOrders": lead.get("recentOrders", 0),
                "recentSpent": lead.get("recentSpent", "0"),
            }

    return {"found": False, "code": "CUSTOMER_NOT_FOUND", "customerId": input_data.customer_id}


lead_score_tool = FunctionTool(
    name="lead_score",
    description="Score and rank customer leads based on purchase probability (recency, frequency, monetary).",
    func=lead_score,
    input_model=LeadScoreInput,
)

abandoned_carts_tool = FunctionTool(
    name="abandoned_carts",
    description="Find customers with abandoned draft orders and suggest recovery actions.",
    func=abandoned_carts,
    input_model=AbandonedCartsInput,
)

pipeline_overview_tool = FunctionTool(
    name="pipeline_overview",
    description="Get sales pipeline breakdown by order status with revenue trends.",
    func=pipeline_overview,
    input_model=PipelineOverviewInput,
)

followup_suggestions_tool = FunctionTool(
    name="followup_suggestions",
    description="Suggest follow-up actions for customers who need re-engagement.",
    func=followup_suggestions,
    input_model=FollowupSuggestionsInput,
)

deal_params_tool = FunctionTool(
    name="deal_params",
    description="Get negotiation parameters: average discount, price range, and suggested max discount.",
    func=deal_params,
    input_model=DealParamsInput,
)

purchase_prediction_tool = FunctionTool(
    name="purchase_prediction",
    description="Predict purchase probability and lead score for a specific customer.",
    func=purchase_prediction,
    input_model=PurchasePredictionInput,
)

__all_tools__ = [
    lead_score_tool,
    abandoned_carts_tool,
    pipeline_overview_tool,
    followup_suggestions_tool,
    deal_params_tool,
    purchase_prediction_tool,
]
