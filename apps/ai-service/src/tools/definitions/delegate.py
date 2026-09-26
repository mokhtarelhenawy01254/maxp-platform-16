from __future__ import annotations

import time
from typing import Any
import structlog
from agent_framework import FunctionTool
from pydantic import BaseModel, Field

logger = structlog.get_logger(__name__)


class DelegateTaskInput(BaseModel):
    target_role: str = Field(
        description="Specialist agent role to delegate the sub-task to (e.g. 'INVENTORY', 'COMPETITOR', 'SALES', 'SUPPORT')"
    )
    task_goal: str = Field(
        description="Clear, actionable question or sub-task to execute (e.g. 'افحص المخزون المتاح لكوتشي Dash مقاسات 41-45', 'استخرج أسعار سنيكرز المنافسين في السوق')"
    )
    delegator_role: str | None = Field(
        default=None,
        description="Role or title of the delegating agent (e.g. 'المساعد التنفيذي', 'مدير المتجر')",
    )
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def delegate_task(input_data: DelegateTaskInput) -> dict[str, Any]:
    """Hermes-grade Subagent Delegation:
    Delegates a focused sub-task to another specialist agent (e.g. INVENTORY to verify sizes,
    COMPETITOR to check prices) and returns a concise briefing to the parent agent.
    """
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "status": "DELEGATION_FAILED", "action": "HANDLE_LOCALLY", "error": "company_id is required"}

    target_role = (input_data.target_role or "").strip().upper()
    if not target_role:
        return {"success": False, "status": "DELEGATION_FAILED", "action": "HANDLE_LOCALLY", "error": "target_role is required"}

    try:
        from src.services.agent_manager_service import get_agent_manager_service
        manager = get_agent_manager_service()

        import uuid
        task_token = uuid.uuid4().hex[:8]
        thread_id = f"subtask_{target_role.lower()}_{time.time_ns()}_{task_token}"
        message = f"[مهمة مفوضة من {delegator_title}]\nالهدف المطلوب تنفيذه بدقة: {input_data.task_goal}"

        result = await manager.run_agent_task(
            company_id=company_id,
            message=message,
            role=target_role,
            thread_id=thread_id,
        )

        if not result.get("success"):
            err = result.get("error", "فشل تشغيل الوكيل المتخصص")
            return {
                "success": False,
                "status": "DELEGATION_FAILED",
                "action": "HANDLE_LOCALLY",
                "target_role": target_role,
                "error": err,
                "instructions": (
                    f"الوكيل المتخصص ({target_role}) غير متاح حاليًا ({err}). "
                    "يجب تنفيذ المهمة محليًا بالأدوات المتوفرة لديك واستخراج الأرقام الحقيقية مباشرة دون اختراع أو ردود ترحيبية فارغة."
                ),
            }

        return {
            "success": True,
            "status": "success",
            "target_role": target_role,
            "agent_name": result.get("agent_name", target_role),
            "task_goal": input_data.task_goal,
            "briefing": result.get("reply", ""),
        }
    except Exception as exc:
        logger.error("delegate_task execution error", error=str(exc))
        return {
            "success": False,
            "status": "DELEGATION_FAILED",
            "action": "HANDLE_LOCALLY",
            "target_role": target_role,
            "error": str(exc),
            "instructions": (
                f"تعذر التفويض للوكيل ({target_role}). "
                "يجب تنفيذ المهمة محليًا بالأدوات المتوفرة لديك واستخراج الأرقام الحقيقية مباشرة دون اختراع."
            ),
        }


def _format_delegate_task(result: dict) -> str:
    if not result.get("success"):
        return (
            f"تعذر تفويض المهمة لوكيل [{result.get('target_role', '')}]: {result.get('error', 'غير متاح')}.\n"
            f"الإجراء: مطلوب التنفيذ محليًا فورًا ({result.get('action', 'HANDLE_LOCALLY')}) باستخدام أدواتك المتاحة وإظهار الأرقام الفعلية للتاجر."
        )

    role = result.get("target_role", "")
    agent_name = result.get("agent_name", role)
    briefing = result.get("briefing", "").strip()
    return f"تقرير موجز من الوكيل المتخصص [{agent_name} - {role}]:\n{briefing}"


delegate_task_tool = FunctionTool(
    name="delegate_task",
    description="Delegate a focused sub-task or information request to another specialist agent (e.g. INVENTORY to check stock, COMPETITOR to check market prices) and receive a concise briefing.",
    func=delegate_task,
    input_model=DelegateTaskInput,
    format_result=_format_delegate_task,
)

__all_tools__ = [
    delegate_task_tool,
]
