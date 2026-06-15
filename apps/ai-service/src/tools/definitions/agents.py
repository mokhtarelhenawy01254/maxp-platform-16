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


async def agent_handoff_to(input_data: AgentHandoffToInput) -> dict[str, Any]:
    from src.services.agent_manager_service import AgentManagerService, get_agent_manager_service
    manager: AgentManagerService = get_agent_manager_service()
    result = await manager.run_agent_task(
        company_id=input_data.company_id or "",
        message=f"[Handoff] Reason: {input_data.reason}\nContext: {input_data.context or ''}",
        role=input_data.target_role,
        thread_id="",
    )
    return {
        "status": "HANDOFF_INITIATED",
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
    description="Transfer the conversation to a specialist agent. Use when the customer needs expertise outside your role.",
    func=agent_handoff_to,
    input_model=AgentHandoffToInput,
)

__all_tools__ = [
    agent_spawn_tool,
    agent_handoff_to_tool,
]
