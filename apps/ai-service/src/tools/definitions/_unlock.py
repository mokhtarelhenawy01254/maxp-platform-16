from __future__ import annotations

from typing import Any

from agent_framework import FunctionInvocationContext, FunctionTool
from pydantic import BaseModel, Field


class UnlockAdvancedToolsInput(BaseModel):
    reason: str = Field(description="Reason why advanced tools are needed for the current task")
    action: str = Field(default="unlock", description="Action to perform: 'unlock' to request opening tools, 'lock' or 'revoke' to revert")
    approved: bool = Field(default=False, description="Whether merchant approval was granted")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def unlock_advanced_tools(
    input_data: UnlockAdvancedToolsInput,
    ctx: FunctionInvocationContext | None = None,
) -> dict[str, Any]:
    # ADVANCED_TOOLS is resolved at call time to avoid circular imports.
    # Exclude HR/internal tools for store manager / copilot to prevent privilege escalation.
    from src.tools.registry import ADVANCED_TOOLS
    from src.tools.repositories.audit_repository import log_agent_audit_event

    company_id = input_data.company_id or ""
    action = (input_data.action or "unlock").strip().lower()

    if action in ("lock", "revoke"):
        if company_id:
            await log_agent_audit_event(
                company_id=company_id,
                action="ADVANCED_TOOLS_REVOKED",
                description="تم إلغاء تفعيل واسترجاع صلاحيات الأدوات المتقدمة وإعادتها للوضع الأساسي المقفل.",
                category="AI_AGENT",
                severity="INFO",
                metadata={"action": action, "reverted": True},
            )
        return {
            "status": "SUCCESS",
            "success": True,
            "message": "تم إغلاق واسترجاع صلاحيات الأدوات المتقدمة بنجاح.",
            "scope": "LOCKED",
        }

    scoped_tools = [
        t for t in ADVANCED_TOOLS 
        if not t.name.startswith("hr_") and not t.name.startswith("payroll_") and not t.name.startswith("internal_")
    ]
    unlocked_names = [t.name for t in scoped_tools]

    if not input_data.approved:
        if company_id:
            await log_agent_audit_event(
                company_id=company_id,
                action="ADVANCED_TOOLS_UNLOCK_REQUESTED",
                description=f"طلب تفعيل الأدوات المتقدمة ينتظر موافقة التاجر (نطاق المساعد التنفيذي: {len(unlocked_names)} أداة تحليل ومنافسين، مستبعد منها HR/Payroll بالكامل). السبب: {input_data.reason}",
                category="AI_AGENT",
                severity="MEDIUM",
                metadata={
                    "reason": input_data.reason,
                    "unlocked_count": len(unlocked_names),
                    "tools": unlocked_names,
                    "scope": "STORE_MANAGER_ADVANCED",
                    "excluded_domains": ["HR", "PAYROLL", "INTERNAL"],
                },
            )

        return {
            "status": "awaiting_approval",
            "action_type": "unlock_advanced_tools",
            "action_args": {
                "reason": input_data.reason,
                "action": "unlock",
                "company_id": company_id,
                "scoped_tools": unlocked_names,
                "scope_info": f"STORE_MANAGER_ADVANCED ({len(unlocked_names)} tools — HR/Payroll excluded)",
                "approved": True,
            },
            "company_id": company_id,
            "message": (
                f"طلب تفعيل الأدوات المتقدمة ({len(unlocked_names)} أداة تحليل ومنافسين، مستبعد منها أدوات HR بالكامل) مستني اعتمادك — "
                f"السبب: {input_data.reason}. اضغط اعتماد لتفعيل الصلاحيات."
            ),
        }

    if ctx is not None:
        ctx.add_tools(scoped_tools)

    if company_id:
        await log_agent_audit_event(
            company_id=company_id,
            action="ADVANCED_TOOLS_UNLOCKED",
            description=f"تم فتح صلاحيات الأدوات المتقدمة بنطاق المساعد التنفيذي (مستبعد HR/Payroll): {', '.join(unlocked_names[:8])}… (السبب: {input_data.reason})",
            category="AI_AGENT",
            severity="MEDIUM",
            metadata={
                "reason": input_data.reason,
                "unlocked_count": len(unlocked_names),
                "tools": unlocked_names,
                "scope": "STORE_MANAGER_ADVANCED",
                "excluded_domains": ["HR", "PAYROLL", "INTERNAL"],
            },
        )

    return {
        "status": "SUCCESS",
        "success": True,
        "message": f"تم تفعيل {len(unlocked_names)} أداة متقدمة بنطاق المساعد التنفيذي بنجاح (مستبعد منها أدوات HR).",
        "unlocked_tools": unlocked_names,
        "scope": "STORE_MANAGER_ADVANCED",
    }


def _format_unlock_advanced_tools(result: dict) -> str:
    if result.get("status") == "awaiting_approval":
        return result.get("message", "طلب تفعيل الأدوات المتقدمة بانتظار الاعتماد.")
    if result.get("scope") == "LOCKED":
        return result.get("message", "تم إغلاق واسترجاع الأدوات المتقدمة بنجاح.")
    return f"تم تفعيل الأدوات المتقدمة بنطاق المساعد التنفيذي بنجاح ({len(result.get('unlocked_tools', []))} أداة)."


unlock_advanced_tools_tool = FunctionTool(
    name="unlock_advanced_tools",
    description="Unlock advanced analysis and reporting tools for the Store Manager when the user request requires deep data mining or competitor research (HR and payroll tools are strictly excluded).",
    func=unlock_advanced_tools,
    input_model=UnlockAdvancedToolsInput,
    format_result=_format_unlock_advanced_tools,
)

__all_tools__ = [unlock_advanced_tools_tool]
