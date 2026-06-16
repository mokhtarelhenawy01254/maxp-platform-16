from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any

import structlog

import src.db.session as _db_mod
from src.tools.definitions._helpers import _write_result, period_start_date
from src.tools.repositories.product_search_repository import ProductSearchRepository

logger = structlog.get_logger(__name__)


_VARIANT_SIZE_ALIASES = {"size", "Size", "\u0645\u0642\u0627\u0633", "\u0627\u0644\u0645\u0642\u0627\u0633"}
_VARIANT_COLOR_ALIASES = {"color", "Color", "\u0644\u0648\u0646", "\u0627\u0644\u0644\u0648\u0646"}


def _aggregate_variants(
    variants: list[dict[str, Any]], aliases: set[str],
) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for v in variants:
        vtype = (v.get("type") or "").strip()
        if vtype not in aliases:
            continue
        stock = v.get("stock", 0)
        track = v.get("trackInventory", True)
        if stock is None:
            stock = 0
        result.append({
            "value": v.get("name", ""),
            "sku": v.get("sku"),
            "stock": stock,
            "status": "AVAILABLE" if not track else (
                "OUT_OF_STOCK" if stock <= 0 else (
                    "LOW_STOCK" if 0 < stock <= 5 else "IN_STOCK"
                )
            ),
        })
    return result


def _map_product(p: dict[str, Any]) -> dict[str, Any]:
    variants = p.get("productVariants") or p.get("_variants") or []
    size_variants = _aggregate_variants(variants, _VARIANT_SIZE_ALIASES)
    color_variants = _aggregate_variants(variants, _VARIANT_COLOR_ALIASES)
    return {
        "name": p.get("name"),
        "sku": p.get("sku"),
        "price": p.get("price"),
        "comparePrice": p.get("comparePrice"),
        "stock": p.get("stock"),
        "status": _availability_status(p),
        "categoryName": p.get("categoryName"),
        "featured": bool(p.get("isFeatured")),
        "images": _parse_images(p),
        "availableSizes": size_variants,
        "availableColors": color_variants,
    }


def _availability_status(product: dict[str, Any]) -> str:
    stock = product.get("stock", 0)
    track = product.get("trackInventory", True)
    if not track:
        return "AVAILABLE"
    if stock is None or stock <= 0:
        return "OUT_OF_STOCK"
    return "IN_STOCK"


def _is_valid_image_url(url: str) -> bool:
    return bool(url and (url.startswith("http://") or url.startswith("https://")))


def _parse_images(product: dict[str, Any]) -> list[str]:
    images: list[str] = []
    main = product.get("mainImage")
    if main and _is_valid_image_url(str(main)):
        images.append(str(main))
    extra = product.get("images")
    if isinstance(extra, list):
        for img in extra:
            if img and _is_valid_image_url(str(img)):
                images.append(str(img))
    elif isinstance(extra, str):
        try:
            parsed = json.loads(extra)
            if isinstance(parsed, list):
                for img in parsed:
                    if img and _is_valid_image_url(str(img)):
                        images.append(str(img))
        except json.JSONDecodeError:
            pass
    return images[:8]


async def search_products(
    company_id: str,
    query: str,
    limit: int = 5,
    use_vector: bool = True,
    product_size: str | None = None,
    product_color: str | None = None,
    conversation_id: str | None = None,
    references_previous_product: bool | None = None,
) -> dict[str, Any]:
    """Search active catalog products by name or SKU. Empty query returns all products."""
    if not company_id:
        return {"found": False, "code": "MISSING_COMPANY", "query": query, "products": []}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = ProductSearchRepository(sess)
        products_raw, variants_map = await repo.search_products_with_categories(
            company_id, query or "", limit
        )

    # Attach variants to products
    for p in products_raw:
        pid = p.get("id")
        if pid and pid in variants_map:
            p["productVariants"] = variants_map[pid]

    mapped = [_map_product(p) for p in products_raw]
    return {"found": True, "count": len(mapped), "query": query, "products": mapped}


async def low_stock_products(
    company_id: str, threshold: int = 5, limit: int = 10
) -> dict[str, Any]:
    """List low-stock or out-of-stock active products."""
    if not company_id:
        return {"count": 0, "products": [], "code": "MISSING_COMPANY"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = ProductSearchRepository(sess)
        data = await repo.get_low_stock_products(company_id, threshold, limit)

    if not data:
        return {"count": 0, "products": [], "code": "NO_LOW_STOCK_PRODUCTS"}

    mapped = []
    for p in data:
        stock = p.get("stock", 0)
        mapped.append({
            "name": p.get("name"),
            "sku": p.get("sku"),
            "stockRemaining": stock,
            "price": str(p.get("price", 0)),
            "status": "OUT_OF_STOCK" if stock == 0 else "LOW_STOCK",
        })

    return {"count": len(mapped), "products": mapped}


async def top_selling_products(
    company_id: str, period: str = "month", limit: int = 5
) -> dict[str, Any]:
    """List top-selling products for a time period."""
    if not company_id:
        return {"count": 0, "products": [], "code": "MISSING_COMPANY", "period": period}

    start_date = period_start_date(period)

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = ProductSearchRepository(sess)
        data = await repo.get_top_selling_products(company_id, start_date, limit)

    if not data:
        return {"count": 0, "products": [], "code": "NO_SALES_DATA", "period": period}

    result = []
    for i, p in enumerate(data):
        result.append({
            "rank": i + 1,
            "productName": p.get("productName", ""),
            "quantitySold": p.get("quantitySold", 0),
            "revenue": str(p.get("revenue", 0)),
        })

    return {"count": len(result), "products": result, "period": period}


async def list_categories(
    company_id: str,
    limit: int = 50,
) -> dict[str, Any]:
    """List all available product categories by scanning the catalog."""
    sf = _db_mod.async_session
    async with sf() as sess:
        repo = ProductSearchRepository(sess)
        categories_raw = await repo.get_categories(company_id, limit)

    result = []
    for cat in categories_raw:
        result.append({
            "category": cat.get("name", ""),
            "productCount": cat.get("product_count", 0),
        })

    return {
        "found": len(result) > 0,
        "count": len(result),
        "categories": result,
    }
