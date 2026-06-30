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
    description="ORDER LOOKUP TOOL — use for ALL order status, tracking, delivery inquiries. When customer says: 'عايز اعرف طلبي', 'حالة الطلب', 'اوردر', 'رقم الطلب', 'الطلب', 'الشحنة', 'التوصيل', 'track order', 'order status'. THIS is the only order lookup tool. Do not make up any other tool name like order_info.",
    input_schema=OrderLookupInput,
    handler=lookup_order,
    internal_fields=["company_id"],
)
