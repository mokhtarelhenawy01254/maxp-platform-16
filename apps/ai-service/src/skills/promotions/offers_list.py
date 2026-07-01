from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill


class OffersListActiveInput(BaseModel):
    company_id: str = Field(default="", description="")


async def get_offers_list_active(params: OffersListActiveInput) -> dict:
    from src.tools.promotion_tools import offers_list_active as _active
    result = await _active(company_id=params.company_id)
    return result


offers_list_active_skill = Skill(
    name="offers_list_active",
    description="عرض جميع العروض والتخفيضات الشغالة حالياً في المتجر. تشمل: الكوبونات النشطة، عروض المتجر الشاملة (اشتر X وخد Y)، وإعدادات الشحن المجاني. استخدمها لما العميل يسأل عن العروض أو التخفيضات.",
    input_schema=OffersListActiveInput,
    handler=get_offers_list_active,
    internal_fields=["company_id"],
)
