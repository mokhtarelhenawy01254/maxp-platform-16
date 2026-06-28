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
    request: str = Field(..., min_length=3, description="ALL booking details in Arabic text: service name, date, time, patient name, phone, gender. Example: 'احجز جلسة حجامة السبت 27 يونيو الساعة 4 العصر لمحمد عبدالله 01234567890 ذكر'. Pass the full user message.")

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
    """Books an appointment. Pass ALL details in the request text — the tool auto-extracts everything."""
    return await booking_tools.reserve_appointment(input_data.company_id, input_data.request)

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
    description="مركز طبي: حجز موعد. ضع كل التفاصيل في request: اسم الخدمة + التاريخ + الوقت + اسم المريض + رقم الهاتف + الجنس. مثال: 'احجز جلسة حجامة السبت 4 العصر لمحمد عبدالله 01234567890 ذكر'. الأداة تستخرج كل شئ تلقائيا.",
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
