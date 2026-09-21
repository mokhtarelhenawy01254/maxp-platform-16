from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools.definitions._helpers import _write_result


class AgentSpawnInput(BaseModel):
    name: str = Field(description="Agent name")
    role: str = Field(description="Agent role (e.g. SALES, SUPPORT)")
    model: str | None = Field(default=None, description="Model to use")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class AgentHandoffToInput(BaseModel):
    target_role: str = Field(description="Role of the agent to transfer to")
    reason: str = Field(description="Brief reason for the transfer")
    context: str | None = Field(default=None, description="Key information to pass")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def agent_spawn(input_data: AgentSpawnInput) -> dict[str, Any]:
    return _write_result("agent.spawn", {
        "name": input_data.name,
        "role": input_data.role,
        "model": input_data.model,
    }, input_data.company_id or "")


def _format_agent_handoff_to(result: dict) -> str:
    if not result.get("success", False):
        return f"تعذر التحويل: {result.get('error', 'الوكيل المستهدف غير متاح')}. يرجى إنجاز الطلب مباشرة بالصلاحيات المتوفرة."
    target = result.get("targetRole", "")
    reply = result.get("reply", "")
    if reply:
        return f"تم التحويل للوكيل ({target}):\n{reply}"
    return f"تم تسليم المحادثة للوكيل المختص ({target}) بنجاح."


async def agent_handoff_to(input_data: AgentHandoffToInput) -> dict[str, Any]:
    from src.services.agent_manager_service import AgentManagerService, get_agent_manager_service
    manager: AgentManagerService = get_agent_manager_service()
    result = await manager.run_agent_task(
        company_id=input_data.company_id or "",
        message=f"[Handoff] Reason: {input_data.reason}\nContext: {input_data.context or ''}",
        role=input_data.target_role,
        thread_id="",
    )
    if not result.get("success"):
        return {
            "success": False,
            "status": "HANDOFF_FAILED",
            "targetRole": input_data.target_role,
            "reason": input_data.reason,
            "error": (
                f"فشل التحويل: لا يوجد وكيل آخر نشط بالدور '{input_data.target_role}' مسجل في هذا المتجر. "
                "إذا كانت الأداة المطلوبة متوفرة في صلاحياتك، يجب عليك تنفيذ طلب التاجر فوراً بنفسك دون تحويل."
            ),
            "detail": result.get("error", ""),
            "action": "HANDLE_LOCALLY",
        }
    return {
        "success": True,
        "status": "HANDOFF_COMPLETED",
        "targetRole": input_data.target_role,
        "reason": input_data.reason,
        "reply": result.get("reply", ""),
    }


agent_spawn_tool = FunctionTool(
    name="agent_spawn",
    description="Create a new specialist agent. REQUIRES MERCHANT APPROVAL.",
    func=agent_spawn,
    input_model=AgentSpawnInput,
)

agent_handoff_to_tool = FunctionTool(
    name="agent_handoff_to",
    description="Transfer the conversation to an active specialist agent in the store. ONLY use when you lack the tools to fulfill the merchant request AND a qualified target agent exists.",
    func=agent_handoff_to,
    input_model=AgentHandoffToInput,
    format_result=_format_agent_handoff_to,
)

__all_tools__ = [
    agent_spawn_tool,
    agent_handoff_to_tool,
]
