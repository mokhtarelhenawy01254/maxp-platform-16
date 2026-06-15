from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools.definitions._helpers import _write_result


class ShippingRatesInput(BaseModel):
    governorate: str = Field(description="Governorate to check shipping rates for")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ShippingUpdateInput(BaseModel):
    order_id: str = Field(description="Order ID or number to update shipping for")
    address: str | None = Field(default=None, description="New delivery address")
    shipping_class: str | None = Field(default=None, description="New shipping class")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def shipping_rates(input_data: ShippingRatesInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    governorate = input_data.governorate
    if not company_id or not governorate:
        return {"found": False, "error": "Missing company_id or governorate"}

    from src.tools.repositories.shipping_repository import ShippingRepository

    import src.db.session as _db_mod
    sf = _db_mod.async_session
    async with sf() as sess:
        zone = await ShippingRepository(sess).find_zone_for_governorate(company_id, governorate)

    if not zone:
        return {"found": False, "code": "SHIPPING_RATE_NOT_FOUND", "governorate": governorate}

    return {
        "found": True,
        "governorate": governorate,
        "price": str(zone["price"]),
        "deliveryTime": zone["deliveryTime"],
        "isFlat": True,
    }


async def shipping_update(input_data: ShippingUpdateInput) -> dict[str, Any]:
    return _write_result("shipping.update", {
        "orderId": input_data.order_id,
        "address": input_data.address,
        "shippingClass": input_data.shipping_class,
    }, input_data.company_id or "")


shipping_rates_tool = FunctionTool(
    name="shipping_rates",
    description="Get shipping rates and delivery info for a governorate.",
    func=shipping_rates,
    input_model=ShippingRatesInput,
)

shipping_update_tool = FunctionTool(
    name="shipping_update",
    description="Propose updating shipping address or class for an order. REQUIRES MERCHANT APPROVAL.",
    func=shipping_update,
    input_model=ShippingUpdateInput,
)

__all_tools__ = [
    shipping_rates_tool,
    shipping_update_tool,
]
