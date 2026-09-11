from __future__ import annotations

from typing import Any

from sqlalchemy import text

from src.tools.repositories.base import BaseRepository


class InventoryRepository(BaseRepository):
    async def find_product_by_name_or_sku(self, company_id: str, product_name: str) -> dict[str, Any] | None:
        pattern = f"%{product_name}%"
        row = await self._session.execute(text("""
            SELECT id, name, sku, price, "comparePrice", stock, "trackInventory",
                   "mainImage", images, "isFeatured"
            FROM products
            WHERE "companyId" = :company_id
              AND "deletedAt" IS NULL
              AND "isActive" = TRUE
              AND (name ILIKE :pattern OR sku ILIKE :pattern OR id = :exact)
            ORDER BY
              CASE WHEN id = :exact THEN 0 WHEN sku ILIKE :exact THEN 1 WHEN name ILIKE :exact THEN 2 ELSE 3 END,
              "updatedAt" DESC
            LIMIT 1
        """), {"company_id": company_id, "pattern": pattern, "exact": product_name})
        product_row = row.first()
        return dict(product_row._mapping) if product_row else None

    async def find_product_by_sku(self, sku: str, company_id: str) -> dict[str, Any] | None:
        row = await self._session.execute(text("""
            SELECT id, name, sku, price, "comparePrice", stock, "trackInventory",
                   "mainImage", images, "isFeatured"
            FROM products
            WHERE sku = :sku AND "companyId" = :company_id
              AND "deletedAt" IS NULL AND "isActive" = TRUE
            LIMIT 1
        """), {"sku": sku, "company_id": company_id})
        product_row = row.first()
        return dict(product_row._mapping) if product_row else None

    async def fetch_variants(self, product_id: str) -> list[dict[str, Any]]:
        rows = await self._session.execute(text("""
            SELECT name, type, sku, stock, "trackInventory", "isActive"
            FROM product_variants
            WHERE "productId" = :pid AND "isActive" = TRUE
            ORDER BY "sortOrder" ASC
        """), {"pid": product_id})
        return [dict(r._mapping) for r in rows]

    async def update_stock(self, product_id: str, company_id: str, delta: int) -> None:
        await self._session.execute(text("""
            UPDATE products
            SET stock = GREATEST(0, stock + :delta), "updatedAt" = NOW()
            WHERE id = :pid AND "companyId" = :cid
        """), {"delta": delta, "pid": product_id, "cid": company_id})
        await self._session.commit()
