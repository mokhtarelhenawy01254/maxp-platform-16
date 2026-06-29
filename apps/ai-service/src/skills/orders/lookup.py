from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill

class OrderLookupInput(BaseModel):
    order_number: str = Field(description="Order number to look up")
    company_id: str = Field(default="", description="")

async def lookup_order(params: OrderLookupInput) -> dict:
    from src.tools.order_tools import order_lookup as _lookup
    result = await _lookup(company_id=params.company_id, order_number=params.order_number)
    return result

order_lookup = Skill(
    name="order_lookup",
    description="Look up order status, tracking info, or order details. Use when customer asks about their order status, tracking, delivery, or order history.",
    input_schema=OrderLookupInput,
    handler=lookup_order,
    internal_fields=["company_id"],
)
