from __future__ import annotations

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch
import pytest

from src.tools.definitions._helpers import period_date_range
from src.tools.definitions.order import (
    OrderRecentListInput,
    OrderSummaryInput,
    order_recent_list,
    order_summary,
)
from src.tools.repositories.order_repository import OrderRepository
from src.tools.definitions.shipping import (
    ShippingCompaniesListInput,
    ShippingCompanyConnectInput,
    ShippingCompanyToggleInput,
    shipping_companies_list,
    shipping_company_connect,
    shipping_company_toggle,
)
from src.tools.registry import unclassified_mutating_tools


def test_period_date_range_flexible_aliases():
    for alias in ("week", "last_week", "last-week", "7days", "اسبوع", "أسبوع", "اخر اسبوع", "آخر أسبوع"):
        start, end = period_date_range(alias)
        assert end is None
        diff = datetime.utcnow() - start
        assert 6.9 <= diff.total_seconds() / 86400 <= 7.1

    start_tod, end_tod = period_date_range("اليوم")
    assert end_tod is None
    assert start_tod.hour == 0

    start_yes, end_yes = period_date_range("امس")
    assert end_yes is not None
    assert (end_yes - start_yes).total_seconds() == 86400


@pytest.mark.asyncio
async def test_order_summary_returns_direct_total_and_summary():
    mock_res = {
        "period": "week",
        "totalOrders": 142,
        "paidRevenue": "42000",
        "paidOrdersCount": 90,
        "avgOrderValue": "466.6",
        "byStatus": {"delivered": 90, "shipped": 30, "confirmed": 15, "cancelled": 7},
    }

    with patch("src.db.session.init_db", new_callable=AsyncMock), \
         patch("src.db.session.async_session") as mock_session_factory, \
         patch("src.tools.repositories.order_repository.OrderRepository.get_order_summary", new_callable=AsyncMock) as mock_summary:

        mock_sess = AsyncMock()
        mock_session_factory.return_value.__aenter__.return_value = mock_sess
        mock_summary.return_value = mock_res

        inp = OrderSummaryInput(period="week", company_id="comp_123")
        res = await order_summary(inp)

        assert res["totalOrders"] == 142
        assert "142" in res["summary"]
        assert "week" in res["summary"]


@pytest.mark.asyncio
async def test_order_recent_list_returns_total_in_period():
    fake_orders = [{"orderNumber": "1001", "total": "500"}, {"orderNumber": "1002", "total": "600"}]
    total_in_db = 85

    with patch("src.db.session.init_db", new_callable=AsyncMock), \
         patch("src.db.session.async_session") as mock_session_factory, \
         patch("src.tools.repositories.order_repository.OrderRepository.get_recent_orders", new_callable=AsyncMock) as mock_repo_call:

        mock_sess = AsyncMock()
        mock_session_factory.return_value.__aenter__.return_value = mock_sess
        mock_repo_call.return_value = fake_orders

        with patch.object(OrderRepository, "last_total_matching", total_in_db, create=True):
            inp = OrderRecentListInput(period="week", limit=2, company_id="comp_123")
            res = await order_recent_list(inp)

            assert res["count"] == 2
            assert res["total_in_period"] == 85
            assert "85" in res["note"]


@pytest.mark.asyncio
async def test_shipping_companies_list_tool():
    fake_list = [
        {"id": "c1", "name": "بوستا (Bosta)", "slug": "bosta", "isActive": True, "hasCredentials": True},
        {"id": "c2", "name": "Turbo", "slug": "turbo", "isActive": False, "hasCredentials": False},
    ]

    with patch("src.db.session.init_db", new_callable=AsyncMock), \
         patch("src.db.session.async_session") as mock_session_factory, \
         patch("src.tools.repositories.shipping_repository.ShippingRepository.list_shipping_companies", new_callable=AsyncMock) as mock_list:

        mock_sess = AsyncMock()
        mock_session_factory.return_value.__aenter__.return_value = mock_sess
        mock_list.return_value = fake_list

        inp = ShippingCompaniesListInput(company_id="comp_123")
        res = await shipping_companies_list(inp)

        assert res["count"] == 2
        assert res["active_count"] == 1
        assert len(res["companies"]) == 2


@pytest.mark.asyncio
async def test_shipping_company_connect_tool():
    fake_connect_result = {
        "id": "c_bosta_1",
        "carrier": "بوستا (Bosta)",
        "slug": "bosta",
        "providerKey": "BOSTA",
        "isActive": True,
        "hasApiKey": True,
        "message": "تم ربط وتفعيل شركة الشحن «بوستا (Bosta)» بنجاح في المنظومة.",
    }

    with patch("src.db.session.init_db", new_callable=AsyncMock), \
         patch("src.db.session.async_session") as mock_session_factory, \
         patch("src.tools.repositories.shipping_repository.ShippingRepository.connect_shipping_company", new_callable=AsyncMock) as mock_connect:

        mock_sess = AsyncMock()
        mock_session_factory.return_value.__aenter__.return_value = mock_sess
        mock_connect.return_value = fake_connect_result

        inp = ShippingCompanyConnectInput(
            carrier="bosta",
            api_key="test_bosta_key_123",
            company_id="comp_123",
        )
        res = await shipping_company_connect(inp)

        assert res["status"] == "EXECUTED"
        assert res["action"] == "SHIPPING_COMPANY_CONNECTED"
        assert res["result"]["carrier"] == "بوستا (Bosta)"
        assert res["result"]["isActive"] is True


@pytest.mark.asyncio
async def test_shipping_company_toggle_tool():
    fake_toggle_result = {
        "id": "c_turbo_1",
        "name": "Turbo",
        "slug": "turbo",
        "isActive": False,
        "message": "تم إلغاء تفعيل شركة الشحن «Turbo» بنجاح.",
    }

    with patch("src.db.session.init_db", new_callable=AsyncMock), \
         patch("src.db.session.async_session") as mock_session_factory, \
         patch("src.tools.repositories.shipping_repository.ShippingRepository.toggle_shipping_company", new_callable=AsyncMock) as mock_toggle:

        mock_sess = AsyncMock()
        mock_session_factory.return_value.__aenter__.return_value = mock_sess
        mock_toggle.return_value = fake_toggle_result

        inp = ShippingCompanyToggleInput(
            carrier_slug_or_id="turbo",
            is_active=False,
            company_id="comp_123",
        )
        res = await shipping_company_toggle(inp)

        assert res["status"] == "EXECUTED"
        assert res["action"] == "SHIPPING_COMPANY_TOGGLED"
        assert res["result"]["isActive"] is False


def test_unclassified_mutating_tools_guard():
    offending = unclassified_mutating_tools()
    assert offending == []
