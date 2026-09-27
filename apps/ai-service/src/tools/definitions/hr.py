from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

import src.db.session as _db_mod
from src.tools.repositories.hr_repository import HrRepository


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Profile Tool
# ═══════════════════════════════════════════════════════════════════════════════

class HrMyProfileInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    user_id: str | None = Field(default=None, description="User ID of the employee (auto-injected)")
    employee_id: str | None = Field(default=None, description="Employee ID if known")


async def hr_my_profile(input_data: HrMyProfileInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"error": "company_id is required"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = HrRepository(sess)
        emp = await repo.get_employee(company_id, user_id=input_data.user_id, employee_id=input_data.employee_id)

    if not emp:
        return {"error": "لم يتم العثور على سجل وظيفي مرتبط بهذا الحساب"}

    return {
        "found": True,
        "employee_id": emp["id"],
        "employee_number": emp["employeeNumber"],
        "name": f"{emp['firstName']} {emp['lastName']}".strip(),
        "department": emp.get("departmentName") or "غير محدد",
        "manager": emp.get("managerName") or "غير محدد",
        "contract_type": emp.get("contractType") or "FULL_TIME",
        "hire_date": str(emp.get("hireDate") or "")[:10],
        "work_location": emp.get("workLocation") or "المقر الرئيسي",
        "status": emp.get("status") or "ACTIVE",
    }


def _format_hr_my_profile(res: dict[str, Any]) -> str:
    if res.get("error"):
        return f"تنبيه: {res['error']}"
    return (
        f"بيانات الموظف: {res['name']} (كود: {res['employee_number']})\n"
        f"- القسم: {res['department']}\n"
        f"- المدير المباشر: {res['manager']}\n"
        f"- تاريخ التعيين: {res['hire_date']}\n"
        f"- نوع العقد: {res['contract_type']}"
    )


hr_my_profile_tool = FunctionTool(
    name="hr_my_profile",
    description="استعلام عن الملف الوظيفي والبيانات الإدارية الرسمية للموظف المتصل (القسم، المدير المباشر، وتاريخ التعيين).",
    func=hr_my_profile,
    input_model=HrMyProfileInput,
    format_result=_format_hr_my_profile,
)


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Attendance Tool
# ═══════════════════════════════════════════════════════════════════════════════

class HrMyAttendanceInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    user_id: str | None = Field(default=None, description="User ID of the employee (auto-injected)")
    limit: int = Field(default=7, description="عدد الأيام السابقة للاستعلام (افتراضياً 7)")


async def hr_my_attendance(input_data: HrMyAttendanceInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    user_id = input_data.user_id or ""
    if not company_id or not user_id:
        return {"error": "معرف الشركة أو الموظف غير متوفر في الجلسة"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = HrRepository(sess)
        data = await repo.get_my_attendance(company_id, user_id=user_id, limit=input_data.limit)

    return data


def _format_hr_my_attendance(res: dict[str, Any]) -> str:
    if res.get("error"):
        return f"تنبيه: {res['error']}"

    today = res.get("today")
    recent = res.get("recent") or []

    lines = []
    if today:
        check_in = str(today.get("checkIn") or "")[11:16] or "لم يسجل"
        check_out = str(today.get("checkOut") or "")[11:16] or "لم يسجل بعد"
        hours = today.get("workHours") or 0
        late = today.get("lateMinutes") or 0
        lines.append(f"سجل اليوم: حضور {check_in} | انصراف {check_out} | ساعات عمل: {hours} ساعة | تأخير: {late} دقيقة")
    else:
        lines.append("سجل اليوم: لم يتم تسجيل حضور اليوم بعد.")

    if recent:
        lines.append(f"سجل آخر {len(recent)} أيام عمل مسجلة:")
        for r in recent[:5]:
            d = str(r.get("date") or "")[:10]
            status = r.get("status") or "PRESENT"
            h = r.get("workHours") or 0
            lines.append(f"- {d}: {status} ({h} ساعة)")

    return "\n".join(lines)


hr_my_attendance_tool = FunctionTool(
    name="hr_my_attendance",
    description="استعلام الموظف عن بصمة حضوره وانصرافه اليومية وسجل ساعات العمل والتأخيرات المسجلة في الأيام السابقة.",
    func=hr_my_attendance,
    input_model=HrMyAttendanceInput,
    format_result=_format_hr_my_attendance,
)


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Leave Balance Tool
# ═══════════════════════════════════════════════════════════════════════════════

class HrLeaveBalanceInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    user_id: str | None = Field(default=None, description="User ID of the employee (auto-injected)")
    employee_id: str | None = Field(default=None, description="Employee ID if known")


async def hr_leave_balance(input_data: HrLeaveBalanceInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"error": "معرف الشركة غير متوفر"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = HrRepository(sess)
        emp = await repo.get_employee(company_id, user_id=input_data.user_id, employee_id=input_data.employee_id)
        if not emp:
            return {"error": "لم يتم العثور على سجل الموظف"}

        balance = await repo.get_leave_balance(
            company_id,
            employee_id=emp["id"],
            user_id=emp.get("userId") or input_data.user_id,
        )

    if not balance:
        return {"error": "تعذر استخراج بيانات رصيد الإجازات"}

    return {
        "employee_name": f"{emp['firstName']} {emp['lastName']}".strip(),
        **balance,
    }


def _format_hr_leave_balance(res: dict[str, Any]) -> str:
    if res.get("error"):
        return f"تنبيه: {res['error']}"

    annual_bal = res.get("annual_balance", res.get("annual_remaining", 0))
    sick_bal = res.get("sick_balance", res.get("sick_remaining", 0))
    return (
        f"أرصدة إجازات الزميل/ة {res.get('employee_name', '')}:\n"
        f"- الإجازات السنوية: متبقي {annual_bal} يوم من إجمالي {res.get('annual_total', 0)} يوم (مستهلك: {res.get('annual_taken', 0)} يوم).\n"
        f"- الإجازات المرضية: متبقي {sick_bal} يوم من إجمالي {res.get('sick_total', 0)} يوم.\n"
        f"- الإجازات العارضة المستهلكة: {res.get('emergency_taken', 0)} يوم."
    )


hr_leave_balance_tool = FunctionTool(
    name="hr_leave_balance",
    description="فحص رصيد الإجازات السنوية والمرضية والعارضة المتبقية للموظف قبل تقديم أي طلب إجازة رسمي.",
    func=hr_leave_balance,
    input_model=HrLeaveBalanceInput,
    format_result=_format_hr_leave_balance,
)


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Leave Request Create Tool
# ═══════════════════════════════════════════════════════════════════════════════

class HrLeaveRequestCreateInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    user_id: str | None = Field(default=None, description="User ID of the employee (auto-injected)")
    employee_id: str | None = Field(default=None, description="Employee ID if known")
    leave_type: str = Field(..., description="نوع الإجازة: ANNUAL, SICK, EMERGENCY, UNPAID, MATERNITY, PATERNITY, BEREAVEMENT, MARRIAGE")
    start_date: str = Field(..., description="تاريخ بداية الإجازة بصيغة YYYY-MM-DD")
    end_date: str = Field(..., description="تاريخ نهاية الإجازة بصيغة YYYY-MM-DD")
    reason: str = Field(..., description="سبب الإجازة بوضوح")


async def hr_leave_request_create(input_data: HrLeaveRequestCreateInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"error": "معرف الشركة غير متوفر"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = HrRepository(sess)
        emp = await repo.get_employee(company_id, user_id=input_data.user_id, employee_id=input_data.employee_id)
        if not emp:
            return {"error": "لم يتم العثور على سجل الموظف لربط الطلب به"}

        user_id = emp.get("userId") or input_data.user_id or emp["id"]

        result = await repo.create_leave_request(
            company_id=company_id,
            user_id=user_id,
            employee_id=emp["id"],
            leave_type=input_data.leave_type,
            start_date=input_data.start_date,
            end_date=input_data.end_date,
            reason=input_data.reason,
        )

    return result


def _format_hr_leave_request_create(res: dict[str, Any]) -> str:
    if res.get("error"):
        return f"تعذر تسجيل طلب الإجازة: {res['error']}"

    return (
        f"تم تسجيل طلب الإجازة بنجاح برقم قيد ({res.get('request_id', '')[:8]}…).\n"
        f"- النوع: {res.get('leave_type')}\n"
        f"- الفترة: من {res.get('start_date')} إلى {res.get('end_date')} (إجمالي {res.get('total_days')} يوم).\n"
        f"- الحالة: معلق (PENDING) وبانتظار اعتماد المدير المباشر."
    )


hr_leave_request_create_tool = FunctionTool(
    name="hr_leave_request_create",
    description="إنشاء وتوثيق طلب إجازة رسمي جديد في قاعدة البيانات للموظف بعد استيفاء البيانات والحصول على تأكيده الصريح.",
    func=hr_leave_request_create,
    input_model=HrLeaveRequestCreateInput,
    format_result=_format_hr_leave_request_create,
)


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Permission Request Create Tool
# ═══════════════════════════════════════════════════════════════════════════════

class HrPermissionRequestCreateInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    user_id: str | None = Field(default=None, description="User ID of the employee (auto-injected)")
    employee_id: str | None = Field(default=None, description="Employee ID if known")
    date: str = Field(..., description="تاريخ الإذن بصيغة YYYY-MM-DD")
    start_time: str = Field(..., description="وقت بداية الإذن بصيغة HH:mm")
    end_time: str = Field(..., description="وقت نهاية الإذن بصيغة HH:mm")
    reason: str = Field(..., description="سبب الاستئذان")
    permission_type: str = Field(default="NON_DEDUCTIBLE", description="نوع الإذن: DEDUCTIBLE, NON_DEDUCTIBLE, FIXED_HOURS, COMPENSATORY")


async def hr_permission_request_create(input_data: HrPermissionRequestCreateInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"error": "معرف الشركة غير متوفر"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = HrRepository(sess)
        emp = await repo.get_employee(company_id, user_id=input_data.user_id, employee_id=input_data.employee_id)
        if not emp:
            return {"error": "لم يتم العثور على سجل الموظف"}

        result = await repo.create_permission_request(
            company_id=company_id,
            employee_id=emp["id"],
            date_str=input_data.date,
            start_time=input_data.start_time,
            end_time=input_data.end_time,
            reason=input_data.reason,
            permission_type=input_data.permission_type,
        )

    return result


def _format_hr_permission_request_create(res: dict[str, Any]) -> str:
    if res.get("error"):
        return f"تعذر تسجيل طلب الإذن: {res['error']}"

    return (
        f"تم تسجيل طلب الإذن الساعي بنجاح.\n"
        f"- التاريخ: {res.get('date')}\n"
        f"- الوقت: من {res.get('start_time')} حتى {res.get('end_time')} (المدة: {res.get('total_hours')} ساعة).\n"
        f"- الحالة: معلق (PENDING) وبانتظار اعتماد الإدارة."
    )


hr_permission_request_create_tool = FunctionTool(
    name="hr_permission_request_create",
    description="إنشاء ورفع طلب إذن ساعي رسمي (تأخير صباحي أو خروج مبكر) بعد تأكيد تفاصيله ومبرراته مع الموظف.",
    func=hr_permission_request_create,
    input_model=HrPermissionRequestCreateInput,
    format_result=_format_hr_permission_request_create,
)


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Requests Status Tool
# ═══════════════════════════════════════════════════════════════════════════════

class HrRequestsStatusInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    user_id: str | None = Field(default=None, description="User ID of the employee (auto-injected)")
    employee_id: str | None = Field(default=None, description="Employee ID if known")
    limit: int = Field(default=5, description="عدد الطلبات الأخيرة المراد استعراضها")


async def hr_requests_status(input_data: HrRequestsStatusInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"error": "معرف الشركة غير متوفر"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = HrRepository(sess)
        emp = await repo.get_employee(company_id, user_id=input_data.user_id, employee_id=input_data.employee_id)
        if not emp:
            return {"error": "لم يتم العثور على سجل الموظف"}

        result = await repo.get_requests_status(
            company_id,
            employee_id=emp["id"],
            user_id=emp.get("userId") or input_data.user_id,
            limit=input_data.limit,
        )

    return result


def _format_hr_requests_status(res: dict[str, Any]) -> str:
    if res.get("error"):
        return f"تنبيه: {res['error']}"

    leaves = res.get("leaves") or []
    permissions = res.get("permissions") or []

    if not leaves and not permissions:
        return "لا توجد طلبات إجازات أو أذونات مسجلة مؤخراً."

    lines = []
    if leaves:
        lines.append("طلبات الإجازات الأخيرة:")
        for lv in leaves:
            s_date = str(lv.get("startDate") or "")[:10]
            e_date = str(lv.get("endDate") or "")[:10]
            lines.append(f"- {lv.get('type')}: من {s_date} إلى {e_date} ({lv.get('totalDays')} يوم) -> الحالة: {lv.get('status')}")

    if permissions:
        lines.append("طلبات الأذونات الأخيرة:")
        for pm in permissions:
            p_date = str(pm.get("date") or "")[:10]
            lines.append(f"- {p_date}: من {pm.get('startTime')} إلى {pm.get('endTime')} ({pm.get('totalHours')} ساعة) -> الحالة: {pm.get('status')}")

    return "\n".join(lines)


hr_requests_status_tool = FunctionTool(
    name="hr_requests_status",
    description="استعلام الموظف عن مصير وحالة طلبات الإجازات والأذونات التي قدمها مؤخراً (معلقة، مقبولة، أو مرفوضة).",
    func=hr_requests_status,
    input_model=HrRequestsStatusInput,
    format_result=_format_hr_requests_status,
)


# ═══════════════════════════════════════════════════════════════════════════════
# 7. Payslip Tool (Strictly User-Scoped)
# ═══════════════════════════════════════════════════════════════════════════════

class HrPayslipInquiryInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    user_id: str | None = Field(default=None, description="User ID of the employee (auto-injected)")
    month: int | None = Field(default=None, description="الشهر المراد الاستعلام عنه (1-12)")
    year: int | None = Field(default=None, description="السنة المراد الاستعلام عنها e.g. 2026")


async def hr_payslip_inquiry(input_data: HrPayslipInquiryInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    user_id = input_data.user_id or ""
    if not company_id or not user_id:
        return {"error": "بيانات الجلسة غير كافية للتحقق من هوية الموظف في مسار الرواتب"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = HrRepository(sess)
        slip = await repo.get_payslip(company_id, user_id=user_id, month=input_data.month, year=input_data.year)

    if not slip:
        return {"error": "لم يتم العثور على كشف راتب معتمد للشهر والسنة المحددة"}

    return {
        "found": True,
        "month": slip["month"],
        "year": slip["year"],
        "base_salary": float(slip.get("baseSalary") or 0),
        "total_allowances": float(slip.get("totalAllowances") or 0),
        "total_deductions": float(slip.get("totalDeductions") or 0),
        "overtime_amount": float(slip.get("overtimeAmount") or 0),
        "bonuses": float(slip.get("bonuses") or 0),
        "tax": float(slip.get("taxAmount") or 0),
        "insurance": float(slip.get("socialInsurance") or 0),
        "gross_salary": float(slip.get("grossSalary") or 0),
        "net_salary": float(slip.get("netSalary") or 0),
        "status": slip.get("status") or "DRAFT",
        "paid_at": str(slip.get("paidAt") or "")[:10] if slip.get("paidAt") else "لم يصرف بعد",
    }


def _format_hr_payslip_inquiry(res: dict[str, Any]) -> str:
    if res.get("error"):
        return f"تنبيه: {res['error']}"

    return (
        f"مفردات الراتب لشهر {res['month']}/{res['year']}:\n"
        f"- الراتب الأساسي: {res['base_salary']:,.2f}\n"
        f"- البدلات والحوافز: {res['total_allowances'] + res['bonuses'] + res['overtime_amount']:,.2f}\n"
        f"- إجمالي الاستقطاعات والضرائب: {res['total_deductions'] + res['tax'] + res['insurance']:,.2f}\n"
        f"- صافي الراتب المستحق: {res['net_salary']:,.2f}\n"
        f"- حالة الصرف: {res['status']} ({res['paid_at']})"
    )


hr_payslip_inquiry_tool = FunctionTool(
    name="hr_payslip_inquiry",
    description="استعلام آمن ومحمي عن مفردات وكشف الراتب للموظف المتصل فقط (الراتب الأساسي، البدلات، الاستقطاعات، وصافي المرتب).",
    func=hr_payslip_inquiry,
    input_model=HrPayslipInquiryInput,
    format_result=_format_hr_payslip_inquiry,
)


# ═══════════════════════════════════════════════════════════════════════════════
# 8. Company Today Attendance (Management View)
# ═══════════════════════════════════════════════════════════════════════════════

class HrAttendanceTodayInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def hr_attendance_today(input_data: HrAttendanceTodayInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"error": "معرف الشركة غير متوفر"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = HrRepository(sess)
        return await repo.get_company_attendance_today(company_id)


def _format_hr_attendance_today(res: dict[str, Any]) -> str:
    if res.get("error"):
        return f"تنبيه: {res['error']}"

    return (
        f"ملخص حضور الشركة اليوم ({res.get('date')}):\n"
        f"- إجمالي السجلات: {res.get('total_records', 0)}\n"
        f"- الحضور في الموعد: {res.get('present', 0)}\n"
        f"- المتأخرون: {res.get('late', 0)}\n"
        f"- الغائبون: {res.get('absent', 0)}\n"
        f"- في إجازة معتمدة: {res.get('on_leave', 0)}"
    )


hr_attendance_today_tool = FunctionTool(
    name="hr_attendance_today",
    description="استعراض ملخص إحصائي شامل لحضور وغياب وتأخير كافة موظفي الشركة اليوم (مخصص للإدارة ورؤساء الأقسام).",
    func=hr_attendance_today,
    input_model=HrAttendanceTodayInput,
    format_result=_format_hr_attendance_today,
)


# ═══════════════════════════════════════════════════════════════════════════════
# 9. Advances (سلف الموظفين)
# ═══════════════════════════════════════════════════════════════════════════════

class HrMyAdvancesInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    user_id: str | None = Field(default=None, description="User ID of the employee (auto-injected)")
    employee_id: str | None = Field(default=None, description="Employee ID if known")
    limit: int = Field(default=5, description="عدد الطلبات الأخيرة")


async def hr_my_advances(input_data: HrMyAdvancesInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"error": "معرف الشركة غير متوفر"}

    sf = _db_mod.async_session
    async with sf() as sess:
        repo = HrRepository(sess)
        emp = await repo.get_employee(company_id, user_id=input_data.user_id, employee_id=input_data.employee_id)
        eid = emp["id"] if emp else ""
        uid = (emp.get("userId") if emp else None) or input_data.user_id or ""
        advances = await repo.get_my_advances(company_id, user_id=uid, employee_id=eid, limit=input_data.limit)

    return {"advances": advances, "count": len(advances)}


def _format_hr_my_advances(res: dict[str, Any]) -> str:
    if res.get("error"):
        return f"تنبيه: {res['error']}"

    advances = res.get("advances") or []
    if not advances:
        return "لا توجد طلبات سلف مالية مسجلة لحسابك حالياً."

    lines = ["سجل طلبات السلف المالية:"]
    for adv in advances:
        dt = str(adv.get("createdAt") or "")[:10]
        amt = float(adv.get("amount") or 0)
        rem = float(adv.get("remainingBalance") or 0)
        status = adv.get("status") or "PENDING"
        lines.append(f"- طلب بتاريخ {dt}: مبلغ {amt:,.2f} ج.م (المتبقي: {rem:,.2f}) -> الحالة: {status}")

    return "\n".join(lines)


hr_my_advances_tool = FunctionTool(
    name="hr_my_advances",
    description="استعلام الموظف عن سجل وحالة طلبات السلف المالية المقدمة والمبالغ المتبقية لسدادها.",
    func=hr_my_advances,
    input_model=HrMyAdvancesInput,
    format_result=_format_hr_my_advances,
)


class HrAdvanceRequestCreateInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    user_id: str | None = Field(default=None, description="User ID of the employee (auto-injected)")
    employee_id: str | None = Field(default=None, description="Employee ID if known")
    amount: float = Field(..., description="مبلغ السلفة المطلوب بالجنيه")
    reason: str = Field(..., description="سبب طلب السلفة بوضوح")
    installments_count: int = Field(default=1, description="عدد أقساط السداد الشهرية (افتراضياً 1)")


async def hr_advance_request_create(input_data: HrAdvanceRequestCreateInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"error": "معرف الشركة غير متوفر"}

    if (input_data.amount or 0) <= 0:
        return {"error": "مبلغ السلفة يجب أن يكون أكبر من الصفر"}

    sf = _db_mod.async_session
    if sf is None:
        return {"error": "قاعدة البيانات غير مهيأة حالياً"}
    async with sf() as sess:
        repo = HrRepository(sess)
        emp = await repo.get_employee(company_id, user_id=input_data.user_id, employee_id=input_data.employee_id)
        if not emp:
            return {"error": "لم يتم العثور على سجل الموظف لربط طلب السلفة به"}

        uid = emp.get("userId") or input_data.user_id or emp["id"]
        res = await repo.create_advance_request(
            company_id=company_id,
            user_id=uid,
            employee_id=emp["id"],
            amount=input_data.amount,
            reason=input_data.reason,
            installments_count=input_data.installments_count,
        )

    return res


def _format_hr_advance_request_create(res: dict[str, Any]) -> str:
    if res.get("error"):
        return f"تعذر تسجيل طلب السلفة: {res['error']}"

    return (
        f"تم تسجيل طلب السلفة المالية بنجاح.\n"
        f"- المبلغ: {res.get('amount', 0):,.2f} ج.م\n"
        f"- عدد الأقساط: {res.get('installments_count', 1)} شهر (القسط الشهري: {res.get('monthly_amount', 0):,.2f} ج.م)\n"
        f"- الحالة: معلق (PENDING) وبانتظار اعتماد الإدارة المالية."
    )


hr_advance_request_create_tool = FunctionTool(
    name="hr_advance_request_create",
    description="إنشاء ورفع طلب سلفة مالية جديد للموظف بعد استيفاء المبلغ، سبب الطلب، وعدد أقساط السداد والتأكيد الصريح.",
    func=hr_advance_request_create,
    input_model=HrAdvanceRequestCreateInput,
    format_result=_format_hr_advance_request_create,
)


__all_tools__ = [
    hr_my_profile_tool,
    hr_my_attendance_tool,
    hr_leave_balance_tool,
    hr_leave_request_create_tool,
    hr_permission_request_create_tool,
    hr_requests_status_tool,
    hr_payslip_inquiry_tool,
    hr_attendance_today_tool,
    hr_my_advances_tool,
    hr_advance_request_create_tool,
]
