from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill


class BookingStatusInput(BaseModel):
    appointment_id: str = Field(description="Appointment ID to check or cancel")
    action: str = Field(default="check", description="'check' for details, 'cancel' to cancel")
    company_id: str = Field(default="", description="")


async def check_booking_status(params: BookingStatusInput) -> dict:
    from src.tools.definitions.booking import booking_status, StatusInput
    inp = StatusInput(
        appointment_id=params.appointment_id,
        action=params.action,
        company_id=params.company_id,
    )
    return await booking_status(inp)


booking_status_skill = Skill(
    name="booking_status",
    description="Check or cancel an existing appointment. Use when customer asks about their booking status or wants to cancel a reservation. Keywords: appointment, موعد, حالة, cancel, إلغاء",
    input_schema=BookingStatusInput,
    handler=check_booking_status,
    internal_fields=["company_id"],
)
