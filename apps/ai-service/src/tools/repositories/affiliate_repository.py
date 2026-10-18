from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlparse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class AffiliateRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_affiliate_details(
        self,
        company_id: str,
        user_id: str | None = None,
        query: str | None = None,
        product_slug: str | None = None,
    ) -> dict[str, Any]:
        """Fetch affiliate details, links, and code for a company and user/query."""
        if not company_id:
            return {"error": "company_id is required"}

        # 1. Company info
        comp_sql = text("""
            SELECT id, name, slug, "customDomain"
            FROM companies
            WHERE id = :cid
            LIMIT 1
        """)
        c_row = await self._session.execute(comp_sql, {"cid": company_id})
        comp_res = c_row.first()
        if not comp_res:
            return {"error": f"Company {company_id} not found"}

        comp = dict(comp_res._mapping)
        comp_slug = comp.get("slug") or ""
        custom_domain = comp.get("customDomain")

        # Base storefront URL — sanitize customDomain against redundant protocols or slashes
        if custom_domain and custom_domain.strip():
            clean_domain = custom_domain.strip().replace("https://", "").replace("http://", "").rstrip("/")
            store_base = f"https://{clean_domain}"
        elif comp_slug:
            store_base = f"https://{comp_slug}.maxp.online"
        else:
            store_base = f"https://maxp.online/store?companyId={company_id}"

        # 2. Find affiliate record
        affiliate_row = None
        clean_q = (query or "").strip()

        if clean_q:
            q_pat = f"%{clean_q}%"
            sql_q = text("""
                SELECT a.id, a."userId", a."companyId", a."affiliateCode", a.status,
                       a."totalEarnings", a."paidEarnings", a."pendingEarnings",
                       a."totalSales", a."totalClicks", a."commissionRate", a."commissionType",
                       u."firstName", u."lastName", u.email, u.phone
                FROM affiliates a
                LEFT JOIN users u ON u.id = a."userId"
                WHERE a."companyId" = :cid
                  AND (a."affiliateCode" ILIKE :q OR u.email ILIKE :q OR u.phone ILIKE :q
                       OR u."firstName" ILIKE :q OR u."lastName" ILIKE :q)
                ORDER BY (LOWER(a."affiliateCode") = LOWER(:exact)) DESC, a."createdAt" DESC
                LIMIT 1
            """)
            r = await self._session.execute(sql_q, {"cid": company_id, "q": q_pat, "exact": clean_q})
            affiliate_row = r.first()

        # Check by user_id strictly scoped to the same company
        if not affiliate_row and user_id:
            sql_u = text("""
                SELECT a.id, a."userId", a."companyId", a."affiliateCode", a.status,
                       a."totalEarnings", a."paidEarnings", a."pendingEarnings",
                       a."totalSales", a."totalClicks", a."commissionRate", a."commissionType",
                       u."firstName", u."lastName", u.email, u.phone
                FROM affiliates a
                LEFT JOIN users u ON u.id = a."userId"
                WHERE a."userId" = :uid AND a."companyId" = :cid
                ORDER BY a."createdAt" DESC
                LIMIT 1
            """)
            r = await self._session.execute(sql_u, {"uid": user_id, "cid": company_id})
            affiliate_row = r.first()

        # If still not found, prioritize the merchant / company admin's affiliate record
        if not affiliate_row:
            sql_any = text("""
                SELECT a.id, a."userId", a."companyId", a."affiliateCode", a.status,
                       a."totalEarnings", a."paidEarnings", a."pendingEarnings",
                       a."totalSales", a."totalClicks", a."commissionRate", a."commissionType",
                       u."firstName", u."lastName", u.email, u.phone
                FROM affiliates a
                LEFT JOIN user_companies uc ON uc."userId" = a."userId" AND uc."companyId" = a."companyId"
                LEFT JOIN users u ON u.id = a."userId"
                WHERE a."companyId" = :cid AND a.status = 'ACTIVE'
                ORDER BY 
                    CASE 
                        WHEN uc.role::text = 'OWNER' THEN 1
                        WHEN uc.role::text = 'COMPANY_ADMIN' THEN 2
                        ELSE 4 
                    END ASC,
                    (a."totalSales" > 0) DESC,
                    a."totalSales" DESC,
                    a."createdAt" DESC
                LIMIT 1
            """)
            r = await self._session.execute(sql_any, {"cid": company_id})
            affiliate_row = r.first()

        # If found affiliate record
        aff_dict = dict(affiliate_row._mapping) if affiliate_row else None
        aff_code = aff_dict.get("affiliateCode") if aff_dict else None

        # Build links
        if aff_code:
            referral_catalog_url = f"{store_base}/shop?ref={aff_code}"
            referral_home_url = f"{store_base}/?ref={aff_code}"
            if product_slug:
                raw_prod = product_slug.strip()
                if raw_prod.startswith("http://") or raw_prod.startswith("https://"):
                    parsed = urlparse(raw_prod)
                    path = parsed.path.lstrip("/")
                    referral_product_url = f"{store_base}/{path}?ref={aff_code}"
                else:
                    clean_prod = raw_prod.lstrip("/")
                    if not clean_prod.startswith("product/"):
                        clean_prod = f"product/{clean_prod}"
                    referral_product_url = f"{store_base}/{clean_prod}?ref={aff_code}"
            else:
                referral_product_url = f"{store_base}/product/<PRODUCT_SLUG>?ref={aff_code}"
        else:
            referral_catalog_url = None
            referral_home_url = None
            referral_product_url = None

        recruitment_url = (
            f"https://maxp.online/affiliate-register/{comp_slug}"
            if comp_slug
            else "https://maxp.online/affiliates/register"
        )

        # Get settings summary with safe fallback defaults
        settings_sql = text("""
            SELECT "commissionType", "commissionRate", "cookieDuration", "isActive"
            FROM affiliate_settings
            WHERE "companyId" = :cid
            LIMIT 1
        """)
        s_row = await self._session.execute(settings_sql, {"cid": company_id})
        s_res = s_row.first()
        settings_dict = dict(s_res._mapping) if s_res else {}

        return {
            "has_affiliate_profile": bool(aff_dict),
            "affiliate_code": aff_code,
            "status": aff_dict.get("status") if aff_dict else None,
            "referral_catalog_url": referral_catalog_url,
            "referral_home_url": referral_home_url,
            "referral_product_url_template": referral_product_url,
            "recruitment_url": recruitment_url,
            "company_name": comp.get("name"),
            "company_slug": comp_slug,
            "store_base_url": store_base,
            "dashboard_url": "https://maxp.online/affiliates/dashboard",
            "management_url": "https://maxp.online/affiliates/management",
            "referrals_url": "https://maxp.online/affiliates/referrals",
            "settings_url": "https://maxp.online/affiliates/settings",
            "commission_rate": float(aff_dict.get("commissionRate") or settings_dict.get("commissionRate") or 5),
            "commission_type": aff_dict.get("commissionType") or settings_dict.get("commissionType") or "FIXED_PER_ITEM",
            "total_earnings": str(aff_dict.get("totalEarnings") or "0.00") if aff_dict else "0.00",
            "pending_earnings": str(aff_dict.get("pendingEarnings") or "0.00") if aff_dict else "0.00",
            "total_sales": int(aff_dict.get("totalSales") or 0) if aff_dict else 0,
            "affiliate_user_name": f"{aff_dict.get('firstName') or ''} {aff_dict.get('lastName') or ''}".strip() if aff_dict else None,
        }

    async def list_affiliates(
        self,
        company_id: str,
        limit: int = 10,
        status: str | None = None,
    ) -> list[dict[str, Any]]:
        if not company_id:
            return []

        bounded_limit = max(1, min(int(limit or 10), 100))
        clauses = ['a."companyId" = :cid']
        params: dict[str, Any] = {"cid": company_id, "lim": bounded_limit}

        if status:
            clauses.append('a.status = :status')
            params["status"] = status.upper()

        where_clause = " AND ".join(clauses)

        sql = text(f"""
            SELECT a.id, a."userId", a."affiliateCode", a.status,
                   a."totalEarnings", a."paidEarnings", a."pendingEarnings",
                   a."totalSales", a."totalClicks", a."commissionRate", a."commissionType",
                   a."createdAt", u."firstName", u."lastName", u.email, u.phone
            FROM affiliates a
            LEFT JOIN users u ON u.id = a."userId"
            WHERE {where_clause}
            ORDER BY a."totalSales" DESC, a."createdAt" DESC
            LIMIT :lim
        """)
        rows = await self._session.execute(sql, params)
        return [
            {
                "id": r.id,
                "affiliateCode": r.affiliateCode,
                "name": f"{r.firstName or ''} {r.lastName or ''}".strip() or r.email or "—",
                "email": r.email or "—",
                "phone": r.phone or "—",
                "status": r.status,
                "totalSales": r.totalSales,
                "totalEarnings": str(r.totalEarnings),
                "commissionRate": float(r.commissionRate or 0),
                "commissionType": r.commissionType,
            }
            for r in rows
        ]

    async def get_affiliate_settings(self, company_id: str) -> dict[str, Any]:
        if not company_id:
            return {
                "isActive": True,
                "commissionType": "FIXED_PER_ITEM",
                "commissionRate": 5.0,
                "cookieDurationDays": 30,
                "defaultMinPayout": 100.0,
                "autoApprove": False,
            }
        sql = text("""
            SELECT id, "companyId", "commissionType", "commissionRate", "cookieDuration",
                   "isActive", "autoApproveAffiliates", "defaultMinPayout", "payoutSlaDays"
            FROM affiliate_settings
            WHERE "companyId" = :cid
            LIMIT 1
        """)
        row = await self._session.execute(sql, {"cid": company_id})
        res = row.first()
        if not res:
            return {
                "isActive": True,
                "commissionType": "FIXED_PER_ITEM",
                "commissionRate": 5.0,
                "cookieDurationDays": 30,
                "defaultMinPayout": 100.0,
                "autoApprove": False,
            }
        d = dict(res._mapping)
        return {
            "isActive": bool(d.get("isActive", True)),
            "commissionType": d.get("commissionType") or "FIXED_PER_ITEM",
            "commissionRate": float(d.get("commissionRate") or 5.0),
            "cookieDurationDays": int(d.get("cookieDuration") or 30),
            "defaultMinPayout": float(d.get("defaultMinPayout") or 100),
            "autoApprove": bool(d.get("autoApproveAffiliates", False)),
        }
