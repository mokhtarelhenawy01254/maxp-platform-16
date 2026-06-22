from __future__ import annotations

import json
import uuid

import structlog
from agent_framework.anthropic import RawClaudeAgent
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents.base import BaseAgent, BaseAgentConfig
from src.config import get_settings
from src.db.models.agent import Agent
from src.db.repo.agent_repo import AgentRepository
from src.prompts.template_registry import get_prompt_registry
from src.tools.registry import (
    get_tool_names_for_role,
    resolve_tools_from_names,
)
from src.tools.sdk_gateway import wrap_tools_for_gateway

logger = structlog.get_logger(__name__)


def _generate_agent_id(company_id: str) -> str:
    prefix = company_id[-6:]
    return f"agent_{prefix}_{uuid.uuid4().hex[:12]}"


class AgentRegistry:
    """In-memory registry for spawned agents, mirrored to DB.

    كل subagent بيتسجل هنا مع الـ tools بتاعته
    """

    def __init__(self) -> None:
        self._registry: dict[str, dict[str, _AgentRecord]] = {}
        self._company_id_map: dict[str, str] = {}  # agent_id -> company_id

    def register(
        self,
        company_id: str,
        agent_id: str,
        agent: BaseAgent | RawClaudeAgent,
        tool_names: list[str] | None = None,
    ) -> None:
        if company_id not in self._registry:
            self._registry[company_id] = {}
        self._registry[company_id][agent_id] = _AgentRecord(
            agent=agent,
            tool_names=tool_names or [],
        )
        self._company_id_map[agent_id] = company_id

    def get(self, company_id: str, agent_id: str) -> BaseAgent | RawClaudeAgent | None:
        record = self._registry.get(company_id, {}).get(agent_id)
        return record.agent if record else None

    def get_tool_names(self, company_id: str, agent_id: str) -> list[str]:
        record = self._registry.get(company_id, {}).get(agent_id)
        return record.tool_names if record else []

    def list_agents(self, company_id: str) -> list[tuple[str, BaseAgent | RawClaudeAgent, list[str]]]:
        """Return list of (agent_id, agent, tool_names) for a company."""
        return [
            (agent_id, record.agent, record.tool_names)
            for agent_id, record in self._registry.get(company_id, {}).items()
        ]

    def list_agent_records(self, company_id: str) -> list[_AgentRecord]:
        return list(self._registry.get(company_id, {}).values())

    def remove(self, company_id: str, agent_id: str) -> bool:
        company_agents = self._registry.get(company_id)
        if not company_agents or agent_id not in company_agents:
            return False
        del company_agents[agent_id]
        self._company_id_map.pop(agent_id, None)
        return True

    def clear_company(self, company_id: str) -> None:
        records = self._registry.pop(company_id, {})
        for agent_id in records:
            self._company_id_map.pop(agent_id, None)

    async def spawn(
        self,
        company_id: str,
        role: str,
        name: str | None = None,
        instructions: str | None = None,
        allowed_tools: list[str] | None = None,
        allowed_channels: list[str] | None = None,
        model: str | None = None,
        parent_id: str | None = None,
        template_slug: str | None = None,
        company_name: str | None = None,
        db_session: AsyncSession | None = None,
    ) -> tuple[BaseAgent, str]:
        """Create a new agent with role-specific tools, register in memory, persist to DB."""
        settings = get_settings()
        agent_id = _generate_agent_id(company_id)
        resolved_model = model or settings.default_model

        tool_names = allowed_tools or get_tool_names_for_role(role)

        config = BaseAgentConfig(
            id=agent_id,
            name=name or f"{role} Agent",
            role=role,
            company_id=company_id,
            allowed_tools=tool_names,
            allowed_channels=allowed_channels or [],
            model=resolved_model,
            parent_id=parent_id,
            template_slug=template_slug,
            # instructions handled via template or overrides in BaseAgent
        )

        agent = BaseAgent(config)

        self.register(company_id, agent_id, agent, tool_names=tool_names)

        if db_session:
            repo = AgentRepository(db_session)
            await repo.upsert_agent(agent_id, company_id, {
                "name": agent.name,
                "role": role,
                "model": resolved_model,
                "status": "ACTIVE",
                "parent_id": parent_id,
                "template_slug": template_slug,
                "skills": json.dumps(tool_names),
                "channels": json.dumps(allowed_channels or []),
                "created_by": "agent_registry",
            })

        return agent, agent_id

    def _default_instructions(self, role: str, company_name: str) -> str:
        """Build default instructions using the template registry instead of hardcoded strings."""
        tool_names = get_tool_names_for_role(role.upper())
        tools_list = "\n".join(f"- {t}" for t in tool_names)

        # Use template registry (SOTA 2026 - no more hardcoded Arabic)
        registry = get_prompt_registry()
        try:
            hydrated = registry.build_prompt(
                role=role.upper(),
                variables={
                    "company_name": company_name,
                    "tools_list": tools_list,
                    "role": role,
                },
            )
            return hydrated.text
        except Exception:
            # Fallback to inline assembly (no Arabic - uses English defaults)
            return self._assemble_inline_fallback(role, company_name, tools_list)

    def _assemble_inline_fallback(self, role: str, company_name: str, tools_list: str) -> str:
        """Language-neutral fallback instruction builder."""
        return (
            f"You are a specialized {role} agent for {company_name or 'MaxP'}.\n\n"
            f"Available tools:\n{tools_list}\n\n"
            "Use the available tools to obtain data before answering. "
            "If you cannot fulfill a request, clearly inform the user."
        )


class _AgentRecord:
    def __init__(self, agent: BaseAgent | RawClaudeAgent, tool_names: list[str]) -> None:
        self.agent = agent
        self.tool_names = tool_names


_registry: AgentRegistry | None = None


def get_agent_registry() -> AgentRegistry:
    global _registry
    if _registry is None:
        _registry = AgentRegistry()
    return _registry


async def init_registry_from_db(session_factory) -> None:
    """Recover active agents (مع tools بتاعتهم) من DB إلى in-memory registry عند بدء التشغيل."""
    registry = get_agent_registry()
    settings = get_settings()

    async with session_factory() as session:
        repo = AgentRepository(session)
        stmt = select(Agent.company_id).distinct()
        result = await session.execute(stmt)
        companies = [row[0] for row in result]

        for company_id in companies:
            db_agents = await repo.list_active_agents(company_id)
            for db_agent in db_agents:
                try:
                    if registry.get(company_id, db_agent.id):
                        continue

                    tool_names: list[str] = []
                    if db_agent.skills:
                        try:
                            parsed = json.loads(db_agent.skills)
                            if isinstance(parsed, list):
                                tool_names = parsed
                        except (json.JSONDecodeError, TypeError):
                            pass

                    if not tool_names:
                        tool_names = get_tool_names_for_role(db_agent.role)

                    channels: list[str] = db_agent.channels or []

                    raw_tools = resolve_tools_from_names(tool_names)
                    agent_tools = wrap_tools_for_gateway(
                        raw_tools,
                        company_id=company_id,
                        agent_role=db_agent.role,
                        allowed_tools=tool_names,
                    )

                    if settings.default_llm_provider == "anthropic":
                        agent: BaseAgent | RawClaudeAgent = RawClaudeAgent(
                            name=db_agent.name,
                            instructions=db_agent.soul or "",
                            tools=agent_tools,
                            default_options={"model": db_agent.model or settings.default_model},
                        )
                    else:
                        _agent_config_json = db_agent.config or {}
                        config = BaseAgentConfig(
                            id=db_agent.id,
                            name=db_agent.name,
                            role=db_agent.role,
                            company_id=company_id,
                            allowed_tools=tool_names,
                            allowed_channels=channels,
                            model=db_agent.model or settings.default_model,
                            allowed_skills=list(db_agent.allowed_skills or []),
                            persona=db_agent.persona or {},
                            provider=_agent_config_json.get("provider") or None,
                            template_slug=db_agent.template_slug or None,
                        )
                        agent = BaseAgent(config)
                        agent._db_rules = db_agent.rules or ""

                    registry.register(company_id, db_agent.id, agent, tool_names=tool_names)
                except Exception as exc:
                    logger.warning("failed to load agent from DB", agent_id=db_agent.id, role=db_agent.role, error=str(exc))
                    continue

    logger.info("registry recovered from DB", companies=len(companies))
