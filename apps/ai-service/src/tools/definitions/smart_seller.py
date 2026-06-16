from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools import smart_seller_tools
from src.tools.definitions._helpers import _write_result


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
    return await smart_seller_tools.lead_score(
        input_data.company_id or "", limit=input_data.limit, period=input_data.period
    )


async def abandoned_carts(input_data: AbandonedCartsInput) -> dict[str, Any]:
    return await smart_seller_tools.abandoned_carts(
        input_data.company_id or "", hours=input_data.hours, limit=input_data.limit
    )


async def pipeline_overview(input_data: PipelineOverviewInput) -> dict[str, Any]:
    return await smart_seller_tools.pipeline_overview(input_data.company_id or "")


async def followup_suggestions(input_data: FollowupSuggestionsInput) -> dict[str, Any]:
    return await smart_seller_tools.followup_suggestions(
        input_data.company_id or "", limit=input_data.limit
    )


async def deal_params(input_data: DealParamsInput) -> dict[str, Any]:
    return await smart_seller_tools.deal_params(
        input_data.company_id or "", product_id=input_data.product_id
    )


async def purchase_prediction(input_data: PurchasePredictionInput) -> dict[str, Any]:
    return await smart_seller_tools.purchase_prediction(
        input_data.company_id or "", customer_id=input_data.customer_id
    )


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
