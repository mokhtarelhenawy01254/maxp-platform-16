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

async def booking_reserve(input_data: ReserveInput, ctx: Any = None) -> dict[str, Any]:
    """Books an appointment using structured patient and booking details."""
    agent_name = None
    if ctx is not None and hasattr(ctx, 'metadata'):
        agent_name = ctx.metadata.get('agent_name')
    return await booking_tools.reserve_appointment(
        company_id=input_data.company_id,
        patient_name=input_data.patient_name,
        patient_phone=input_data.patient_phone,
        gender=input_data.gender,
        service_name=input_data.service_name,
        branch_name=input_data.branch_name,
        appointment_date=input_data.appointment_date,
        appointment_time=input_data.appointment_time,
        agent_name=agent_name,
    )

async def booking_status(input_data: StatusInput) -> dict[str, Any]:
    """Checks appointment details or cancels it."""
    return await booking_tools.appointment_status(input_data.company_id, input_data.appointment_id, input_data.action)


def _format_booking_info(result: dict) -> str:
    branch_count = result.get("total_branches", 0) or len(result.get("branches") or [])
    svc_count = len(result.get("services") or [])
    doc_count = len(result.get("doctors") or [])
    parts = [f"المركز لديه {branch_count} فرع"]
    if svc_count:
        parts.append(f"{svc_count} خدمة")
    if doc_count:
        parts.append(f"{doc_count} دكتور")
    return " و".join(parts) + "."

def _format_booking_slots(result: dict) -> str:
    available = result.get("available") or []
    booked = result.get("booked") or []
    note = result.get("note", "")
    day = result.get("day", "")
    date = result.get("date", "")
    line = f"مواعيد {'يوم ' + day if day else ''} {date}: " if date else "مواعيد متاحة: "
    if available:
        line += ", ".join(available)
    else:
        line += "لا توجد مواعيد متاحة"
    if note:
        line += f" ({note})"
    return line

def _format_booking_reserve(result: dict) -> str:
    err = result.get("error", "")
    if err:
        return f"تعذر الحجز: {err}"
    if result.get("needs_gender"):
        return result.get("message", "")
    appt = result.get("appointment") or result
    parts = [
        f"تم حجز موعد لـ {result.get('patient', '')}",
    ]
    if result.get("branch"):
        parts.append(f"في {result.get('branch', '')}")
    if result.get("day_arabic") or result.get("date"):
        parts.append(f"يوم {result.get('day_arabic', '') or result.get('date', '')}")
    if result.get("time"):
        parts.append(f"الساعة {result.get('time', '')}")
    if result.get("service"):
        parts.append(f"خدمة {result.get('service', '')}")
    return " ".join(parts)

def _format_booking_status(result: dict) -> str:
    if result.get("error"):
        return f"خطأ: {result.get('error')}"
    if result.get("cancelled") or result.get("success"):
        return "تم إلغاء الحجز بنجاح."
    if result.get("appointment"):
        appt = result["appointment"]
        return f"حالة الحجز: {appt.get('status', 'مؤكد')} في {appt.get('branchName', '')} يوم {appt.get('date', '')}"
    return f"حالة الحجز: {result.get('status', 'غير معروف')}"


booking_info_tool = FunctionTool(
    name="booking_info",
    description="معلومات عامة عن المركز (العنوان, الفروع, الخدمات, الأطباء, الأسعار, أوقات العمل). استخدمها فقط إذا سأل العميل عن معلومات عامة. لا تستخدمها للتحقق من توفر مواعيد — استخدم booking_slots لذلك.",
    func=booking_info,
    input_model=InfoInput,
    format_result=_format_booking_info,
)

booking_slots_tool = FunctionTool(
    name="booking_slots",
    description="التحقق من مواعيد الحجز المتاحة في تاريخ معين. استخدم هذه الأداة عندما يريد العميل حجز موعد أو الاستفسار عن المواعيد المتاحة. تمرر تلقائياً company_id والتاريخ ونوع المريض.",
    func=booking_slots,
    input_model=SlotsInput,
    format_result=_format_booking_slots,
)

booking_reserve_tool = FunctionTool(
    name="booking_reserve",
    description="إنشاء وحجز موعد جديد للمريض في المركز الطبي باستخدام تفاصيل حجز مهيكلة ومحددة.",
    func=booking_reserve,
    input_model=ReserveInput,
    format_result=_format_booking_reserve,
)

booking_status_tool = FunctionTool(
    name="booking_status",
    description="الاستعلام عن تفاصيل موعد محجوز مسبقاً أو إلغاء الحجز باستخدام معرف الموعد.",
    func=booking_status,
    input_model=StatusInput,
    format_result=_format_booking_status,
)

__all_tools__ = [
    booking_info_tool,
    booking_slots_tool,
    booking_reserve_tool,
    booking_status_tool,
]
