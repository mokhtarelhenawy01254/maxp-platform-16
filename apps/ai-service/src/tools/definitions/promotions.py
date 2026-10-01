from __future__ import annotations

import json
from typing import Any

import structlog
from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools.backend_client import get_backend_client

logger = structlog.get_logger(__name__)


class OffersListActiveInput(BaseModel):
    include_all_coupons: bool = Field(
        default=False,
        description="إذا كانت True يرجع القائمة الكاملة لكل أكواد الكوبونات بالتفصيل؛ بالافتراضي False يرجع ملخصاً بالعدد والأنواع والحملات مع نماذج للأكواد لمنع إغراق المحادثة.",
    )
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class CouponValidateInput(BaseModel):
    code: str = Field(description="Coupon code to validate")
    order_amount: str = Field(default="0", description="Current order amount to calculate discount against")
    customer_id: str | None = Field(default=None, description="Optional customer ID to check per-user limits")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


def _safe_json_parse(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str) and value.strip():
        try:
            return json.loads(value)
        except Exception:
            return {}
    return {}


async def offers_list_active(input_data: OffersListActiveInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {
            "status": "error",
            "sourcesRead": [],
            "sourcesFailed": [{"source": "all", "labelAr": "جميع المصادر", "reason": "معرف الشركة مفقود"}],
            "sourcesStatusSummary": "تعذرت قراءة العروض لأن معرف الشركة مفقود.",
            "coupons": [],
            "couponsSummary": {"total": 0, "byType": {}, "byGroup": []},
            "storePromotion": None,
            "promotionSettings": None,
            "conversionTools": None,
            "boughtTogether": None,
            "productQuantityOffers": [],
            "totalActiveCoupons": 0,
            "_errors": ["company_id is missing"],
        }

    client = get_backend_client()
    raw_results: dict[str, Any] = {}
    sources_read: list[dict[str, str]] = []
    sources_failed: list[dict[str, str]] = []
    errors: list[str] = []

    # المصادر الخمسة للعروض والتخفيضات في المنصة
    sources_tasks = [
        ("coupons", "الكوبونات النشطة", client.get_coupons(company_id, is_active=True, limit=100)),
        ("storePromotion", "عرض المتجر الشامل", client.get_store_promotion(company_id)),
        ("promotionSettings", "إعدادات الشحن المجاني والترويج", client.get_promotion_settings(company_id)),
        ("storefrontSettings", "أدوات التحويل وباقات «اشترِ معًا»", client.get_public_storefront_settings(company_id)),
        ("productOffers", "عروض وخصومات الكمية على المنتجات", client.get_store_products(company_id, limit=100)),
    ]

    for source_key, label_ar, coro in sources_tasks:
        try:
            val = await coro
            raw_results[source_key] = val
            sources_read.append({"source": source_key, "labelAr": label_ar})
        except Exception as e:
            err_msg = str(e)
            errors.append(f"{source_key} ({label_ar}): {err_msg}")
            sources_failed.append({"source": source_key, "labelAr": label_ar, "reason": err_msg})
            logger.error("offers_list_active_source_failed", source=source_key, error=err_msg)
            raw_results[source_key] = None

    # ── 1. معالجة وتلخيص الكوبونات النشطة ──
    all_coupons = raw_results.get("coupons")
    if not isinstance(all_coupons, list):
        all_coupons = []

    total_coupons = len(all_coupons)
    types_counter: dict[str, int] = {}
    groups_map: dict[tuple, dict[str, Any]] = {}

    for c in all_coupons:
        c_type = str(c.get("type") or "PERCENTAGE").upper()
        types_counter[c_type] = types_counter.get(c_type, 0) + 1

        c_name = str(c.get("name") or "كوبون خصم").strip()
        c_val = str(c.get("value") or "0")
        min_amount = c.get("minOrderAmount")
        min_amount_str = str(min_amount) if min_amount is not None else None

        g_key = (c_name, c_type, c_val, min_amount_str)
        if g_key not in groups_map:
            groups_map[g_key] = {
                "campaignName": c_name,
                "type": c_type,
                "value": c_val,
                "minOrderAmount": min_amount_str,
                "count": 0,
                "sampleCodes": [],
            }
        groups_map[g_key]["count"] += 1
        code = c.get("code")
        if code and len(groups_map[g_key]["sampleCodes"]) < 3:
            groups_map[g_key]["sampleCodes"].append(code)

    coupons_groups = list(groups_map.values())
    is_long_list = total_coupons > 10 and not input_data.include_all_coupons

    coupons_summary = {
        "total": total_coupons,
        "isSummarized": is_long_list,
        "byType": types_counter,
        "campaigns": coupons_groups,
        "displayHint": (
            "للعملاء والمتسوقين: اعرض فقط الخصومات المتاحة بشكل جذاب ومباشر، ويُمنع تماماً ذكر إحصائيات تقنية داخلية مثل إجمالي عدد الكوبونات أو عدد الحملات أو مسميات قواعد البيانات. "
            "للتقارير الإدارية الخاصة بالتاجر فقط: يمكن ذكر إجمالي الأعداد والحملات عند طلب التاجر ذلك."
        ),
    }

    if is_long_list:
        # إرجاع عينة ممثلة لأول 5 كوبونات فقط في الحقل المباشر لتفادي إغراق السياق
        returned_coupons = all_coupons[:5]
    else:
        returned_coupons = all_coupons

    # ── 2. معالجة عرض المتجر الشامل (storePromotion) ──
    raw_store_promo = raw_results.get("storePromotion")
    store_promotion: dict[str, Any] | None = None
    if isinstance(raw_store_promo, dict):
        tiers_data = raw_store_promo.get("tiers")
        parsed_tiers = _safe_json_parse(tiers_data) if isinstance(tiers_data, str) else (tiers_data or [])
        store_promotion = {
            "id": raw_store_promo.get("id"),
            "title": raw_store_promo.get("title") or raw_store_promo.get("name") or "عرض المتجر الشامل",
            "name": raw_store_promo.get("name") or raw_store_promo.get("title") or "عرض المتجر الشامل",
            "isActive": bool(raw_store_promo.get("isActive", False)),
            "tiers": parsed_tiers,
            "startDate": raw_store_promo.get("startDate"),
            "endDate": raw_store_promo.get("endDate"),
            "disableOtherDiscounts": raw_store_promo.get("disableOtherDiscounts", False),
        }

    # ── 3. معالجة إعدادات الترويج والشحن المجاني (promotionSettings) ──
    raw_promo_settings = raw_results.get("promotionSettings")
    promotion_settings: dict[str, Any] = {}
    if isinstance(raw_promo_settings, dict):
        promotion_settings = {
            "freeShippingEnabled": bool(raw_promo_settings.get("freeShippingEnabled", False)),
            "freeShippingThreshold": float(raw_promo_settings.get("freeShippingThreshold") or 0),
            "flatShippingEnabled": bool(raw_promo_settings.get("flatShippingEnabled", False)),
            "flatShippingRate": float(raw_promo_settings.get("flatShippingRate") or 0),
        }

    # ── 4. معالجة أدوات التحويل وباقات «اشترِ معًا» (storefrontSettings) ──
    raw_storefront = raw_results.get("storefrontSettings")
    storefront_data = raw_storefront if isinstance(raw_storefront, dict) else {}
    storefront_apps = (storefront_data.get("storefront") or {}).get("apps") or {}

    conv_suite = storefront_apps.get("conversion-suite") or {}
    conv_suite_enabled = bool(conv_suite.get("enabled", False))
    conv_modules = (conv_suite.get("settings") or {}).get("modules") or {}
    conv_thresholds = (conv_suite.get("settings") or {}).get("thresholds") or {}
    conv_copy = (conv_suite.get("settings") or {}).get("copy") or {}

    qty_app = storefront_apps.get("quantity-offers-pro") or {}
    qty_app_enabled = bool(qty_app.get("enabled", False))
    qty_modules = (qty_app.get("settings") or {}).get("modules") or {}
    qty_copy = (qty_app.get("settings") or {}).get("copy") or {}

    bought_together_enabled = conv_suite_enabled and bool(conv_modules.get("boughtTogether", False))
    bought_together_title = conv_copy.get("boughtTogetherTitle") or "اشترِ معًا"
    bought_together_desc = conv_copy.get("boughtTogetherDescription") or ""

    conversion_tools_summary = {
        "conversionSuiteActive": conv_suite_enabled,
        "boughtTogether": {
            "enabled": bought_together_enabled,
            "title": bought_together_title,
            "description": bought_together_desc,
        },
        "bulkSavings": {
            "enabled": conv_suite_enabled and bool(conv_modules.get("bulkSavings", False)),
            "labelAr": "خصومات الكميات (Bulk Savings)",
        },
        "freeShippingBar": {
            "enabled": conv_suite_enabled and bool(conv_modules.get("freeShippingBar", False)),
            "thresholdAmount": conv_thresholds.get("freeShippingAmount"),
            "message": conv_copy.get("freeShippingMessage"),
        },
        "crossSell": {
            "enabled": conv_suite_enabled and bool(conv_modules.get("crossSell", False)),
            "labelAr": "عروض المنتجات المكملة (Cross-Sell)",
        },
        "postPurchaseUpsell": {
            "enabled": conv_suite_enabled and bool(conv_modules.get("postPurchaseUpsell", False)),
            "upsellPriceRangePercent": conv_thresholds.get("upsellPriceRangePercent"),
            "labelAr": "ترقية ما بعد الشراء (Post-Purchase Upsell)",
        },
        "saleCountdown": {
            "enabled": conv_suite_enabled and bool(conv_modules.get("saleCountdown", False)),
            "labelAr": "العد التنازلي للعروض (Sale Countdown)",
        },
        "quantityOffersApp": {
            "enabled": qty_app_enabled,
            "renderOnProductPage": bool(qty_modules.get("renderOnProductPage", False)),
            "mixAndMatch": bool(qty_modules.get("mixAndMatch", False)),
            "title": qty_copy.get("title") or "عروض الكميات",
        },
    }

    # ── 5. معالجة عروض وخصومات الكمية من بيانات المنتجات (productOffers) ──
    raw_products = raw_results.get("productOffers")
    product_quantity_offers: list[dict[str, Any]] = []
    products_with_direct_discount: list[dict[str, Any]] = []
    paired_products_bundles: list[dict[str, Any]] = []

    if isinstance(raw_products, list):
        for prod in raw_products:
            if not isinstance(prod, dict):
                continue
            # تخطي المنتجات المحذوفة أو غير النشطة أو المخفية
            if prod.get("deletedAt") is not None:
                continue
            if prod.get("isActive") is False or prod.get("isHidden") is True:
                continue

            prod_id = prod.get("id") or ""
            prod_name = prod.get("name") or ""
            price = float(prod.get("price") or 0)
            compare_price = float(prod.get("comparePrice") or 0) if prod.get("comparePrice") is not None else None

            meta = _safe_json_parse(prod.get("metadata"))

            # عروض الكميات المحددة للمنتج (quantityOffers / multiPackOffers)
            q_offers = meta.get("quantityOffers") or meta.get("multiPackOffers") or prod.get("quantityOffers") or []
            if isinstance(q_offers, list):
                active_q_offers = [
                    o for o in q_offers
                    if isinstance(o, dict) and o.get("isActive", True) is not False
                ]
                if active_q_offers:
                    tiers = []
                    for o in active_q_offers:
                        tiers.append({
                            "quantity": o.get("quantity"),
                            "unitPrice": o.get("unitPrice"),
                            "buyText": o.get("buyText") or f"اشتري {o.get('quantity')} بسعر {o.get('unitPrice')}",
                            "helperText": o.get("helperText") or "",
                            "enableFreeShipping": bool(o.get("enableFreeShipping", False)),
                        })
                    product_quantity_offers.append({
                        "productId": prod_id,
                        "productName": prod_name,
                        "basePrice": price,
                        "comparePrice": compare_price,
                        "tiersCount": len(tiers),
                        "tiers": tiers,
                    })

            # خصم السعر المباشر على المنتج (comparePrice > price)
            if compare_price and compare_price > price:
                discount_amount = round(compare_price - price, 2)
                discount_pct = round((discount_amount / compare_price) * 100, 1)
                products_with_direct_discount.append({
                    "productId": prod_id,
                    "productName": prod_name,
                    "currentPrice": price,
                    "originalPrice": compare_price,
                    "discountAmount": discount_amount,
                    "discountPercentage": discount_pct,
                })

            # باقات المنتجات المقترنة (crossSell / boughtTogether)
            paired = meta.get("crossSellProducts") or meta.get("boughtTogether") or []
            if isinstance(paired, list) and len(paired) > 0:
                paired_products_bundles.append({
                    "productId": prod_id,
                    "productName": prod_name,
                    "pairedItemsCount": len(paired),
                    "pairedProductIdentifiers": paired,
                })

    # ملخص حالة المصادر للقراءة مقابل الفشل
    if sources_failed and sources_read:
        sources_status_summary = (
            f"تمت قراءة {len(sources_read)} مصادر بنجاح ({'، '.join(s['labelAr'] for s in sources_read)})، "
            f"بينما تعذرت قراءة {len(sources_failed)} مصادر: "
            + "، ".join(f"{s['labelAr']} (السبب: {s['reason']})" for s in sources_failed)
        )
    elif sources_failed and not sources_read:
        sources_status_summary = "تعذرت قراءة جميع مصادر العروض: " + "، ".join(
            f"{s['labelAr']} (السبب: {s['reason']})" for s in sources_failed
        )
    else:
        sources_status_summary = (
            f"تمت قراءة جميع المصادر بنجاح ({len(sources_read)}/5): "
            + "، ".join(s["labelAr"] for s in sources_read)
        )

    reporting_instructions = (
        "قواعد إجابة الإيجنت:\n"
        "1. عند الرد على العميل/المتسوق: اعرض فقط العروض والخصومات المتاحة له بأسلوب بيعي جذاب وودود (نسب الخصم، كود الخصم، الشحن المجاني، عروض الكميات). يُمنع منعاً باتاً ذكر إحصائيات تقنية داخلية للعميل (مثل: «عندنا 44 كوبون» أو «مجمعة في 4 حملات» أو ذكر أسماء مصادر البيانات البرمجية أو المصادر المقروءة والفاشلة).\n"
        "2. منع الفشل الصامت: إذا فشل أو تعذر قراءة أي مصدر، ممنوع تماماً القول «مفيش عروض» أو «مفيش بيانات»؛ بل اعرض العروض من المصادر التي نجحت قراءتها دون إشعار العميل بأي خلل تقني.\n"
        "3. للتاجر/الإدارة فقط في التقارير الإدارية: وضح ما قُرئ وما فشل مع تقديم ملخص الكوبونات وذكر إجمالي عددها إذا كان الاستفسار إدارياً موجهاً للتاجر."
    )

    free_shipping_active = (
        promotion_settings.get("freeShippingEnabled", False)
        or bool(conversion_tools_summary["freeShippingBar"]["enabled"])
    )
    free_shipping_threshold = (
        promotion_settings.get("freeShippingThreshold", 0)
        or conversion_tools_summary["freeShippingBar"]["thresholdAmount"]
        or 0
    )

    return {
        "status": "partial_failure" if sources_failed else ("error" if not sources_read else "success"),
        "hasFailedSources": bool(sources_failed),
        "sourcesRead": sources_read,
        "sourcesFailed": sources_failed,
        "sourcesStatusSummary": sources_status_summary,
        "totalActiveCoupons": total_coupons,
        "couponsSummary": coupons_summary,
        "coupons": returned_coupons,
        "storePromotion": store_promotion,
        "hasStorePromotion": bool(store_promotion and store_promotion.get("isActive", False)),
        "promotionSettings": promotion_settings if raw_results.get("promotionSettings") is not None else None,
        "hasFreeShipping": free_shipping_active,
        "freeShippingThreshold": free_shipping_threshold,
        "hasFlatShipping": promotion_settings.get("flatShippingEnabled", False),
        "conversionTools": conversion_tools_summary,
        "boughtTogether": {
            "enabled": bought_together_enabled,
            "title": bought_together_title,
            "description": bought_together_desc,
            "productsConfiguredWithBundles": len(paired_products_bundles),
            "sampleBundles": paired_products_bundles[:5],
        },
        "productQuantityOffers": {
            "totalProductsWithOffers": len(product_quantity_offers),
            "products": product_quantity_offers,
        },
        "productDirectDiscounts": {
            "totalProductsOnSale": len(products_with_direct_discount),
            "sampleProducts": products_with_direct_discount[:5],
        },
        "reportingInstructions": reporting_instructions,
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
    except Exception as e:
        logger.error("coupon_validate_failed", error=str(e))
        return {"valid": False, "error": f"فشل التحقق من الكوبون: {e}"}


offers_list_active_tool = FunctionTool(
    name="offers_list_active",
    description=(
        "Arabic: فحص وجلب كل العروض والتخفيضات الشغالة حالياً في المتجر: "
        "الكوبونات، عرض المتجر الشامل (اشتر X وخد Y)، إعدادات الشحن المجاني، باقات التحويل «اشترِ معًا»، وعروض وخصومات الكمية على المنتجات. "
        "ضوابط الرد للعملاء: اعرض أبرز العروض المتاحة بأسلوب بيعي تسويقي جذاب ومباشر دون ذكر إحصائيات تقنية داخلية مثل إجمالي عدد الكوبونات أو عدد الحملات أو أسماء المصادر. "
        "إذا تعذر جلب أي مصدر، اعرض باقي العروض المتاحة وممنوع تماماً القول «مفيش عروض» أو «مفيش بيانات»."
    ),
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

