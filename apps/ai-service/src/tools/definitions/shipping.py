from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools.definitions._helpers import _executed_result, _write_result


class ShippingZoneSetInput(BaseModel):
    governorates: list[str] | str = Field(
        description="Governorate name or list of governorates to set shipping price for (e.g. 'الإسكندرية' or ['القاهرة', 'الجيزة'])"
    )
    price: float = Field(
        description="Shipping cost/price (e.g. 50.0)"
    )
    delivery_time: str = Field(
        default="2-3 أيام",
        description="Expected delivery duration (e.g. '2-3 أيام' or '1-2 days')"
    )
    name: str | None = Field(
        default=None,
        description="Optional name for this shipping zone (e.g. 'شحن الإسكندرية')"
    )
    free_shipping_threshold: float | None = Field(
        default=None,
        description="Optional minimum order amount to qualify for free shipping (e.g. 500.0)"
    )
    is_active: bool = Field(
        default=True,
        description="Whether this shipping rate is active"
    )
    company_id: str | None = Field(
        default=None,
        description="Tenant ID (auto-injected)"
    )


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


async def shipping_zone_set(input_data: ShippingZoneSetInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "Missing company_id"}

    raw_govs = input_data.governorates
    if isinstance(raw_govs, str):
        govs = [g.strip() for g in raw_govs.split(",") if g.strip()]
    elif isinstance(raw_govs, list):
        govs = [str(g).strip() for g in raw_govs if str(g).strip()]
    else:
        govs = []

    if not govs:
        return {"success": False, "error": "يرجى تحديد محافظة واحدة على الأقل"}

    if input_data.price < 0:
        return {"success": False, "error": "سعر الشحن لا يمكن أن يكون سالباً"}

    from src.tools.repositories.shipping_repository import ShippingRepository
    import src.db.session as _db_mod

    if _db_mod.async_session is None:
        await _db_mod.init_db()

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = ShippingRepository(sess)
        result = await repo.upsert_zone(
            company_id=company_id,
            governorates=govs,
            price=input_data.price,
            delivery_time=input_data.delivery_time,
            name=input_data.name,
            free_shipping_threshold=input_data.free_shipping_threshold,
            is_active=input_data.is_active,
        )

    return _executed_result("SHIPPING_ZONE_SET", result)


def _format_shipping_zone_set(result: dict[str, Any]) -> str:
    res = result.get("result", result)
    if not res.get("id") and not res.get("success", True):
        return f"تعذر تحديث سعر الشحن: {res.get('error', 'خطأ غير معروف')}"
    govs_str = ", ".join(res.get("governorates", []))
    price = res.get("price")
    time = res.get("deliveryTime")
    action_str = "تم تحديث" if res.get("isUpdated") else "تمت إضافة"
    msg = f"{action_str} سعر الشحن لمحافظة ({govs_str}) بنجاح: {price} ج.م (مدة التوصيل: {time})."
    if res.get("freeShippingThreshold"):
        msg += f" [شحن مجاني للطلبات فوق {res.get('freeShippingThreshold')} ج.م]."
    return msg


shipping_rates_tool = FunctionTool(
    name="shipping_rates",
    description="Get shipping rates and delivery info for a governorate. Only needs the governorate name to calculate — do not ask for full address, city, or street. Use this immediately when customer asks about delivery cost, shipping fees, or how much delivery costs.",
    func=shipping_rates,
    input_model=ShippingRatesInput,
)

shipping_zone_set_tool = FunctionTool(
    name="shipping_zone_set",
    description="Create or update shipping price and delivery duration for one or more governorates (e.g. setting Alexandria shipping to 60 EGP). Automatically creates the zone or updates the existing rate if already present.",
    func=shipping_zone_set,
    input_model=ShippingZoneSetInput,
    format_result=_format_shipping_zone_set,
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
    shipping_zone_set_tool,
    shipping_update_tool,
    shipping_company_governorates_tool,
    shipping_company_areas_tool,
    search_area_by_text_tool,
]
