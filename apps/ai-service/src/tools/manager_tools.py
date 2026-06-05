from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.services.agent_manager_service import AgentManagerService, get_agent_manager_service
from src.services.agent_registry import get_agent_registry


class AgentSpawnInput(BaseModel):
    role: str = Field(description="Agent role: SUPPORT, SALES, INVENTORY, MARKETING, ORDER, or custom")
    name: str | None = Field(default=None, description="Optional display name")
    instructions: str | None = Field(default=None, description="Optional custom instructions for this agent")
    allowed_tools: list[str] | None = Field(
        default=None,
        description="Optional list of tool names this agent can use. If not provided, defaults based on role.",
    )
    model: str | None = Field(default=None, description="Optional model override")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class AgentListInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
 
 
class AgentSearchInput(BaseModel):
    query: str = Field(description="Search query to find a suitable specialist agent based on capabilities or role")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
 
 
class AgentRunTaskInput(BaseModel):

    message: str = Field(description="The task or customer message to process")
    agent_id: str | None = Field(default=None, description="Target agent ID (optional if role is provided)")
    role: str | None = Field(
        default=None,
        description="Target agent role. Used to find agent if agent_id not provided.",
    )
    thread_id: str | None = Field(default=None, description="Conversation thread ID")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class AgentHandoffInput(BaseModel):
    summary: str = Field(description="Summary of the conversation so far")
    agent_id: str = Field(description="Target agent ID to hand off to")
    reason: str = Field(description="Reason for the handoff")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def agent_spawn_handler(input_data: AgentSpawnInput) -> dict[str, Any]:
    """Create a specialized agent and register it with its tools."""
    manager: AgentManagerService = get_agent_manager_service()
    result = await manager.hire_agent(
        company_id=input_data.company_id or "",
        role=input_data.role,
        name=input_data.name,
        instructions=input_data.instructions,
        allowed_tools=input_data.allowed_tools,
        model=input_data.model,
    )
    return result


async def agent_list_handler(input_data: AgentListInput) -> dict[str, Any]:
    """List all active agents for the current company with their tools."""
    registry = get_agent_registry()
    agents = registry.list_agents(input_data.company_id or "")
    result = []
    for agent_id, agent, tool_names in agents:
        result.append({
            "id": agent_id,
            "name": agent.name,
            "role": getattr(agent, "role", "UNKNOWN"),
            "tools": tool_names,
        })
    return {"agents": result}
 
 
async def agent_search_handler(input_data: AgentSearchInput) -> dict[str, Any]:
    """Find the most relevant specialist agent based on a query about capabilities or roles."""
    registry = get_agent_registry()
    agents = registry.list_agents(input_data.company_id or "")
    query = input_data.query.lower()
    
    matches = []
    for agent_id, agent, tool_names in agents:
        role = getattr(agent, "role", "UNKNOWN").lower()
        name = agent.name.lower()
        
        # Simple keyword match in role, name, or tool names
        if query in role or query in name or any(query in t.lower() for t in tool_names):
            matches.append({
                "id": agent_id,
                "name": agent.name,
                "role": getattr(agent, "role", "UNKNOWN"),
                "tools": tool_names,
            })
    
    return {"matches": matches, "count": len(matches)}
 
 
async def agent_run_task_handler(input_data: AgentRunTaskInput) -> dict[str, Any]:

    """Run a task on a specialized agent and return the result.
    الـ CEO بيستخدم دا عشان يبعت المسدج للـ sub-agent المناسب.
    """
    manager: AgentManagerService = get_agent_manager_service()
    result = await manager.run_agent_task(
        company_id=input_data.company_id or "",
        message=input_data.message,
        agent_id=input_data.agent_id,
        role=input_data.role,
        thread_id=input_data.thread_id or "",
    )
    return result


async def agent_handoff_handler(input_data: AgentHandoffInput) -> dict[str, Any]:
    """Hand off a conversation to a specialized agent with context."""
    manager: AgentManagerService = get_agent_manager_service()

    result = await manager.run_agent_task(
        company_id=input_data.company_id or "",
        message=f"[Handoff from CEO]\nReason: {input_data.reason}\nSummary: {input_data.summary}",
        agent_id=input_data.agent_id,
        thread_id="",
    )

    return {
        "handoff": True,
        "target_agent_id": input_data.agent_id,
        "message": "Conversation handed off to specialist agent.",
        "reply": result.get("reply", ""),
    }


agent_spawn_tool = FunctionTool(
    name="agent.spawn",
    description="Create a new specialized agent (SUPPORT, SALES, INVENTORY, MARKETING, ORDER, etc.) with its specific tools and register it in the database. Use this when you need a specialist agent that doesn't exist yet.",
    func=agent_spawn_handler,
    input_model=AgentSpawnInput,
)

agent_list_tool = FunctionTool(
    name="agent.list_agents",
    description="List all active specialist agents for the current company, including their IDs, roles, and assigned tools.",
    func=agent_list_handler,
    input_model=AgentListInput,
)
 
agent_search_tool = FunctionTool(
    name="agent.search_agents",
    description="Search for a specialist agent that can handle a specific task or possesses certain capabilities. Use this instead of listing all agents when you have a specific need.",
    func=agent_search_handler,
    input_model=AgentSearchInput,
)
 
agent_run_task_tool = FunctionTool(

    name="agent.run_task",
    description="Send a customer message or task to a specific specialist agent and get its reply. Use this to delegate work to an agent after identifying the right one. Provide agent_id or role to find the target.",
    func=agent_run_task_handler,
    input_model=AgentRunTaskInput,
)

agent_handoff_tool = FunctionTool(
    name="agent.handoff",
    description="Hand off the entire conversation to a specialist agent with context. The target agent will take over the conversation.",
    func=agent_handoff_handler,
    input_model=AgentHandoffInput,
)


# ── Agent Assign Task ────────────────────────────────────────────────────────


class AgentAssignTaskInput(BaseModel):
    agent_id: str = Field(description="ID of the agent to assign the task to")
    title: str = Field(description="Task title")
    description: str | None = Field(default=None, description="Task description")
    priority: str = Field(default="normal", description="Priority: low, normal, high, urgent")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class AgentReadStateInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class AgentUpdateProfileInput(BaseModel):
    agent_id: str = Field(description="ID of the agent to update")
    name: str | None = Field(default=None, description="New display name")
    model: str | None = Field(default=None, description="New model override")
    instructions: str | None = Field(default=None, description="New custom instructions")
    allowed_tools: list[str] | None = Field(default=None, description="New allowed tools list")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


class SkillCreateInput(BaseModel):
    name: str = Field(description="Skill name")
    description: str = Field(description="Skill description")
    trigger: str = Field(default="auto", description="How the skill is triggered")
    steps: list[str] = Field(default_factory=list, description="List of step descriptions")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def agent_assign_task_handler(input_data: AgentAssignTaskInput) -> dict[str, Any]:
    manager: AgentManagerService = get_agent_manager_service()
    result = await manager.run_agent_task(
        company_id=input_data.company_id or "",
        message=f"[Task Assignment] {input_data.title}\n{input_data.description or ''}",
        agent_id=input_data.agent_id,
        thread_id="",
    )
    return {
        "assigned": True,
        "agent_id": input_data.agent_id,
        "title": input_data.title,
        "reply": result.get("reply", ""),
    }


async def agent_read_state_handler(input_data: AgentReadStateInput) -> dict[str, Any]:
    registry = get_agent_registry()
    agents = registry.list_agents(input_data.company_id or "")
    result = []
    for agent_id, agent, tool_names in agents:
        result.append({
            "id": agent_id,
            "name": agent.name,
            "role": getattr(agent, "role", "UNKNOWN"),
            "tools": tool_names,
            "status": "ACTIVE",
        })
    return {"agents": result, "count": len(result)}


async def agent_update_profile_handler(input_data: AgentUpdateProfileInput) -> dict[str, Any]:
    from src.db.repo.agent_repo import AgentRepository
    from src.db.session import get_session

    async for session in get_session():
        repo = AgentRepository(session)
        update_data = {}
        if input_data.name:
            update_data["name"] = input_data.name
        if input_data.model:
            update_data["model"] = input_data.model
        if input_data.instructions:
            update_data["soul"] = input_data.instructions
        if input_data.allowed_tools is not None:
            import json
            update_data["skills"] = json.dumps(input_data.allowed_tools)
        if update_data:
            await repo.upsert_agent(input_data.agent_id, input_data.company_id or "", update_data)
        return {"updated": True, "agent_id": input_data.agent_id, "changes": list(update_data.keys())}


async def skill_create_handler(input_data: SkillCreateInput) -> dict[str, Any]:
    return {
        "created": True,
        "skill_name": input_data.name,
        "note": "Skill created in memory. Filesystem-based skill authoring not yet connected.",
    }


agent_assign_task_tool = FunctionTool(
    name="agent.assign_task",
    description="Assign a task to a specialist agent for execution.",
    func=agent_assign_task_handler,
    input_model=AgentAssignTaskInput,
)

agent_read_state_tool = FunctionTool(
    name="agent.read_state",
    description="Read the current state of all specialist agents for the company.",
    func=agent_read_state_handler,
    input_model=AgentReadStateInput,
)

agent_update_profile_tool = FunctionTool(
    name="agent.update_profile",
    description="Update a specialist agent's profile (name, model, instructions, tools).",
    func=agent_update_profile_handler,
    input_model=AgentUpdateProfileInput,
)

skill_create_tool = FunctionTool(
    name="skill.create",
    description="Create a new skill definition for agents.",
    func=skill_create_handler,
    input_model=SkillCreateInput,
)


def get_manager_tools() -> list[FunctionTool]:
    return [
        agent_spawn_tool,
        agent_list_tool,
        agent_search_tool,
        agent_run_task_tool,
        agent_handoff_tool,
        agent_assign_task_tool,
        agent_read_state_tool,
        agent_update_profile_tool,
        skill_create_tool,
    ]
