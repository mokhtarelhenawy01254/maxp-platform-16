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
from src.tools.backend_client import BackendAPIError
from src.llm.scripted_client import ScriptedAgentClient


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
    fake_res = {
        "success": True,
        "data": {
            "id": "adv_999",
            "amount": 1500.0,
            "installmentsCount": 3,
            "monthlyAmount": 500.0,
            "status": "PENDING",
        }
    }
    with patch("src.tools.definitions.hr.HrRepository") as MockRepo, \
         patch("src.tools.definitions.hr.get_backend_client") as MockBackend:
        mock_instance = MockRepo.return_value
        mock_instance.get_employee = AsyncMock(return_value=fake_emp)
        mock_client = MockBackend.return_value
        mock_client.create_hr_advance_request = AsyncMock(return_value=fake_res)

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
        assert res["status"] == "PENDING"

        formatted = _format_hr_advance_request_create(res)
        assert "تم تسجيل طلب السلفة المالية بنجاح" in formatted
        assert "1,500" in formatted
        assert "500" in formatted


@pytest.mark.asyncio
async def test_hr_leave_request_create_calls_backend_client():
    fake_emp = {"id": "emp_01", "userId": "usr_1"}
    fake_api_res = {
        "success": True,
        "leave": {
            "id": "leave_req_01",
            "type": "ANNUAL",
            "startDate": "2026-11-02",
            "endDate": "2026-11-04",
            "totalDays": 3,
            "status": "PENDING",
        }
    }
    with patch("src.tools.definitions.hr.HrRepository") as MockRepo, \
         patch("src.tools.definitions.hr.get_backend_client") as MockBackend:
        mock_instance = MockRepo.return_value
        mock_instance.get_employee = AsyncMock(return_value=fake_emp)
        mock_client = MockBackend.return_value
        mock_client.create_hr_leave_request = AsyncMock(return_value=fake_api_res)

        res = await hr_leave_request_create(HrLeaveRequestCreateInput(
            company_id="comp_1",
            user_id="usr_1",
            leave_type="ANNUAL",
            start_date="2026-11-02",
            end_date="2026-11-04",
            reason="إجازة سنوية اعتيادية",
        ))
        assert res["request_id"] == "leave_req_01"
        assert res["status"] == "PENDING"
        assert res["total_days"] == 3
        mock_client.create_hr_leave_request.assert_awaited_once()


@pytest.mark.asyncio
async def test_hr_leave_request_create_backend_api_error():
    fake_emp = {"id": "emp_01", "userId": "usr_1"}
    with patch("src.tools.definitions.hr.HrRepository") as MockRepo, \
         patch("src.tools.definitions.hr.get_backend_client") as MockBackend:
        mock_instance = MockRepo.return_value
        mock_instance.get_employee = AsyncMock(return_value=fake_emp)
        mock_client = MockBackend.return_value
        mock_client.create_hr_leave_request = AsyncMock(
            side_effect=BackendAPIError("رصيد الإجازات غير كافٍ", status_code=400, error_code="INSUFFICIENT_BALANCE")
        )

        res = await hr_leave_request_create(HrLeaveRequestCreateInput(
            company_id="comp_1",
            user_id="usr_1",
            leave_type="ANNUAL",
            start_date="2026-11-02",
            end_date="2026-11-04",
            reason="إجازة سنوية",
        ))
        assert res["error"] == "رصيد الإجازات غير كافٍ"
        assert res["code"] == "INSUFFICIENT_BALANCE"


@pytest.mark.asyncio
async def test_hr_leave_request_create_nonexistent_employee():
    with patch("src.tools.definitions.hr.HrRepository") as MockRepo:
        mock_instance = MockRepo.return_value
        mock_instance.get_employee = AsyncMock(return_value=None)

        res = await hr_leave_request_create(HrLeaveRequestCreateInput(
            company_id="comp_1",
            user_id="usr_unknown",
            leave_type="ANNUAL",
            start_date="2026-11-02",
            end_date="2026-11-04",
            reason="إجازة سنوية",
        ))
        assert "لم يتم العثور على سجل الموظف" in res["error"]


@pytest.mark.asyncio
async def test_hr_permission_request_create_calls_backend_client():
    fake_emp = {"id": "emp_01", "userId": "usr_1"}
    fake_api_res = {
        "success": True,
        "data": {
            "id": "perm_req_01",
            "type": "NON_DEDUCTIBLE",
            "date": "2026-11-05",
            "startTime": "09:00",
            "endTime": "11:00",
            "totalHours": 2.0,
            "status": "PENDING",
        }
    }
    with patch("src.tools.definitions.hr.HrRepository") as MockRepo, \
         patch("src.tools.definitions.hr.get_backend_client") as MockBackend:
        mock_instance = MockRepo.return_value
        mock_instance.get_employee = AsyncMock(return_value=fake_emp)
        mock_client = MockBackend.return_value
        mock_client.create_hr_permission_request = AsyncMock(return_value=fake_api_res)

        res = await hr_permission_request_create(HrPermissionRequestCreateInput(
            company_id="comp_1",
            user_id="usr_1",
            date="2026-11-05",
            start_time="09:00",
            end_time="11:00",
            reason="موعد بنكي رسمي",
            permission_type="NON_DEDUCTIBLE",
        ))
        assert res["request_id"] == "perm_req_01"
        assert res["status"] == "PENDING"
        assert res["total_hours"] == 2.0
        mock_client.create_hr_permission_request.assert_awaited_once()


def test_hr_approval_classification():
    assert "hr_leave_request_create" in WRITE_TOOL_NAMES
    assert "hr_permission_request_create" in WRITE_TOOL_NAMES
    assert "hr_advance_request_create" in WRITE_TOOL_NAMES


@pytest.mark.asyncio
async def test_hr_scripted_agent_client_scenario():
    # Scenario: User asks "رصيد إجازاتي كام؟" -> LLM calls hr_leave_balance -> receives tool output -> answers
    scenario = [
        {
            "text": "",
            "tool_calls": [
                {
                    "id": "call_1",
                    "function": {
                        "name": "hr_leave_balance",
                        "arguments": '{"company_id": "comp_1", "user_id": "usr_1"}'
                    }
                }
            ]
        },
        {
            "text": "رصيد إجازاتك السنوية المتبقية 14 يوماً والمرضية 13 يوماً.",
            "tool_calls": []
        }
    ]
    scripted_client = ScriptedAgentClient(scenario=scenario)
    assert scripted_client.provider == "scripted"

    # Step 1: LLM request returns tool call
    resp1 = await scripted_client.get_response([{"role": "user", "content": "رصيد إجازاتي كام؟"}])
    assert len(resp1.tool_calls) == 1
    assert resp1.tool_calls[0]["function"]["name"] == "hr_leave_balance"

    # Tool execution with fake repo
    fake_emp = {"id": "emp_01", "userId": "usr_1", "firstName": "سارة", "lastName": "أحمد"}
    fake_balance = {"annual_remaining": 14, "sick_remaining": 13, "annual_total": 21}
    with patch("src.tools.definitions.hr.HrRepository") as MockRepo:
        mock_instance = MockRepo.return_value
        mock_instance.get_employee = AsyncMock(return_value=fake_emp)
        mock_instance.get_leave_balance = AsyncMock(return_value=fake_balance)

        tool_result = await hr_leave_balance(HrLeaveBalanceInput(company_id="comp_1", user_id="usr_1"))
        assert tool_result["annual_remaining"] == 14

    # Step 2: Final response
    resp2 = await scripted_client.get_response([
        {"role": "user", "content": "رصيد إجازاتي كام؟"},
        {"role": "assistant", "content": "", "tool_calls": resp1.tool_calls},
        {"role": "tool", "content": str(tool_result)}
    ])
    assert "14 يوماً" in resp2.text
    assert len(resp2.tool_calls) == 0


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


@pytest.mark.asyncio
async def test_hr_requests_status_includes_advances():
    fake_emp = {"id": "emp_01", "userId": "usr_1"}
    fake_status = {
        "leaves": [{"type": "ANNUAL", "startDate": "2026-11-01", "endDate": "2026-11-03", "totalDays": 3, "status": "PENDING"}],
        "permissions": [{"date": "2026-11-04", "startTime": "09:00", "endTime": "10:00", "totalHours": 1.0, "status": "APPROVED"}],
        "advances": [{"createdAt": "2026-11-01", "amount": 1000.0, "status": "PENDING"}],
    }
    with patch("src.tools.definitions.hr.HrRepository") as MockRepo:
        mock_instance = MockRepo.return_value
        mock_instance.get_employee = AsyncMock(return_value=fake_emp)
        mock_instance.get_requests_status = AsyncMock(return_value=fake_status)

        res = await hr_requests_status(HrRequestsStatusInput(company_id="comp_1", user_id="usr_1"))
        assert len(res["advances"]) == 1
        formatted = _format_hr_requests_status(res)
        assert "طلبات السلف الأخيرة" in formatted
        assert "1,000" in formatted
