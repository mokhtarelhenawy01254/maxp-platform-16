from __future__ import annotations

import json
from typing import Any, Literal

import structlog
from agent_framework import FunctionTool
from pydantic import BaseModel, Field

logger = structlog.get_logger(__name__)

PAYMENT_METHODS: tuple[str, ...] = ("cod", "card", "wallet")

PAYMENT_METHOD_LABELS_AR: dict[str, str] = {
    "cod": "الدفع عند الاستلام (الكاشير)",
    "card": "بطاقات الدفع (بوابة Kashier)",
    "wallet": "المحفظة الإلكترونية (تحويل + إثبات)",
}

_DEPOSIT_TYPES = ("PERCENTAGE", "FIXED")


def parse_enabled_methods(raw: Any) -> list[str]:
    """Backend stores enabledPaymentMethods as a JSON string; tolerate dict/list forms too."""
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except Exception:
            return ["cod"]
    if isinstance(raw, list):
        methods = [str(m) for m in raw if str(m) in PAYMENT_METHODS]
        return methods or ["cod"]
    return ["cod"]


def summarize_payment_settings(data: dict[str, Any]) -> dict[str, Any]:
    """Build a secret-free summary of the tenant payment configuration.

    The gateway config itself (masked keys) is intentionally NOT returned — only presence flags.
    """
    methods = parse_enabled_methods(data.get("enabledPaymentMethods"))

    gateway = data.get("paymentGatewayConfig") or {}
    if isinstance(gateway, str):
        try:
            gateway = json.loads(gateway)
        except Exception:
            gateway = {}
    kashier_configured = bool(
        isinstance(gateway, dict) and (gateway.get("apiKey") or gateway.get("merchantId"))
    )
    kashier_mode = str(gateway.get("mode") or "").strip() if isinstance(gateway, dict) else ""

    wallet = data.get("walletPaymentSettings") or {}
    if isinstance(wallet, str):
        try:
            wallet = json.loads(wallet)
        except Exception:
            wallet = {}
    wallet_number = str((wallet or {}).get("walletNumber") or "").strip()
    wallet_configured = bool(wallet_number)
    discount_percent = (wallet or {}).get("discountPercent")
    try:
        discount_percent = round(float(discount_percent), 2) if discount_percent is not None else 0.0
    except (TypeError, ValueError):
        discount_percent = 0.0

    return {
        "enabledMethods": methods,
        "kashier": {
            "configured": kashier_configured,
            "mode": kashier_mode or None,
            "active": kashier_configured and "card" in methods,
        },
        "wallet": {
            "configured": wallet_configured,
            "active": wallet_configured and "wallet" in methods,
            "discountEnabled": bool((wallet or {}).get("discountEnabled")),
            "discountPercent": discount_percent,
        },
        "codDeposit": {
            "enabled": bool(data.get("codDepositEnabled")),
            "type": data.get("codDepositType") or "PERCENTAGE",
            "value": float(data.get("codDepositValue") or 0),
            "minAmount": float(data["codDepositMinAmount"]) if data.get("codDepositMinAmount") is not None else None,
            "maxAmount": float(data["codDepositMaxAmount"]) if data.get("codDepositMaxAmount") is not None else None,
        },
    }


def validate_payment_configuration(
    desired_methods: list[str],
    current_summary: dict[str, Any],
    incoming_wallet_number: str | None,
) -> str | None:
    """Return an Arabic error when the desired configuration would break checkout, else None."""
    if not desired_methods:
        return "لازم تسيب طريقة دفع واحدة على الأقل مفعّلة — مينفعش المتجر يفضل من غير طرق دفع."
    if "card" in desired_methods and not current_summary["kashier"]["configured"]:
        return (
            "عشان تفعّل بطاقات الدفع لازم مفاتيح بوابة Kashier تتسجل الأول من "
            "إعدادات المتجر ← الدفع (المفاتيح دي لأمان التاجر بتتسجل يدوي بس)."
        )
    if "wallet" in desired_methods:
        has_number_now = current_summary["wallet"]["configured"]
        has_number_incoming = bool((incoming_wallet_number or "").strip())
        if not has_number_now and not has_number_incoming:
            return (
                "عشان تفعّل المحفظة الإلكترونية لازم رقم محفظة (InstaPay/Vodafone Cash) — "
                "مرّره في wallet_number أو سجّله من إعدادات المتجر."
            )
    return None


class PaymentSettingsReadInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class PaymentMethodsConfigureInput(BaseModel):
    enabled_methods: list[Literal[tuple(PAYMENT_METHODS)]] = Field(  # type: ignore[valid-type]
        description=(
            "The COMPLETE desired payment methods list for the storefront checkout. "
            "'cod' = cash on delivery, 'card' = Kashier card payments, 'wallet' = mobile wallet transfer. "
            "Methods omitted from this list will be DISABLED."
        )
    )
    cod_deposit_enabled: bool | None = Field(default=None, description="Require a deposit on cash-on-delivery orders")
    cod_deposit_type: Literal["PERCENTAGE", "FIXED"] | None = Field(
        default=None, description="Deposit type: percentage of order total or fixed amount"
    )
    cod_deposit_value: float | None = Field(default=None, description="Deposit amount (percent if PERCENTAGE, absolute if FIXED)")
    cod_deposit_min_amount: float | None = Field(default=None, description="Optional minimum order amount for the deposit")
    cod_deposit_max_amount: float | None = Field(default=None, description="Optional maximum order amount for the deposit")
    wallet_number: str | None = Field(
        default=None,
        description="Wallet payout number (InstaPay / Vodafone Cash) shown to customers for wallet transfers",
    )
    wallet_discount_enabled: bool | None = Field(default=None, description="Apply a discount when customers pay via wallet/card")
    wallet_discount_percent: float | None = Field(default=None, description="Wallet payment discount percent (0-100)")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def payment_settings_read(input_data: PaymentSettingsReadInput) -> dict[str, Any]:
    company_id = input_data.company_id or None
    if not company_id:
        return {"success": False, "error": "معرف المتجر مفقود — حاول تاني."}

    try:
        from src.tools.backend_client import get_backend_client

        result = await get_backend_client().get_storefront_settings(company_id)
    except Exception as exc:
        logger.error("payment_settings_read failed", error=str(exc))
        return {"success": False, "error": "تعذر تحميل إعدادات الدفع من السيرفر، حاول تاني بعد شوية."}

    data = result.get("data") or {}
    summary = summarize_payment_settings(data)
    return {"success": True, "payments": summary}


def _validate_deposit_payload(input_data: PaymentMethodsConfigureInput) -> str | None:
    if input_data.cod_deposit_type and input_data.cod_deposit_type not in _DEPOSIT_TYPES:
        return "نوع العربون لازم يكون PERCENTAGE أو FIXED."
    if input_data.cod_deposit_value is not None:
        if input_data.cod_deposit_value < 0:
            return "قيمة العربون مينفعش تكون بالسالب."
        if (input_data.cod_deposit_type or "PERCENTAGE") == "PERCENTAGE" and input_data.cod_deposit_value > 100:
            return "نسبة العربون مينفعش تعدّي 100%."
    if input_data.wallet_discount_percent is not None and not (0 <= input_data.wallet_discount_percent <= 100):
        return "نسبة خصم الدفع بالمحفظة لازم تكون بين 0 و 100."
    if input_data.cod_deposit_min_amount is not None and input_data.cod_deposit_min_amount < 0:
        return "أقل مبلغ للعربون مينفعش يكون بالسالب."
    if input_data.cod_deposit_max_amount is not None and input_data.cod_deposit_max_amount < 0:
        return "أقصى مبلغ للعربون مينفعش يكون بالسالب."
    return None


async def payment_methods_configure(input_data: PaymentMethodsConfigureInput) -> dict[str, Any]:
    company_id = input_data.company_id or None
    if not company_id:
        return {"success": False, "error": "معرف المتجر مفقود — حاول تاني."}

    desired_methods = list(dict.fromkeys(input_data.enabled_methods or []))
    invalid = [m for m in desired_methods if m not in PAYMENT_METHODS]
    if invalid:
        valid = "، ".join(PAYMENT_METHODS)
        return {"success": False, "error": f"طرق دفع غير معروفة: {', '.join(invalid)}. المتاح: {valid}."}

    deposit_error = _validate_deposit_payload(input_data)
    if deposit_error:
        return {"success": False, "error": deposit_error, "action": "PAYMENT_PAYLOAD_INVALID"}

    try:
        from src.tools.backend_client import get_backend_client

        backend = get_backend_client()
        current = (await backend.get_storefront_settings(company_id)).get("data") or {}
    except Exception as exc:
        logger.error("payment_methods_configure load failed", error=str(exc))
        return {"success": False, "error": "تعذر تحميل إعدادات الدفع الحالية، حاول تاني بعد شوية."}

    summary = summarize_payment_settings(current)
    wallet_number = (input_data.wallet_number or "").strip() or None
    config_error = validate_payment_configuration(desired_methods, summary, wallet_number)
    if config_error:
        return {"success": False, "error": config_error, "action": "PAYMENT_CONFIG_INVALID"}

    payload: dict[str, Any] = {
        "enabledPaymentMethods": json.dumps(desired_methods),
    }

    if wallet_number or input_data.wallet_discount_enabled is not None or input_data.wallet_discount_percent is not None:
        wallet_settings = dict(current.get("walletPaymentSettings") or {})
        if wallet_number:
            wallet_settings["walletNumber"] = wallet_number
        if input_data.wallet_discount_enabled is not None:
            wallet_settings["discountEnabled"] = bool(input_data.wallet_discount_enabled)
        if input_data.wallet_discount_percent is not None:
            wallet_settings["discountPercent"] = float(input_data.wallet_discount_percent)
        payload["walletPaymentSettings"] = wallet_settings

    if input_data.cod_deposit_enabled is not None:
        payload["codDepositEnabled"] = bool(input_data.cod_deposit_enabled)
    if input_data.cod_deposit_type is not None:
        payload["codDepositType"] = input_data.cod_deposit_type
    if input_data.cod_deposit_value is not None:
        payload["codDepositValue"] = float(input_data.cod_deposit_value)
    if input_data.cod_deposit_min_amount is not None:
        payload["codDepositMinAmount"] = float(input_data.cod_deposit_min_amount)
    if input_data.cod_deposit_max_amount is not None:
        payload["codDepositMaxAmount"] = float(input_data.cod_deposit_max_amount)

    try:
        await backend.update_storefront_settings(company_id, payload)
    except Exception as exc:
        logger.error("payment_methods_configure save failed", error=str(exc))
        return {"success": False, "error": "تعذر حفظ إعدادات الدفع، حاول تاني بعد شوية."}

    methods_ar = "، ".join(PAYMENT_METHOD_LABELS_AR[m] for m in desired_methods)
    return {
        "success": True,
        "enabledMethods": desired_methods,
        "message": f"طرق الدفع المتاحة للعملاء بقت: {methods_ar}.",
    }


def _format_payment_settings_read(result: dict[str, Any]) -> str:
    if not result.get("success"):
        return f"تعذر قراءة إعدادات الدفع: {result.get('error')}"

    payments = result.get("payments") or {}
    methods = payments.get("enabledMethods") or []
    lines = ["### طرق الدفع الحالية في المتجر:"]
    for method_id, label in PAYMENT_METHOD_LABELS_AR.items():
        icon = "✅" if method_id in methods else "⚪"
        lines.append(f"- {icon} {label} `{method_id}`")

    kashier = payments.get("kashier") or {}
    if not kashier.get("configured"):
        lines.append("- ⚠️ بوابة Kashier مش متسجّلة (مفاتيح التاجر ناقصة) فطرق البطاقات مش هتظهر للعملاء.")
    else:
        mode_ar = "تجريبي (test)" if (kashier.get("mode") or "test") == "test" else "حقيقي (live)"
        lines.append(f"- 🔑 بوابة Kashier مسجّلة — الوضع: {mode_ar}.")

    wallet = payments.get("wallet") or {}
    if not wallet.get("configured"):
        lines.append("- ⚠️ رقم المحفظة مش مسجّل فطريقة المحفظة مش هتظهر للعملاء.")
    elif wallet.get("discountEnabled") and (wallet.get("discountPercent") or 0) > 0:
        lines.append(f"- 💸 خصم الدفع الإلكتروني مفعّل: {wallet['discountPercent']}%.")

    deposit = payments.get("codDeposit") or {}
    if deposit.get("enabled"):
        type_ar = "نسبة" if deposit.get("type") == "PERCENTAGE" else "مبلغ ثابت"
        lines.append(f"- 🧾 عربون الدفع عند الاستلام: مفعّل ({type_ar}: {deposit.get('value')}).")
    else:
        lines.append("- 🧾 عربون الدفع عند الاستلام: متوقف.")
    return "\n".join(lines)


def _format_payment_methods_configure(result: dict[str, Any]) -> str:
    if not result.get("success"):
        return f"تعذر تحديث طرق الدفع: {result.get('error')}"
    return result.get("message", "تم تحديث طرق الدفع.")


payment_settings_read_tool = FunctionTool(
    name="payment_settings_read",
    description=(
        "Read the store's checkout payment configuration: which payment methods are enabled "
        "(cod / card / wallet), whether the Kashier gateway is configured and its mode, "
        "wallet number presence and discount, and COD deposit rules. Secret keys are never returned."
    ),
    func=payment_settings_read,
    input_model=PaymentSettingsReadInput,
    format_result=_format_payment_settings_read,
)

payment_methods_configure_tool = FunctionTool(
    name="payment_methods_configure",
    description=(
        "Configure the store's checkout payment methods. Pass the COMPLETE desired methods list "
        "(cod / card / wallet) plus optional COD deposit rules and wallet payout settings. "
        "Enabling 'card' requires the Kashier gateway keys to be registered already; "
        "enabling 'wallet' requires a wallet number. Requires merchant approval."
    ),
    func=payment_methods_configure,
    input_model=PaymentMethodsConfigureInput,
    format_result=_format_payment_methods_configure,
)

__all_tools__ = [
    payment_settings_read_tool,
    payment_methods_configure_tool,
]
