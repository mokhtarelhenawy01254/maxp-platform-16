from __future__ import annotations

from typing import Any

from sqlalchemy import text

from src.tools.repositories.base import BaseRepository


class ShippingRepository(BaseRepository):
    async def find_zone_for_governorate(self, company_id: str, governorate: str) -> dict[str, Any] | None:
        gov_pattern = f"%{governorate}%"
        row = await self._session.execute(text("""
            SELECT sz.name, sz.price, sz."deliveryTime", sz."freeShippingThreshold"
            FROM shipping_zones sz
            LEFT JOIN shipping_zone_governorates szg ON szg."shippingZoneId" = sz.id
            LEFT JOIN governorates g ON g.id = szg."governorateId"
            WHERE sz."companyId" = :cid
              AND sz."isActive" = TRUE
              AND (g."nameAr" ILIKE :gov OR g."nameEn" ILIKE :gov OR g.code ILIKE :gov
                   OR sz.governorates ILIKE :gov)
            LIMIT 1
        """), {"cid": company_id, "gov": gov_pattern})
        zone = row.first()
        return dict(zone._mapping) if zone else None
