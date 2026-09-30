from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.tools.repositories.base import BaseRepository
from src.tools.definitions._helpers import period_start_date


class ProductSearchRepository(BaseRepository):
    """Data access for product search, listing, and analytics."""

    async def search_products(
        self,
        company_id: str,
        query: str,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """Search active products by name, SKU, or tags."""
        clean_query = (query or "").strip()
        params: dict[str, Any] = {"company_id": company_id, "limit": min(limit, 50)}
        order_rank = ""

        if clean_query:
            params["full_pattern"] = f"%{clean_query}%"

            # Split into meaningful words (3+ chars) to catch partial matches and typos
            words = [w for w in clean_query.split() if len(w) >= 3]

            if len(words) > 1:
                word_parts: list[str] = []
                word_score_parts: list[str] = []
                for i, word in enumerate(words[:6]):
                    key = f"word_{i}"
                    params[key] = f"%{word}%"
                    word_match = f"(p.name ILIKE :{key} OR p.sku ILIKE :{key} OR COALESCE(p.tags,'') ILIKE :{key})"
                    word_parts.append(word_match)
                    word_score_parts.append(f"(CASE WHEN {word_match} THEN 1 ELSE 0 END)")
                word_clause = " OR ".join(word_parts)
                words_score = " + ".join(word_score_parts)
                where = f"""
                    (p.name ILIKE :full_pattern
                     OR p.sku ILIKE :full_pattern
                     OR COALESCE(p.tags, '') ILIKE :full_pattern
                     OR {word_clause})
                """
                # Exact phrase matches rank first, then products matching the most query words
                order_rank = f"CASE WHEN p.name ILIKE :full_pattern THEN 0 ELSE 1 END, ({words_score}) DESC,"
            else:
                where = """
                    (p.name ILIKE :full_pattern
                     OR p.sku ILIKE :full_pattern
                     OR COALESCE(p.tags, '') ILIKE :full_pattern)
                """
        else:
            where = "TRUE"

        sql = text(f"""
            SELECT p.id, p.name, p.sku, p.price, p."comparePrice",
                   p.stock, p."trackInventory", p."isActive",
                   p."isFeatured", p.images, p."mainImage",
                   p."categoryId", c.name AS "categoryName",
                   p.tags, p.description, p.metadata
            FROM products p
            LEFT JOIN categories c ON c.id = p."categoryId"
            WHERE p."companyId" = :company_id
              AND p."deletedAt" IS NULL
              AND {where}
            ORDER BY
              {order_rank}
              CASE WHEN p."isFeatured" = TRUE THEN 0 ELSE 1 END,
              p.name ASC
            LIMIT :limit
        """)

        rows = await self._session.execute(sql, params)
        return [dict(r._mapping) for r in rows]

    async def get_low_stock_products(
        self, company_id: str, threshold: int = 5, limit: int = 20
    ) -> list[dict[str, Any]]:
        """List low-stock or out-of-stock products, checking both parent stock and variants."""
        sql = text("""
            SELECT 
                p.id, p.name, p.sku, p.stock, p.price,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', pv.id,
                            'name', pv.name,
                            'sku', pv.sku,
                            'stock', pv.stock
                        )
                    ) FILTER (WHERE pv.id IS NOT NULL AND pv.stock <= :threshold),
                    '[]'::json
                ) AS low_variants,
                MIN(pv.stock) AS min_variant_stock,
                COUNT(pv.id) FILTER (WHERE pv.stock <= :threshold) AS low_variant_count
            FROM products p
            LEFT JOIN product_variants pv 
                ON pv."productId" = p.id 
               AND pv."isActive" = TRUE 
               AND pv."trackInventory" = TRUE
            WHERE p."companyId" = :company_id
              AND p."deletedAt" IS NULL
              AND p."isActive" = TRUE
              AND p."trackInventory" = TRUE
            GROUP BY p.id, p.name, p.sku, p.stock, p.price
            HAVING p.stock <= :threshold OR COUNT(pv.id) FILTER (WHERE pv.stock <= :threshold) > 0
            ORDER BY LEAST(p.stock, COALESCE(MIN(pv.stock), p.stock)) ASC
            LIMIT :limit
        """)
        rows = await self._session.execute(sql, {
            "company_id": company_id,
            "threshold": threshold,
            "limit": limit,
        })
        return [dict(r._mapping) for r in rows]

    async def get_top_selling_products(
        self, company_id: str, start_date: datetime, limit: int = 5
    ) -> list[dict[str, Any]]:
        """List top-selling products for a time period."""
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
        rows = await self._session.execute(sql, {
            "company_id": company_id,
            "start_date": start_date,
            "limit": limit,
        })
        return [dict(r._mapping) for r in rows]

    async def get_categories(
        self, company_id: str, limit: int = 50
    ) -> list[dict[str, Any]]:
        """Get all categories with product counts."""
        sql = text("""
            SELECT c.id, c.name, COUNT(p.id)::int AS product_count
            FROM categories c
            LEFT JOIN products p ON p."categoryId" = c.id
                AND p."companyId" = :company_id
                AND p."deletedAt" IS NULL
                AND p."isActive" = TRUE
            WHERE c."companyId" = :company_id
            GROUP BY c.id, c.name
            ORDER BY c.name
            LIMIT :limit
        """)
        rows = await self._session.execute(sql, {
            "company_id": company_id,
            "limit": limit,
        })
        return [dict(r._mapping) for r in rows]

    async def get_product_variants(
        self, product_ids: list[str]
    ) -> dict[str, list[dict[str, Any]]]:
        """Fetch variants for a list of product IDs."""
        if not product_ids:
            return {}
        sql = text("""
            SELECT "productId", name, type, sku, stock, "trackInventory"
            FROM product_variants
            WHERE "productId" = ANY(:pids)
              AND "isActive" = TRUE
            ORDER BY "sortOrder" ASC
        """)
        rows = await self._session.execute(sql, {"pids": product_ids})
        raw = [dict(r._mapping) for r in rows]

        result: dict[str, list[dict[str, Any]]] = {}
        for r in raw:
            pid = r["productId"]
            if pid not in result:
                result[pid] = []
            result[pid].append(r)
        return result

    async def search_products_with_categories(
        self,
        company_id: str,
        query: str,
        limit: int = 5,
    ) -> tuple[list[dict[str, Any]], dict[str, list[dict[str, Any]]]]:
        """Search products and return both products and their categories."""
        products = await self.search_products(company_id, query, limit)
        product_ids = [p["id"] for p in products]
        variants = await self.get_product_variants(product_ids) if product_ids else {}
        return products, variants
