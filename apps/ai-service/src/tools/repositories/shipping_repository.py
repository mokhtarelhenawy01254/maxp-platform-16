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

    async def upsert_zone(
        self,
        company_id: str,
        governorates: list[str],
        price: float,
        delivery_time: str = "2-3 أيام",
        name: str | None = None,
        free_shipping_threshold: float | None = None,
        is_active: bool = True,
    ) -> dict[str, Any]:
        import json
        import uuid

        if not governorates:
            raise ValueError("At least one governorate is required")

        cleaned_govs = [g.strip() for g in governorates if g and g.strip()]
        if not cleaned_govs:
            raise ValueError("Valid governorates must be provided")

        zone_name = (name or "").strip()
        if not zone_name:
            if len(cleaned_govs) == 1:
                zone_name = f"شحن {cleaned_govs[0]}"
            else:
                zone_name = f"شحن {', '.join(cleaned_govs)}"

        # 1. Resolve canonical governorates
        matched_gov_ids: list[str] = []
        for g in cleaned_govs:
            gov_row = await self._session.execute(text("""
                SELECT id, "nameAr" FROM governorates
                WHERE "nameAr" ILIKE :g OR "nameEn" ILIKE :g OR code ILIKE :g
                LIMIT 1
            """), {"g": f"%{g}%"})
            first_gov = gov_row.first()
            if first_gov and first_gov.id:
                matched_gov_ids.append(first_gov.id)

        # 2. Check for existing zone by matching mapped governorates or name/pattern
        existing_zone_id: str | None = None
        if matched_gov_ids:
            check_row = await self._session.execute(text("""
                SELECT sz.id FROM shipping_zones sz
                JOIN shipping_zone_governorates szg ON szg."shippingZoneId" = sz.id
                WHERE sz."companyId" = :cid AND szg."governorateId" = ANY(:gids)
                LIMIT 1
            """), {"cid": company_id, "gids": matched_gov_ids})
            first_check = check_row.first()
            if first_check:
                existing_zone_id = first_check.id

        if not existing_zone_id:
            # Fallback check by zone name or direct governorate string
            first_gov_pat = f"%{cleaned_govs[0]}%"
            check_row2 = await self._session.execute(text("""
                SELECT id FROM shipping_zones
                WHERE "companyId" = :cid AND (name ILIKE :zname OR governorates ILIKE :gov_pat)
                LIMIT 1
            """), {"cid": company_id, "zname": zone_name, "gov_pat": first_gov_pat})
            first_check2 = check_row2.first()
            if first_check2:
                existing_zone_id = first_check2.id

        gov_json = json.dumps(cleaned_govs, ensure_ascii=False)

        # 3. Update existing zone or Insert new zone
        if existing_zone_id:
            update_row = await self._session.execute(text("""
                UPDATE shipping_zones
                SET price = :price,
                    "deliveryTime" = :delivery_time,
                    "freeShippingThreshold" = :free_thresh,
                    "isActive" = :is_active,
                    name = :name,
                    governorates = :gov_json,
                    "updatedAt" = NOW()
                WHERE id = :zid AND "companyId" = :cid
                RETURNING id, name, price, "deliveryTime", "freeShippingThreshold", "isActive"
            """), {
                "zid": existing_zone_id,
                "cid": company_id,
                "price": price,
                "delivery_time": delivery_time,
                "free_thresh": free_shipping_threshold,
                "is_active": is_active,
                "name": zone_name,
                "gov_json": gov_json,
            })
            updated = update_row.first()
            zone_id = existing_zone_id
            is_updated = True
        else:
            zone_id = str(uuid.uuid4())
            insert_row = await self._session.execute(text("""
                INSERT INTO shipping_zones (
                    id, name, governorates, price, "deliveryTime", "deliveryTimeType",
                    "freeShippingThreshold", "pricingType", "isActive", "companyId",
                    "createdAt", "updatedAt"
                ) VALUES (
                    :zid, :name, :gov_json, :price, :delivery_time, 'custom',
                    :free_thresh, 'flat', :is_active, :cid,
                    NOW(), NOW()
                )
                RETURNING id, name, price, "deliveryTime", "freeShippingThreshold", "isActive"
            """), {
                "zid": zone_id,
                "name": zone_name,
                "gov_json": gov_json,
                "price": price,
                "delivery_time": delivery_time,
                "free_thresh": free_shipping_threshold,
                "is_active": is_active,
                "cid": company_id,
            })
            updated = insert_row.first()
            is_updated = False

        # 4. Ensure mappings exist in shipping_zone_governorates
        for gid in matched_gov_ids:
            map_id = str(uuid.uuid4())
            await self._session.execute(text("""
                INSERT INTO shipping_zone_governorates (
                    id, "shippingZoneId", "governorateId", "createdAt", "updatedAt"
                ) VALUES (
                    :mid, :zid, :gid, NOW(), NOW()
                )
                ON CONFLICT ("shippingZoneId", "governorateId") DO NOTHING
            """), {"mid": map_id, "zid": zone_id, "gid": gid})

        await self._session.commit()

        return {
            "id": zone_id,
            "name": zone_name,
            "governorates": cleaned_govs,
            "price": float(price),
            "deliveryTime": delivery_time,
            "freeShippingThreshold": float(free_shipping_threshold) if free_shipping_threshold is not None else None,
            "isActive": is_active,
            "isUpdated": is_updated,
        }

