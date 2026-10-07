from __future__ import annotations

from typing import Any, Literal

import structlog
from agent_framework import FunctionTool
from pydantic import BaseModel, Field

logger = structlog.get_logger(__name__)

# Managed conversion apps mirror apps/frontend/src/config/marketplaceAppSettings.ts
# and pages/settings/storeConversionSettingsConfig.ts. Keep both sides in sync.
MANAGED_APP_SLUGS: tuple[str, ...] = (
    "conversion-suite",
    "quantity-offers-pro",
    "commerce-advanced",
    "ugc-reviews-pro",
)

MANAGED_APP_LABELS_AR: dict[str, str] = {
    "conversion-suite": "أدوات رفع التحويل",
    "quantity-offers-pro": "عروض الكميات",
    "commerce-advanced": "المبيعات المتقدمة",
    "ugc-reviews-pro": "تقييمات العملاء",
}

# tool_key -> (app_slug, Arabic label)
CONVERSION_MODULE_CATALOG: dict[str, tuple[str, str]] = {
    # conversion-suite — urgency
    "saleCountdown": ("conversion-suite", "العد التنازلي للعروض"),
    "exitIntentPopup": ("conversion-suite", "نافذة نية الخروج"),
    "lowStockNotice": ("conversion-suite", "تنبيه قرب نفاد المخزون"),
    "bulkSavings": ("conversion-suite", "خصومات الكميات"),
    "trustedBadges": ("conversion-suite", "شارات الثقة"),
    "fakeVisitorCounter": ("conversion-suite", "عداد الزوار الحاليين"),
    "fakeSalePopup": ("conversion-suite", "إشعارات المبيعات الأخيرة"),
    "crossSell": ("conversion-suite", "منتجات مكملة"),
    "soldCounter": ("conversion-suite", "عداد القطع المباعة"),
    "estimatedDelivery": ("conversion-suite", "موعد التسليم المتوقع"),
    "freeShippingBar": ("conversion-suite", "شريط الشحن المجاني"),
    "stickyAddToCart": ("conversion-suite", "زر الشراء الثابت"),
    "boughtTogether": ("conversion-suite", "يُشترى معًا"),
    "postPurchaseUpsell": ("conversion-suite", "الترقية بعد الشراء"),
    "backInStock": ("conversion-suite", "إشعار توفار المنتج"),
    "purchaseFomo": ("conversion-suite", "ضغط الشراء (FOMO)"),
    "inactiveTab": ("conversion-suite", "تنبيه التاب غير النشط"),
    "productWishlist": ("conversion-suite", "قائمة الرغبات"),
    "productComparison": ("conversion-suite", "مقارنة المنتجات"),
    # ugc-reviews-pro
    "photoReviews": ("ugc-reviews-pro", "التقييمات بالصور"),
    "videoReviews": ("ugc-reviews-pro", "التقييمات بالفيديو"),
    "verifiedBadge": ("ugc-reviews-pro", "شارة الشراء الموثق"),
    # commerce-advanced
    "preOrder": ("commerce-advanced", "الطلب المسبق"),
    "externalAffiliate": ("commerce-advanced", "رابط التسويق بالعمولة"),
    # quantity-offers-pro
    "renderOnProductPage": ("quantity-offers-pro", "عروض الكميات على صفحة المنتج"),
    "mixAndMatch": ("quantity-offers-pro", "التنسيق الحر بين القطع (Mix & Match)"),
}

# threshold_key -> (Arabic label, minimum allowed value)
CONVERSION_THRESHOLD_CATALOG: dict[str, tuple[str, int]] = {
    "lowStockLimit": ("حد تنبيه قرب نفاد المخزون", 0),
    "freeShippingAmount": ("مبلغ الشحن المجاني", 0),
    "upsellPriceRangePercent": ("نطاق سعر الترقية بعد الشراء ٪", 0),
    "purchaseFomoCartWindowHours": ("نافذة ساعات عربات FOMO", 1),
    "purchaseFomoRecentPurchaseWindowHours": ("نافذة ساعات مبيعات FOMO", 1),
    "purchaseFomoWaitlistFallbackLimit": ("حد قائمة انتظار FOMO", 0),
}


def _deep_merge(target: dict[str, Any], source: dict[str, Any]) -> dict[str, Any]:
    """Recursive merge that returns a new dict; source wins on scalar conflicts."""
    merged = dict(target or {})
    for key, value in (source or {}).items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def _resolve_app_for_tool(tool_key: str) -> str | None:
    entry = CONVERSION_MODULE_CATALOG.get(tool_key)
    return entry[0] if entry else None


def _find_managed_app(apps: list[dict[str, Any]], app_slug: str) -> dict[str, Any] | None:
    for app in apps:
        if (app.get("app") or {}).get("slug") == app_slug:
            return app
    return None


def _is_operational(app: dict[str, Any] | None) -> bool:
    if not app:
        return False
    return str(app.get("status") or "").upper() in {"TRIAL", "ACTIVE"}


def _read_path(settings: dict[str, Any], dotted: str) -> Any:
    current: Any = settings
    for part in dotted.split("."):
        if not isinstance(current, dict) or part not in current:
            return None
        current = current[part]
    return current


def build_conversion_snapshot(apps: list[dict[str, Any]]) -> dict[str, Any]:
    """Build a structured per-app snapshot of module toggles and thresholds."""
    result_apps: list[dict[str, Any]] = []
    for slug in MANAGED_APP_SLUGS:
        app = _find_managed_app(apps, slug)
        installed = app is not None
        operational = _is_operational(app)
        settings = (app or {}).get("settings") or {}
        suite_enabled = bool(_read_path(settings, "general.enabled")) if installed else False

        modules = [
            {
                "key": key,
                "labelAr": label,
                "enabled": bool(_read_path(settings, f"modules.{key}")) if installed else False,
            }
            for key, (owner, label) in CONVERSION_MODULE_CATALOG.items()
            if owner == slug
        ]
        thresholds = [
            {
                "key": key,
                "labelAr": label,
                "value": _read_path(settings, f"thresholds.{key}"),
            }
            for key, (label, _min) in CONVERSION_THRESHOLD_CATALOG.items()
            if slug == "conversion-suite"
        ]
        result_apps.append(
            {
                "appSlug": slug,
                "appLabelAr": MANAGED_APP_LABELS_AR[slug],
                "installed": installed,
                "operational": operational,
                "suiteEnabled": suite_enabled,
                "modules": modules,
                "thresholds": [t for t in thresholds if t["value"] is not None],
            }
        )
    return {"apps": result_apps}


def apply_module_toggle(
    settings: dict[str, Any], tool_key: str, enable: bool
) -> dict[str, Any]:
    """Mirror the frontend buildModuleToggle semantics:
    turning a module ON also re-enables the whole suite; turning it OFF only flips the module."""
    owner, _label = CONVERSION_MODULE_CATALOG[tool_key]
    updates: dict[str, Any] = {"modules": {tool_key: enable}}
    if enable:
        updates["general"] = {"enabled": True}
    return _deep_merge(settings or {}, updates)


def validate_threshold(threshold_key: str, value: float) -> str | None:
    """Return an Arabic error message when the value violates the catalog minimum, else None."""
    entry = CONVERSION_THRESHOLD_CATALOG.get(threshold_key)
    if not entry:
        valid = "، ".join(sorted(CONVERSION_THRESHOLD_CATALOG))
        return f"«{threshold_key}» مش من حدود المتغيرات المعروفة. المتاح: {valid}"
    _label, minimum = entry
    if value < minimum:
        return f"قيمة «{_label}» لازم تكون {minimum} أو أكتر (استلمت {value})."
    return None


class ConversionToolsReadInput(BaseModel):
    app_slug: Literal[tuple(MANAGED_APP_SLUGS)] | None = Field(  # type: ignore[valid-type]
        default=None,
        description="Optional app filter. Omit to get the full snapshot of all conversion apps.",
    )
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ConversionToolToggleInput(BaseModel):
    tool_key: str = Field(description="Conversion module key, e.g. 'freeShippingBar', 'saleCountdown', 'photoReviews'")
    enable: bool = Field(description="True to turn the tool ON, False to turn it OFF")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class ConversionToolSetThresholdInput(BaseModel):
    threshold_key: str = Field(
        description="Threshold key, e.g. 'freeShippingAmount' (free shipping minimum), 'lowStockLimit'"
    )
    value: float = Field(description="New numeric value for the threshold")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


def _require_company(input_company_id: str | None) -> str | None:
    return input_company_id or None


async def conversion_tools_read(input_data: ConversionToolsReadInput) -> dict[str, Any]:
    company_id = _require_company(input_data.company_id)
    if not company_id:
        return {"success": False, "error": "معرف المتجر مفقود — حاول تاني."}

    try:
        from src.tools.backend_client import get_backend_client

        apps = await get_backend_client().list_company_apps(company_id)
    except Exception as exc:
        logger.error("conversion_tools_read failed", error=str(exc))
        return {"success": False, "error": "تعذر تحميل أدوات التحويل من السيرفر، حاول تاني بعد شوية."}

    snapshot = build_conversion_snapshot(apps)
    if input_data.app_slug:
        snapshot["apps"] = [a for a in snapshot["apps"] if a["appSlug"] == input_data.app_slug]
    snapshot["success"] = True
    return snapshot


async def conversion_tool_toggle(input_data: ConversionToolToggleInput) -> dict[str, Any]:
    company_id = _require_company(input_data.company_id)
    if not company_id:
        return {"success": False, "error": "معرف المتجر مفقود — حاول تاني."}

    tool_key = (input_data.tool_key or "").strip()
    if tool_key not in CONVERSION_MODULE_CATALOG:
        valid = "، ".join(sorted(CONVERSION_MODULE_CATALOG))
        return {
            "success": False,
            "error": f"«{tool_key}» مش من أدوات التحويل المعروفة. الأدوات المتاحة: {valid}",
            "action": "TOOL_KEY_REQUIRED",
        }

    app_slug = _resolve_app_for_tool(tool_key)
    _owner, tool_label_ar = CONVERSION_MODULE_CATALOG[tool_key]

    try:
        from src.tools.backend_client import get_backend_client

        backend = get_backend_client()
        apps = await backend.list_company_apps(company_id)
    except Exception as exc:
        logger.error("conversion_tool_toggle load failed", error=str(exc))
        return {"success": False, "error": "تعذر تحميل إعدادات أدوات التحويل، حاول تاني بعد شوية."}

    app = _find_managed_app(apps, app_slug)
    if not _is_operational(app):
        app_name = MANAGED_APP_LABELS_AR[app_slug]
        if app is None:
            return {
                "success": False,
                "error": f"تطبيق «{app_name}» مش متثبت في المتجر — لازم يتثبت الأول من صفحة التطبيقات.",
                "action": "APP_NOT_INSTALLED",
            }
        return {
            "success": False,
            "error": f"تطبيق «{app_name}» موجود لكنه مش مفعّل (حالة: {app.get('status')}).",
            "action": "APP_NOT_OPERATIONAL",
        }

    current_settings = app.get("settings") or {}
    next_settings = apply_module_toggle(current_settings, tool_key, bool(input_data.enable))
    if tool_key == "renderOnProductPage" and not input_data.enable:
        next_settings = _deep_merge(next_settings, {"modules": {"mixAndMatch": False}})

    try:
        await backend.update_company_app_settings(company_id, app["id"], next_settings)
        # Keep quantity-offers-pro and conversion-suite.bulkSavings synchronized so disabling
        # quantity offers from either key actually hides quantity offer panels on the storefront.
        if tool_key == "bulkSavings":
            qty_app = _find_managed_app(apps, "quantity-offers-pro")
            if _is_operational(qty_app):
                qty_updates: dict[str, Any] = {
                    "modules": {
                        "renderOnProductPage": bool(input_data.enable),
                        **({"mixAndMatch": False} if not input_data.enable else {}),
                    }
                }
                if input_data.enable:
                    qty_updates["general"] = {"enabled": True}
                merged_qty = _deep_merge(qty_app.get("settings") or {}, qty_updates)
                await backend.update_company_app_settings(company_id, qty_app["id"], merged_qty)
        elif tool_key == "renderOnProductPage":
            conv_app = _find_managed_app(apps, "conversion-suite")
            if _is_operational(conv_app):
                merged_conv = apply_module_toggle(
                    conv_app.get("settings") or {}, "bulkSavings", bool(input_data.enable)
                )
                await backend.update_company_app_settings(company_id, conv_app["id"], merged_conv)
    except Exception as exc:
        logger.error("conversion_tool_toggle save failed", error=str(exc))
        return {"success": False, "error": "تعذر حفظ التغيير على السيرفر، حاول تاني بعد شوية."}

    state_ar = "مفعّلة" if input_data.enable else "متوقفة"
    return {
        "success": True,
        "toolKey": tool_key,
        "appSlug": app_slug,
        "enabled": bool(input_data.enable),
        "message": f"أداة «{tool_label_ar}» بقت {state_ar} في متجرك.",
    }


async def conversion_tool_set_threshold(input_data: ConversionToolSetThresholdInput) -> dict[str, Any]:
    company_id = _require_company(input_data.company_id)
    if not company_id:
        return {"success": False, "error": "معرف المتجر مفقود — حاول تاني."}

    threshold_key = (input_data.threshold_key or "").strip()
    validation_error = validate_threshold(threshold_key, float(input_data.value))
    if validation_error:
        return {"success": False, "error": validation_error, "action": "THRESHOLD_INVALID"}

    threshold_label_ar, _min = CONVERSION_THRESHOLD_CATALOG[threshold_key]

    try:
        from src.tools.backend_client import get_backend_client

        backend = get_backend_client()
        apps = await backend.list_company_apps(company_id)
    except Exception as exc:
        logger.error("conversion_tool_set_threshold load failed", error=str(exc))
        return {"success": False, "error": "تعذر تحميل إعدادات أدوات التحويل، حاول تاني بعد شوية."}

    app = _find_managed_app(apps, "conversion-suite")
    if not _is_operational(app):
        return {
            "success": False,
            "error": "تطبيق «أدوات رفع التحويل» مش متثبت أو مش مفعّل في المتجر.",
            "action": "APP_NOT_OPERATIONAL",
        }

    current_settings = app.get("settings") or {}
    next_settings = _deep_merge(
        current_settings,
        {"thresholds": {threshold_key: float(input_data.value)}},
    )

    try:
        await backend.update_company_app_settings(company_id, app["id"], next_settings)
    except Exception as exc:
        logger.error("conversion_tool_set_threshold save failed", error=str(exc))
        return {"success": False, "error": "تعذر حفظ التغيير على السيرفر، حاول تاني بعد شوية."}

    return {
        "success": True,
        "thresholdKey": threshold_key,
        "value": float(input_data.value),
        "message": f"«{threshold_label_ar}» اتظبطت على {input_data.value}.",
    }


def _format_conversion_tools_read(result: dict[str, Any]) -> str:
    if not result.get("success"):
        return f"تعذر قراءة أدوات التحويل: {result.get('error')}"

    lines: list[str] = ["### حالة أدوات التحويل:"]
    for app in result.get("apps", []):
        if not app.get("installed"):
            lines.append(f"\n**{app['appLabelAr']}** — مش متثبت في المتجر.")
            continue
        status_ar = "شغال" if app.get("operational") else "متوقف"
        suite_ar = "مفعّل" if app.get("suiteEnabled") else "متوقف"
        lines.append(f"\n**{app['appLabelAr']}** ({status_ar} — التطبيق {suite_ar}):")
        for module in app.get("modules", []):
            icon = "✅" if module["enabled"] else "⚪"
            lines.append(f"- {icon} {module['labelAr']} `{module['key']}`")
        for threshold in app.get("thresholds", []):
            lines.append(f"- 🎚️ {threshold['labelAr']}: {threshold['value']}")
    return "\n".join(lines)


def _format_conversion_tool_toggle(result: dict[str, Any]) -> str:
    if not result.get("success"):
        return f"تعذر تغيير حالة الأداة: {result.get('error')}"
    return result.get("message", "تم تحديث الأداة.")


def _format_conversion_tool_set_threshold(result: dict[str, Any]) -> str:
    if not result.get("success"):
        return f"تعذر ضبط القيمة: {result.get('error')}"
    return result.get("message", "تم ضبط القيمة.")


conversion_tools_read_tool = FunctionTool(
    name="conversion_tools_read",
    description=(
        "Read the store's conversion tools state: which of the managed conversion apps "
        "(conversion-suite, quantity-offers-pro, commerce-advanced, ugc-reviews-pro) are installed, "
        "which module toggles are ON/OFF, and current threshold values. Use before any toggle to show the merchant the current state."
    ),
    func=conversion_tools_read,
    input_model=ConversionToolsReadInput,
    format_result=_format_conversion_tools_read,
)

conversion_tool_toggle_tool = FunctionTool(
    name="conversion_tool_toggle",
    description=(
        "Enable or disable one storefront conversion tool by its module key "
        "(e.g. enable 'freeShippingBar' or disable 'saleCountdown'). Requires merchant approval; "
        "use conversion_tools_read first to list valid keys and the current state."
    ),
    func=conversion_tool_toggle,
    input_model=ConversionToolToggleInput,
    format_result=_format_conversion_tool_toggle,
)

conversion_tool_set_threshold_tool = FunctionTool(
    name="conversion_tool_set_threshold",
    description=(
        "Set a numeric conversion threshold, e.g. 'freeShippingAmount' (free shipping minimum amount) "
        "or 'lowStockLimit'. Requires merchant approval; values below the allowed minimum are rejected."
    ),
    func=conversion_tool_set_threshold,
    input_model=ConversionToolSetThresholdInput,
    format_result=_format_conversion_tool_set_threshold,
)

__all_tools__ = [
    conversion_tools_read_tool,
    conversion_tool_toggle_tool,
    conversion_tool_set_threshold_tool,
]
