from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.agent import AgentDepartment, CompanyAgent


class AgentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_agent(self, data: dict[str, Any]) -> CompanyAgent:
        agent = CompanyAgent(**data)
        self._session.add(agent)
        await self._session.flush()
        return agent

    async def upsert_agent(self, agent_id: str, company_id: str, data: dict[str, Any]) -> CompanyAgent:
        existing = await self.get_agent(agent_id, company_id)
        if existing:
            for key, value in data.items():
                setattr(existing, key, value)
            await self._session.flush()
            return existing
        data["id"] = agent_id
        data["company_id"] = company_id
        return await self.create_agent(data)

    async def get_agent(self, agent_id: str, company_id: str) -> CompanyAgent | None:
        stmt = select(CompanyAgent).where(
            CompanyAgent.id == agent_id,
            CompanyAgent.company_id == company_id,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_agents(self, company_id: str, status: str | None = None) -> Sequence[CompanyAgent]:
        stmt = select(CompanyAgent).where(CompanyAgent.company_id == company_id)
        if status:
            stmt = stmt.where(CompanyAgent.status == status)
        stmt = stmt.order_by(CompanyAgent.created_at)
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def update_agent_status(self, agent_id: str, company_id: str, status: str) -> None:
        stmt = (
            update(CompanyAgent)
            .where(CompanyAgent.id == agent_id, CompanyAgent.company_id == company_id)
            .values(status=status)
        )
        await self._session.execute(stmt)
        await self._session.flush()

    async def list_active_agents(self, company_id: str) -> Sequence[CompanyAgent]:
        return await self.list_agents(company_id, status="ACTIVE")

    async def ensure_department(
        self, company_id: str, key: str, name: str, description: str = "", icon: str = "🤖", sort_order: int = 100
    ) -> AgentDepartment:
        stmt = select(AgentDepartment).where(
            AgentDepartment.company_id == company_id,
            AgentDepartment.key == key,
        )
        result = await self._session.execute(stmt)
        dept = result.scalar_one_or_none()
        if dept:
            return dept

        department_id = f"dept_{company_id[-6:]}_{key}"
        dept = AgentDepartment(
            id=department_id,
            company_id=company_id,
            key=key,
            name=name,
            description=description,
            icon=icon,
            sort_order=sort_order,
        )
        self._session.add(dept)
        await self._session.flush()
        return dept
