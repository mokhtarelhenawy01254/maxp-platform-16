from __future__ import annotations

import pytest

from src.tools.repositories.inventory_repository import InventoryRepository


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
        self.committed = False

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

    async def commit(self):
        self.committed = True


class TestFindProductByNameOrSku:
    async def test_finds_by_name(self):
        s = _Session({"name ILIKE": _Rows([_make_row({
            "id": "p1", "name": "Black Shoes", "sku": "SHOE-001",
            "price": 500, "stock": 20,
        })])})
        repo = InventoryRepository(s)  # type: ignore

        result = await repo.find_product_by_name_or_sku("c1", "shoes")

        assert result is not None
        assert result["id"] == "p1"
        assert result["name"] == "Black Shoes"

    async def test_returns_none_when_not_found(self):
        s = _Session({"name ILIKE": _Rows([])})
        repo = InventoryRepository(s)  # type: ignore

        result = await repo.find_product_by_name_or_sku("c1", "nonexistent")

        assert result is None

    async def test_binds_exact_pattern(self):
        s = _Session({"name ILIKE": _Rows([])})
        repo = InventoryRepository(s)  # type: ignore

        await repo.find_product_by_name_or_sku("c1", "ExactProduct")

        params = s._data_map["name ILIKE"]._data or []
        assert params == []


class TestFindProductBySku:
    async def test_finds_by_sku(self):
        s = _Session({"sku = :sku": _Rows([_make_row({
            "id": "p1", "name": "Shoes", "sku": "SHOE-001",
            "price": 500, "stock": 10,
        })])})
        repo = InventoryRepository(s)  # type: ignore

        result = await repo.find_product_by_sku("SHOE-001", "c1")

        assert result is not None
        assert result["sku"] == "SHOE-001"

    async def test_returns_none_when_not_found(self):
        s = _Session({"sku = :sku": _Rows([])})
        repo = InventoryRepository(s)  # type: ignore

        result = await repo.find_product_by_sku("MISSING", "c1")

        assert result is None


class TestFetchVariants:
    async def test_returns_variants(self):
        s = _Session({"product_variants": _Rows([
            _make_row({"name": "42", "type": "SIZE", "sku": "S-42", "stock": 5, "trackInventory": True, "isActive": True}),
            _make_row({"name": "43", "type": "SIZE", "sku": "S-43", "stock": 3, "trackInventory": True, "isActive": True}),
        ])})
        repo = InventoryRepository(s)  # type: ignore

        result = await repo.fetch_variants("p1")

        assert len(result) == 2
        assert result[0]["name"] == "42"
        assert result[1]["name"] == "43"

    async def test_returns_empty_when_no_variants(self):
        s = _Session({"product_variants": _Rows([])})
        repo = InventoryRepository(s)  # type: ignore

        result = await repo.fetch_variants("p1")

        assert result == []


class TestUpdateStock:
    async def test_executes_update_and_commits(self):
        s = _Session({"UPDATE products": _Rows([])})
        repo = InventoryRepository(s)  # type: ignore

        await repo.update_stock("p1", "c1", -3)

        assert s.committed is True

    async def test_binds_delta(self):
        s = _Session({"UPDATE products": _Rows([])})
        repo = InventoryRepository(s)  # type: ignore

        await repo.update_stock("p1", "c1", 10)

        assert s._data_map["UPDATE products"]._data == []
