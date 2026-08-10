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


class ShippingCompanyGovernoratesInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ShippingCompanyAreasInput(BaseModel):
    government_id: str = Field(description="Governorate/government ID from the shipping company map")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class SearchAreaByTextInput(BaseModel):
    query: str = Field(description="Free-text address or area name to search for, e.g. 'مدينة نصر' or 'القاهرة المعادي'")
    limit: int = Field(default=10, description="Max results to return (1-25)")
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


async def shipping_company_governorates(input_data: ShippingCompanyGovernoratesInput) -> dict[str, Any]:
    """Fetch the shipping company's governorate map (canonical list)."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"found": False, "error": "Missing company_id", "governorates": []}

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()
    try:
        result = await client.get_shipping_company_governorates(company_id)
        governorates = result.get("governments") or result.get("governorates") or result.get("data") or []
        return {
            "found": True,
            "governorates": [
                {"id": str(g.get("id", "")), "name": str(g.get("name", ""))}
                for g in governorates
            ],
            "isFallback": bool(result.get("isFallback")),
        }
    except Exception as exc:
        return {"found": False, "error": str(exc), "governorates": []}


async def shipping_company_areas(input_data: ShippingCompanyAreasInput) -> dict[str, Any]:
    """Fetch the shipping company's areas for a specific governorate."""
    company_id = input_data.company_id or ""
    government_id = input_data.government_id
    if not company_id or not government_id:
        return {"found": False, "error": "Missing company_id or government_id", "areas": []}

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()
    try:
        result = await client.get_shipping_company_areas(company_id, government_id)
        areas = result.get("areas") or result.get("data") or []
        return {
            "found": True,
            "governmentId": government_id,
            "areas": [
                {"id": str(a.get("id", "")), "name": str(a.get("name", ""))}
                for a in areas
            ],
        }
    except Exception as exc:
        return {"found": False, "error": str(exc), "areas": []}


async def search_area_by_text(input_data: SearchAreaByTextInput) -> dict[str, Any]:
    """Search the shipping company's area map by free text.

    Returns ranked matches each carrying governorate + area + confidence.
    The agent MUST use these results (never invented names) when resolving
    a customer address against the shipping company's canonical map.
    """
    company_id = input_data.company_id or ""
    query = (input_data.query or "").strip()
    if not company_id or not query:
        return {"found": False, "error": "Missing company_id or query", "matches": []}

    limit = max(1, min(int(input_data.limit or 10), 25))

    from src.tools.backend_client import get_backend_client

    client = get_backend_client()
    try:
        result = await client.search_area_by_text(company_id, query, limit=limit)
        matches = result.get("matches") or []
        return {
            "found": len(matches) > 0,
            "query": query,
            "matches": matches,
            "count": len(matches),
        }
    except Exception as exc:
        return {"found": False, "error": str(exc), "matches": []}


shipping_rates_tool = FunctionTool(
    name="shipping_rates",
    description="Get shipping rates and delivery info for a governorate. Only needs the governorate name to calculate — do not ask for full address, city, or street. Use this immediately when customer asks about delivery cost, shipping fees, or how much delivery costs.",
    func=shipping_rates,
    input_model=ShippingRatesInput,
)

shipping_update_tool = FunctionTool(
    name="shipping_update",
    description="Propose updating shipping address or class for an order. REQUIRES MERCHANT APPROVAL.",
    func=shipping_update,
    input_model=ShippingUpdateInput,
)

shipping_company_governorates_tool = FunctionTool(
    name="shipping_company_governorates",
    description="Get the SHIPPING COMPANY's canonical governorate map. Use this BEFORE confirming or editing an order address — the customer's address may use names not supported by the shipping company, so you must map it to this list. Then fetch areas with shipping_company_areas.",
    func=shipping_company_governorates,
    input_model=ShippingCompanyGovernoratesInput,
)

shipping_company_areas_tool = FunctionTool(
    name="shipping_company_areas",
    description="Get the SHIPPING COMPANY's areas for a governorate (pass the government id from shipping_company_governorates). Use to verify/correct the customer's area name before updating an order address.",
    func=shipping_company_areas,
    input_model=ShippingCompanyAreasInput,
)

search_area_by_text_tool = FunctionTool(
    name="search_area_by_text",
    description="Search the SHIPPING COMPANY's entire area map by free text (e.g. 'مدينة نصر' or 'المعادي'). Returns ranked matches with governorate + area + confidence. Use this when a customer's address has an area name but you are not sure which governorate it belongs to, or to resolve a free-text address into the shipping company's canonical governorate/area.",
    func=search_area_by_text,
    input_model=SearchAreaByTextInput,
)

__all_tools__ = [
    shipping_rates_tool,
    shipping_update_tool,
    shipping_company_governorates_tool,
    shipping_company_areas_tool,
    search_area_by_text_tool,
]
