from __future__ import annotations

from pydantic import BaseModel, Field

from src.skills.base import Skill


class ManagementReportInput(BaseModel):
    company_id: str = Field(default="", description="")
    period: str = Field(default="today", description="today | week | month")


async def get_management_report(params: ManagementReportInput) -> dict:
    from src.tools.booking_admin_tools import reports_summary
    return await reports_summary(params.company_id, params.period)


medical_center_management_skill = Skill(
    name="medical_center_management",
    description="Generate a management summary report for the medical center (appointments, cancellations, revenue by service/branch). Use when the manager asks for a report, dashboard, or summary. Keywords: تقرير, ملخص, إحصائيات, كم موعد, الإلغاءات, reports, dashboard, summary",
    input_schema=ManagementReportInput,
    handler=get_management_report,
    internal_fields=["company_id"],
)