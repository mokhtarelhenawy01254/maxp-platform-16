from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools import promotion_tools


class OffersListActiveInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class CouponValidateInput(BaseModel):
    code: str = Field(description="Coupon code to validate")
    order_amount: str = Field(default="0", description="Current order amount to calculate discount against")
    customer_id: str | None = Field(default=None, description="Optional customer ID to check per-user limits")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def offers_list_active(input_data: OffersListActiveInput) -> dict[str, Any]:
    return await promotion_tools.offers_list_active(input_data.company_id or "")


async def coupon_validate(input_data: CouponValidateInput) -> dict[str, Any]:
    return await promotion_tools.coupon_validate(
        input_data.company_id or "",
        code=input_data.code,
        order_amount=input_data.order_amount,
        customer_id=input_data.customer_id,
    )


offers_list_active_tool = FunctionTool(
    name="offers_list_active",
    description="Arabic: اعرض كل العروض والتخفيضات الشغالة في المتجر: عروض المتجر الشاملة (اشتر X وخد Y)، الكوبونات، الشحن المجاني. استخدمها لما العميل يسأل عن العروض أو التخفيضات النشطة.",
    func=offers_list_active,
    input_model=OffersListActiveInput,
)

coupon_validate_tool = FunctionTool(
    name="coupon_validate",
    description="Arabic: اختبر كود خصم محدد: هل الكود لسه شغال؟ الحد الأدنى للطلب؟ استخدامات متبقية؟ قيمة الخصم؟ استخدمها لما العميل يطلب كود خصم أو عايز يتأكد من صلاحية كود.",
    func=coupon_validate,
    input_model=CouponValidateInput,
)

__all_tools__ = [
    offers_list_active_tool,
    coupon_validate_tool,
]
