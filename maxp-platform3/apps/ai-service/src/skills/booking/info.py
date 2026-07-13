from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill


class BookingInfoInput(BaseModel):
    company_id: str = Field(default="", description="")


async def get_booking_info(params: BookingInfoInput) -> dict:
    from src.tools.definitions.booking import booking_info, InfoInput
    return await booking_info(InfoInput(company_id=params.company_id))


booking_info_skill = Skill(
    name="booking_info",
    description="Get medical center info: branches, services, doctors, working days, gender rules. Use when customer asks about available services, branches, or doctors. Keywords: مركز, عيادة, دكتور, خدمات, branches, doctors",
    input_schema=BookingInfoInput,
    handler=get_booking_info,
    internal_fields=["company_id"],
)
