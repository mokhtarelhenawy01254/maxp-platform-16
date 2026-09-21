from __future__ import annotations

from unittest.mock import AsyncMock, patch
import pytest

from src.tools.definitions.shipping import (
    ShippingZoneSetInput,
    _format_shipping_zone_set,
    shipping_zone_set,
    shipping_zone_set_tool,
)
from src.skills.registry import get_skill_registry
import src.tools.registry  # noqa: F401


class TestShippingZoneSetTool:
    @pytest.mark.asyncio
    async def test_shipping_zone_set_success(self):
        fake_zone_result = {
            "id": "sz_alex_123",
            "name": "شحن الإسكندرية",
            "governorates": ["الإسكندرية"],
            "price": 60.0,
            "deliveryTime": "2-3 أيام",
            "freeShippingThreshold": None,
            "isActive": True,
            "isUpdated": False,
        }

        with patch("src.db.session.init_db", new_callable=AsyncMock), \
             patch("src.db.session.async_session") as mock_session_factory, \
             patch("src.tools.repositories.shipping_repository.ShippingRepository.upsert_zone", new_callable=AsyncMock) as mock_upsert:
            
            mock_sess = AsyncMock()
            mock_session_factory.return_value.__aenter__.return_value = mock_sess
            mock_upsert.return_value = fake_zone_result

            inp = ShippingZoneSetInput(
                governorates=["الإسكندرية"],
                price=60.0,
                delivery_time="2-3 أيام",
                company_id="company_test_1",
            )
            result = await shipping_zone_set(inp)

            assert result["status"] == "EXECUTED"
            assert result["action"] == "SHIPPING_ZONE_SET"
            assert result["result"]["id"] == "sz_alex_123"
            assert result["result"]["price"] == 60.0

            formatted = _format_shipping_zone_set(result)
            assert "تمت إضافة" in formatted
            assert "الإسكندرية" in formatted
            assert "60" in formatted

    @pytest.mark.asyncio
    async def test_shipping_zone_set_update_with_threshold(self):
        fake_zone_result = {
            "id": "sz_cairo_999",
            "name": "شحن القاهرة الكبرى",
            "governorates": ["القاهرة", "الجيزة"],
            "price": 45.0,
            "deliveryTime": "1-2 يوم",
            "freeShippingThreshold": 500.0,
            "isActive": True,
            "isUpdated": True,
        }

        with patch("src.db.session.init_db", new_callable=AsyncMock), \
             patch("src.db.session.async_session") as mock_session_factory, \
             patch("src.tools.repositories.shipping_repository.ShippingRepository.upsert_zone", new_callable=AsyncMock) as mock_upsert:

            mock_sess = AsyncMock()
            mock_session_factory.return_value.__aenter__.return_value = mock_sess
            mock_upsert.return_value = fake_zone_result

            inp = ShippingZoneSetInput(
                governorates="القاهرة, الجيزة",
                price=45.0,
                delivery_time="1-2 يوم",
                name="شحن القاهرة الكبرى",
                free_shipping_threshold=500.0,
                company_id="company_test_1",
            )
            result = await shipping_zone_set(inp)

            assert result["status"] == "EXECUTED"
            assert result["result"]["isUpdated"] is True

            formatted = _format_shipping_zone_set(result)
            assert "تم تحديث" in formatted
            assert "القاهرة, الجيزة" in formatted
            assert "500" in formatted
            assert "شحن مجاني" in formatted

    @pytest.mark.asyncio
    async def test_missing_company_id(self):
        inp = ShippingZoneSetInput(
            governorates=["الإسكندرية"],
            price=50.0,
            company_id=None,
        )
        result = await shipping_zone_set(inp)
        assert result["success"] is False
        assert "Missing company_id" in result["error"]

    @pytest.mark.asyncio
    async def test_missing_governorates(self):
        inp = ShippingZoneSetInput(
            governorates="",
            price=50.0,
            company_id="comp_1",
        )
        result = await shipping_zone_set(inp)
        assert result["success"] is False
        assert "محافظة واحدة" in result["error"]

    @pytest.mark.asyncio
    async def test_negative_price(self):
        inp = ShippingZoneSetInput(
            governorates=["طنطا"],
            price=-10.0,
            company_id="comp_1",
        )
        result = await shipping_zone_set(inp)
        assert result["success"] is False
        assert "سالباً" in result["error"]

    def test_tool_registration(self):
        reg = get_skill_registry()
        tool = reg.resolve("shipping_zone_set")
        assert tool is not None
        assert tool.name == "shipping_zone_set"
        assert tool.approval_mode == "never_require"
        assert shipping_zone_set_tool.name == "shipping_zone_set"
