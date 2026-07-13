from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill

class CreateDraftOrderInput(BaseModel):
    customer_name: str = Field(description="Customer name (required)")
    customer_phone: str = Field(description="Customer phone number (required)")
    product_name: str = Field(description="Product name to order (required)")
    quantity: int = Field(default=1, description="Quantity to order")
    product_size: str | None = Field(None, description="Product size if known and mentioned by customer")
    product_color: str | None = Field(None, description="Product color if known and mentioned by customer")
    address: str | None = Field(None, description="Delivery address")
    company_id: str = Field(default="", description="")

async def create_draft_order(params: CreateDraftOrderInput) -> dict:
    from src.tools.definitions.order import order_create_draft
    from src.tools.definitions.order import OrderCreateDraftInput
    inp = OrderCreateDraftInput(
        customer_name=params.customer_name,
        customer_phone=params.customer_phone,
        product_name=params.product_name,
        product_size=params.product_size,
        product_color=params.product_color,
        quantity=params.quantity,
        address=params.address,
        company_id=params.company_id,
    )
    return await order_create_draft(inp)

create_draft_order = Skill(
    name="create_draft_order",
    description="Create a draft order (awaiting merchant approval). CALL IMMEDIATELY when customer confirms they want to buy, even if you don't have all details — merchant will fill gaps during approval. Keywords: 'اطلب', 'اشتري', 'طلب', 'اوردر', 'شراء', 'هطلب', 'أطلب'. Do NOT ask merchant about variant availability — create the draft instead.",
    input_schema=CreateDraftOrderInput,
    handler=create_draft_order,
    internal_fields=["company_id"],
)
