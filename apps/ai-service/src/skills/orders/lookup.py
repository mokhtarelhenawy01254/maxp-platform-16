from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill

class OrderLookupInput(BaseModel):
    order_number: str = Field(description="Order number to look up")
    company_id: str = Field(default="", description="")

async def lookup_order(params: OrderLookupInput) -> dict:
    from src.tools.definitions.order import order_lookup, OrderLookupInput as _OLI
    result = await order_lookup(_OLI(order_number=params.order_number, company_id=params.company_id))
    return result.get("order", result)

order_lookup = Skill(
    name="order_lookup",
    description="ORDER LOOKUP TOOL — use for ALL order status, tracking, delivery inquiries. When customer says: 'عايز اعرف طلبي', 'حالة الطلب', 'اوردر', 'رقم الطلب', 'الطلب', 'الشحنة', 'التوصيل', 'track order', 'order status'. THIS is the only order lookup tool. Do not make up any other tool name like order_info.",
    input_schema=OrderLookupInput,
    handler=lookup_order,
    internal_fields=["company_id"],
)
