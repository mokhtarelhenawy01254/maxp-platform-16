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

    async def list_shipping_companies(self, company_id: str) -> list[dict[str, Any]]:
        import json
        rows = await self._session.execute(text("""
            SELECT id, name, slug, phone, email, website,
                   "providerKey", "integrationMode", settings, "isActive",
                   CASE WHEN "apiKey" IS NOT NULL AND "apiKey" != '' THEN TRUE ELSE FALSE END AS "hasApiKey",
                   "apiUrl"
            FROM shipping_companies
            WHERE "companyId" = :cid
            ORDER BY "isActive" DESC, "createdAt" ASC
        """), {"cid": company_id})

        result = []
        for r in rows:
            m = dict(r._mapping)
            has_creds = bool(m.get("hasApiKey"))
            settings_str = m.get("settings")
            parsed_settings = {}
            if settings_str:
                try:
                    parsed_settings = json.loads(settings_str) if isinstance(settings_str, str) else settings_str
                except Exception:
                    pass
            if parsed_settings.get("username") or parsed_settings.get("apiKey") or parsed_settings.get("mainClientCode"):
                has_creds = True

            result.append({
                "id": m["id"],
                "name": m["name"],
                "slug": m.get("slug") or "",
                "providerKey": m.get("providerKey") or "MANUAL",
                "integrationMode": m.get("integrationMode") or "MANUAL",
                "isActive": bool(m.get("isActive")),
                "hasCredentials": has_creds,
                "phone": m.get("phone") or "",
                "website": m.get("website") or "",
                "autoCreateShipments": bool(parsed_settings.get("autoCreateShipments", False)),
                "mainClientCode": parsed_settings.get("mainClientCode") or parsed_settings.get("clientCode"),
            })
        return result

    async def connect_shipping_company(
        self,
        company_id: str,
        carrier: str,
        api_key: str | None = None,
        username: str | None = None,
        password: str | None = None,
        main_client_code: str | int | None = None,
        sender_number: str | None = None,
        auto_create_shipments: bool = False,
        phone: str | None = None,
        website: str | None = None,
        notes: str | None = None,
        is_active: bool = True,
        name: str | None = None,
    ) -> dict[str, Any]:
        import json
        import re
        import uuid

        raw_carrier = (carrier or "").strip().lower()
        carrier_name = (name or "").strip()
        provider_key = "MANUAL"
        clean_slug = re.sub(r"[^a-z0-9\-]", "-", raw_carrier).strip("-") or "custom-carrier"
        slug = clean_slug
        integration_mode = "LIVE"
        api_url: str | None = None
        settings_dict: dict[str, Any] = {}

        if "bosta" in raw_carrier or "بوستا" in raw_carrier:
            provider_key = "BOSTA"
            slug = "bosta"
            if not carrier_name:
                carrier_name = "بوستا (Bosta)"
            if not website:
                website = "https://bosta.co"
            if not phone:
                phone = "19000"
            integration_mode = "LIVE"

        elif "turbo" in raw_carrier or "تربو" in raw_carrier:
            provider_key = "TURBO"
            slug = "turbo"
            if not carrier_name:
                carrier_name = "Turbo"
            if not website:
                website = "https://turbo-eg.com"
            if not phone:
                phone = "19685"
            integration_mode = "LIVE"
            settings_dict["autoCreateShipments"] = bool(auto_create_shipments)
            if main_client_code is not None:
                settings_dict["mainClientCode"] = main_client_code
            if sender_number:
                settings_dict["senderNumber"] = str(sender_number)
            if notes:
                settings_dict["defaultNotes"] = notes

        elif "qp" in raw_carrier or "كيو بي" in raw_carrier or "qpxpress" in raw_carrier:
            provider_key = "QP_EXPRESS"
            slug = "qp-express"
            if not carrier_name:
                carrier_name = "كيو بي إكسبريس (QP Express)"
            if not website:
                website = "https://qpxpress.com"
            if not phone:
                phone = "19252"
            api_url = "https://qpxpress.com:8001"
            integration_mode = "LIVE"
            if username:
                settings_dict["username"] = username.strip()
            if password:
                settings_dict["password"] = password.strip()
        else:
            if not carrier_name:
                carrier_name = carrier.strip()
            integration_mode = "MANUAL"

        settings_json = json.dumps(settings_dict, ensure_ascii=False) if settings_dict else None

        check_row = await self._session.execute(text("""
            SELECT id FROM shipping_companies
            WHERE "companyId" = :cid AND (slug = :slug OR ("providerKey" = :pkey AND :pkey != 'MANUAL'))
            LIMIT 1
        """), {"cid": company_id, "slug": slug, "pkey": provider_key})
        existing = check_row.first()

        if existing:
            carrier_id = existing.id
            update_clauses = [
                'name = :name',
                '"providerKey" = :pkey',
                '"integrationMode" = :mode',
                '"isActive" = :active',
                '"updatedAt" = NOW()',
            ]
            params: dict[str, Any] = {
                "cid": company_id,
                "id": carrier_id,
                "name": carrier_name,
                "pkey": provider_key,
                "mode": integration_mode,
                "active": is_active,
            }
            if api_key is not None:
                update_clauses.append('"apiKey" = :apikey')
                params["apikey"] = api_key.strip()
            if api_url:
                update_clauses.append('"apiUrl" = :apiurl')
                params["apiurl"] = api_url
            if settings_json:
                update_clauses.append('settings = :settings')
                params["settings"] = settings_json
            if phone:
                update_clauses.append('phone = :phone')
                params["phone"] = phone
            if website:
                update_clauses.append('website = :website')
                params["website"] = website

            await self._session.execute(text(f"""
                UPDATE shipping_companies
                SET {', '.join(update_clauses)}
                WHERE id = :id AND "companyId" = :cid
            """), params)
        else:
            carrier_id = f"c{uuid.uuid4().hex[:24]}"
            await self._session.execute(text("""
                INSERT INTO shipping_companies (
                    id, name, slug, phone, website, "apiKey", "apiUrl",
                    "providerKey", "integrationMode", settings, "isActive",
                    "companyId", "createdAt", "updatedAt"
                ) VALUES (
                    :id, :name, :slug, :phone, :website, :apikey, :apiurl,
                    :pkey, :mode, :settings, :active,
                    :cid, NOW(), NOW()
                )
            """), {
                "id": carrier_id,
                "name": carrier_name,
                "slug": slug,
                "phone": phone,
                "website": website,
                "apikey": api_key.strip() if api_key else None,
                "apiurl": api_url,
                "pkey": provider_key,
                "mode": integration_mode,
                "settings": settings_json,
                "active": is_active,
                "cid": company_id,
            })

        if provider_key == "BOSTA":
            if api_key:
                await self._session.execute(text("""
                    UPDATE companies
                    SET "bostaApiKey" = :k, "bostaEnabled" = :en, "updatedAt" = NOW()
                    WHERE id = :cid
                """), {"cid": company_id, "k": api_key.strip(), "en": is_active})
            else:
                await self._session.execute(text("""
                    UPDATE companies
                    SET "bostaEnabled" = :en, "updatedAt" = NOW()
                    WHERE id = :cid
                """), {"cid": company_id, "en": is_active})

        elif provider_key == "TURBO":
            turbo_clauses = ['"turboEnabled" = :en', '"updatedAt" = NOW()']
            t_params: dict[str, Any] = {"cid": company_id, "en": is_active}
            if api_key:
                turbo_clauses.append('"turboApiKey" = :k')
                t_params["k"] = api_key.strip()
            if main_client_code is not None:
                try:
                    c_code = int(str(main_client_code).strip())
                    turbo_clauses.append('"turboMainClientCode" = :ccode')
                    t_params["ccode"] = c_code
                except Exception:
                    pass
            if sender_number:
                turbo_clauses.append('"turboSenderNumber" = :snum')
                t_params["snum"] = str(sender_number).strip()
            turbo_clauses.append('"turboAutoCreate" = :autoc')
            t_params["autoc"] = bool(auto_create_shipments)

            await self._session.execute(text(f"""
                UPDATE companies
                SET {', '.join(turbo_clauses)}
                WHERE id = :cid
            """), t_params)

        await self._session.commit()

        return {
            "id": carrier_id,
            "carrier": carrier_name,
            "slug": slug,
            "providerKey": provider_key,
            "isActive": is_active,
            "hasApiKey": bool(api_key),
            "phone": phone or "",
            "message": f"تم ربط وتفعيل شركة الشحن «{carrier_name}» بنجاح في المنظومة."
        }

    async def toggle_shipping_company(self, company_id: str, carrier_slug_or_id: str, is_active: bool) -> dict[str, Any]:
        c_clean = carrier_slug_or_id.strip()
        row = await self._session.execute(text("""
            SELECT id, name, slug, "providerKey" FROM shipping_companies
            WHERE "companyId" = :cid AND (id = :c OR slug = :c OR "providerKey" ILIKE :c OR name ILIKE :c)
            LIMIT 1
        """), {"cid": company_id, "c": c_clean})
        carrier = row.first()
        if not carrier:
            raise ValueError(f"لم يتم العثور على شركة الشحن «{carrier_slug_or_id}»")

        await self._session.execute(text("""
            UPDATE shipping_companies
            SET "isActive" = :act, "updatedAt" = NOW()
            WHERE id = :id AND "companyId" = :cid
        """), {"id": carrier.id, "cid": company_id, "act": is_active})

        if carrier.providerKey == "BOSTA":
            await self._session.execute(text("""
                UPDATE companies SET "bostaEnabled" = :act, "updatedAt" = NOW() WHERE id = :cid
            """), {"cid": company_id, "act": is_active})
        elif carrier.providerKey == "TURBO":
            await self._session.execute(text("""
                UPDATE companies SET "turboEnabled" = :act, "updatedAt" = NOW() WHERE id = :cid
            """), {"cid": company_id, "act": is_active})

        await self._session.commit()
        state_ar = "تفعيل" if is_active else "إلغاء تفعيل"
        return {
            "id": carrier.id,
            "name": carrier.name,
            "slug": carrier.slug,
            "providerKey": carrier.providerKey,
            "isActive": is_active,
            "message": f"تم {state_ar} شركة الشحن «{carrier.name}» بنجاح."
        }


