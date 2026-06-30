from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill


class CreateConfirmedOrderInput(BaseModel):
    customer_name: str = Field(description="Customer name (required)")
    customer_phone: str = Field(description="Customer phone number (required)")
    product_name: str = Field(description="Product name to order (required)")
    quantity: int = Field(default=1, description="Quantity")
    product_size: str | None = Field(None, description="Product size if mentioned by customer")
    product_color: str | None = Field(None, description="Product color if mentioned by customer")
    total: float | None = Field(None, description="Order total (product price * quantity)")
    shipping_amount: float | None = Field(None, description="Shipping cost if known")
    address: str | None = Field(None, description="Delivery address")
    city: str | None = Field(None, description="City/governorate")
    notes: str | None = Field(None, description="Order notes")
    company_id: str = Field(default="", description="")


async def create_confirmed_order(params: CreateConfirmedOrderInput) -> dict:
    from src.tools.definitions.order import order_create_confirmed, OrderCreateConfirmedInput
    inp = OrderCreateConfirmedInput(
        customer_name=params.customer_name,
        customer_phone=params.customer_phone,
        product_name=params.product_name,
        quantity=params.quantity,
        product_size=params.product_size,
        product_color=params.product_color,
        total=params.total,
        shipping_amount=params.shipping_amount,
        address=params.address,
        city=params.city,
        notes=params.notes,
        company_id=params.company_id,
    )
    return await order_create_confirmed(inp)


create_confirmed_order_skill = Skill(
    name="create_confirmed_order",
    description="PLACE CONFIRMED ORDER NOW. Use when customer wants to buy — collect customer_name, customer_phone, product_name. Creates order directly WITHOUT merchant approval (order goes to PENDING status). color and size are OPTIONAL — if customer doesn't specify them, create the order without them. Do NOT keep asking for color if customer hasn't mentioned it. Do NOT use ask_merchant for variant availability — create the order and merchant handles fulfillment.",
    input_schema=CreateConfirmedOrderInput,
    handler=create_confirmed_order,
    internal_fields=["company_id"],
)
