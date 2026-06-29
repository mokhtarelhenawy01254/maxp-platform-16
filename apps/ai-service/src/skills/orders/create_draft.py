from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill

class CreateDraftOrderInput(BaseModel):
    productName: str = Field(description="Product name to order")
    quantity: int = Field(default=1, description="Quantity to order")
    customerName: str | None = Field(None, description="Customer name")
    customerPhone: str | None = Field(None, description="Customer phone number (Egyptian 01x format)")
    customerAddress: str | None = Field(None, description="Customer delivery address")

async def create_draft_order(params: CreateDraftOrderInput) -> dict:
    # ponytail: stub — creates draft via Node.js bridge, pending approval
    return {
        "status": "draft_created",
        "draftId": "dft_" + __import__("uuid").uuid4().hex[:12],
        "requiresApproval": True,
        "summary": f"طلب {params.quantity} × {params.productName}",
    }

create_draft_order = Skill(
    name="create_draft_order",
    description="Create a new draft order. Use when customer wants to place an order, buy a product, or make a purchase. Arabic keywords: عايز اشتري, اطلب, هطلب, شراء, اوردر جديد, اضافة طلب",
    input_schema=CreateDraftOrderInput,
    handler=create_draft_order,
)
