from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill


class ShippingRatesInput(BaseModel):
    governorate: str = Field(description="Governorate name to check shipping to")
    company_id: str = Field(default="", description="")


async def get_shipping_rates(params: ShippingRatesInput) -> dict:
    from src.tools.definitions.shipping import shipping_rates, ShippingRatesInput as RealInput
    inp = RealInput(governorate=params.governorate, company_id=params.company_id)
    return await shipping_rates(inp)


shipping_rates_skill = Skill(
    name="shipping_rates",
    description="Get shipping rates and delivery info for a governorate. Use when customer asks about delivery cost, shipping fees, or how much delivery costs. Keywords: shipping, delivery, شحن, توصيل, سعر الشحن",
    input_schema=ShippingRatesInput,
    handler=get_shipping_rates,
    internal_fields=["company_id"],
)
