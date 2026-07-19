from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

import src.db.session as _db_mod
from src.tools.repositories.customer_repository import CustomerRepository


class CustomerInfoInput(BaseModel):
    query: str = Field(description="Phone number, name, or email to look up")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class CustomerTopBuyersInput(BaseModel):
    limit: int = Field(default=5, description="Maximum number of customers")
    period: str = Field(default="month", description="Period: week, month, all")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def customer_info(input_data: CustomerInfoInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    query = input_data.query
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


async def customer_top_buyers(input_data: CustomerTopBuyersInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"customers": []}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = CustomerRepository(sess)
        customers = await repo.get_top_buyers(company_id, input_data.limit, input_data.period)
    return {"customers": customers}


def _format_customer_info(result: dict) -> str:
    if result.get("found") or result.get("customer"):
        cust = result.get("customer") or result
        return f"بيانات العميل: {cust.get('name') or cust.get('customerName')}"
    return ""


customer_info_tool = FunctionTool(
    name="customer_info",
    description="Look up a customer by phone number, name, or email.",
    func=customer_info,
    input_model=CustomerInfoInput,
    format_result=_format_customer_info,
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
