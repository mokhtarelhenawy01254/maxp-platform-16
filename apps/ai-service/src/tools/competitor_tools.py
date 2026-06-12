from __future__ import annotations

from datetime import datetime
from typing import Any

import structlog
from sqlalchemy import text

import src.db.session as _db_mod

logger = structlog.get_logger(__name__)


async def search_competitors(
    company_id: str, query: str, limit: int = 10
) -> list[dict[str, Any]]:
    if not company_id or not query:
        return []
    pattern = f"%{query}%"
    sql = text("""
        SELECT id, name, slug, url, logo, description, notes, "isActive"
        FROM competitors
        WHERE "companyId" = :cid
          AND (name ILIKE :pattern OR url ILIKE :pattern OR description ILIKE :pattern)
        ORDER BY name ASC
        LIMIT :lim
    """)
    sf = _db_mod.async_session
    async with sf() as sess:
        rows = await sess.execute(sql, {"cid": company_id, "pattern": pattern, "lim": limit})
        return [
            {
                "id": r.id,
                "name": r.name,
                "slug": r.slug,
                "url": r.url,
                "logo": r.logo,
                "description": r.description,
                "isActive": r.isActive,
            }
            for r in rows
        ]


async def get_competitor_products(
    company_id: str, competitor_id: str, limit: int = 20
) -> list[dict[str, Any]]:
    if not company_id or not competitor_id:
        return []
    sql = text("""
        SELECT id, name, price, currency, image, url, sku, "isAvailable", category, description
        FROM competitor_products
        WHERE "competitorId" = :comp_id
        ORDER BY "lastSeen" DESC
        LIMIT :lim
    """)
    sf = _db_mod.async_session
    async with sf() as sess:
        rows = await sess.execute(sql, {"comp_id": competitor_id, "lim": limit})
        return [dict(r._mapping) for r in rows]


async def competitor_price_compare(
    company_id: str, competitor_id: str
) -> dict[str, Any]:
    if not company_id or not competitor_id:
        return {"found": False, "error": "Missing params"}

    sf = _db_mod.async_session
    async with sf() as sess:
        comp_row = await sess.execute(text("""
            SELECT id, name FROM competitors WHERE id = :cid AND "companyId" = :coid LIMIT 1
        """), {"cid": competitor_id, "coid": company_id})
        comp = comp_row.first()
        if not comp:
            return {"found": False, "error": "Competitor not found"}

        products_row = await sess.execute(text("""
            SELECT name, price, currency, "isAvailable"
            FROM competitor_products
            WHERE "competitorId" = :cid
            ORDER BY "lastSeen" DESC
            LIMIT 50
        """), {"cid": competitor_id})
        products = [dict(r._mapping) for r in products_row]

    return {
        "found": True,
        "competitorName": comp.name,
        "productCount": len(products),
        "products": [
            {
                "productName": p["name"],
                "price": str(p.get("price", 0)),
                "currency": p.get("currency", "EGP"),
                "isAvailable": p.get("isAvailable", False),
            }
            for p in products
        ],
    }


async def get_competitor_ads(
    company_id: str, competitor_id: str, limit: int = 10
) -> list[dict[str, Any]]:
    if not company_id or not competitor_id:
        return []
    sql = text("""
        SELECT id, "adContent", platform, url, "estimatedSpend", "startDate", "endDate"
        FROM competitor_ads
        WHERE "competitorId" = :cid
        ORDER BY "startDate" DESC
        LIMIT :lim
    """)
    sf = _db_mod.async_session
    async with sf() as sess:
        rows = await sess.execute(sql, {"cid": competitor_id, "lim": limit})
        return [dict(r._mapping) for r in rows]


async def generate_report(
    company_id: str, competitor_id: str, report_type: str = "weekly"
) -> dict[str, Any]:
    if not company_id or not competitor_id:
        return {"success": False, "error": "Missing params"}

    sf = _db_mod.async_session
    async with sf() as sess:
        comp_row = await sess.execute(text("""
            SELECT id, name, url, description FROM competitors WHERE id = :cid LIMIT 1
        """), {"cid": competitor_id})
        comp = comp_row.first()
        if not comp:
            return {"success": False, "error": "Competitor not found"}

        products_row = await sess.execute(text("""
            SELECT COUNT(*)::int AS cnt,
                   COALESCE(AVG(price), 0) AS avg_price,
                   COUNT(*) FILTER (WHERE "isAvailable" = TRUE)::int AS available
            FROM competitor_products
            WHERE "competitorId" = :cid
        """), {"cid": competitor_id})
        _pr_first = products_row.first()
        stats = dict(_pr_first._mapping) if _pr_first else {}

        ads_row = await sess.execute(text("""
            SELECT COUNT(*)::int AS cnt FROM competitor_ads WHERE "competitorId" = :cid
        """), {"cid": competitor_id})
        _ad_first = ads_row.first()
        ad_count = _ad_first.cnt if _ad_first else 0

    return {
        "success": True,
        "reportType": report_type,
        "competitorName": comp.name,
        "competitorUrl": comp.url,
        "stats": {
            "totalProducts": stats.get("cnt", 0),
            "availableProducts": stats.get("available", 0),
            "averagePrice": float(stats.get("avg_price", 0)),
            "totalAds": ad_count,
        },
        "generatedAt": str(datetime.utcnow()),
    }
