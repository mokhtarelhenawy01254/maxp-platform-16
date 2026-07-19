from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import text

from src.tools.repositories.base import BaseRepository


class ProductRepository(BaseRepository):
    async def get_product(self, product_id: str, company_id: str) -> dict[str, Any] | None:
        row = await self._session.execute(text("""
            SELECT id, name, price, images
            FROM products WHERE id = :pid AND "companyId" = :cid
        """), {"pid": product_id, "cid": company_id})
        info = row.first()
        return dict(info._mapping) if info else None

    async def count_visits(self, product_id: str, company_id: str, start: datetime, end: datetime) -> int:
        row = await self._session.execute(text("""
            SELECT COUNT(*) AS cnt FROM product_visits
            WHERE "productId" = :pid AND "companyId" = :cid
              AND "visitedAt" BETWEEN :start AND :end
        """), {"pid": product_id, "cid": company_id, "start": start, "end": end})
        first = row.first()
        return first.cnt if first else 0

    async def count_conversion_events(self, product_id: str, company_id: str, event_type: str, start: datetime, end: datetime) -> int:
        row = await self._session.execute(text("""
            SELECT COUNT(*) AS cnt FROM conversion_events
            WHERE "productId" = :pid AND "companyId" = :cid
              AND "eventType" = :evt
              AND "createdAt" BETWEEN :start AND :end
        """), {"pid": product_id, "cid": company_id, "evt": event_type, "start": start, "end": end})
        first = row.first()
        return first.cnt if first else 0

    async def get_sales_aggregate(self, product_id: str, company_id: str, start: datetime, end: datetime) -> dict[str, Any]:
        row = await self._session.execute(text("""
            SELECT COALESCE(SUM(oi.quantity), 0)::int AS qty_sold,
                   COALESCE(SUM(oi.total), 0) AS revenue
            FROM order_items oi
            JOIN orders o ON o.id = oi."orderId"
            WHERE oi."productId" = :pid AND o."companyId" = :cid
              AND o."createdAt" BETWEEN :start AND :end
              AND o.status != 'CANCELLED'
        """), {"pid": product_id, "cid": company_id, "start": start, "end": end})
        first = row.first()
        return dict(first._mapping) if first else {"qty_sold": 0, "revenue": 0}
