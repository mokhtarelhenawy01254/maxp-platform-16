from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools import booking_tools
from src.tools import booking_draft_tools


class BranchesListInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class DoctorsListInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    branch_id: str | None = Field(default=None, description="Filter doctors by branch ID")


class ServicesListInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    branch_id: str | None = Field(default=None, description="Filter services by branch ID")


class AvailableSlotsInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    branch_id: str | None = Field(default=None, description="Branch ID (optional - uses first branch if empty)")
    date: str | None = Field(default=None, description="Date YYYY-MM-DD (optional - uses today if empty)")
    doctor_id: str | None = Field(default=None, description="Doctor ID (optional)")
    service_id: str | None = Field(default=None, description="Service ID (optional)")


class AppointmentCreateInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    patient_info: str | None = Field(default=None, description="Patient information as text: name, phone, gender. Example: 'محمد عبدالله, 01234567890, ذكر' or 'name=أحمد phone=01111111111 gender=MALE'")
    branch_id: str | None = Field(default=None, description="Branch ID (optional - uses first branch if empty)")
    doctor_id: str | None = Field(default=None, description="Doctor ID (optional - uses first doctor if empty)")
    service_id: str | None = Field(default=None, description="Service ID (optional - uses first service if empty)")
    appointment_date: str | None = Field(default=None, description="Date in YYYY-MM-DD format")
    start_time: str | None = Field(default=None, description="Start time in HH:mm format (24h)")
    customer_name: str | None = Field(default=None, description="Patient full name (alternative to patient_info)")
    customer_phone: str | None = Field(default=None, description="Patient phone number (alternative to patient_info)")
    customer_gender: str | None = Field(default=None, description="Patient gender: MALE or FEMALE (alternative to patient_info)")
    notes: str | None = Field(default=None, description="Additional notes about the appointment")


class AppointmentConfirmInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    appointment_id: str = Field(description="Appointment ID to confirm")


class AppointmentCancelInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    appointment_id: str = Field(description="Appointment ID to cancel")
    reason: str | None = Field(default=None, description="Cancellation reason")


class AppointmentDetailsInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    appointment_id: str = Field(description="Appointment ID")


async def booking_branches_list(input_data: BranchesListInput) -> list[dict[str, Any]]:
    return await booking_tools.list_branches(input_data.company_id or "")


async def booking_doctors_list(input_data: DoctorsListInput) -> list[dict[str, Any]]:
    return await booking_tools.list_doctors(input_data.company_id or "", input_data.branch_id)


async def booking_services_list(input_data: ServicesListInput) -> list[dict[str, Any]]:
    return await booking_tools.list_services(input_data.company_id or "", input_data.branch_id)


async def booking_available_slots(input_data: AvailableSlotsInput) -> list[str]:
    return await booking_tools.available_slots(
        input_data.company_id or "",
        input_data.branch_id,
        input_data.date,
        input_data.doctor_id,
        input_data.service_id,
    )


async def booking_appointment_create(input_data: AppointmentCreateInput) -> dict[str, Any]:
    return await booking_tools.create_appointment(input_data.company_id or "", {
        "patientInfo": input_data.patient_info,
        "branchId": input_data.branch_id,
        "doctorId": input_data.doctor_id,
        "serviceId": input_data.service_id,
        "customerName": input_data.customer_name,
        "customerPhone": input_data.customer_phone,
        "customerGender": input_data.customer_gender,
        "appointmentDate": input_data.appointment_date,
        "startTime": input_data.start_time,
        "notes": input_data.notes,
    })


async def booking_appointment_confirm(input_data: AppointmentConfirmInput) -> dict[str, Any]:
    return await booking_tools.confirm_appointment(input_data.company_id or "", input_data.appointment_id)


async def booking_appointment_cancel(input_data: AppointmentCancelInput) -> dict[str, Any]:
    return await booking_tools.cancel_appointment(input_data.company_id or "", input_data.appointment_id, input_data.reason)


async def booking_appointment_details(input_data: AppointmentDetailsInput) -> dict[str, Any] | None:
    return await booking_tools.appointment_details(input_data.company_id or "", input_data.appointment_id)


booking_branches_list_tool = FunctionTool(
    name="booking_branches_list",
    description="قائمة الفروع المتاحة في النظام الطبي (List all branches).",
    func=booking_branches_list,
    input_model=BranchesListInput,
)

booking_doctors_list_tool = FunctionTool(
    name="booking_doctors_list",
    description="قائمة الأطباء بالمركز (List doctors). Params: branch_id (optional filter).",
    func=booking_doctors_list,
    input_model=DoctorsListInput,
)

booking_services_list_tool = FunctionTool(
    name="booking_services_list",
    description="قائمة الخدمات الطبية والأسعار (List services). Params: branch_id (optional filter).",
    func=booking_services_list,
    input_model=ServicesListInput,
)

booking_available_slots_tool = FunctionTool(
    name="booking_available_slots",
    description="[REQUIRED PARAMS: branch_id, date] Returns available appointment time slots. branch_id from branches_list result id. date format YYYY-MM-DD. Optional: doctor_id, service_id.",
    func=booking_available_slots,
    input_model=AvailableSlotsInput,
)

booking_appointment_create_tool = FunctionTool(
    name="booking_appointment_create",
    description="إنشاء موعد جديد في النظام الطبي (Create appointment). Pass ALL patient info in patient_info text field: name, phone, gender. Example patient_info: 'محمد عبدالله, 01234567890, ذكر'. All other fields are optional (auto-filled).",
    func=booking_appointment_create,
    input_model=AppointmentCreateInput,
)

booking_appointment_confirm_tool = FunctionTool(
    name="booking_appointment_confirm",
    description="تأكيد موعد قيد الانتظار (Confirm appointment). Params: appointment_id (required).",
    func=booking_appointment_confirm,
    input_model=AppointmentConfirmInput,
)

booking_appointment_cancel_tool = FunctionTool(
    name="booking_appointment_cancel",
    description="إلغاء موعد (Cancel appointment) REQUIRES APPROVAL. Params: appointment_id (required), reason (optional).",
    func=booking_appointment_cancel,
    input_model=AppointmentCancelInput,
)

booking_appointment_details_tool = FunctionTool(
    name="booking_appointment_details",
    description="عرض تفاصيل موعد (View appointment details). Params: appointment_id (required).",
    func=booking_appointment_details,
    input_model=AppointmentDetailsInput,
)

# ── Booking Draft (multi-turn) ──

class DraftStartInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class DraftSetFieldInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    draft_id: str = Field(description="Draft ID from booking_draft_start")
    field: str = Field(description="Field name: branchId, doctorId, serviceId, customerName, customerPhone, customerGender, appointmentDate (YYYY-MM-DD), startTime (HH:mm)")
    value: str = Field(description="Field value")


class DraftGetInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    draft_id: str = Field(description="Draft ID from booking_draft_start")


class DraftFinalizeInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    draft_id: str = Field(description="Draft ID to finalize into an appointment")


async def booking_draft_start(input_data: DraftStartInput) -> dict[str, Any]:
    return await booking_draft_tools.start_draft(input_data.company_id or "")


async def booking_draft_set_field(input_data: DraftSetFieldInput) -> dict[str, Any]:
    return await booking_draft_tools.set_draft_field(input_data.company_id or "", input_data.draft_id, input_data.field, input_data.value)


async def booking_draft_get(input_data: DraftGetInput) -> dict[str, Any]:
    return await booking_draft_tools.get_draft(input_data.company_id or "", input_data.draft_id)


async def booking_draft_finalize(input_data: DraftFinalizeInput) -> dict[str, Any]:
    return await booking_draft_tools.finalize_draft(input_data.company_id or "", input_data.draft_id)


booking_draft_start_tool = FunctionTool(
    name="booking_draft_start",
    description="بدء حجز جديد (Start a new booking draft). Returns draft_id. Use this FIRST when a patient wants to book. Then collect fields one by one with booking_draft_set_field. Params: none.",
    func=booking_draft_start,
    input_model=DraftStartInput,
)

booking_draft_set_field_tool = FunctionTool(
    name="booking_draft_set_field",
    description="تحديث حقل في مسودة الحجز (Set a single draft field). Collect ONE field per call. Allowed fields: branchId, doctorId, serviceId, customerName, customerPhone, customerGender, appointmentDate (YYYY-MM-DD), startTime (HH:mm), notes.",
    func=booking_draft_set_field,
    input_model=DraftSetFieldInput,
)

booking_draft_get_tool = FunctionTool(
    name="booking_draft_get",
    description="عرض مسودة الحجز الحالية (View current draft state and what fields are filled). Useful to check what's missing before finalizing.",
    func=booking_draft_get,
    input_model=DraftGetInput,
)

booking_draft_finalize_tool = FunctionTool(
    name="booking_draft_finalize",
    description="تأكيد الحجز وإنشاء الموعد (Finalize and create the appointment). Only call this when ALL required fields are filled: customerName, customerPhone, appointmentDate, startTime. Must have at least customerName, customerPhone, appointmentDate, startTime.",
    func=booking_draft_finalize,
    input_model=DraftFinalizeInput,
)

__all_tools__ = [
    booking_branches_list_tool,
    booking_doctors_list_tool,
    booking_services_list_tool,
    booking_available_slots_tool,
    booking_appointment_create_tool,
    booking_appointment_confirm_tool,
    booking_appointment_cancel_tool,
    booking_appointment_details_tool,
    booking_draft_start_tool,
    booking_draft_set_field_tool,
    booking_draft_get_tool,
    booking_draft_finalize_tool,
]
