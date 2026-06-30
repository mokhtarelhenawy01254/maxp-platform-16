from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill

class CreateDraftOrderInput(BaseModel):
    customer_name: str = Field(description="Customer name")
    customer_phone: str = Field(description="Customer phone number")
    product_name: str = Field(description="Product name to order")
    quantity: int = Field(default=1, description="Quantity to order")
    address: str | None = Field(None, description="Delivery address")
    company_id: str = Field(default="", description="")

async def create_draft_order(params: CreateDraftOrderInput) -> dict:
    from src.tools.definitions.order import order_create_draft
    from src.tools.definitions.order import OrderCreateDraftInput
    inp = OrderCreateDraftInput(
        customer_name=params.customer_name,
        customer_phone=params.customer_phone,
        product_name=params.product_name,
        quantity=params.quantity,
        address=params.address,
        company_id=params.company_id,
    )
    return await order_create_draft(inp)

create_draft_order = Skill(
    name="create_draft_order",
    description="Create a new draft order for a customer who has decided to buy. Call AFTER using product_search to find the product. Use when customer says 'اطلب', 'اشتري', 'عايز', 'طلب', 'اوردر', 'شراء', 'هطلب', 'أطلب', 'طلب شراء'. Do NOT use for product inquiries or browsing — use product_search for that.",
    input_schema=CreateDraftOrderInput,
    handler=create_draft_order,
    internal_fields=["company_id"],
    keywords=["اطلب", "اشتري", "طلب", "اوردر", "شراء", "هطلب", "طلب شراء"],
)
