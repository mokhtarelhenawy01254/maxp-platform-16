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
    def __init__(self, data_map: dict[str, _Rows]):
        self._data_map = data_map

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def execute(self, sql, params=None):
        stmt = str(sql)
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
