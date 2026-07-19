from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools import education_tools


class InfoInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")

class EnrollInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    customer_phone: str = Field(..., description="رقم هاتف ولي الأمر")
    customer_name: str = Field(default="", description="اسم ولي الأمر (اختياري إذا كان موجوداً)")
    student_name: str = Field(..., description="اسم الطالب بالكامل")
    student_grade: str = Field(default="", description="الصف الدراسي أو المستوى (اختياري)")
    package_id: str = Field(..., description="معرف الباقة المختارة")
    amount_paid: float = Field(default=0, description="المبلغ المدفوع (اختياري، 0 للدفع لاحقاً)")

class ScheduleSessionInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    enrollment_id: str = Field(..., description="معرف التسجيل")
    scheduled_at: str = Field(..., description="تاريخ ووقت الحصة بصيغة YYYY-MM-DDTHH:MM (مثال: 2026-07-10T15:00)")
    planned_duration: int = Field(default=60, description="المدة المخططة بالدقائق (اختياري، افتراضي 60)")
    topic: str = Field(default="", description="موضوع الحصة (اختياري)")

class SessionsForPhoneInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    phone: str = Field(..., description="رقم هاتف ولي الأمر")
    status: str = Field(default="", description="حالة الحصة للتصفية: SCHEDULED, CONFIRMED, CANCELLED (اختياري)")

class CancelSessionInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    session_id: str = Field(..., description="معرف الحصة")


async def education_info(input_data: InfoInput) -> dict[str, Any]:
    """Returns ALL education center info: subjects and their packages."""
    return await education_tools.get_center_info(input_data.company_id)

async def education_enroll(input_data: EnrollInput) -> dict[str, Any]:
    """Enrolls a student: finds or creates customer (parent) by phone, creates student, creates enrollment."""
    return await education_tools.enroll_student(
        company_id=input_data.company_id,
        customer_phone=input_data.customer_phone,
        customer_name=input_data.customer_name,
        student_name=input_data.student_name,
        student_grade=input_data.student_grade,
        package_id=input_data.package_id,
        amount_paid=input_data.amount_paid,
    )

async def education_schedule_session(input_data: ScheduleSessionInput) -> dict[str, Any]:
    """Schedules a new session for an existing enrollment."""
    return await education_tools.schedule_session(
        company_id=input_data.company_id,
        enrollment_id=input_data.enrollment_id,
        scheduled_at=input_data.scheduled_at,
        planned_duration=input_data.planned_duration,
        topic=input_data.topic,
    )

async def education_sessions(input_data: SessionsForPhoneInput) -> dict[str, Any]:
    """Returns all sessions (upcoming and past) for a parent's phone number."""
    return await education_tools.get_sessions_for_phone(
        company_id=input_data.company_id,
        phone=input_data.phone,
        status=input_data.status,
    )

async def education_cancel_session(input_data: CancelSessionInput) -> dict[str, Any]:
    """Cancels a scheduled session."""
    return await education_tools.cancel_session(
        company_id=input_data.company_id,
        session_id=input_data.session_id,
    )


education_info_tool = FunctionTool(
    name="education_info",
    description="معلومات المركز التعليمي: عرض المواد الدراسية والباقات المتاحة مع الأسعار وعدد الساعات.",
    func=education_info,
    input_model=InfoInput,
)

education_enroll_tool = FunctionTool(
    name="education_enroll",
    description="تسجيل طالب جديد في باقة دراسية: البحث عن ولي الأمر بالهاتف أو إنشائه، إنشاء الطالب، والتسجيل في الباقة.",
    func=education_enroll,
    input_model=EnrollInput,
)

education_schedule_session_tool = FunctionTool(
    name="education_schedule_session",
    description="جدولة حصة جديدة لتسجيل موجود. يجب أن يكون للتسجيل ساعات متبقية كافية.",
    func=education_schedule_session,
    input_model=ScheduleSessionInput,
)

education_sessions_tool = FunctionTool(
    name="education_sessions",
    description="عرض الحصص المسجلة لولي الأمر باستخدام رقم الهاتف. يعرض جميع الحصص القادمة والسابقة.",
    func=education_sessions,
    input_model=SessionsForPhoneInput,
)

education_cancel_session_tool = FunctionTool(
    name="education_cancel_session",
    description="إلغاء حصة مجدولة (فقط الحصص ذات الحالة SCHEDULED يمكن إلغاؤها).",
    func=education_cancel_session,
    input_model=CancelSessionInput,
)

__all_tools__ = [
    education_info_tool,
    education_enroll_tool,
    education_schedule_session_tool,
    education_sessions_tool,
    education_cancel_session_tool,
]
