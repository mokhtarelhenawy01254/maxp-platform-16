"""Unit tests for multi-source order shipping carrier & AWB resolution and delegation."""

from src.tools.repositories.order_repository import (
    _carrier_display_name,
    _extract_shipping_info,
)
from src.tools.definitions.order import _format_order_lookup
from src.tools.definitions.shipping import _format_shipment_track
from src.services.agent_manager_service import ROLE_ALIASES, ROLE_DEFAULT_TEMPLATES


def test_carrier_display_name_resolves_qp_express_and_turbo():
    assert "QP Express" in _carrier_display_name(None, "QP_EXPRESS")
    assert "Turbo" in _carrier_display_name(None, "TURBO")
    assert _carrier_display_name("كيو بي إكسبريس (QP Express)", "QP_EXPRESS") == "كيو بي إكسبريس (QP Express)"


def test_extract_shipping_info_from_shipments_and_metadata():
    row = {
        "orderNumber": "ORD-534074-835",
        "status": "SHIPPED",
        "shippingCompanyName": "كيو بي إكسبريس (QP Express)",
        "shipmentCarrierType": "QP_EXPRESS",
        "shipmentTrackingNumber": "22889569",
        "shipmentStatus": "CREATED",
        "shipmentCreatedAt": "2026-09-26 10:44:23",
        "metadata": {
            "shippingCarrier": "QP_EXPRESS",
            "trackingNumber": "22889569",
            "qpExpress": {
                "serial": 22889569,
                "trackingNumber": "22889569",
                "status": "Sent to QP Express",
            },
        },
    }
    info = _extract_shipping_info(row)
    assert info["shippingCompany"] == "كيو بي إكسبريس (QP Express)"
    assert info["shippingCarrier"] == "QP_EXPRESS"
    assert info["trackingNumber"] == "22889569"
    assert info["shipmentStatus"] == "CREATED"


def test_extract_shipping_info_fallback_to_metadata_only():
    row = {
        "orderNumber": "ORD-100",
        "status": "SHIPPED",
        "metadata": {
            "qpExpress": {
                "serial": 99887766,
                "status": "Sent to QP Express",
            },
        },
    }
    info = _extract_shipping_info(row)
    assert "QP Express" in info["shippingCompany"]
    assert info["shippingCarrier"] == "QP_EXPRESS"
    assert info["trackingNumber"] == "99887766"


def test_format_order_lookup_includes_shipping_company_and_tracking():
    text = _format_order_lookup({
        "found": True,
        "order": {
            "orderNumber": "ORD-534074-835",
            "status": "SHIPPED",
            "total": 450,
            "customerName": "هدير",
            "shippingCompany": "كيو بي إكسبريس (QP Express)",
            "trackingNumber": "22889569",
        },
    })
    assert "كيو بي إكسبريس (QP Express)" in text
    assert "22889569" in text


def test_format_shipment_track_includes_carrier_and_awb():
    text = _format_shipment_track({
        "found": True,
        "orderNumber": "ORD-534074-835",
        "carrier": "كيو بي إكسبريس (QP Express)",
        "trackingNumber": "22889569",
        "status": "CREATED",
    })
    assert "كيو بي إكسبريس (QP Express)" in text
    assert "22889569" in text


def test_role_aliases_and_default_templates_include_specialists():
    assert ROLE_ALIASES.get("منى") == "ORDER_CONFIRMATION"
    assert ROLE_ALIASES.get("شحن") == "SHIPPING"
    assert "ORDER_CONFIRMATION" in ROLE_DEFAULT_TEMPLATES
    assert "SHIPPING" in ROLE_DEFAULT_TEMPLATES
