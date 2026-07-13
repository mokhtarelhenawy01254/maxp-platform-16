from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill


class BookingSlotsInput(BaseModel):
    date: str = Field(default="", description="Date YYYY-MM-DD (optional - defaults to today)")
    gender: str = Field(default="", description="MALE or FEMALE")
    company_id: str = Field(default="", description="")


async def get_booking_slots(params: BookingSlotsInput) -> dict:
    from src.tools.definitions.booking import booking_slots, SlotsInput
    inp = SlotsInput(date=params.date, gender=params.gender, company_id=params.company_id)
    return await booking_slots(inp)


booking_slots_skill = Skill(
    name="booking_slots",
    description="Get available appointment slots for a date and gender. Use when customer asks about available times or appointments. Keywords: مواعيد, slots, available, متاح, أوقات, times",
    input_schema=BookingSlotsInput,
    handler=get_booking_slots,
    internal_fields=["company_id"],
)
