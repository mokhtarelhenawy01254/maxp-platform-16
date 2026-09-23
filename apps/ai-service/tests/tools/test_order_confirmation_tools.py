from __future__ import annotations

import pytest

from src.tools.definitions.order import (
    OrderConfirmInput,
    OrderLookupByPhoneInput,
    OrderRecentListInput,
    OrderSummaryInput,
    OrderUpdateDetailsInput,
    order_confirm,
    order_lookup_by_phone,
    order_recent_list,
    order_summary,
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


@pytest.mark.asyncio
async def test_order_recent_list_with_status_and_period(monkeypatch):
    async def fake_get_recent_orders(company_id, limit=25, status=None, period=None, date=None):
        assert company_id == "comp1"
        assert status == "CONFIRMED"
        assert period == "yesterday"
        assert limit == 25
        return [
            {
                "orderNumber": "ORD-501",
                "customerName": "أحمد مصطفى",
                "phone": "01012345678",
                "status": "CONFIRMED",
                "paymentStatus": "PENDING",
                "total": "750",
                "date": "2026-09-22 14:30:00",
                "confirmedAt": "2026-09-22 15:00:00",
                "city": "القاهرة",
                "governorate": "القاهرة",
            }
        ]

    class _MockSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr("src.db.session.async_session", lambda: _MockSession())
    from src.tools.repositories.order_repository import OrderRepository
    monkeypatch.setattr(OrderRepository, "get_recent_orders", fake_get_recent_orders)

    result = await order_recent_list(OrderRecentListInput(
        status="CONFIRMED",
        period="yesterday",
        limit=25,
        company_id="comp1",
    ))
    assert result["count"] == 1
    assert result["status"] == "CONFIRMED"
    assert result["period"] == "yesterday"
    assert result["orders"][0]["orderNumber"] == "ORD-501"
    assert result["orders"][0]["confirmedAt"] == "2026-09-22 15:00:00"


@pytest.mark.asyncio
async def test_order_summary_yesterday(monkeypatch):
    async def fake_get_order_summary(company_id, period="today"):
        assert company_id == "comp1"
        assert period == "yesterday"
        return {
            "period": "yesterday",
            "totalOrders": 12,
            "paidRevenue": "4500",
            "paidOrdersCount": 8,
            "avgOrderValue": "562.5",
            "byStatus": {"confirmed": 6, "delivered": 2, "pending": 4},
        }

    class _MockSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr("src.db.session.async_session", lambda: _MockSession())
    from src.tools.repositories.order_repository import OrderRepository
    monkeypatch.setattr(OrderRepository, "get_order_summary", fake_get_order_summary)

    result = await order_summary(OrderSummaryInput(period="yesterday", company_id="comp1"))
    assert result["period"] == "yesterday"
    assert result["totalOrders"] == 12
    assert result["byStatus"]["confirmed"] == 6


def test_period_date_range_yesterday():
    from src.tools.definitions._helpers import period_date_range
    start, end = period_date_range("yesterday")
    assert start is not None
    assert end is not None
    assert start < end
    diff = end - start
    assert diff.total_seconds() == 86400
