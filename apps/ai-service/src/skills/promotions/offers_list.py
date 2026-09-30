from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill


class OffersListActiveInput(BaseModel):
    include_all_coupons: bool = Field(default=False, description="عرض جميع أكواد الكوبونات بالتفصيل بدلاً من الملخص")
    company_id: str = Field(default="", description="")


async def get_offers_list_active(params: OffersListActiveInput) -> dict:
    from src.tools.definitions.promotions import offers_list_active, OffersListActiveInput as _OI
    return await offers_list_active(_OI(company_id=params.company_id, include_all_coupons=params.include_all_coupons))


offers_list_active_skill = Skill(
    name="offers_list_active",
    description=(
        "عرض جميع العروض والتخفيضات الشغالة حالياً في المتجر من 5 مصادر: الكوبونات النشطة بجميع صفحاتها، "
        "عرض المتجر الشامل، إعدادات الشحن المجاني، أدوات التحويل وباقات «اشترِ معًا»، وعروض وخصومات الكمية على المنتجات. "
        "إلزام: اذكر المصادر التي قُرئت والمصادر التي فشلت (إن وجدت)، ويُمنع قول «مفيش بيانات» عند تعثر أي مصدر، مع تلخيص الكوبونات الطويلة بحسب الحملات والأعداد."
    ),
    input_schema=OffersListActiveInput,
    handler=get_offers_list_active,
    internal_fields=["company_id"],
)
