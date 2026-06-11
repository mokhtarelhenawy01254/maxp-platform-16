from __future__ import annotations

from typing import Any

import structlog

from src.tools.backend_client import get_backend_client

logger = structlog.get_logger(__name__)

_VARIANT_SIZE_ALIASES = {"size", "Size", "مقاس", "المقاس"}
_VARIANT_COLOR_ALIASES = {"color", "Color", "لون", "اللون"}


def _aggregate_variants(
    variants: list[dict[str, Any]], aliases: set[str],
) -> list[dict[str, Any]]:
    """Filter and map variants whose type matches one of the given aliases."""
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
    """Map a single product dict from the bridge into the agent-facing format."""
    variants = p.get("productVariants") or []
    size_variants = _aggregate_variants(variants, _VARIANT_SIZE_ALIASES)
    color_variants = _aggregate_variants(variants, _VARIANT_COLOR_ALIASES)

    return {
        "name": p.get("name"),
        "sku": p.get("sku"),
        "price": p.get("price"),
        "comparePrice": p.get("comparePrice"),
        "stock": p.get("stock"),
        "status": _availability_status(p),
        "categoryName": _nested(p, "category", "name"),
        "featured": bool(p.get("isFeatured")),
        "images": _parse_images(p),
        "availableSizes": size_variants,
        "availableColors": color_variants,
    }


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
    client = get_backend_client()
    products = await client.search_products(
        company_id, query,
        limit=limit,
        use_vector=use_vector,
        product_size=product_size,
        product_color=product_color,
        conversation_id=conversation_id,
        references_previous_product=references_previous_product,
    )

    if not products:
        return {
            "found": False,
            "code": "PRODUCT_NOT_FOUND",
            "query": query,
            "products": [],
        }

    mapped = [_map_product(p) for p in products]

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


async def list_categories(
    company_id: str,
    limit: int = 50,
) -> dict[str, Any]:
    """List all available product categories by scanning the catalog."""
    mapped = await search_products(
        company_id=company_id,
        query="",
        limit=limit,
        use_vector=False,
    )

    categories: dict[str, list[dict[str, Any]]] = {}
    products = mapped.get("products", [])
    for p in products:
        cat_name = p.get("categoryName")
        if cat_name:
            if cat_name not in categories:
                categories[cat_name] = []
            categories[cat_name].append({
                "name": p.get("name"),
                "sku": p.get("sku"),
                "price": p.get("price"),
                "stock": p.get("stock"),
                "status": p.get("status"),
            })

    result = []
    for cat_name, cat_products in sorted(categories.items()):
        result.append({
            "category": cat_name,
            "productCount": len(cat_products),
            "products": cat_products,
        })

    return {
        "found": len(result) > 0,
        "count": len(result),
        "categories": result,
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
    return images[:8]


def _nested(obj: Any, *keys: str) -> Any:
    for k in keys:
        if isinstance(obj, dict):
            obj = obj.get(k)
        else:
            return None
    return obj
