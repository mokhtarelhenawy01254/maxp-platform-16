from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.guardrail import AgentGuardrailRule


class GuardrailRepository:
    """Repository for the AgentGuardrailRule model."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_rule(self, data: dict[str, Any]) -> AgentGuardrailRule:
        rule = AgentGuardrailRule(**data)
        self._session.add(rule)
        await self._session.flush()
        return rule

    async def get_rule(self, rule_id: str) -> AgentGuardrailRule | None:
        stmt = select(AgentGuardrailRule).where(AgentGuardrailRule.id == rule_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_rules(self, agent_id: str, active_only: bool = True) -> Sequence[AgentGuardrailRule]:
        stmt = select(AgentGuardrailRule).where(AgentGuardrailRule.agent_id == agent_id)
        if active_only:
            stmt = stmt.where(AgentGuardrailRule.is_active == True)
        stmt = stmt.order_by(AgentGuardrailRule.created_at.desc())
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def list_rules_by_company(self, company_id: str) -> Sequence[AgentGuardrailRule]:
        stmt = select(AgentGuardrailRule).where(
            AgentGuardrailRule.company_id == company_id,
            AgentGuardrailRule.is_active == True
        )
        stmt = stmt.order_by(AgentGuardrailRule.created_at.desc())
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def update_rule(self, rule_id: str, data: dict[str, Any]) -> AgentGuardrailRule | None:
        rule = await self.get_rule(rule_id)
        if not rule:
            return None
        for key, value in data.items():
            setattr(rule, key, value)
        await self._session.flush()
        return rule

    async def deactivate_rule(self, rule_id: str) -> None:
        stmt = (
            update(AgentGuardrailRule)
            .where(AgentGuardrailRule.id == rule_id)
            .values(is_active=False)
        )
        await self._session.execute(stmt)
        await self._session.flush()
