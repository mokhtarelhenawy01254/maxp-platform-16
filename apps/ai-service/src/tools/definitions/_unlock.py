from __future__ import annotations

from typing import Any

from agent_framework import FunctionInvocationContext, FunctionTool
from pydantic import BaseModel, Field


class UnlockAdvancedToolsInput(BaseModel):
    reason: str = Field(description="Reason why advanced tools are needed for the current task")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def unlock_advanced_tools(
    input_data: UnlockAdvancedToolsInput,
    ctx: FunctionInvocationContext | None = None,
) -> dict[str, Any]:
    # ADVANCED_TOOLS is resolved at call time to avoid circular imports.
    # Exclude HR/internal tools for store manager / copilot to prevent privilege escalation.
    from src.tools.registry import ADVANCED_TOOLS
    from src.tools.repositories.audit_repository import log_agent_audit_event

    scoped_tools = [t for t in ADVANCED_TOOLS if not t.name.startswith("hr_")]

    if ctx is not None:
        ctx.add_tools(scoped_tools)

    unlocked_names = [t.name for t in scoped_tools]
    if input_data.company_id:
        await log_agent_audit_event(
            company_id=input_data.company_id,
            action="ADVANCED_TOOLS_UNLOCKED",
            description=f"تم فتح صلاحيات الأدوات المتقدمة: {', '.join(unlocked_names[:8])}… (السبب: {input_data.reason})",
            category="AI_AGENT",
            severity="MEDIUM",
            metadata={"reason": input_data.reason, "unlocked_count": len(unlocked_names), "tools": unlocked_names},
        )

    return {
        "status": "SUCCESS",
        "message": "Advanced tools have been unlocked. You can now use tools for deep analysis, reporting, and competitor research.",
        "unlocked_tools": unlocked_names,
    }


unlock_advanced_tools_tool = FunctionTool(
    name="unlock_advanced_tools",
    description="Unlock advanced analysis and reporting tools when the user request requires deep data mining or competitor research.",
    func=unlock_advanced_tools,
    input_model=UnlockAdvancedToolsInput,
)

__all_tools__ = [unlock_advanced_tools_tool]
