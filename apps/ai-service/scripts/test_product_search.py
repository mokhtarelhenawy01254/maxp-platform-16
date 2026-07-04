#!/usr/bin/env python3
"""Direct test of product_search SQL against the DB."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://appuser:0165676135@localhost:5432/maxp"
COMPANY_ID = "cmleypbf70028juo2wwpmp8rt"

async def main():
    engine = create_async_engine(DATABASE_URL, pool_size=2)
    async with engine.connect() as conn:
        # Test 1: Count products with isActive filter
        r1 = await conn.execute(text("""
            SELECT COUNT(*) as cnt FROM products p
            WHERE p."companyId" = :cid AND p."deletedAt" IS NULL AND p."isActive" = TRUE
        """), {"cid": COMPANY_ID})
        row1 = r1.fetchone()
        print(f"1. isActive=TRUE: {row1[0]}")

        # Test 2: Count products without isActive filter (should be higher)
        r2 = await conn.execute(text("""
            SELECT COUNT(*) as cnt FROM products p
            WHERE p."companyId" = :cid AND p."deletedAt" IS NULL
        """), {"cid": COMPANY_ID})
        row2 = r2.fetchone()
        print(f"2. No isActive filter: {row2[0]}")

        # Test 3: List first 5 products (no isActive filter)
        r3 = await conn.execute(text("""
            SELECT id, name, "isActive", "deletedAt" FROM products p
            WHERE p."companyId" = :cid AND p."deletedAt" IS NULL
            ORDER BY p.name ASC LIMIT 5
        """), {"cid": COMPANY_ID})
        print("3. Products (no isActive):")
        for r in r3:
            print(f"   - {r[0]} | name={r[1]} | isActive={r[2]} | deletedAt={r[3]}")

        # Test 4: Simulate FULL product_search SQL
        r4 = await conn.execute(text("""
            SELECT p.id, p.name, p.sku, p.price, p."comparePrice",
                   p.stock, p."trackInventory", p."isActive",
                   p."isFeatured", p.images, p."mainImage",
                   p."categoryId", c.name AS "categoryName",
                   p.tags
            FROM products p
            LEFT JOIN categories c ON c.id = p."categoryId"
            WHERE p."companyId" = :cid
              AND p."deletedAt" IS NULL
              AND TRUE
            ORDER BY
              CASE WHEN p."isFeatured" = TRUE THEN 0 ELSE 1 END,
              p.name ASC
            LIMIT 5
        """), {"cid": COMPANY_ID})
        rows4 = r4.fetchall()
        print(f"4. Full product_search SQL: {len(rows4)} results")
        for r in rows4[:5]:
            print(f"   - {r[0]} | {r[1]} | {r[2]} | isActive={r[3]}")

    await engine.dispose()

asyncio.run(main())
