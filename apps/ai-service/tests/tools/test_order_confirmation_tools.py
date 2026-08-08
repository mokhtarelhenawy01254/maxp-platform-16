from __future__ import annotations

import pytest

from src.tools.definitions.order import (
    OrderConfirmInput,
    OrderUpdateDetailsInput,
    order_confirm,
    order_update_details,
)
from src.tools.definitions.shipping import (
    ShippingCompanyAreasInput,
    ShippingCompanyGovernoratesInput,
    shipping_company_areas,
    shipping_company_governorates,
)


@pytest.mark.asyncio
async def test_order_confirm_missing_params():
    result = await order_confirm(OrderConfirmInput(order_number="", company_id=""))
    assert result["success"] is False
    assert "Missing" in result["error"]


@pytest.mark.asyncio
async def test_order_confirm_calls_backend(monkeypatch):
    async def fake_confirm(self, company_id, order_number, notes=None):
        assert company_id == "comp1"
        assert order_number == "ORD-1"
        return {"status": "ok", "success": True}

    monkeypatch.setattr(
        "src.tools.backend_client.BackendClient.confirm_order",
        fake_confirm,
    )

    result = await order_confirm(OrderConfirmInput(order_number="ORD-1", company_id="comp1"))
    assert result["success"] is True
    assert result["newStatus"] == "CONFIRMED"


@pytest.mark.asyncio
async def test_order_confirm_backend_failure(monkeypatch):
    async def fake_confirm(self, company_id, order_number, notes=None):
        raise RuntimeError("boom")

    monkeypatch.setattr(
        "src.tools.backend_client.BackendClient.confirm_order",
        fake_confirm,
    )

    result = await order_confirm(OrderConfirmInput(order_number="ORD-1", company_id="comp1"))
    assert result["success"] is False
    assert "boom" in result["error"]


@pytest.mark.asyncio
async def test_order_update_details_missing_params():
    result = await order_update_details(OrderUpdateDetailsInput(order_number="", company_id=""))
    assert result["success"] is False


@pytest.mark.asyncio
async def test_order_update_details_calls_backend(monkeypatch):
    async def fake_update(self, company_id, order_number, data):
        assert company_id == "comp1"
        assert order_number == "ORD-1"
        assert data["shippingAddress"]["governorate"] == "القاهرة"
        return {"updatedFields": ["shippingAddress"]}

    monkeypatch.setattr(
        "src.tools.backend_client.BackendClient.update_order_details",
        fake_update,
    )

    result = await order_update_details(OrderUpdateDetailsInput(
        order_number="ORD-1",
        company_id="comp1",
        shipping_address={"governorate": "القاهرة", "city": "مدينة نصر", "address": "شارع 1"},
    ))
    assert result["success"] is True
    assert "shippingAddress" in result["updatedFields"]


@pytest.mark.asyncio
async def test_order_update_details_nothing_to_update():
    result = await order_update_details(OrderUpdateDetailsInput(
        order_number="ORD-1",
        company_id="comp1",
    ))
    assert result["success"] is False
    assert "Nothing to update" in result["error"]


@pytest.mark.asyncio
async def test_shipping_company_governorates_no_company():
    result = await shipping_company_governorates(ShippingCompanyGovernoratesInput(company_id=""))
    assert result["found"] is False
    assert result["governorates"] == []


@pytest.mark.asyncio
async def test_shipping_company_governorates_calls_backend(monkeypatch):
    async def fake_govs(self, company_id):
        assert company_id == "comp1"
        return {
            "success": True,
            "governments": [
                {"id": "1", "name": "القاهرة"},
                {"id": "2", "name": "الجيزة"},
            ],
        }

    monkeypatch.setattr(
        "src.tools.backend_client.BackendClient.get_shipping_company_governorates",
        fake_govs,
    )

    result = await shipping_company_governorates(ShippingCompanyGovernoratesInput(company_id="comp1"))
    assert result["found"] is True
    assert result["governorates"] == [
        {"id": "1", "name": "القاهرة"},
        {"id": "2", "name": "الجيزة"},
    ]


@pytest.mark.asyncio
async def test_shipping_company_areas_calls_backend(monkeypatch):
    async def fake_areas(self, company_id, government_id):
        assert company_id == "comp1"
        assert government_id == "1"
        return {
            "success": True,
            "areas": [
                {"id": "10", "name": "مدينة نصر"},
                {"id": "11", "name": "وسط البلد"},
            ],
        }

    monkeypatch.setattr(
        "src.tools.backend_client.BackendClient.get_shipping_company_areas",
        fake_areas,
    )

    result = await shipping_company_areas(ShippingCompanyAreasInput(
        government_id="1",
        company_id="comp1",
    ))
    assert result["found"] is True
    assert result["areas"][0]["name"] == "مدينة نصر"
