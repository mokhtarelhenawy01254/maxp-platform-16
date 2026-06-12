from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import text

import src.db.session as _db_mod

logger = structlog.get_logger(__name__)

_VARIANT_SIZE_ALIASES = {"size", "Size", "مقاس", "المقاس"}
_VARIANT_COLOR_ALIASES = {"color", "Color", "لون", "اللون"}


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


def _nested(obj: Any, *keys: str) -> Any:
    for k in keys:
        if isinstance(obj, dict):
            obj = obj.get(k)
        else:
            return None
    return obj


async def _fetch_variants(product_ids: list[str]) -> dict[str, list[dict[str, Any]]]:
    if not product_ids:
        return {}
    sql = text("""
        SELECT "productId", name, type, sku, stock, "trackInventory"
        FROM product_variants
        WHERE "productId" = ANY(:pids)
          AND "isActive" = TRUE
        ORDER BY "sortOrder" ASC
    """)
    sf = _db_mod.async_session
    async with sf() as sess:
        rows = await sess.execute(sql, {"pids": product_ids})
        raw = [dict(r._mapping) for r in rows]
    result: dict[str, list[dict[str, Any]]] = {}
    for r in raw:
        pid = r["productId"]
        if pid not in result:
            result[pid] = []
        result[pid].append(r)
    return result


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

    where_clauses = [
        'p."companyId" = :company_id',
        'p."deletedAt" IS NULL',
        'p."isActive" = TRUE',
    ]
    params: dict[str, Any] = {"company_id": company_id, "limit": min(limit, 50)}

    clean_query = (query or "").strip()
    if clean_query:
        pattern = f"%{clean_query}%"
        where_clauses.append(
            '(p.name ILIKE :pattern OR p.sku ILIKE :pattern OR COALESCE(p.tags, \'\') ILIKE :pattern)'
        )
        params["pattern"] = pattern

    if product_size:
        size_pattern = f"%{product_size}%"
        where_clauses.append(
            'AND EXISTS (SELECT 1 FROM product_variants pv WHERE pv."productId" = p.id '
            'AND pv."isActive" = TRUE AND pv.type = ANY(:size_types) AND pv.name ILIKE :size_pattern)'
        )
        params["size_types"] = list(_VARIANT_SIZE_ALIASES)
        params["size_pattern"] = size_pattern

    if product_color:
        color_pattern = f"%{product_color}%"
        where_clauses.append(
            'AND EXISTS (SELECT 1 FROM product_variants pv WHERE pv."productId" = p.id '
            'AND pv."isActive" = TRUE AND pv.type = ANY(:color_types) AND pv.name ILIKE :color_pattern)'
        )
        params["color_types"] = list(_VARIANT_COLOR_ALIASES)
        params["color_pattern"] = color_pattern

    where_sql = " AND ".join(where_clauses)

    sql = text(f"""
        SELECT p.id, p.name, p.sku, p.price, p."comparePrice", p.stock,
               p."trackInventory", p."mainImage", p.images, p."isFeatured",
               p.tags, p."categoryId", c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON c.id = p."categoryId"
        WHERE {where_sql}
        ORDER BY p."updatedAt" DESC
        LIMIT :limit
    """)

    sf = _db_mod.async_session
    async with sf() as sess:
        rows = await sess.execute(sql, params)
        products_raw = [dict(r._mapping) for r in rows]

    if not products_raw:
        return {"found": False, "code": "PRODUCT_NOT_FOUND", "query": query, "products": []}

    pids = [p["id"] for p in products_raw]
    variants_map = await _fetch_variants(pids)

    for p in products_raw:
        p["productVariants"] = variants_map.get(p["id"], [])
        cat_name = p.pop("category_name", None)
        if cat_name:
            p["category"] = {"name": cat_name}

    mapped = [_map_product(p) for p in products_raw]

    return {"found": True, "count": len(mapped), "query": query, "products": mapped}


async def low_stock_products(
    company_id: str, threshold: int = 5, limit: int = 10
) -> dict[str, Any]:
    """List low-stock or out-of-stock active products."""
    if not company_id:
        return {"count": 0, "products": [], "code": "MISSING_COMPANY"}

    sql = text("""
        SELECT id, name, sku, stock, price
        FROM products
        WHERE "companyId" = :company_id
          AND "deletedAt" IS NULL
          AND "isActive" = TRUE
          AND "trackInventory" = TRUE
          AND stock <= :threshold
        ORDER BY stock ASC
        LIMIT :limit
    """)

    sf = _db_mod.async_session
    async with sf() as sess:
        rows = await sess.execute(sql, {
            "company_id": company_id,
            "threshold": threshold,
            "limit": limit,
        })
        data = [dict(r._mapping) for r in rows]

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

    start_date = _period_start_date(period)

    sql = text("""
        SELECT p.id, p.name AS "productName", p.sku,
               COALESCE(SUM(oi.quantity), 0)::int AS "quantitySold",
               COALESCE(SUM(oi.total), 0) AS revenue
        FROM products p
        JOIN order_items oi ON oi."productId" = p.id
        JOIN orders o ON o.id = oi."orderId"
        WHERE p."companyId" = :company_id
          AND p."deletedAt" IS NULL
          AND o."createdAt" >= :start_date
          AND o.status != 'CANCELLED'
        GROUP BY p.id, p.name, p.sku
        ORDER BY "quantitySold" DESC
        LIMIT :limit
    """)

    sf = _db_mod.async_session
    async with sf() as sess:
        rows = await sess.execute(sql, {
            "company_id": company_id,
            "start_date": start_date,
            "limit": limit,
        })
        data = [dict(r._mapping) for r in rows]

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


def _period_start_date(period: str) -> datetime:
    now = datetime.utcnow()
    period = period.lower()
    if period == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "yesterday":
        return (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        return now - timedelta(days=7)
    elif period == "month":
        return now - timedelta(days=30)
    elif period == "all":
        return datetime(2000, 1, 1)
    return now - timedelta(days=30)
