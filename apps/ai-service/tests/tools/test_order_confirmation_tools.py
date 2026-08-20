from __future__ import annotations

import pytest

from src.tools.definitions.order import (
    OrderConfirmInput,
    OrderLookupByPhoneInput,
    OrderUpdateDetailsInput,
    order_confirm,
    order_lookup_by_phone,
    order_update_details,
)
from src.tools.definitions.shipping import (
    SearchAreaByTextInput,
    ShippingCompanyAreasInput,
    ShippingCompanyGovernoratesInput,
    search_area_by_text,
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


@pytest.mark.asyncio
async def test_search_area_by_text_missing_params():
    result = await search_area_by_text(SearchAreaByTextInput(query="", company_id=""))
    assert result["found"] is False
    assert "Missing" in result["error"]
    assert result["matches"] == []


@pytest.mark.asyncio
async def test_search_area_by_text_calls_backend(monkeypatch):
    async def fake_search(self, company_id, query, limit=10):
        assert company_id == "comp1"
        assert query == "مدينة نصر"
        return {
            "success": True,
            "matches": [
                {
                    "governorateId": "1",
                    "governorate": "القاهرة",
                    "areaId": "10",
                    "area": "مدينة نصر",
                    "confidence": 1.0,
                },
            ],
            "count": 1,
        }

    monkeypatch.setattr(
        "src.tools.backend_client.BackendClient.search_area_by_text",
        fake_search,
    )

    result = await search_area_by_text(SearchAreaByTextInput(query="مدينة نصر", company_id="comp1"))
    assert result["found"] is True
    assert result["count"] == 1
    assert result["matches"][0]["governorate"] == "القاهرة"
    assert result["matches"][0]["area"] == "مدينة نصر"


@pytest.mark.asyncio
async def test_search_area_by_text_backend_failure(monkeypatch):
    async def fake_search(self, company_id, query, limit=10):
        raise RuntimeError("boom")

    monkeypatch.setattr(
        "src.tools.backend_client.BackendClient.search_area_by_text",
        fake_search,
    )

    result = await search_area_by_text(SearchAreaByTextInput(query="المعادي", company_id="comp1"))
    assert result["found"] is False
    assert "boom" in result["error"]
    assert result["matches"] == []


@pytest.mark.asyncio
async def test_order_lookup_by_phone_missing_params():
    result = await order_lookup_by_phone(OrderLookupByPhoneInput(phone="", company_id=""))
    assert result["found"] is False
    assert "MISSING_PARAMS" in result["code"]


@pytest.mark.asyncio
async def test_order_lookup_by_phone_calls_repo(monkeypatch):
    async def fake_get_orders(company_id, phone, limit=10, status=None):
        assert company_id == "comp1"
        assert phone == "01012345678"
        return [
            {"orderNumber": "ORD-1001", "status": "PENDING", "paymentStatus": "PENDING", "total": 1500, "createdAt": "2026-08-08"},
            {"orderNumber": "ORD-1002", "status": "CONFIRMED", "paymentStatus": "PENDING", "total": 800, "createdAt": "2026-08-07"},
        ]

    class _MockSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr("src.db.session.async_session", lambda: _MockSession())
    from src.tools.repositories.order_repository import OrderRepository
    monkeypatch.setattr(OrderRepository, "get_orders_by_phone", fake_get_orders)

    result = await order_lookup_by_phone(OrderLookupByPhoneInput(phone="01012345678", company_id="comp1"))
    assert result["found"] is True
    assert result["count"] == 2
    assert result["orders"][0]["orderNumber"] == "ORD-1001"
    assert result["orders"][1]["status"] == "CONFIRMED"


@pytest.mark.asyncio
async def test_order_lookup_by_phone_empty(monkeypatch):
    async def fake_get_orders(company_id, phone, limit=10, status=None):
        return []

    class _MockSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr("src.db.session.async_session", lambda: _MockSession())
    from src.tools.repositories.order_repository import OrderRepository
    monkeypatch.setattr(OrderRepository, "get_orders_by_phone", fake_get_orders)

    result = await order_lookup_by_phone(OrderLookupByPhoneInput(phone="01000000000", company_id="comp1"))
    assert result["found"] is False
    assert result["orders"] == []
