from __future__ import annotations

from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.repo.agent_repo import AgentRepository
from src.services.agent_registry import AgentRegistry, get_agent_registry
from src.tools.registry import get_tool_names_for_role

logger = structlog.get_logger(__name__)

DEFAULT_DEPARTMENTS = [
    {"key": "executive", "name": "Executive", "description": "CEO and agent coordination", "sort_order": 1},
    {"key": "sales", "name": "Sales", "description": "Customer sales and order drafts", "sort_order": 10},
    {"key": "support", "name": "Support", "description": "Customer service and order follow-up", "sort_order": 20},
    {"key": "inventory", "name": "Inventory & Pricing", "description": "Stock, prices and products", "sort_order": 30},
    {"key": "marketing", "name": "Marketing", "description": "Campaigns and advertisements", "sort_order": 40},
    {"key": "operations", "name": "Operations", "description": "Shipping, operations and follow-up", "sort_order": 50},
    {"key": "hr", "name": "Human Resources", "description": "Employee affairs and internal inquiries", "sort_order": 60},
]

DEPARTMENT_ROLE_MAP: dict[str, list[str]] = {
    "executive": ["CEO", "MANAGER"],
    "sales": ["SALES", "SAS_SALES"],
    "support": ["SUPPORT"],
    "inventory": ["INVENTORY", "PRICING"],
    "marketing": ["MARKETING"],
    "operations": ["SHIPPING"],
    "hr": ["HR_ASSISTANT"],
}


def _department_key_for_role(role: str) -> str:
    role_upper = role.upper()
    for dept_key, roles in DEPARTMENT_ROLE_MAP.items():
        if role_upper in roles:
            return dept_key
    return "operations"


class AgentManagerService:
    """Facade for agent lifecycle management.

    كل agent بيتسجل في DB مع الـ tools بتاعته.
    """

    def __init__(self, registry: AgentRegistry | None = None) -> None:
        self._registry = registry or get_agent_registry()

    async def ensure_departments(self, company_id: str, session: AsyncSession) -> list[dict[str, Any]]:
        repo = AgentRepository(session)
        departments = []
        for dept in DEFAULT_DEPARTMENTS:
            d = await repo.ensure_department(
                company_id=company_id,
                key=dept["key"],
                name=dept["name"],
                description=dept.get("description", ""),
                sort_order=dept.get("sort_order", 100),
            )
            departments.append({
                "id": d.id,
                "key": d.key,
                "name": d.name,
                "sort_order": d.sort_order,
            })
        return departments

    async def list_agents(
        self,
        company_id: str,
        session: AsyncSession | None = None,
    ) -> list[dict[str, Any]]:
        """List all agents with their tools."""
        result = []
        for agent_id, agent, tool_names in self._registry.list_agents(company_id):
            result.append({
                "id": agent_id,
                "name": agent.name,
                "role": getattr(agent, "role", "UNKNOWN"),
                "status": "ACTIVE",
                "tools": tool_names,
            })

        if session:
            repo = AgentRepository(session)
            db_agents = await repo.list_active_agents(company_id)
            seen_ids = {r["id"] for r in result}
            for db_agent in db_agents:
                if db_agent.id not in seen_ids:
                    result.append({
                        "id": db_agent.id,
                        "name": db_agent.name,
                        "role": db_agent.role,
                        "status": db_agent.status,
                        "tools": [],
                    })
        return result

    async def hire_agent(
        self,
        company_id: str,
        role: str,
        name: str | None = None,
        instructions: str | None = None,
        allowed_tools: list[str] | None = None,
        model: str | None = None,
        parent_id: str | None = None,
        template_slug: str | None = None,
        company_name: str | None = None,
        session: AsyncSession | None = None,
    ) -> dict[str, Any]:
        """Spawn and persist a new sub-agent with its tools."""
        registry = self._registry

        tool_names = allowed_tools or get_tool_names_for_role(role)
        agent, agent_id = await registry.spawn(
            company_id=company_id,
            role=role,
            name=name,
            instructions=instructions,
            allowed_tools=tool_names,
            model=model,
            parent_id=parent_id,
            template_slug=template_slug,
            company_name=company_name,
            db_session=session,
        )

        logger.info("agent hired", company_id=company_id, agent_id=agent_id, role=role, tools=tool_names)

        return {
            "success": True,
            "agent": {
                "id": agent_id,
                "name": agent.name,
                "role": role,
                "status": "ACTIVE",
                "model": model,
                "tools": tool_names,
            },
        }

    async def run_agent_task(
        self,
        company_id: str,
        message: str,
        agent_id: str | None = None,
        role: str | None = None,
        thread_id: str = "",
    ) -> dict[str, Any]:
        """Find an agent (بالـ role أو الـ id) وشغّل المهمة عليه."""
        agent: Any = None
        if agent_id:
            agent = self._registry.get(company_id, agent_id)
        if not agent and role:
            for aid, a, _ in self._registry.list_agents(company_id):
                if getattr(a, "role", "").upper() == role.upper():
                    agent = a
                    agent_id = aid
                    break

        if not agent:
            msg = f"Agent not found: id={agent_id}, role={role}"
            return {"success": False, "error": msg}

        try:
            await agent.ensure_client()
            task = {
                "current_message": message,
                "description": message,
                "session_id": thread_id or f"task_{agent_id}",
                "user_id": "",
                "channel": "a2a",
                # SDK agent runtime does not loop correctly with DeepSeek
                # (returns after first turn without executing tool calls).
                # Force the 3-stage pipeline for proper tool execution.
                "force_pipeline": True,
            }
            response = await agent.process_task(task)
            return {
                "success": True,
                "reply": response.get("result", {}).get("reply", ""),
                "agent_id": agent_id or "",
                "agent_name": agent.name,
            }
        except Exception as e:
            logger.error("agent task failed", error=str(e), agent_id=agent_id)
            return {"success": False, "error": str(e)}

    def get_registry(self) -> AgentRegistry:
        return self._registry


_service: AgentManagerService | None = None


def get_agent_manager_service() -> AgentManagerService:
    global _service
    if _service is None:
        _service = AgentManagerService()
    return _service
