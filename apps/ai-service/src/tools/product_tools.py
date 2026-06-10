from __future__ import annotations

from typing import Any

import structlog

from src.tools.backend_client import get_backend_client

logger = structlog.get_logger(__name__)


async def search_products(
    company_id: str, query: str, limit: int = 5, use_vector: bool = True
) -> dict[str, Any]:
    """Search active catalog products by name or SKU. Empty query returns all products."""
    client = get_backend_client()
    products = await client.search_products(company_id, query, limit=limit, use_vector=use_vector)

    if not products:
        return {
            "found": False,
            "code": "PRODUCT_NOT_FOUND",
            "query": query,
            "products": [],
        }

    mapped = []
    for p in products:
        mapped.append({
            "name": p.get("name"),
            "sku": p.get("sku"),
            "price": p.get("price"),
            "comparePrice": p.get("comparePrice"),
            "stock": p.get("stock"),
            "status": _availability_status(p),
            "categoryName": _nested(p, "category", "name"),
            "featured": bool(p.get("isFeatured")),
            "images": _parse_images(p),
        })

    return {
        "found": True,
        "count": len(mapped),
        "query": query,
        "products": mapped,
    }


async def low_stock_products(
    company_id: str, threshold: int = 5, limit: int = 10
) -> dict[str, Any]:
    """List low-stock or out-of-stock active products."""
    client = get_backend_client()
    products = await client.get_low_stock_products(company_id, threshold, limit)

    if not products:
        return {"count": 0, "products": [], "code": "NO_LOW_STOCK_PRODUCTS"}

    mapped = []
    for p in products:
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
    client = get_backend_client()
    products = await client.get_top_selling_products(company_id, period, limit)

    if not products:
        return {"count": 0, "products": [], "code": "NO_SALES_DATA", "period": period}

    result = []
    for i, p in enumerate(products):
        result.append({
            "rank": i + 1,
            "productName": p.get("productName") or p.get("name", ""),
            "quantitySold": p.get("quantitySold", 0) or p.get("quantity", 0),
            "revenue": str(p.get("revenue", 0) or p.get("total", 0)),
        })

    return {"count": len(result), "products": result}


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
    return images[:8]


def _nested(obj: Any, *keys: str) -> Any:
    for k in keys:
        if isinstance(obj, dict):
            obj = obj.get(k)
        else:
            return None
    return obj
