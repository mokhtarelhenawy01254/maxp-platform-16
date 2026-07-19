from __future__ import annotations

from datetime import datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.tools.repositories.product_repository import ProductRepository


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
        self._executed = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def execute(self, sql, params=None):
        self._executed.append((str(sql), params))
        # Match by SQL fragment
        stmt = str(sql)
        for key, rows in self._data_map.items():
            if key in stmt:
                return rows
        return _Rows([])


def _session(data_map: dict[str, _Rows]) -> AsyncSession:
    return _Session(data_map)  # type: ignore


class TestGetProduct:
    async def test_returns_product_when_found(self):
        s = _session({"FROM products": _Rows([_make_row({
            "id": "p1", "name": "Shoes", "price": 500, "images": None
        })])})
        repo = ProductRepository(s)  # type: ignore

        result = await repo.get_product("p1", "c1")

        assert result is not None
        assert result["id"] == "p1"
        assert result["name"] == "Shoes"
        assert result["price"] == 500

    async def test_returns_none_when_missing(self):
        s = _session({"FROM products": _Rows([])})
        repo = ProductRepository(s)  # type: ignore

        result = await repo.get_product("missing", "c1")

        assert result is None


class TestCountVisits:
    async def test_returns_count(self):
        s = _session({"product_visits": _Rows([_make_row({"cnt": 7})])})
        repo = ProductRepository(s)  # type: ignore

        result = await repo.count_visits("p1", "c1", datetime(2025, 1, 1), datetime(2025, 2, 1))

        assert result == 7

    async def test_returns_zero_when_no_data(self):
        s = _session({"product_visits": _Rows([_make_row({"cnt": 0})])})
        repo = ProductRepository(s)  # type: ignore

        result = await repo.count_visits("p1", "c1", datetime(2025, 1, 1), datetime(2025, 2, 1))

        assert result == 0


class TestCountConversionEvents:
    async def test_returns_count(self):
        s = _session({"conversion_events": _Rows([_make_row({"cnt": 3})])})
        repo = ProductRepository(s)  # type: ignore

        result = await repo.count_conversion_events("p1", "c1", "purchase", datetime(2025, 1, 1), datetime(2025, 2, 1))

        assert result == 3
        assert '"eventType" = :evt' in s._executed[0][0]

    async def test_binds_event_type(self):
        s = _session({"conversion_events": _Rows([_make_row({"cnt": 1})])})
        repo = ProductRepository(s)  # type: ignore

        await repo.count_conversion_events("p1", "c1", "add_to_cart", datetime(2025, 1, 1), datetime(2025, 2, 1))

        assert s._executed[0][1]["evt"] == "add_to_cart"


class TestGetSalesAggregate:
    async def test_returns_aggregate(self):
        s = _session({"order_items": _Rows([_make_row({"qty_sold": 10, "revenue": 5000})])})
        repo = ProductRepository(s)  # type: ignore

        result = await repo.get_sales_aggregate("p1", "c1", datetime(2025, 1, 1), datetime(2025, 2, 1))

        assert result["qty_sold"] == 10
        assert result["revenue"] == 5000

    async def test_returns_defaults_when_no_data(self):
        s = _session({"order_items": _Rows([])})
        repo = ProductRepository(s)  # type: ignore

        result = await repo.get_sales_aggregate("p1", "c1", datetime(2025, 1, 1), datetime(2025, 2, 1))

        assert result["qty_sold"] == 0
        assert result["revenue"] == 0
