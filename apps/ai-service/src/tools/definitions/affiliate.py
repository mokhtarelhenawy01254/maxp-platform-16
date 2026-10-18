from __future__ import annotations

from typing import Any
from agent_framework import FunctionTool
from pydantic import BaseModel, Field

import src.db.session as _db_mod
from src.tools.repositories.affiliate_repository import AffiliateRepository


class AffiliateGetLinkInput(BaseModel):
    query: str | None = Field(
        default=None,
        description="Optional affiliate code, email, phone, or name. Leave blank to get current user/merchant's affiliate link.",
    )
    product_slug: str | None = Field(
        default=None,
        description="Optional product slug or URL to generate a direct product referral link.",
    )
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    customer_id: str | None = Field(default=None, description="User/Customer ID (auto-injected)")


class AffiliatesListInput(BaseModel):
    limit: int = Field(default=10, ge=1, le=100, description="Max number of affiliates to return (1-100)")
    status: str | None = Field(default=None, description="Optional status filter: ACTIVE, PENDING, SUSPENDED")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class AffiliateSettingsReadInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def affiliate_get_link(input_data: AffiliateGetLinkInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"error": "Missing company_id"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = AffiliateRepository(sess)
        return await repo.get_affiliate_details(
            company_id=company_id,
            user_id=input_data.customer_id,
            query=input_data.query,
            product_slug=input_data.product_slug,
        )


async def affiliates_list(input_data: AffiliatesListInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"affiliates": []}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = AffiliateRepository(sess)
        affiliates = await repo.list_affiliates(
            company_id=company_id,
            limit=input_data.limit,
            status=input_data.status,
        )
        return {"affiliates": affiliates}


async def affiliate_settings_read(input_data: AffiliateSettingsReadInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"settings": None}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = AffiliateRepository(sess)
        settings = await repo.get_affiliate_settings(company_id=company_id)
        return {"settings": settings}


def _format_affiliate_link(res: dict[str, Any]) -> str:
    if not res:
        return "لا توجد بيانات مسوق متاحة."
    code = res.get("affiliate_code")
    catalog_url = res.get("referral_catalog_url")
    home_url = res.get("referral_home_url")
    recruitment_url = res.get("recruitment_url")
    dashboard_url = res.get("dashboard_url")
    if code and catalog_url:
        return (
            f"كود الأفليت: {code} | الحالة: {res.get('status') or 'نشط'}\n"
            f"رابط المتجر: {home_url}\n"
            f"رابط الكتالوج: {catalog_url}\n"
            f"رابط دعوة مسوقين جدد: {recruitment_url}\n"
            f"لوحة متابعة الأفليت: {dashboard_url}"
        )
    return (
        f"لا يوجد كود مسوق مسجل حالياً لهذا الحساب.\n"
        f"رابط دعوة وتسجيل المسوقين للمتجر: {recruitment_url}\n"
        f"لوحة متابعة الأفليت: {dashboard_url}"
    )


affiliate_get_link_tool = FunctionTool(
    name="affiliate_get_link",
    description=(
        "Get affiliate referral link, affiliate code, product link, recruitment URL, and dashboard URL for the merchant or an affiliate partner. "
        "Use whenever the user asks for their affiliate link, marketing link, referral code, or partner registration link."
    ),
    func=affiliate_get_link,
    input_model=AffiliateGetLinkInput,
    format_result=_format_affiliate_link,
)

affiliates_list_tool = FunctionTool(
    name="affiliates_list",
    description="List affiliate partners, their codes, sales, status, and earnings for the company.",
    func=affiliates_list,
    input_model=AffiliatesListInput,
)

affiliate_settings_read_tool = FunctionTool(
    name="affiliate_settings_read",
    description="Read company affiliate program settings (commission rate, type, cookie duration, status).",
    func=affiliate_settings_read,
    input_model=AffiliateSettingsReadInput,
)

__all_tools__ = [
    affiliate_get_link_tool,
    affiliates_list_tool,
    affiliate_settings_read_tool,
]
