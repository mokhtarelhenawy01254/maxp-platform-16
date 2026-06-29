from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill

class RefundRequestInput(BaseModel):
    order_number: str = Field(description="Order number for the refund")
    reason: str = Field(description="Reason for refund/return")
    company_id: str = Field(default="", description="")

async def request_refund(params: RefundRequestInput) -> dict:
    from src.tools.definitions.order import order_refund
    from src.tools.definitions.order import OrderRefundInput
    inp = OrderRefundInput(
        order_number=params.order_number,
        reason=params.reason,
        company_id=params.company_id,
    )
    return await order_refund(inp)

support_refund = Skill(
    name="support_refund",
    description="Handle refund, return, or financial dispute requests. Use when customer wants to return a product, get a refund, or has a payment issue.",
    input_schema=RefundRequestInput,
    handler=request_refund,
    internal_fields=["company_id"],
)
