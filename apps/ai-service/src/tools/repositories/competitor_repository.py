from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.tools.repositories.base import BaseRepository


class CompetitorRepository(BaseRepository):
    """Data access for competitor search, products, ads, and reports."""

    async def search_competitors(
        self, company_id: str, query: str, limit: int = 10
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
        rows = await self._session.execute(sql, {"cid": company_id, "pattern": pattern, "lim": limit})
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
        self, competitor_id: str, limit: int = 20
    ) -> list[dict[str, Any]]:
        sql = text("""
            SELECT id, name, price, currency, image, url, sku, "isAvailable", category, description
            FROM competitor_products
            WHERE "competitorId" = :comp_id
            ORDER BY "lastSeen" DESC
            LIMIT :lim
        """)
        rows = await self._session.execute(sql, {"comp_id": competitor_id, "lim": limit})
        return [dict(r._mapping) for r in rows]

    async def get_price_comparison(self, company_id: str, competitor_id: str) -> dict[str, Any]:
        comp_row = await self._session.execute(text("""
            SELECT id, name FROM competitors WHERE id = :cid AND "companyId" = :coid LIMIT 1
        """), {"cid": competitor_id, "coid": company_id})
        comp = comp_row.first()
        if not comp:
            return {"found": False, "error": "Competitor not found"}

        products_row = await self._session.execute(text("""
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
        self, competitor_id: str, limit: int = 10
    ) -> list[dict[str, Any]]:
        sql = text("""
            SELECT id, platform, "adId", "creativeUrl", copy, headline, cta, 
                   "destinationUrl", status, "firstSeen", "lastSeen", metadata
            FROM competitor_ads
            WHERE "competitorId" = :cid
            ORDER BY "createdAt" DESC
            LIMIT :lim
        """)
        rows = await self._session.execute(sql, {"cid": competitor_id, "lim": limit})
        res = []
        now = datetime.utcnow()
        for r in rows:
            m = dict(r._mapping)
            first_seen = m.get("firstSeen")
            days_active = 1
            if first_seen and hasattr(first_seen, "replace"):
                try:
                    delta = now - first_seen.replace(tzinfo=None)
                    days_active = max(1, delta.days)
                except Exception:
                    days_active = 1

            longevity_tier = "TESTING_NEW"
            is_winner = False
            badge = "إعلان تجريبي حديث (< 10 أيام)"
            if days_active >= 25:
                longevity_tier = "PROVEN_WINNER"
                is_winner = True
                badge = f"🔥 إعلان رابح ومثبت ({days_active} يوماً تشغيل متواصل)"
            elif days_active >= 10:
                longevity_tier = "PROMISING_SCALE"
                badge = f"⚡ إعلان واعد قيد التوسيع ({days_active} يوماً)"

            res.append({
                "id": m.get("id"),
                "adId": m.get("adId"),
                "platform": m.get("platform") or "facebook",
                "headline": m.get("headline") or "",
                "copy": m.get("copy") or "",
                "cta": m.get("cta") or "SHOP_NOW",
                "creativeUrl": m.get("creativeUrl") or "",
                "destinationUrl": m.get("destinationUrl") or "",
                "status": m.get("status") or "ACTIVE",
                "daysActive": days_active,
                "longevityTier": longevity_tier,
                "isWinner": is_winner,
                "badge": badge,
                "firstSeen": str(m.get("firstSeen")) if m.get("firstSeen") else None,
                "lastSeen": str(m.get("lastSeen")) if m.get("lastSeen") else None,
            })
        res.sort(key=lambda x: x["daysActive"], reverse=True)
        return res

    async def search_competitor_ads(
        self, company_id: str, query: str = "", limit: int = 10
    ) -> list[dict[str, Any]]:
        if not company_id:
            return []
        pattern = f"%{query}%" if query else "%"
        sql = text("""
            SELECT a.id, a.platform, a."adId", a."creativeUrl", a.copy, a.headline, a.cta, 
                   a."destinationUrl", a.status, a."firstSeen", a."lastSeen", c.name as "competitorName"
            FROM competitor_ads a
            JOIN competitors c ON c.id = a."competitorId"
            WHERE c."companyId" = :cid
              AND (a.copy ILIKE :pattern OR a.headline ILIKE :pattern OR c.name ILIKE :pattern)
            ORDER BY a."createdAt" DESC
            LIMIT :lim
        """)
        rows = await self._session.execute(sql, {"cid": company_id, "pattern": pattern, "lim": limit})
        res = []
        now = datetime.utcnow()
        for r in rows:
            m = dict(r._mapping)
            first_seen = m.get("firstSeen")
            days_active = 1
            if first_seen and hasattr(first_seen, "replace"):
                try:
                    delta = now - first_seen.replace(tzinfo=None)
                    days_active = max(1, delta.days)
                except Exception:
                    days_active = 1

            longevity_tier = "TESTING_NEW"
            is_winner = False
            badge = "إعلان تجريبي حديث (< 10 أيام)"
            if days_active >= 25:
                longevity_tier = "PROVEN_WINNER"
                is_winner = True
                badge = f"🔥 إعلان رابح ومثبت ({days_active} يوماً تشغيل متواصل)"
            elif days_active >= 10:
                longevity_tier = "PROMISING_SCALE"
                badge = f"⚡ إعلان واعد قيد التوسيع ({days_active} يوماً)"

            res.append({
                "id": m.get("id"),
                "competitorName": m.get("competitorName") or "منافس",
                "platform": m.get("platform") or "facebook",
                "headline": m.get("headline") or "",
                "copy": m.get("copy") or "",
                "cta": m.get("cta") or "SHOP_NOW",
                "creativeUrl": m.get("creativeUrl") or "",
                "destinationUrl": m.get("destinationUrl") or "",
                "status": m.get("status") or "ACTIVE",
                "daysActive": days_active,
                "longevityTier": longevity_tier,
                "isWinner": is_winner,
                "badge": badge,
                "firstSeen": str(m.get("firstSeen")) if m.get("firstSeen") else None,
                "lastSeen": str(m.get("lastSeen")) if m.get("lastSeen") else None,
            })
        res.sort(key=lambda x: x["daysActive"], reverse=True)
        return res

    async def generate_report(
        self, competitor_id: str, report_type: str = "weekly"
    ) -> dict[str, Any]:
        comp_row = await self._session.execute(text("""
            SELECT id, name, url, description FROM competitors WHERE id = :cid LIMIT 1
        """), {"cid": competitor_id})
        comp = comp_row.first()
        if not comp:
            return {"success": False, "error": "Competitor not found"}

        products_row = await self._session.execute(text("""
            SELECT COUNT(*)::int AS cnt,
                   COALESCE(AVG(price), 0) AS avg_price,
                   COUNT(*) FILTER (WHERE "isAvailable" = TRUE)::int AS available
            FROM competitor_products
            WHERE "competitorId" = :cid
        """), {"cid": competitor_id})
        _pr_first = products_row.first()
        stats = dict(_pr_first._mapping) if _pr_first else {}

        ads_row = await self._session.execute(text("""
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
