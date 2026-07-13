from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools import booking_admin_tools


# ── Branches ──

class ListBranchesInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")


class CreateBranchInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    name: str = Field(..., description="اسم الفرع")
    address: str = Field(default="", description="عنوان الفرع")
    phone: str = Field(default="", description="رقم هاتف الفرع")
    phones: list[str] | None = Field(default=None, description="قائمة أرقام الهاتف (JSON array)")
    workingDays: dict[str, Any] | None = Field(default=None, description="أيام/ساعات العمل (JSON)")
    genderDays: dict[str, Any] | None = Field(default=None, description="توزيع أيام الرجال/السيدات (JSON)")
    maxBookingsPerSlot: int | None = Field(default=None, description="الحد الأقصى للحجوزات لكل وقت (افتراضي 1)")
    location: str | None = Field(default=None, description="الموقع (وصف أو رابط)")
    landmarkImage: str | None = Field(default=None, description="صورة علامة مميزة (base64)")


class UpdateBranchInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    branch_id: str = Field(..., description="معرف الفرع")
    name: str = Field(default="", description="اسم الفرع")
    address: str = Field(default="", description="عنوان الفرع")
    phone: str = Field(default="", description="رقم الهاتف")
    phones: list[str] | None = Field(default=None, description="قائمة أرقام الهاتف (JSON array)")
    workingDays: dict[str, Any] | None = Field(default=None, description="أيام/ساعات العمل")
    genderDays: dict[str, Any] | None = Field(default=None, description="توزيع أيام الرجال/السيدات")
    isActive: bool | None = Field(default=None, description="تفعيل/إيقاف الفرع")
    maxBookingsPerSlot: int | None = Field(default=None, description="الحد الأقصى للحجوزات لكل وقت")
    location: str | None = Field(default=None, description="الموقع (وصف أو رابط)")
    landmarkImage: str | None = Field(default=None, description="صورة علامة مميزة (base64)")


class DeleteBranchInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    branch_id: str = Field(..., description="معرف الفرع")


# ── Doctors ──

class ListDoctorsInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    branch_id: str = Field(default="", description="معرف الفرع (اخياري - لتصفية الأطباء حسب الفرع)")


class CreateDoctorInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    branchId: str = Field(..., description="معرف الفرع")
    title: str = Field(..., description="المسمى (دكتور/أستاذ/إلخ)")
    name: str = Field(default="", description="اسم الطبيب")
    specialty: str = Field(default="", description="التخصص")
    phone: str = Field(default="", description="رقم الهاتف")
    gender: str = Field(default="", description="الجنس (MALE/FEMALE)")


class UpdateDoctorInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    doctor_id: str = Field(..., description="معرف الطبيب")
    branchId: str = Field(default="", description="معرف الفرع")
    title: str = Field(default="", description="المسمى")
    name: str = Field(default="", description="الاسم")
    specialty: str = Field(default="", description="التخصص")
    phone: str = Field(default="", description="الهاتف")
    gender: str = Field(default="", description="الجنس")
    isActive: bool | None = Field(default=None, description="تفعيل/إيقاف")


class DeleteDoctorInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    doctor_id: str = Field(..., description="معرف الطبيب")


# ── Services ──

class ListServicesInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")


class CreateServiceInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    name: str = Field(..., description="اسم الخدمة")
    description: str = Field(default="", description="وصف الخدمة")
    requiresConsultation: bool = Field(default=True, description="تتطلب استشارة؟")
    branches: list[str] = Field(default_factory=list, description="قائمة معرفات الفروع لربط الخدمة بها")


class UpdateServiceInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    service_id: str = Field(..., description="معرف الخدمة")
    name: str = Field(default="", description="اسم الخدمة")
    description: str = Field(default="", description="وصف الخدمة")
    requiresConsultation: bool | None = Field(default=None, description="تتطلب استشارة؟")
    isActive: bool | None = Field(default=None, description="تفعيل/إيقاف")


class DeleteServiceInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    service_id: str = Field(..., description="معرف الخدمة")


class ToggleServiceInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    service_id: str = Field(..., description="معرف الخدمة")


# ── Appointments ──

class ListAppointmentsInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    status: str = Field(default="", description="الحالة (pending/confirmed/cancelled/completed) - اختياري")
    branchId: str = Field(default="", description="معرف الفرع - اختياري")
    doctorId: str = Field(default="", description="معرف الطبيب - اختياري")
    serviceId: str = Field(default="", description="معرف الخدمة - اختياري")
    dateFrom: str = Field(default="", description="تاريخ بداية (YYYY-MM-DD) - اختياري")
    dateTo: str = Field(default="", description="تاريخ نهاية (YYYY-MM-DD) - اختياري")


class UpdateAppointmentStatusInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    appointment_id: str = Field(..., description="معرف الموعد")
    status: str = Field(..., description="الحالة الجديدة (confirmed/cancelled/completed/pending)")
    notes: str = Field(default="", description="ملاحظات - اختياري")


class BulkDeleteAppointmentsInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    ids: list[str] = Field(..., description="قائمة معرفات المواعيد")


# ── Reports ──

class ReportsSummaryInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    period: str = Field(default="today", description="الفترة (today/week/month)")


# ── Functions ──

async def booking_branches_list(input_data: ListBranchesInput) -> dict[str, Any]:
    return await booking_admin_tools.list_branches(input_data.company_id)

async def booking_branch_create(input_data: CreateBranchInput) -> dict[str, Any]:
    data = input_data.model_dump(exclude={"company_id"}, exclude_none=True)
    return await booking_admin_tools.create_branch(input_data.company_id, data)

async def booking_branch_update(input_data: UpdateBranchInput) -> dict[str, Any]:
    data = input_data.model_dump(exclude={"company_id", "branch_id"}, exclude_none=True)
    return await booking_admin_tools.update_branch(input_data.company_id, input_data.branch_id, data)

async def booking_branch_delete(input_data: DeleteBranchInput) -> dict[str, Any]:
    return await booking_admin_tools.delete_branch(input_data.company_id, input_data.branch_id)

async def booking_doctors_list(input_data: ListDoctorsInput) -> dict[str, Any]:
    return await booking_admin_tools.list_doctors(input_data.company_id, input_data.branch_id)

async def booking_doctor_create(input_data: CreateDoctorInput) -> dict[str, Any]:
    data = input_data.model_dump(exclude={"company_id"}, exclude_none=True)
    return await booking_admin_tools.create_doctor(input_data.company_id, data)

async def booking_doctor_update(input_data: UpdateDoctorInput) -> dict[str, Any]:
    data = input_data.model_dump(exclude={"company_id", "doctor_id"}, exclude_none=True)
    return await booking_admin_tools.update_doctor(input_data.company_id, input_data.doctor_id, data)

async def booking_doctor_delete(input_data: DeleteDoctorInput) -> dict[str, Any]:
    return await booking_admin_tools.delete_doctor(input_data.company_id, input_data.doctor_id)

async def booking_services_list(input_data: ListServicesInput) -> dict[str, Any]:
    return await booking_admin_tools.list_services(input_data.company_id)

async def booking_service_create(input_data: CreateServiceInput) -> dict[str, Any]:
    data = input_data.model_dump(exclude={"company_id"}, exclude_none=True)
    if data.get("branches") and isinstance(data["branches"], list):
        data["branches"] = [{"branchId": b} if isinstance(b, str) else b for b in data["branches"]]
    return await booking_admin_tools.create_service(input_data.company_id, data)

async def booking_service_update(input_data: UpdateServiceInput) -> dict[str, Any]:
    data = input_data.model_dump(exclude={"company_id", "service_id"}, exclude_none=True)
    return await booking_admin_tools.update_service(input_data.company_id, input_data.service_id, data)

async def booking_service_delete(input_data: DeleteServiceInput) -> dict[str, Any]:
    return await booking_admin_tools.delete_service(input_data.company_id, input_data.service_id)

async def booking_service_toggle(input_data: ToggleServiceInput) -> dict[str, Any]:
    return await booking_admin_tools.toggle_service(input_data.company_id, input_data.service_id)

async def booking_appointments_list(input_data: ListAppointmentsInput) -> dict[str, Any]:
    filters = input_data.model_dump(exclude={"company_id"}, exclude_none=True)
    return await booking_admin_tools.list_appointments(input_data.company_id, filters)

async def booking_appointment_update_status(input_data: UpdateAppointmentStatusInput) -> dict[str, Any]:
    return await booking_admin_tools.update_appointment_status(
        input_data.company_id, input_data.appointment_id, input_data.status, input_data.notes
    )

async def booking_appointments_bulk_delete(input_data: BulkDeleteAppointmentsInput) -> dict[str, Any]:
    return await booking_admin_tools.bulk_delete_appointments(input_data.company_id, input_data.ids)

async def booking_reports_summary(input_data: ReportsSummaryInput) -> dict[str, Any]:
    return await booking_admin_tools.reports_summary(input_data.company_id, input_data.period)


# ── FunctionTool instances ──

booking_branches_list_tool = FunctionTool(
    name="booking_branches_list",
    description="عرض قائمة كل فروع المركز الطبي.",
    func=booking_branches_list,
    input_model=ListBranchesInput,
)

booking_branch_create_tool = FunctionTool(
    name="booking_branch_create",
    description="إضافة فرع جديد للمركز الطبي.",
    func=booking_branch_create,
    input_model=CreateBranchInput,
)

booking_branch_update_tool = FunctionTool(
    name="booking_branch_update",
    description="تعديل بيانات فرع موجود (الاسم، العنوان، الهاتف، الأرقام، أيام العمل، التفعيل، الحد الأقصى للحجوزات، الموقع، الصورة).",
    func=booking_branch_update,
    input_model=UpdateBranchInput,
)

booking_branch_delete_tool = FunctionTool(
    name="booking_branch_delete",
    description="حذف فرع من المركز الطبي.",
    func=booking_branch_delete,
    input_model=DeleteBranchInput,
)

booking_doctors_list_tool = FunctionTool(
    name="booking_doctors_list",
    description="عرض قائمة الأطباء (اختياري بفلتر فرع محدد).",
    func=booking_doctors_list,
    input_model=ListDoctorsInput,
)

booking_doctor_create_tool = FunctionTool(
    name="booking_doctor_create",
    description="إضافة طبيب جديد لفرع محدد.",
    func=booking_doctor_create,
    input_model=CreateDoctorInput,
)

booking_doctor_update_tool = FunctionTool(
    name="booking_doctor_update",
    description="تعديل بيانات طبيب موجود.",
    func=booking_doctor_update,
    input_model=UpdateDoctorInput,
)

booking_doctor_delete_tool = FunctionTool(
    name="booking_doctor_delete",
    description="حذف طبيب.",
    func=booking_doctor_delete,
    input_model=DeleteDoctorInput,
)

booking_services_list_tool = FunctionTool(
    name="booking_services_list",
    description="عرض قائمة كل الخدمات الطبية المتاحة.",
    func=booking_services_list,
    input_model=ListServicesInput,
)

booking_service_create_tool = FunctionTool(
    name="booking_service_create",
    description="إضافة خدمة طبية جديدة.",
    func=booking_service_create,
    input_model=CreateServiceInput,
)

booking_service_update_tool = FunctionTool(
    name="booking_service_update",
    description="تعديل بيانات خدمة موجودة.",
    func=booking_service_update,
    input_model=UpdateServiceInput,
)

booking_service_delete_tool = FunctionTool(
    name="booking_service_delete",
    description="حذف خدمة طبية.",
    func=booking_service_delete,
    input_model=DeleteServiceInput,
)

booking_service_toggle_tool = FunctionTool(
    name="booking_service_toggle",
    description="تفعيل أو إيقاف خدمة مؤقتًا بدون حذفها.",
    func=booking_service_toggle,
    input_model=ToggleServiceInput,
)

booking_appointments_list_tool = FunctionTool(
    name="booking_appointments_list",
    description="عرض قائمة المواعيد بفلاتر (الحالة، الفرع، الطبيب، الخدمة، التاريخ).",
    func=booking_appointments_list,
    input_model=ListAppointmentsInput,
)

booking_appointment_update_status_tool = FunctionTool(
    name="booking_appointment_update_status",
    description="تحديث حالة موعد محدد (تأكيد، إلغاء، إكمال).",
    func=booking_appointment_update_status,
    input_model=UpdateAppointmentStatusInput,
)

booking_appointments_bulk_delete_tool = FunctionTool(
    name="booking_appointments_bulk_delete",
    description="حذف عدة مواعيد دفعة واحدة.",
    func=booking_appointments_bulk_delete,
    input_model=BulkDeleteAppointmentsInput,
)

booking_reports_summary_tool = FunctionTool(
    name="booking_reports_summary",
    description="تقرير ملخص المواعيد (اليوم/الأسبوع/الشهر) — الإحصائيات، الإلغاءات، الخدمات الأكثر طلبًا.",
    func=booking_reports_summary,
    input_model=ReportsSummaryInput,
)


__all_tools__ = [
    booking_branches_list_tool,
    booking_branch_create_tool,
    booking_branch_update_tool,
    booking_branch_delete_tool,
    booking_doctors_list_tool,
    booking_doctor_create_tool,
    booking_doctor_update_tool,
    booking_doctor_delete_tool,
    booking_services_list_tool,
    booking_service_create_tool,
    booking_service_update_tool,
    booking_service_delete_tool,
    booking_service_toggle_tool,
    booking_appointments_list_tool,
    booking_appointment_update_status_tool,
    booking_appointments_bulk_delete_tool,
    booking_reports_summary_tool,
]