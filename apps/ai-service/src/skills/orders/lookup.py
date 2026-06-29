from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill

class OrderLookupInput(BaseModel):
    orderId: str | None = Field(None, description="Order ID or number to look up")
    phoneNumber: str | None = Field(None, description="Customer phone number for order lookup (Egyptian 01x format)")

async def lookup_order(params: OrderLookupInput) -> dict:
    # ponytail: stub — calls actual order lookup service
    return {
        "status": "shipped",
        "orderId": params.orderId or "ORD-12345",
        "items": [{"name": "شوك ويف فانيليا", "qty": 2, "price": 80.0}],
        "total": 160.0,
        "tracking": "EG123456789",
    }

order_lookup = Skill(
    name="order_lookup",
    description="Look up order status, tracking info, or order details. Use when customer asks about their order status, tracking, delivery, or order history. Arabic keywords: اوردر, طلب, شحنة, توصيل, رقم, تتبع, فين",
    input_schema=OrderLookupInput,
    handler=lookup_order,
)
