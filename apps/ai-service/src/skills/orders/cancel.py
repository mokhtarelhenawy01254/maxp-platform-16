from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill


class CancelOrderInput(BaseModel):
    order_number: str = Field(description="Order number to cancel")
    reason: str = Field(description="Reason for cancellation")
    company_id: str = Field(default="", description="")


async def cancel_order(params: CancelOrderInput) -> dict:
    from src.tools.definitions.order import order_cancel, OrderCancelInput
    inp = OrderCancelInput(
        order_number=params.order_number,
        reason=params.reason,
        company_id=params.company_id,
    )
    return await order_cancel(inp)


cancel_order_skill = Skill(
    name="cancel_order",
    description="Cancel an existing order. Use when customer wants to cancel their order. Requires order number and reason. Keywords: cancel, إلغاء, الغي, إلغاء الطلب",
    input_schema=CancelOrderInput,
    handler=cancel_order,
    internal_fields=["company_id"],
)
