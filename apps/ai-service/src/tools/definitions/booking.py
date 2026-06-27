from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools import booking_tools


# ── 4 TOOLS ONLY ──

class InfoInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")

class SlotsInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    date: str = Field(default="", description="Date YYYY-MM-DD (optional - defaults to today)")
    gender: str = Field(default="", description="MALE or FEMALE (optional - auto-detects)")

class ReserveInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    service: str = Field(default="", description="Service name (e.g. حجامة, ريكفري, كشف). Partial match OK.")
    date: str = Field(default="", description="Date YYYY-MM-DD")
    time: str = Field(default="", description="Time HH:MM (optional - picks first available)")
    patient_info: str = Field(default="", description="All patient info: name, phone, gender. Example: 'محمد, 01234567890, ذكر' or 'سارة 01112223333 أنثى'")

class StatusInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    appointment_id: str = Field(default="", description="Appointment ID to check or cancel")
    action: str = Field(default="check", description="'check' for details, 'cancel' to cancel")


async def booking_info(input_data: InfoInput) -> dict[str, Any]:
    """Returns ALL center info: branches, services, doctors, working days, gender rules."""
    return await booking_tools.get_center_info(input_data.company_id)

async def booking_slots(input_data: SlotsInput) -> dict[str, Any]:
    """Returns available time slots for a date."""
    return await booking_tools.get_slots(input_data.company_id, input_data.date, input_data.gender)

async def booking_reserve(input_data: ReserveInput) -> dict[str, Any]:
    """Books an appointment. Finds service, branch, doctor automatically. Parses patient_info for name/phone/gender."""
    return await booking_tools.reserve_appointment(
        input_data.company_id,
        input_data.service,
        input_data.date,
        input_data.time,
        input_data.patient_info,
    )

async def booking_status(input_data: StatusInput) -> dict[str, Any]:
    """Checks appointment details or cancels it."""
    return await booking_tools.appointment_status(input_data.company_id, input_data.appointment_id, input_data.action)


booking_info_tool = FunctionTool(
    name="booking_info",
    description="مركز طبي: عرض كل المعلومات (الفروع، الخدمات، الأطباء، الأسعار، أيام العمل للرجال والنساء). استخدمها أول حاجة.",
    func=booking_info,
    input_model=InfoInput,
)

booking_slots_tool = FunctionTool(
    name="booking_slots",
    description="مركز طبي: عرض المواعيد المتاحة في تاريخ محدد. date=YYYY-MM-DD, gender=MALE أو FEMALE.",
    func=booking_slots,
    input_model=SlotsInput,
)

booking_reserve_tool = FunctionTool(
    name="booking_reserve",
    description="مركز طبي: حجز موعد. أدخل service=اسم الخدمة (مثلا حجامة), date=YYYY-MM-DD, time=HH:MM (اختياري), patient_info=اسم+رقم+جنس المريض (مثلا 'محمد, 01234567890, ذكر'). الأداة هتختار الفرع والدكتور تلقائيا.",
    func=booking_reserve,
    input_model=ReserveInput,
)

booking_status_tool = FunctionTool(
    name="booking_status",
    description="مركز طبي: عرض تفاصيل موعد أو إلغاؤه. appointment_id=رقم الموعد, action=check للتفاصيل أو cancel للإلغاء.",
    func=booking_status,
    input_model=StatusInput,
)

__all_tools__ = [
    booking_info_tool,
    booking_slots_tool,
    booking_reserve_tool,
    booking_status_tool,
]
