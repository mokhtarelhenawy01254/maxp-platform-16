from __future__ import annotations

from typing import Any

import structlog

from src.tools.backend_client import get_backend_client

logger = structlog.get_logger(__name__)


async def offers_list_active(company_id: str) -> dict[str, Any]:
    if not company_id:
        return {"coupons": [], "storePromotion": None, "promotionSettings": None}

    client = get_backend_client()
    coupons = await client.get_coupons(company_id, is_active=True)
    store_promotion = await client.get_store_promotion(company_id)
    promotion_settings = await client.get_promotion_settings(company_id)

    return {
        "coupons": coupons or [],
        "storePromotion": store_promotion,
        "promotionSettings": promotion_settings,
        "totalActiveCoupons": len(coupons) if coupons else 0,
        "hasStorePromotion": store_promotion is not None and store_promotion.get("isActive", False),
        "hasFreeShipping": (promotion_settings or {}).get("freeShippingEnabled", False),
        "freeShippingThreshold": (promotion_settings or {}).get("freeShippingThreshold", 0),
        "hasFlatShipping": (promotion_settings or {}).get("flatShippingEnabled", False),
    }


async def coupon_validate(
    company_id: str, code: str, order_amount: str = "0", customer_id: str | None = None
) -> dict[str, Any]:
    if not company_id or not code:
        return {"valid": False, "error": "بيانات ناقصة"}

    client = get_backend_client()
    try:
        result = await client.validate_coupon(company_id, code, order_amount, customer_id)
        valid = result.get("success", False)
        data = result.get("data", {})
        if valid and data:
            return {
                "valid": True,
                "code": data.get("coupon", {}).get("code", code),
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
