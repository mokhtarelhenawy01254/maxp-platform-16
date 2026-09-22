from __future__ import annotations

import pytest

from src.tools.definitions.conversion_tools import (
    CONVERSION_MODULE_CATALOG,
    MANAGED_APP_SLUGS,
    ConversionToolSetThresholdInput,
    ConversionToolToggleInput,
    ConversionToolsReadInput,
    apply_module_toggle,
    build_conversion_snapshot,
    conversion_tool_set_threshold,
    conversion_tool_toggle,
    conversion_tools_read,
    validate_threshold,
    _format_conversion_tools_read,
    _deep_merge,
)
from src.tools.definitions.payments import (
    PaymentMethodsConfigureInput,
    PaymentSettingsReadInput,
    payment_methods_configure,
    payment_settings_read,
    parse_enabled_methods,
    summarize_payment_settings,
    validate_payment_configuration,
    _format_payment_settings_read,
)
from src.tools.registry import get_tool, get_tool_names_for_role


# ── Registration ─────────────────────────────────────────────────────────────

def test_new_tools_registered_in_registry():
    for name in (
        "conversion_tools_read",
        "conversion_tool_toggle",
        "conversion_tool_set_threshold",
        "payment_settings_read",
        "payment_methods_configure",
    ):
        tool = get_tool(name)
        assert tool is not None, name


def test_read_tools_are_direct_and_write_tools_require_approval():
    assert get_tool("conversion_tools_read").approval_mode != "always_require"
    assert get_tool("payment_settings_read").approval_mode != "always_require"
    for name in (
        "conversion_tool_toggle",
        "conversion_tool_set_threshold",
        "payment_methods_configure",
    ):
        assert get_tool(name).approval_mode == "always_require", name


def test_role_tools_yaml_grants_new_tools():
    ceo = get_tool_names_for_role("CEO")
    assert "payment_methods_configure" in ceo
    assert "conversion_tool_toggle" in ceo
    marketing = get_tool_names_for_role("MARKETING")
    assert "conversion_tool_toggle" in marketing
    assert "payment_methods_configure" not in marketing


# ── Conversion tools logic ───────────────────────────────────────────────────

def test_module_catalog_keys_unique_per_owner():
    owners = {key: owner for key, (owner, _label) in CONVERSION_MODULE_CATALOG.items()}
    assert set(owners.values()) == set(MANAGED_APP_SLUGS)
    assert len(owners) == len(CONVERSION_MODULE_CATALOG)


def test_apply_module_toggle_on_enables_suite():
    settings = {"general": {"enabled": False}, "modules": {"freeShippingBar": False}}
    merged = apply_module_toggle(settings, "freeShippingBar", True)
    assert merged["modules"]["freeShippingBar"] is True
    assert merged["general"]["enabled"] is True
    # original untouched (no in-place mutation)
    assert settings["modules"]["freeShippingBar"] is False


def test_apply_module_toggle_off_keeps_suite_enabled():
    settings = {"general": {"enabled": True}, "modules": {"saleCountdown": True}}
    merged = apply_module_toggle(settings, "saleCountdown", False)
    assert merged["modules"]["saleCountdown"] is False
    assert merged["general"]["enabled"] is True


def test_deep_merge_preserves_sibling_keys():
    merged = _deep_merge(
        {"modules": {"a": True, "b": True}, "ui": {"style": "x"}},
        {"modules": {"a": False}},
    )
    assert merged == {"modules": {"a": False, "b": True}, "ui": {"style": "x"}}


def test_build_conversion_snapshot_reports_install_state():
    apps = [
        {
            "id": "app_1",
            "status": "ACTIVE",
            "app": {"slug": "conversion-suite"},
            "settings": {
                "general": {"enabled": True},
                "modules": {"freeShippingBar": True},
                "thresholds": {"freeShippingAmount": 750},
            },
        }
    ]
    snapshot = build_conversion_snapshot(apps)
    by_slug = {a["appSlug"]: a for a in snapshot["apps"]}
    suite = by_slug["conversion-suite"]
    assert suite["installed"] is True and suite["operational"] is True
    modules = {m["key"]: m["enabled"] for m in suite["modules"]}
    assert modules["freeShippingBar"] is True
    assert suite["thresholds"][0]["value"] == 750
    # ugc app not installed -> reported as such
    assert by_slug["ugc-reviews-pro"]["installed"] is False


@pytest.mark.asyncio
async def test_toggle_rejects_unknown_tool_key(monkeypatch):
    result = await conversion_tool_toggle(
        ConversionToolToggleInput(tool_key="notAKey", enable=True, company_id="c1")
    )
    assert result["success"] is False
    assert result["action"] == "TOOL_KEY_REQUIRED"


@pytest.mark.asyncio
async def test_toggle_requires_operational_app(monkeypatch):
    from src.tools.backend_client import get_backend_client

    class FakeBackend:
        async def list_company_apps(self, company_id):
            return [{"id": "app_1", "status": "PAUSED", "app": {"slug": "conversion-suite"}, "settings": {}}]

        async def update_company_app_settings(self, *args, **kwargs):
            raise AssertionError("must not save when app is not operational")

    monkeypatch.setattr("src.tools.backend_client.get_backend_client", lambda: FakeBackend())
    result = await conversion_tool_toggle(
        ConversionToolToggleInput(tool_key="freeShippingBar", enable=True, company_id="c1")
    )
    assert result["success"] is False
    assert result["action"] == "APP_NOT_OPERATIONAL"


@pytest.mark.asyncio
async def test_toggle_writes_merged_settings(monkeypatch):
    saved: dict = {}

    class FakeBackend:
        async def list_company_apps(self, company_id):
            return [
                {
                    "id": "app_1",
                    "status": "ACTIVE",
                    "app": {"slug": "conversion-suite"},
                    "settings": {"general": {"enabled": False}, "modules": {"freeShippingBar": False}},
                }
            ]

        async def update_company_app_settings(self, company_id, app_id, settings):
            saved.update({"company_id": company_id, "app_id": app_id, "settings": settings})
            return {"success": True}

    monkeypatch.setattr("src.tools.backend_client.get_backend_client", lambda: FakeBackend())
    result = await conversion_tool_toggle(
        ConversionToolToggleInput(tool_key="freeShippingBar", enable=True, company_id="c1")
    )
    assert result["success"] is True
    assert saved["app_id"] == "app_1"
    assert saved["settings"]["modules"]["freeShippingBar"] is True
    assert saved["settings"]["general"]["enabled"] is True


def test_validate_threshold_rejects_invalid():
    assert validate_threshold("freeShippingAmount", -5) is not None
    assert validate_threshold("freeShippingAmount", 750) is None
    assert validate_threshold("unknownKey", 10) is not None


@pytest.mark.asyncio
async def test_set_threshold_rejects_negative(monkeypatch):
    result = await conversion_tool_set_threshold(
        ConversionToolSetThresholdInput(threshold_key="freeShippingAmount", value=-1, company_id="c1")
    )
    assert result["success"] is False
    assert result["action"] == "THRESHOLD_INVALID"


@pytest.mark.asyncio
async def test_read_reports_backend_failure(monkeypatch):
    from src.tools.backend_client import get_backend_client

    class FakeBackend:
        async def list_company_apps(self, company_id):
            raise RuntimeError("boom")

    monkeypatch.setattr("src.tools.backend_client.get_backend_client", lambda: FakeBackend())
    result = await conversion_tools_read(ConversionToolsReadInput(company_id="c1"))
    assert result["success"] is False
    # Arabic human message, no raw exception leak
    assert "boom" not in (result.get("error") or "")


def test_read_formatter_is_arabic_and_lists_modules():
    formatted = _format_conversion_tools_read(
        {
            "success": True,
            "apps": [
                {
                    "appSlug": "conversion-suite",
                    "appLabelAr": "أدوات رفع التحويل",
                    "installed": True,
                    "operational": True,
                    "suiteEnabled": True,
                    "modules": [{"key": "freeShippingBar", "labelAr": "شريط الشحن المجاني", "enabled": True}],
                    "thresholds": [{"key": "freeShippingAmount", "labelAr": "مبلغ الشحن المجاني", "value": 750}],
                }
            ],
        }
    )
    assert "أدوات التحويل" in formatted
    assert "شريط الشحن المجاني" in formatted


# ── Payments logic ───────────────────────────────────────────────────────────

def test_parse_enabled_methods_tolerates_forms():
    assert parse_enabled_methods('["cod","card"]') == ["cod", "card"]
    assert parse_enabled_methods(["card"]) == ["card"]
    assert parse_enabled_methods("not-json") == ["cod"]
    assert parse_enabled_methods(None) == ["cod"]
    assert parse_enabled_methods('["bogus"]') == ["cod"]


def test_summarize_payment_settings_never_exposes_gateway_config():
    summary = summarize_payment_settings(
        {
            "enabledPaymentMethods": '["cod","card"]',
            "paymentGatewayConfig": {"apiKey": "XXXX...XXXX", "merchantId": "12345", "mode": "live"},
            "walletPaymentSettings": {"walletNumber": "010x", "discountEnabled": True, "discountPercent": 3},
            "codDepositEnabled": True,
            "codDepositType": "PERCENTAGE",
            "codDepositValue": "30.00",
        }
    )
    assert summary["enabledMethods"] == ["cod", "card"]
    assert summary["kashier"]["configured"] is True
    assert summary["kashier"]["mode"] == "live"
    assert summary["kashier"]["active"] is True
    assert summary["wallet"]["configured"] is True
    assert summary["wallet"]["discountPercent"] == 3
    assert summary["codDeposit"]["enabled"] is True
    assert summary["codDeposit"]["value"] == 30.0
    serialized = str(summary)
    assert "XXXX" not in serialized and "12345" not in serialized and "010x" not in serialized


def test_validate_payment_configuration_guards():
    base = {
        "kashier": {"configured": False},
        "wallet": {"configured": False},
    }
    # empty methods list is rejected
    assert validate_payment_configuration([], base, None) is not None
    # card without gateway keys is rejected
    error = validate_payment_configuration(["card"], base, None)
    assert error is not None and "Kashier" in error
    # wallet without any number is rejected
    error = validate_payment_configuration(["wallet"], base, None)
    assert error is not None and "المحفظة" in error
    # wallet with incoming number passes
    assert validate_payment_configuration(["wallet"], base, "010x") is None
    # cod alone always fine
    ok = {"kashier": {"configured": True}, "wallet": {"configured": True}}
    assert validate_payment_configuration(["cod"], ok, None) is None


@pytest.mark.asyncio
async def test_configure_blocks_card_without_gateway(monkeypatch):
    from src.tools.backend_client import get_backend_client

    class FakeBackend:
        async def get_storefront_settings(self, company_id):
            return {"data": {"enabledPaymentMethods": '["cod"]', "paymentGatewayConfig": None}}

        async def update_storefront_settings(self, *args, **kwargs):
            raise AssertionError("must not save an invalid payment configuration")

    monkeypatch.setattr("src.tools.backend_client.get_backend_client", lambda: FakeBackend())
    result = await payment_methods_configure(
        PaymentMethodsConfigureInput(enabled_methods=["cod", "card"], company_id="c1")
    )
    assert result["success"] is False
    assert result["action"] == "PAYMENT_CONFIG_INVALID"


@pytest.mark.asyncio
async def test_configure_saves_merged_wallet_settings(monkeypatch):
    saved: dict = {}

    class FakeBackend:
        async def get_storefront_settings(self, company_id):
            return {
                "data": {
                    "enabledPaymentMethods": '["cod"]',
                    "paymentGatewayConfig": {"apiKey": "XXXX...XXXX", "merchantId": "1", "mode": "test"},
                    "walletPaymentSettings": {"walletNumber": "old", "showDiscountBadge": True},
                }
            }

        async def update_storefront_settings(self, company_id, payload):
            saved.update(payload)
            return {"success": True}

    monkeypatch.setattr("src.tools.backend_client.get_backend_client", lambda: FakeBackend())
    result = await payment_methods_configure(
        PaymentMethodsConfigureInput(
            enabled_methods=["cod", "card", "wallet"],
            wallet_discount_enabled=True,
            wallet_discount_percent=5,
            cod_deposit_enabled=True,
            cod_deposit_type="PERCENTAGE",
            cod_deposit_value=30,
            company_id="c1",
        )
    )
    assert result["success"] is True
    import json as _json

    assert _json.loads(saved["enabledPaymentMethods"]) == ["cod", "card", "wallet"]
    # existing wallet keys preserved, only provided ones changed
    assert saved["walletPaymentSettings"]["walletNumber"] == "old"
    assert saved["walletPaymentSettings"]["showDiscountBadge"] is True
    assert saved["walletPaymentSettings"]["discountEnabled"] is True
    assert saved["walletPaymentSettings"]["discountPercent"] == 5
    assert saved["codDepositEnabled"] is True
    assert saved["codDepositValue"] == 30


@pytest.mark.asyncio
async def test_configure_rejects_percent_over_100(monkeypatch):
    result = await payment_methods_configure(
        PaymentMethodsConfigureInput(
            enabled_methods=["cod"],
            cod_deposit_type="PERCENTAGE",
            cod_deposit_value=150,
            company_id="c1",
        )
    )
    assert result["success"] is False


@pytest.mark.asyncio
async def test_payment_read_reports_backend_failure(monkeypatch):
    from src.tools.backend_client import get_backend_client

    class FakeBackend:
        async def get_storefront_settings(self, company_id):
            raise RuntimeError("connection refused")

    monkeypatch.setattr("src.tools.backend_client.get_backend_client", lambda: FakeBackend())
    result = await payment_settings_read(PaymentSettingsReadInput(company_id="c1"))
    assert result["success"] is False
    assert "connection" not in (result.get("error") or "")


def test_payment_read_formatter_lists_methods_in_arabic():
    formatted = _format_payment_settings_read(
        {
            "success": True,
            "payments": summarize_payment_settings(
                {"enabledPaymentMethods": '["cod"]', "paymentGatewayConfig": None}
            ),
        }
    )
    assert "طرق الدفع" in formatted
    assert "الدفع عند الاستلام" in formatted
    assert "Kashier" in formatted
