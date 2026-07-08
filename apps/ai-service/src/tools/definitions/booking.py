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
    patient_name: str = Field(..., description="اسم المريض بالكامل")
    patient_phone: str = Field(..., description="رقم هاتف المريض")
    gender: str = Field(default="", description="جنس المريض (MALE أو FEMALE). اختياري. الآيجنت يقرر تمريره إذا كان واضحًا من الاسم؛ لو غير واضح يتركه فاضي والأداة تطلب التوضيح بلطف.")
    service_name: str = Field(..., description="اسم الخدمة الطبية المطلوبة (مثل: علاج طبيعي، حجامة)")
    branch_name: str = Field(default="", description="اسم فرع المركز الطبي (مثل: التجمع، الدقي)")
    appointment_date: str = Field(default="", description="تاريخ الحجز بصيغة YYYY-MM-DD")
    appointment_time: str = Field(default="", description="وقت الحجز بصيغة HH:MM (مثال: 15:30)")

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
    """Books an appointment using structured patient and booking details."""
    return await booking_tools.reserve_appointment(
        company_id=input_data.company_id,
        patient_name=input_data.patient_name,
        patient_phone=input_data.patient_phone,
        gender=input_data.gender,
        service_name=input_data.service_name,
        branch_name=input_data.branch_name,
        appointment_date=input_data.appointment_date,
        appointment_time=input_data.appointment_time,
    )

async def booking_status(input_data: StatusInput) -> dict[str, Any]:
    """Checks appointment details or cancels it."""
    return await booking_tools.appointment_status(input_data.company_id, input_data.appointment_id, input_data.action)


booking_info_tool = FunctionTool(
    name="booking_info",
    description="استرجاع كافة معلومات المركز الطبي (مثل الفروع، الخدمات، الأطباء، الأسعار، وأيام العمل للرجال والنساء).",
    func=booking_info,
    input_model=InfoInput,
)

booking_slots_tool = FunctionTool(
    name="booking_slots",
    description="استعلام وعرض مواعيد الحجز المتاحة لفرع المركز الطبي في تاريخ معين وبناءً على نوع المريض (MALE/FEMALE).",
    func=booking_slots,
    input_model=SlotsInput,
)

booking_reserve_tool = FunctionTool(
    name="booking_reserve",
    description="إنشاء وحجز موعد جديد للمريض في المركز الطبي باستخدام تفاصيل حجز مهيكلة ومحددة.",
    func=booking_reserve,
    input_model=ReserveInput,
)

booking_status_tool = FunctionTool(
    name="booking_status",
    description="الاستعلام عن تفاصيل موعد محجوز مسبقاً أو إلغاء الحجز باستخدام معرف الموعد.",
    func=booking_status,
    input_model=StatusInput,
)

__all_tools__ = [
    booking_info_tool,
    booking_slots_tool,
    booking_reserve_tool,
    booking_status_tool,
]
