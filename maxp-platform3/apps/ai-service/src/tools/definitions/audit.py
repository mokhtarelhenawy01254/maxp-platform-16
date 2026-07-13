from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field


class AuditReadInput(BaseModel):
    limit: int = Field(default=5, description="Maximum number of audit entries")
    agent_id: str | None = Field(default=None, description="Optional agent ID to filter by")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def audit_read(input_data: AuditReadInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"activities": []}

    from src.tools.repositories.audit_repository import AuditRepository

    import src.db.session as _db_mod
    sf = _db_mod.async_session
    async with sf() as sess:
        activities = await AuditRepository(sess).get_recent_activities(
            company_id, min(input_data.limit or 5, 50)
        )
        return {"activities": activities}


audit_read_tool = FunctionTool(
    name="audit_read",
    description="Read agent audit trail / decision log.",
    func=audit_read,
    input_model=AuditReadInput,
)

__all_tools__ = [
    audit_read_tool,
]
