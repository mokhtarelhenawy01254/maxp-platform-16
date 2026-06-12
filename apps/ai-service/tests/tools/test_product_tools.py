from __future__ import annotations

from datetime import datetime

import pytest

from src.tools.product_tools import (
    _aggregate_variants,
    _availability_status,
    _map_product,
    _parse_images,
    _period_start_date,
    low_stock_products,
    search_products,
    top_selling_products,
)


# ── Pure unit tests (no DB) ────────────────────────────────────────────────


class TestAggregateVariants:
    def test_aggregates_size_variants(self):
        variants = [
            {"name": "42", "type": "size", "sku": "S-42", "stock": 10, "trackInventory": True},
            {"name": "44", "type": "size", "sku": "S-44", "stock": 0, "trackInventory": True},
            {"name": "أحمر", "type": "color", "sku": "C-R", "stock": 3, "trackInventory": True},
        ]
        result = _aggregate_variants(variants, {"size"})
        assert len(result) == 2
        assert result[0]["value"] == "42"
        assert result[0]["status"] == "IN_STOCK"
        assert result[1]["status"] == "OUT_OF_STOCK"

    def test_handles_track_inventory_false(self):
        variants = [
            {"name": "Red", "type": "color", "sku": "R", "stock": 0, "trackInventory": False},
        ]
        result = _aggregate_variants(variants, {"color"})
        assert result[0]["status"] == "AVAILABLE"

    def test_handles_none_stock(self):
        variants = [
            {"name": "L", "type": "size", "sku": "L", "stock": None, "trackInventory": True},
        ]
        result = _aggregate_variants(variants, {"size"})
        assert result[0]["stock"] == 0
        assert result[0]["status"] == "OUT_OF_STOCK"

    def test_returns_empty_when_no_type_match(self):
        variants = [{"name": "Red", "type": "color", "sku": "R", "stock": 5, "trackInventory": True}]
        result = _aggregate_variants(variants, {"size"})
        assert result == []


class TestAvailabilityStatus:
    def test_in_stock(self):
        assert _availability_status({"stock": 10, "trackInventory": True}) == "IN_STOCK"

    def test_out_of_stock(self):
        assert _availability_status({"stock": 0, "trackInventory": True}) == "OUT_OF_STOCK"

    def test_available_when_no_tracking(self):
        assert _availability_status({"stock": 0, "trackInventory": False}) == "AVAILABLE"

    def test_none_stock_is_out(self):
        assert _availability_status({"stock": None, "trackInventory": True}) == "OUT_OF_STOCK"


class TestParseImages:
    def test_main_image_only(self):
        result = _parse_images({"mainImage": "https://cdn.example.com/img.jpg", "images": None})
        assert result == ["https://cdn.example.com/img.jpg"]

    def test_main_and_extra_images(self):
        result = _parse_images({
            "mainImage": "https://cdn.example.com/1.jpg",
            "images": ["https://cdn.example.com/2.jpg", "https://cdn.example.com/3.jpg"],
        })
        assert len(result) == 3

    def test_skips_bare_filenames(self):
        result = _parse_images({
            "mainImage": "product.jpg",
            "images": ["https://cdn.example.com/img.jpg"],
        })
        assert result == ["https://cdn.example.com/img.jpg"]

    def test_empty_when_no_valid_urls(self):
        result = _parse_images({"mainImage": None, "images": None})
        assert result == []

    def test_parses_json_string_images(self):
        result = _parse_images({
            "mainImage": None,
            "images": '["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"]',
        })
        assert len(result) == 2

    def test_caps_at_eight_images(self):
        urls = [f"https://cdn.example.com/{i}.jpg" for i in range(20)]
        result = _parse_images({"mainImage": urls[0], "images": urls})
        assert len(result) == 8


class TestMapProduct:
    def test_maps_all_fields(self):
        raw = {
            "name": "Test Product",
            "sku": "TST-001",
            "price": 100.0,
            "comparePrice": 120.0,
            "stock": 10,
            "trackInventory": True,
            "isFeatured": True,
            "categoryName": "Electronics",
            "mainImage": "https://cdn.example.com/img.jpg",
            "productVariants": [
                {"name": "42", "type": "size", "sku": "S-42", "stock": 5, "trackInventory": True},
                {"name": "Red", "type": "color", "sku": "C-R", "stock": 3, "trackInventory": True},
            ],
        }
        result = _map_product(raw)
        assert result["name"] == "Test Product"
        assert result["sku"] == "TST-001"
        assert result["price"] == 100.0
        assert result["comparePrice"] == 120.0
        assert result["stock"] == 10
        assert result["status"] == "IN_STOCK"
        assert result["categoryName"] == "Electronics"
        assert result["featured"] is True
        assert len(result["availableSizes"]) == 1
        assert len(result["availableColors"]) == 1
        assert len(result["images"]) == 1

    def test_handles_missing_variants(self):
        result = _map_product({"name": "Simple", "stock": 5, "trackInventory": True})
        assert result["availableSizes"] == []
        assert result["availableColors"] == []


class TestPeriodStartDate:
    def test_today(self):
        d = _period_start_date("today")
        assert d.hour == 0
        assert d.minute == 0

    def test_month(self):
        d = _period_start_date("month")
        # Should be 30 days ago
        assert (datetime.utcnow() - d).days <= 31

    def test_all(self):
        d = _period_start_date("all")
        assert d.year == 2000

    def test_defaults_to_month(self):
        d = _period_start_date("unknown_period")
        assert (datetime.utcnow() - d).days <= 31


# ── Tests with mocked DB session ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_search_products_returns_not_found_with_empty_company(monkeypatch):
    result = await search_products(company_id="", query="test")
    assert result["found"] is False
    assert result["code"] == "MISSING_COMPANY"


@pytest.mark.asyncio
async def test_search_products_empty_query_returns_all(monkeypatch):
    class _Rows:
        def __init__(self, data):
            self._data = data
            self._idx = 0

        def __iter__(self):
            return iter(self._data)

        def first(self):
            return self._data[0] if self._data else None

    class _Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, sql, params):
            statement = str(sql)
            if "FROM products" in statement and "WHERE" in statement:
                return _Rows([])
            return _Rows([])

    monkeypatch.setattr("src.db.session.async_session", lambda: _Session())

    result = await search_products(company_id="comp1", query="")
    assert result["found"] is False
    assert result["code"] == "PRODUCT_NOT_FOUND"


@pytest.mark.asyncio
async def test_search_products_with_results(monkeypatch):
    class _Rows:
        def __init__(self, data):
            self._data = data
            self._idx = 0

        def __iter__(self):
            return iter(self._data)

        def first(self):
            return self._data[0] if self._data else None

    prod_row = type("Row", (), {
        "_mapping": {
            "id": "p1", "name": "Test Product", "sku": "TST-001",
            "price": 100.0, "comparePrice": None, "stock": 10,
            "trackInventory": True, "mainImage": "https://cdn.example.com/img.jpg",
            "images": None, "isFeatured": False, "tags": "",
            "categoryId": None, "category_name": None,
        }
    })()

    class _Session:
        call_count = 0

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, sql, params):
            _Session.call_count += 1
            statement = str(sql)
            if "FROM products" in statement:
                return _Rows([prod_row])
            if "FROM product_variants" in statement:
                return _Rows([])
            return _Rows([])

    monkeypatch.setattr("src.db.session.async_session", lambda: _Session())

    result = await search_products(company_id="comp1", query="test")
    assert result["found"] is True
    assert result["count"] >= 1
    assert result["products"][0]["name"] == "Test Product"


@pytest.mark.asyncio
async def test_low_stock_products(monkeypatch):
    class _Rows:
        def __init__(self, data):
            self._data = data
            self._idx = 0

        def __iter__(self):
            return iter(self._data)

        def first(self):
            return self._data[0] if self._data else None

    low_row = type("Row", (), {
        "_mapping": {
            "id": "p1", "name": "Low Stock Item", "sku": "LOW-001",
            "stock": 3, "price": 50.0,
        }
    })()

    class _Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, sql, params):
            return _Rows([low_row])

    monkeypatch.setattr("src.db.session.async_session", lambda: _Session())

    result = await low_stock_products(company_id="comp1", threshold=5)
    assert result["count"] == 1
    assert result["products"][0]["name"] == "Low Stock Item"
    assert result["products"][0]["stockRemaining"] == 3
    assert result["products"][0]["status"] == "LOW_STOCK"


@pytest.mark.asyncio
async def test_low_stock_products_empty(monkeypatch):
    class _Rows:
        def __init__(self, data):
            self._data = data
            self._idx = 0

        def __iter__(self):
            return iter(self._data)

        def first(self):
            return self._data[0] if self._data else None

    class _Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, sql, params):
            return _Rows([])

    monkeypatch.setattr("src.db.session.async_session", lambda: _Session())

    result = await low_stock_products(company_id="comp1")
    assert result["code"] == "NO_LOW_STOCK_PRODUCTS"


@pytest.mark.asyncio
async def test_low_stock_products_missing_company(monkeypatch):
    result = await low_stock_products(company_id="", threshold=5)
    assert result["code"] == "MISSING_COMPANY"


@pytest.mark.asyncio
async def test_top_selling_products_missing_company(monkeypatch):
    result = await top_selling_products(company_id="", period="month")
    assert result["code"] == "MISSING_COMPANY"


@pytest.mark.asyncio
async def test_top_selling_products_with_data(monkeypatch):
    class _Rows:
        def __init__(self, data):
            self._data = data
            self._idx = 0

        def __iter__(self):
            return iter(self._data)

        def first(self):
            return self._data[0] if self._data else None

    row = type("Row", (), {
        "_mapping": {
            "productName": "Top Seller",
            "quantitySold": 50,
            "revenue": 5000.0,
        }
    })()

    class _Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, sql, params):
            return _Rows([row])

    monkeypatch.setattr("src.db.session.async_session", lambda: _Session())

    result = await top_selling_products(company_id="comp1", period="month", limit=5)
    assert result["count"] == 1
    assert result["products"][0]["productName"] == "Top Seller"
    assert result["products"][0]["quantitySold"] == 50
