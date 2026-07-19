from __future__ import annotations

from datetime import datetime

import pytest

from src.tools.product_tools import (
    _aggregate_variants,
    _availability_status,
    _map_product,
    _parse_images,
    low_stock_products,
    search_products,
    top_selling_products,
)
from src.tools.definitions._helpers import period_start_date


# ── Pure unit tests (no DB) ────────────────────────────────────────────────

class TestAvailabilityStatus:
    def test_in_stock(self):
        assert _availability_status({"stock": 10, "trackInventory": True}) == "IN_STOCK"

    def test_out_of_stock(self):
        assert _availability_status({"stock": 0, "trackInventory": True}) == "OUT_OF_STOCK"

    def test_out_of_stock_none(self):
        assert _availability_status({"stock": None, "trackInventory": True}) == "OUT_OF_STOCK"

    def test_available_when_not_tracking(self):
        assert _availability_status({"stock": 0, "trackInventory": False}) == "AVAILABLE"


class TestParseImages:
    def test_main_image_only(self):
        product = {"mainImage": "https://example.com/img.jpg"}
        result = _parse_images(product)
        assert result == ["https://example.com/img.jpg"]

    def test_empty_string_skipped(self):
        product = {"mainImage": ""}
        assert _parse_images(product) == []

    def test_list_of_images(self):
        product = {
            "mainImage": "https://example.com/main.jpg",
            "images": ["https://example.com/1.jpg", "https://example.com/2.jpg"],
        }
        result = _parse_images(product)
        assert len(result) == 3

    def test_json_string_images(self):
        product = {
            "images": '["https://example.com/a.jpg"]',
        }
        result = _parse_images(product)
        assert result == ["https://example.com/a.jpg"]

    def test_max_8_images(self):
        product = {"images": [f"https://example.com/{i}.jpg" for i in range(15)]}
        result = _parse_images(product)
        assert len(result) == 8


class TestAggregateVariants:
    def test_size_variants(self):
        variants = [
            {"type": "size", "name": "L", "sku": "SKU-L", "stock": 5, "trackInventory": True},
            {"type": "color", "name": "Red", "sku": "SKU-R", "stock": 3, "trackInventory": True},
        ]
        result = _aggregate_variants(variants, {"size", "Size"})
        assert len(result) == 1
        assert result[0]["value"] == "L"

    def test_low_stock_variant(self):
        variants = [
            {"type": "size", "name": "M", "sku": None, "stock": 2, "trackInventory": True},
        ]
        result = _aggregate_variants(variants, {"size"})
        assert result[0]["status"] == "LOW_STOCK"


class TestMapProduct:
    def test_basic_mapping(self):
        product = {
            "name": "Shirt",
            "sku": "SHIRT-1",
            "price": 100,
            "comparePrice": 150,
            "stock": 10,
            "trackInventory": True,
            "isFeatured": True,
            "categoryName": "Clothing",
            "images": [],
            "mainImage": None,
            "productVariants": [],
        }
        result = _map_product(product)
        assert result["name"] == "Shirt"
        assert result["featured"] is True
        assert result["status"] == "IN_STOCK"


class TestPeriodStartDate:
    def test_today(self):
        d = period_start_date("today")
        assert d.hour == 0 and d.minute == 0

    def test_month(self):
        d = period_start_date("month")
        assert (datetime.utcnow() - d).days <= 31

    def test_all(self):
        d = period_start_date("all")
        assert d.year < 2020

    def test_defaults_to_month(self):
        d = period_start_date("unknown_period")
        assert (datetime.utcnow() - d).days <= 31


# ── Integration tests (need DB) ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_top_selling_products_with_data():
    """Smoke test: function should not crash even without real DB."""
    result = await top_selling_products(company_id="", period="month", limit=5)
    assert "products" in result
    assert result.get("code") == "MISSING_COMPANY"
