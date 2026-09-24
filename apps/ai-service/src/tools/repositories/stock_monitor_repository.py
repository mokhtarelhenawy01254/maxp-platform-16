from __future__ import annotations

from typing import Any

from sqlalchemy import text

from src.tools.repositories.base import BaseRepository


class StockMonitorRepository(BaseRepository):
    """Repository for deep variant-level inventory monitoring and burn rate forecasting."""

    async def scan_variant_low_stock(
        self,
        company_id: str,
        threshold: int = 5,
        include_out_of_stock_only: bool = False,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Deep scan across products and product variants for low-stock and out-of-stock items."""
        if not company_id:
            return []

        stock_filter = "stock <= 0" if include_out_of_stock_only else "stock <= :threshold"

        sql = text(f"""
            WITH low_stock_items AS (
                -- 1) Base products that have NO active variants
                SELECT
                    p.id AS product_id,
                    p.name AS product_name,
                    p.sku AS product_sku,
                    NULL AS variant_id,
                    NULL AS variant_name,
                    NULL AS variant_sku,
                    p.stock,
                    p.price,
                    p."mainImage" AS image,
                    CASE WHEN p.stock <= 0 THEN 'OUT_OF_STOCK' ELSE 'LOW_STOCK' END AS status
                FROM products p
                WHERE p."companyId" = :cid
                  AND p."deletedAt" IS NULL
                  AND p."isActive" = TRUE
                  AND p."trackInventory" = TRUE
                  AND p.{stock_filter}
                  AND NOT EXISTS (
                      SELECT 1 FROM product_variants pv
                      WHERE pv."productId" = p.id AND pv."isActive" = TRUE
                  )

                UNION ALL

                -- 2) Variants of products (sizes/colors) with low or zero stock
                SELECT
                    p.id AS product_id,
                    p.name AS product_name,
                    p.sku AS product_sku,
                    pv.id AS variant_id,
                    pv.name AS variant_name,
                    pv.sku AS variant_sku,
                    pv.stock,
                    COALESCE(pv.price, p.price) AS price,
                    p."mainImage" AS image,
                    CASE WHEN pv.stock <= 0 THEN 'OUT_OF_STOCK' ELSE 'LOW_STOCK' END AS status
                FROM product_variants pv
                JOIN products p ON p.id = pv."productId"
                WHERE p."companyId" = :cid
                  AND p."deletedAt" IS NULL
                  AND p."isActive" = TRUE
                  AND pv."isActive" = TRUE
                  AND COALESCE(pv."trackInventory", p."trackInventory", TRUE) = TRUE
                  AND pv.{stock_filter}
            )
            SELECT * FROM low_stock_items
            ORDER BY
              CASE WHEN status = 'OUT_OF_STOCK' THEN 0 ELSE 1 END,
              stock ASC,
              product_name ASC
            LIMIT :limit
        """)

        rows = await self._session.execute(sql, {
            "cid": company_id,
            "threshold": threshold,
            "limit": max(1, min(limit, 100)),
        })
        return [dict(r._mapping) for r in rows]

    async def calculate_burn_rate_and_forecast(
        self,
        company_id: str,
        days_lookback: int = 7,
        limit: int = 30,
    ) -> list[dict[str, Any]]:
        """Calculate product sales velocity (burn rate) and predict exhaustion time."""
        if not company_id:
            return []

        days = max(1, min(days_lookback, 90))

        sql = text("""
            WITH recent_sales AS (
                SELECT
                    oi."productId",
                    COALESCE(SUM(oi.quantity), 0)::int AS total_sold
                FROM order_items oi
                JOIN orders o ON o.id = oi."orderId"
                WHERE o."companyId" = :cid
                  AND o."createdAt" >= NOW() - (:days || ' days')::INTERVAL
                  AND o.status != 'CANCELLED'
                GROUP BY oi."productId"
            )
            SELECT
                p.id AS product_id,
                p.name AS product_name,
                p.sku,
                p.stock,
                p.price,
                COALESCE(rs.total_sold, 0)::int AS units_sold_period,
                ROUND((COALESCE(rs.total_sold, 0)::numeric / :days), 2) AS daily_velocity,
                CASE
                    WHEN COALESCE(rs.total_sold, 0) <= 0 THEN 999.0
                    ELSE ROUND((p.stock::numeric / (COALESCE(rs.total_sold, 0)::numeric / :days)), 1)
                END AS days_remaining
            FROM products p
            LEFT JOIN recent_sales rs ON rs."productId" = p.id
            WHERE p."companyId" = :cid
              AND p."deletedAt" IS NULL
              AND p."isActive" = TRUE
              AND p."trackInventory" = TRUE
              AND (COALESCE(rs.total_sold, 0) > 0 OR p.stock <= 5)
            ORDER BY
              days_remaining ASC,
              stock ASC
            LIMIT :limit
        """)

        rows = await self._session.execute(sql, {
            "cid": company_id,
            "days": days,
            "limit": max(1, min(limit, 50)),
        })

        results = []
        for r in rows:
            item = dict(r._mapping)
            days_left = float(item.get("days_remaining", 999.0))
            stock = int(item.get("stock", 0))

            if stock == 0:
                risk_level = "CRITICAL"
                risk_label = "نافد تماماً (Out of Stock)"
            elif days_left <= 3.0:
                risk_level = "CRITICAL"
                risk_label = "حرج جداً: سينفد خلال أقل من 3 أيام"
            elif days_left <= 7.0:
                risk_level = "WARNING"
                risk_label = "تحذير: سينفد خلال أسبوع"
            elif days_left <= 14.0:
                risk_level = "WATCH"
                risk_label = "مراقبة: سينفد خلال أسبوعين"
            else:
                risk_level = "STABLE"
                risk_label = "مستقر"

            item["riskLevel"] = risk_level
            item["riskLabel"] = risk_label
            results.append(item)

        return results
