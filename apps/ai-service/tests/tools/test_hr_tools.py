from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch

from src.tools.definitions.hr import (
    HrMyProfileInput,
    HrMyAttendanceInput,
    HrLeaveBalanceInput,
    HrLeaveRequestCreateInput,
    HrPermissionRequestCreateInput,
    HrRequestsStatusInput,
    HrPayslipInquiryInput,
    HrAttendanceTodayInput,
    HrMyAdvancesInput,
    HrAdvanceRequestCreateInput,
    hr_my_profile,
    hr_my_attendance,
    hr_leave_balance,
    hr_leave_request_create,
    hr_permission_request_create,
    hr_requests_status,
    hr_payslip_inquiry,
    hr_attendance_today,
    hr_my_advances,
    hr_advance_request_create,
    _format_hr_my_profile,
    _format_hr_my_attendance,
    _format_hr_leave_balance,
    _format_hr_leave_request_create,
    _format_hr_permission_request_create,
    _format_hr_requests_status,
    _format_hr_payslip_inquiry,
    _format_hr_attendance_today,
    _format_hr_my_advances,
    _format_hr_advance_request_create,
)
from src.tools.registry import (
    get_tool,
    get_tool_names_for_role,
    ADVANCED_TOOL_NAMES,
    WRITE_TOOL_NAMES,
)


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Registry & Roles Verification Tests
# ═══════════════════════════════════════════════════════════════════════════════

def test_hr_tools_registered_in_registry():
    expected_tools = [
        "hr_my_profile",
        "hr_my_attendance",
        "hr_leave_balance",
        "hr_leave_request_create",
        "hr_permission_request_create",
        "hr_requests_status",
        "hr_payslip_inquiry",
        "hr_attendance_today",
        "hr_my_advances",
        "hr_advance_request_create",
    ]
    for tool_name in expected_tools:
        tool = get_tool(tool_name)
        assert tool is not None, f"Tool {tool_name} should be registered in registry"
        assert callable(tool.func), f"Tool {tool_name} func should be callable"


def test_hr_tools_classification():
    # Advances read is advanced, create is write
    assert "hr_my_advances" in ADVANCED_TOOL_NAMES
    assert "hr_advance_request_create" in WRITE_TOOL_NAMES
    assert "hr_leave_request_create" in WRITE_TOOL_NAMES
    assert "hr_permission_request_create" in WRITE_TOOL_NAMES


def test_hr_assistant_role_tool_names():
    role_tools = get_tool_names_for_role("HR_ASSISTANT")
    expected = {
        "hr_my_profile",
        "hr_my_attendance",
        "hr_leave_balance",
        "hr_leave_request_create",
        "hr_permission_request_create",
        "hr_requests_status",
        "hr_payslip_inquiry",
        "hr_attendance_today",
        "hr_my_advances",
        "hr_advance_request_create",
        "knowledge_search",
    }
    for t in expected:
        assert t in role_tools, f"Tool {t} should be granted to HR_ASSISTANT role"


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Validation & Missing Parameters Tests
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_hr_my_profile_missing_company():
    res = await hr_my_profile(HrMyProfileInput(company_id=""))
    assert "error" in res
    assert "company_id is required" in res["error"]


@pytest.mark.asyncio
async def test_hr_my_attendance_missing_credentials():
    res = await hr_my_attendance(HrMyAttendanceInput(company_id="", user_id=""))
    assert "error" in res


@pytest.mark.asyncio
async def test_hr_leave_balance_missing_company():
    res = await hr_leave_balance(HrLeaveBalanceInput(company_id=""))
    assert "error" in res


@pytest.mark.asyncio
async def test_hr_leave_request_missing_company():
    res = await hr_leave_request_create(HrLeaveRequestCreateInput(
        company_id="",
        leave_type="ANNUAL",
        start_date="2026-10-01",
        end_date="2026-10-03",
        reason="Vacation",
    ))
    assert "error" in res


@pytest.mark.asyncio
async def test_hr_my_advances_missing_credentials():
    res = await hr_my_advances(HrMyAdvancesInput(company_id="", user_id=""))
    assert "error" in res


@pytest.mark.asyncio
async def test_hr_advance_request_invalid_amount():
    res = await hr_advance_request_create(HrAdvanceRequestCreateInput(
        company_id="comp_123",
        amount=0,
        reason="Emergency",
    ))
    assert "error" in res


class MockSession:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


@pytest.fixture(autouse=True)
def mock_db_session(monkeypatch):
    monkeypatch.setattr("src.tools.definitions.hr._db_mod.async_session", lambda: MockSession())


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Execution & Formatter Tests (With Mocked Repository)
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_hr_my_profile_execution():
    fake_emp = {
        "id": "emp_01",
        "employeeNumber": "EMP-101",
        "firstName": "أحمد",
        "lastName": "علي",
        "departmentName": "المبيعات",
        "managerName": "سارة إبراهيم",
        "contractType": "FULL_TIME",
        "hireDate": "2024-01-15",
        "workLocation": "المقر الرئيسي",
        "status": "ACTIVE",
    }
    with patch("src.tools.definitions.hr.HrRepository") as MockRepo:
        mock_instance = MockRepo.return_value
        mock_instance.get_employee = AsyncMock(return_value=fake_emp)

        res = await hr_my_profile(HrMyProfileInput(company_id="comp_1", user_id="usr_1"))
        assert res["found"] is True
        assert res["name"] == "أحمد علي"
        assert res["employee_number"] == "EMP-101"

        formatted = _format_hr_my_profile(res)
        assert "أحمد علي" in formatted
        assert "المبيعات" in formatted


@pytest.mark.asyncio
async def test_hr_leave_balance_execution():
    fake_emp = {"id": "emp_01", "userId": "usr_1", "firstName": "أحمد", "lastName": "علي"}
    fake_balance = {
        "annual_total": 21,
        "annual_taken": 7,
        "annual_remaining": 14,
        "sick_total": 15,
        "sick_taken": 2,
        "sick_remaining": 13,
    }
    with patch("src.tools.definitions.hr.HrRepository") as MockRepo:
        mock_instance = MockRepo.return_value
        mock_instance.get_employee = AsyncMock(return_value=fake_emp)
        mock_instance.get_leave_balance = AsyncMock(return_value=fake_balance)

        res = await hr_leave_balance(HrLeaveBalanceInput(company_id="comp_1", user_id="usr_1"))
        assert res["annual_remaining"] == 14
        assert res["sick_remaining"] == 13

        formatted = _format_hr_leave_balance(res)
        assert "14 يوم" in formatted
        assert "13 يوم" in formatted


@pytest.mark.asyncio
async def test_hr_my_advances_execution():
    fake_emp = {"id": "emp_01", "userId": "usr_1"}
    fake_advances = [
        {
            "id": "adv_01",
            "amount": 2000.0,
            "reason": "ظرف طارئ",
            "repaymentType": "SALARY_DEDUCTION",
            "installmentsCount": 2,
            "monthlyAmount": 1000.0,
            "remainingBalance": 1000.0,
            "isPaidOff": False,
            "status": "APPROVED",
            "createdAt": "2026-09-01T10:00:00Z",
        }
    ]
    with patch("src.tools.definitions.hr.HrRepository") as MockRepo:
        mock_instance = MockRepo.return_value
        mock_instance.get_employee = AsyncMock(return_value=fake_emp)
        mock_instance.get_my_advances = AsyncMock(return_value=fake_advances)

        res = await hr_my_advances(HrMyAdvancesInput(company_id="comp_1", user_id="usr_1"))
        assert res["count"] == 1
        assert res["advances"][0]["amount"] == 2000.0

        formatted = _format_hr_my_advances(res)
        assert "سلف" in formatted
        assert "2,000" in formatted


@pytest.mark.asyncio
async def test_hr_advance_request_create_execution():
    fake_emp = {"id": "emp_01", "userId": "usr_1"}
    fake_created = {
        "success": True,
        "request_id": "adv_999",
        "amount": 1500.0,
        "installments_count": 3,
        "monthly_amount": 500.0,
        "status": "PENDING",
    }
    with patch("src.tools.definitions.hr.HrRepository") as MockRepo:
        mock_instance = MockRepo.return_value
        mock_instance.get_employee = AsyncMock(return_value=fake_emp)
        mock_instance.create_advance_request = AsyncMock(return_value=fake_created)

        res = await hr_advance_request_create(HrAdvanceRequestCreateInput(
            company_id="comp_1",
            user_id="usr_1",
            amount=1500.0,
            reason="صيانة سيارة",
            installments_count=3,
        ))
        assert res["success"] is True
        assert res["amount"] == 1500.0
        assert res["monthly_amount"] == 500.0

        formatted = _format_hr_advance_request_create(res)
        assert "تم تسجيل طلب السلفة المالية بنجاح" in formatted
        assert "1,500" in formatted
        assert "500" in formatted


@pytest.mark.asyncio
async def test_hr_attendance_today_execution():
    fake_data = {"present": 42, "late": 3, "absent": 5, "on_leave": 2}
    with patch("src.tools.definitions.hr.HrRepository") as MockRepo:
        mock_instance = MockRepo.return_value
        mock_instance.get_company_attendance_today = AsyncMock(return_value=fake_data)

        res = await hr_attendance_today(HrAttendanceTodayInput(company_id="comp_1"))
        assert res["present"] == 42
        assert res["late"] == 3

        formatted = _format_hr_attendance_today(res)
        assert "42" in formatted
        assert "حضور" in formatted
