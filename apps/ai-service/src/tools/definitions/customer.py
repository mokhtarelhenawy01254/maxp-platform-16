from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools import customer_tools


class CustomerInfoInput(BaseModel):
    query: str = Field(description="Phone number, name, or email to look up")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class CustomerTopBuyersInput(BaseModel):
    limit: int = Field(default=5, description="Maximum number of customers")
    period: str = Field(default="month", description="Period: week, month, all")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def customer_info(input_data: CustomerInfoInput) -> dict[str, Any]:
    return await customer_tools.customer_info(
        input_data.company_id or "", input_data.query
    )


async def customer_top_buyers(input_data: CustomerTopBuyersInput) -> dict[str, Any]:
    customers = await customer_tools.top_buyers(
        input_data.company_id or "", limit=input_data.limit, period=input_data.period
    )
    return {"customers": customers}


customer_info_tool = FunctionTool(
    name="customer_info",
    description="Look up a customer by phone number, name, or email.",
    func=customer_info,
    input_model=CustomerInfoInput,
)

customer_top_buyers_tool = FunctionTool(
    name="customer_top_buyers",
    description="List top buyers for a selected period.",
    func=customer_top_buyers,
    input_model=CustomerTopBuyersInput,
)

__all_tools__ = [
    customer_info_tool,
    customer_top_buyers_tool,
]
