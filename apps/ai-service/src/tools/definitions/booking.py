from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools import booking_tools


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
    branch_id: str = Field(description="Branch ID to check availability for")
    date: str = Field(description="Date in YYYY-MM-DD format")
    doctor_id: str | None = Field(default=None, description="Doctor ID (optional)")
    service_id: str | None = Field(default=None, description="Service ID (optional)")


class AppointmentCreateInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    branch_id: str = Field(description="Branch ID")
    doctor_id: str = Field(description="Doctor ID")
    service_id: str = Field(description="Service ID")
    customer_name: str = Field(description="Patient full name")
    customer_phone: str = Field(description="Patient phone number")
    customer_gender: str = Field(description="Patient gender: MALE or FEMALE")
    appointment_date: str = Field(description="Date in YYYY-MM-DD format")
    start_time: str = Field(description="Start time in HH:mm format (24h)")


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
        "branchId": input_data.branch_id,
        "doctorId": input_data.doctor_id,
        "serviceId": input_data.service_id,
        "customerName": input_data.customer_name,
        "customerPhone": input_data.customer_phone,
        "customerGender": input_data.customer_gender,
        "appointmentDate": input_data.appointment_date,
        "startTime": input_data.start_time,
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
    description="[REQUIRED: ALL 8 PARAMS] Creates a new appointment in the system. MUST provide: branch_id, doctor_id, service_id, customer_name, customer_phone, customer_gender (MALE or FEMALE), appointment_date (YYYY-MM-DD), start_time (HH:mm 24h). Requires human approval.",
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

__all_tools__ = [
    booking_branches_list_tool,
    booking_doctors_list_tool,
    booking_services_list_tool,
    booking_available_slots_tool,
    booking_appointment_create_tool,
    booking_appointment_confirm_tool,
    booking_appointment_cancel_tool,
    booking_appointment_details_tool,
]
