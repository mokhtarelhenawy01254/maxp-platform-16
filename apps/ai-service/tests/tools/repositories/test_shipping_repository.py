from __future__ import annotations

import pytest

from src.tools.repositories.shipping_repository import ShippingRepository


def _make_row(mapping: dict):
    return type("Row", (), {**mapping, "_mapping": mapping})()


class _Rows:
    def __init__(self, data: list):
        self._data = data

    def first(self):
        return self._data[0] if self._data else None

    def __iter__(self):
        return iter(self._data)


class _Session:
    def __init__(self, data_map: dict[str, _Rows] | None = None):
        self._data_map = data_map or {}
        self.executed_statements: list[tuple[str, dict | None]] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def commit(self):
        pass

    async def execute(self, sql, params=None):
        stmt = str(sql)
        self.executed_statements.append((stmt, params))
        for key, rows in self._data_map.items():
            if key in stmt:
                return rows
        return _Rows([])


class TestFindZoneForGovernorate:
    async def test_returns_zone_when_found(self):
        s = _Session({"shipping_zones": _Rows([_make_row({
            "name": "Cairo Zone",
            "price": 50,
            "deliveryTime": "1-2 days",
            "freeShippingThreshold": 1000,
        })])})

        repo = ShippingRepository(s)  # type: ignore
        result = await repo.find_zone_for_governorate("c1", "cairo")

        assert result is not None
        assert result["name"] == "Cairo Zone"
        assert result["price"] == 50
        assert result["deliveryTime"] == "1-2 days"

    async def test_returns_none_when_not_found(self):
        s = _Session({"shipping_zones": _Rows([])})
        repo = ShippingRepository(s)  # type: ignore

        result = await repo.find_zone_for_governorate("c1", "unknown")

        assert result is None


class TestUpsertZone:
    async def test_upsert_creates_new_zone(self):
        gov_row = _make_row({"id": "gov_alex", "nameAr": "الإسكندرية"})
        s = _Session({
            "FROM governorates": _Rows([gov_row]),
            "SELECT sz.id FROM shipping_zones": _Rows([]),
            "INSERT INTO shipping_zones": _Rows([_make_row({
                "id": "new_sz_1",
                "name": "شحن الإسكندرية",
                "price": 60,
                "deliveryTime": "2-3 أيام",
                "freeShippingThreshold": None,
                "isActive": True,
            })]),
        })

        repo = ShippingRepository(s)  # type: ignore
        result = await repo.upsert_zone(
            company_id="comp_1",
            governorates=["الإسكندرية"],
            price=60.0,
            delivery_time="2-3 أيام",
        )

        assert result["price"] == 60.0
        assert result["governorates"] == ["الإسكندرية"]
        assert result["isUpdated"] is False
        assert result["name"] == "شحن الإسكندرية"

    async def test_upsert_updates_existing_zone(self):
        gov_row = _make_row({"id": "gov_cairo", "nameAr": "القاهرة"})
        existing_zone_row = _make_row({"id": "sz_cairo_123"})
        s = _Session({
            "FROM governorates": _Rows([gov_row]),
            "JOIN shipping_zone_governorates": _Rows([existing_zone_row]),
            "UPDATE shipping_zones": _Rows([_make_row({
                "id": "sz_cairo_123",
                "name": "شحن القاهرة",
                "price": 45,
                "deliveryTime": "1-2 أيام",
                "freeShippingThreshold": 500,
                "isActive": True,
            })]),
        })

        repo = ShippingRepository(s)  # type: ignore
        result = await repo.upsert_zone(
            company_id="comp_1",
            governorates=["القاهرة"],
            price=45.0,
            delivery_time="1-2 أيام",
            free_shipping_threshold=500.0,
        )

        assert result["price"] == 45.0
        assert result["id"] == "sz_cairo_123"
        assert result["isUpdated"] is True
        assert result["freeShippingThreshold"] == 500.0

    async def test_upsert_raises_error_on_empty_governorates(self):
        s = _Session()
        repo = ShippingRepository(s)  # type: ignore

        with pytest.raises(ValueError):
            await repo.upsert_zone(
                company_id="comp_1",
                governorates=[],
                price=50.0,
            )

