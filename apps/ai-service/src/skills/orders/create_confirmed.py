from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill


class CreateConfirmedOrderInput(BaseModel):
    customer_name: str = Field(description="Customer name")
    customer_phone: str = Field(description="Customer phone number")
    product_name: str = Field(description="Product name or ID")
    quantity: int = Field(default=1, description="Quantity")
    total: float | None = Field(None, description="Order total")
    address: str | None = Field(None, description="Delivery address")
    city: str | None = Field(None, description="City")
    company_id: str = Field(default="", description="")


async def create_confirmed_order(params: CreateConfirmedOrderInput) -> dict:
    from src.tools.definitions.order import order_create_confirmed, OrderCreateConfirmedInput
    inp = OrderCreateConfirmedInput(
        customer_name=params.customer_name,
        customer_phone=params.customer_phone,
        product_name=params.product_name,
        quantity=params.quantity,
        total=params.total,
        address=params.address,
        city=params.city,
        company_id=params.company_id,
    )
    return await order_create_confirmed(inp)


create_confirmed_order_skill = Skill(
    name="create_confirmed_order",
    description="Place a confirmed order. Use when customer explicitly confirms an order after seeing a summary. Keywords: confirm, تأكيد, اوكد, تمام, confirmed",
    input_schema=CreateConfirmedOrderInput,
    handler=create_confirmed_order,
    internal_fields=["company_id"],
)
