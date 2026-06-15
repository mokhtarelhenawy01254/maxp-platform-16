from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field


class HrAttendanceTodayInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def hr_attendance_today(input_data: HrAttendanceTodayInput) -> dict[str, Any]:
    return {
        "date": "",
        "totalEmployees": 0,
        "present": 0,
        "late": 0,
        "absent": 0,
        "absentEmployees": [],
        "presentEmployees": [],
        "note": "HR attendance service not yet connected. This is a placeholder.",
    }


hr_attendance_today_tool = FunctionTool(
    name="hr_attendance_today",
    description="Get today's attendance summary for the company.",
    func=hr_attendance_today,
    input_model=HrAttendanceTodayInput,
)

__all_tools__ = [
    hr_attendance_today_tool,
]
