from __future__ import annotations

from typing import Any

import structlog
from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools.backend_client import get_backend_client

logger = structlog.get_logger(__name__)


class OffersListActiveInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class CouponValidateInput(BaseModel):
    code: str = Field(description="Coupon code to validate")
    order_amount: str = Field(default="0", description="Current order amount to calculate discount against")
    customer_id: str | None = Field(default=None, description="Optional customer ID to check per-user limits")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def offers_list_active(input_data: OffersListActiveInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"coupons": [], "storePromotion": None, "promotionSettings": None}

    client = get_backend_client()
    result: dict[str, Any] = {"coupons": [], "storePromotion": None, "promotionSettings": None}
    errors: list[str] = []

    for name, coro in [("coupons", client.get_coupons(company_id, is_active=True)),
                         ("storePromotion", client.get_store_promotion(company_id)),
                         ("promotionSettings", client.get_promotion_settings(company_id))]:
        try:
            result[name] = await coro
        except RuntimeError as e:
            msg = f"{name}: {e}"
            errors.append(msg)
            logger.error("offers_list_active_fetch_failed", error=msg)
            result[name] = [] if name == "coupons" else None

    coupons = result.get("coupons") or []
    store_promotion = result.get("storePromotion")
    promotion_settings = result.get("promotionSettings")

    return {
        "coupons": coupons,
        "storePromotion": store_promotion,
        "promotionSettings": promotion_settings,
        "totalActiveCoupons": len(coupons) if coupons else 0,
        "hasStorePromotion": store_promotion is not None and store_promotion.get("isActive", False),
        "hasFreeShipping": (promotion_settings or {}).get("freeShippingEnabled", False),
        "freeShippingThreshold": (promotion_settings or {}).get("freeShippingThreshold", 0),
        "hasFlatShipping": (promotion_settings or {}).get("flatShippingEnabled", False),
        "_errors": errors,
    }


async def coupon_validate(input_data: CouponValidateInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id or not input_data.code:
        return {"valid": False, "error": "بيانات ناقصة"}

    client = get_backend_client()
    try:
        result = await client.validate_coupon(company_id, input_data.code, input_data.order_amount, input_data.customer_id)
        valid = result.get("success", False)
        data = result.get("data", {})
        if valid and data:
            return {
                "valid": True,
                "code": data.get("coupon", {}).get("code", input_data.code),
                "name": data.get("coupon", {}).get("name", ""),
                "discountAmount": str(data.get("discountAmount", 0)),
                "finalAmount": str(data.get("finalAmount", 0)),
                "type": data.get("coupon", {}).get("type", ""),
                "value": str(data.get("coupon", {}).get("value", 0)),
            }
        return {"valid": False, "error": result.get("error", "الكوبون غير صالح")}
    except RuntimeError as e:
        logger.error("coupon_validate_failed", error=str(e))
        return {"valid": False, "error": "فشل التحقق من الكوبون"}


offers_list_active_tool = FunctionTool(
    name="offers_list_active",
    description="Arabic: اعرض كل العروض والتخفيضات الشغالة في المتجر: عروض المتجر الشاملة (اشتر X وخد Y)، الكوبونات، الشحن المجاني. استخدمها لما العميل يسأل عن العروض أو التخفيضات النشطة.",
    func=offers_list_active,
    input_model=OffersListActiveInput,
)

coupon_validate_tool = FunctionTool(
    name="coupon_validate",
    description="Arabic: اختبر كود خصم محدد: هل الكود لسه شغال؟ الحد الأدنى للطلب؟ استخدامات متبقية؟ قيمة الخصم؟ استخدمها لما العميل يطلب كود خصم أو عايز يتأكد من صلاحية كود.",
    func=coupon_validate,
    input_model=CouponValidateInput,
)

__all_tools__ = [
    offers_list_active_tool,
    coupon_validate_tool,
]
