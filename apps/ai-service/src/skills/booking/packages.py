from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill


class BookingPackagesInput(BaseModel):
    company_id: str = Field(default="", description="")


async def get_packages(params: BookingPackagesInput) -> dict:
    from src.tools.definitions.booking import booking_info, InfoInput
    inp = InfoInput(company_id=params.company_id)
    info = await booking_info(inp)
    services = info.get("services", [])
    packages = [s for s in services if s.get("packages")]
    return {
        "branches": info.get("branches", []),
        "doctors": info.get("doctors", []),
        "services": services,
        "packages": packages,
    }


booking_packages_skill = Skill(
    name="booking_packages",
    description="عرض الباقات والاشتراكات الطبية المتاحة. استخدم عندما يسأل العميل عن العروض أو الباقات أو الاشتراكات أو التخفيضات أو الحزم العلاجية. Keywords: باقة, package, اشتراك, عرض, خصم, subscription, bundle, حزمة",
    input_schema=BookingPackagesInput,
    handler=get_packages,
    internal_fields=["company_id"],
)
