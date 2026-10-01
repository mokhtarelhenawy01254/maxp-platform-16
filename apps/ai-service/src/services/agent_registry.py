from __future__ import annotations

import json
import uuid

import structlog
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
from src.agents.role_registry import get_role

logger = structlog.get_logger(__name__)


def _generate_agent_id(company_id: str) -> str:
    prefix = company_id[-6:]
    return f"agent_{prefix}_{uuid.uuid4().hex[:12]}"


async def _resolve_agent_model(db_agent: Agent, session: AsyncSession) -> str | None:
    if db_agent.template_slug:
        from src.agents.loader import get_template
        try:
            template = await get_template(db_agent.template_slug, session)
            if template and template.model_policy:
                return db_agent.model or template.model_policy.get("default")
        except Exception:
            logger.warning("template_resolve_failed", template_slug=db_agent.template_slug)
    return db_agent.model


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
        agent: BaseAgent,
        tool_names: list[str] | None = None,
    ) -> None:
        if company_id not in self._registry:
            self._registry[company_id] = {}
        self._registry[company_id][agent_id] = _AgentRecord(
            agent=agent,
            tool_names=tool_names or [],
        )
        self._company_id_map[agent_id] = company_id

    def get(self, company_id: str, agent_id: str) -> BaseAgent | None:
        record = self._registry.get(company_id, {}).get(agent_id)
        return record.agent if record else None

    def get_tool_names(self, company_id: str, agent_id: str) -> list[str]:
        record = self._registry.get(company_id, {}).get(agent_id)
        return record.tool_names if record else []

    def list_agents(self, company_id: str) -> list[tuple[str, BaseAgent, list[str]]]:
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
        allowed_skills: list[str] | None = None,
        allowed_channels: list[str] | None = None,
        model: str | None = None,
        model_policy: dict[str, Any] | None = None,
        parent_id: str | None = None,
        template_slug: str | None = None,
        company_name: str | None = None,
        db_session: AsyncSession | None = None,
    ) -> tuple[BaseAgent, str]:
        """Create a new agent with role-specific tools, register in memory, persist to DB."""
        settings = get_settings()
        agent_id = _generate_agent_id(company_id)

        resolved_policy = model_policy or {}
        resolved_skills = allowed_skills or []
        resolved_persona: dict[str, Any] = {}
        resolved_guardrails: dict[str, Any] = {}
        resolved_instructions: dict[str, str] = {}

        if template_slug:
            from src.agents.loader import get_template, _discover_templates
            from src.agents._internals import _TemplateAdapter
            try:
                template = None
                if db_session:
                    template = await get_template(template_slug, db_session)
                if not template:
                    match_data = next((d for d in _discover_templates() if d["slug"] == template_slug), None)
                    if match_data:
                        from src.db.models.agent import AgentTemplate
                        template = AgentTemplate(**match_data)
                if template:
                    profile = _TemplateAdapter.from_db_or_proxy(template, template_slug, company_id)
                    if not resolved_policy:
                        resolved_policy = profile.model_policy or {}
                    if not resolved_skills:
                        resolved_skills = profile.allowed_skills or []
                    resolved_persona = {
                        "language": profile.persona_meta.get("language", "arabic"),
                        "dialect": profile.persona_meta.get("dialect"),
                        "tone": profile.persona_meta.get("tone", "professional"),
                        "formality": profile.persona_meta.get("formality", "formal"),
                        "soulInstructions": template.instructions_soul or "",
                        "toolsInstructions": template.instructions_tools or "",
                        "agentInstructions": template.instructions_agents or "",
                        "personaInstructions": template.instructions_persona or "",
                    }
                    resolved_instructions = {
                        "soul": template.instructions_soul or "",
                        "persona": template.instructions_persona or "",
                        "agents": template.instructions_agents or "",
                        "tools": template.instructions_tools or "",
                    }
                    resolved_guardrails = profile.guardrails or {}
            except Exception as e:
                logger.warning("failed to load template during spawn", template_slug=template_slug, error=str(e))

        resolved_model = (
            model
            or resolved_policy.get("default")
            or resolved_policy.get("model")
        )
        if not resolved_model:
            # DB-first: company model → platform default. No env fallback.
            try:
                from src.services.model_resolver import resolve_db_default_model

                resolved_model = await resolve_db_default_model(company_id)
            except Exception as e:
                logger.warning("db_default_model_resolution_failed", company_id=company_id, error=str(e)[:160])

        tool_names = allowed_tools or get_tool_names_for_role(role)

        config = BaseAgentConfig(
            id=agent_id,
            name=name or f"{role} Agent",
            role=role,
            company_id=company_id,
            allowed_tools=tool_names,
            allowed_skills=resolved_skills,
            allowed_channels=allowed_channels or [],
            model=resolved_model,
            parent_id=parent_id,
            template_slug=template_slug,
            persona=resolved_persona,
            instructions=resolved_instructions,
            policies={
                "model_policy": resolved_policy,
                "guardrails": resolved_guardrails,
            },
        )

        agent = BaseAgent(config)

        self.register(company_id, agent_id, agent, tool_names=tool_names)

        if db_session:
            repo = AgentRepository(db_session)
            await repo.upsert_agent(agent_id, company_id, {
                "name": agent.name,
                "role": role,
                "model": resolved_model,
                "model_policy": resolved_policy,
                "status": "ACTIVE",
                "parent_id": parent_id,
                "template_slug": template_slug,
                "skills": json.dumps(tool_names),
                "channels": json.dumps(allowed_channels or []),
                "allowed_skills": resolved_skills,
                "persona": resolved_persona,
                "guardrails": resolved_guardrails,
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
    def __init__(self, agent: BaseAgent, tool_names: list[str]) -> None:
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

                    role_spec = get_role(db_agent.role)
                    if not tool_names:
                        tool_names = list(role_spec.tools) if role_spec.tools else get_tool_names_for_role(db_agent.role)

                    # Hermes Self-Learning Protocol: ALWAYS ensure learning & skill tools are available if capable
                    if role_spec.capabilities.get("learning", True):
                        if "record_learned_rule" not in tool_names:
                            tool_names.append("record_learned_rule")
                        if "manage_agent_skill" not in tool_names:
                            tool_names.append("manage_agent_skill")

                    # Ensure any role-specific tools from manifest and role_tools.yaml are populated
                    for t in list(role_spec.tools) + get_tool_names_for_role(db_agent.role):
                        if t not in tool_names:
                            tool_names.append(t)

                    channels: list[str] = db_agent.channels or []

                    raw_tools = resolve_tools_from_names(tool_names)
                    agent_tools = wrap_tools_for_gateway(
                        raw_tools,
                        company_id=company_id,
                        agent_role=db_agent.role,
                        allowed_tools=tool_names,
                    )

                    _agent_config_json = db_agent.config or {}
                    persona = dict(db_agent.persona or {})
                    # Hermes Living Agent Protocol: always sync latest SOUL and TOOLS from template
                    if db_agent.template_slug:
                        try:
                            from src.agents.loader import get_template
                            template = await get_template(db_agent.template_slug, session)
                            if template:
                                if template.instructions_soul:
                                    persona["soulInstructions"] = template.instructions_soul
                                if template.instructions_tools:
                                    persona["toolsInstructions"] = template.instructions_tools
                                if template.instructions_agents:
                                    persona["agentInstructions"] = template.instructions_agents
                                if template.instructions_persona and not persona.get("personaInstructions"):
                                    persona["personaInstructions"] = template.instructions_persona
                        except Exception as e:
                            logger.warning("template_sync_failed", error=str(e))
                    config = BaseAgentConfig(
                        id=db_agent.id,
                        name=db_agent.name,
                        role=db_agent.role,
                        company_id=company_id,
                        allowed_tools=tool_names,
                        allowed_channels=channels,
                        model=await _resolve_agent_model(db_agent, session),
                        allowed_skills=list(db_agent.allowed_skills or []),
                        persona=persona,
                        instructions={
                            "soul": persona.get("soulInstructions", ""),
                            "persona": persona.get("personaInstructions", ""),
                            "agents": persona.get("agentInstructions", ""),
                            "tools": persona.get("toolsInstructions", ""),
                        },
                        policies={
                            "model_policy": db_agent.model_policy or {},
                            "guardrails": db_agent.guardrails or {},
                        },
                        provider=_agent_config_json.get("provider") or None,
                        key_id=_agent_config_json.get("keyId") or _agent_config_json.get("key_id") or None,
                        template_slug=db_agent.template_slug or None,
                    )
                    agent = BaseAgent(config)
                    agent._db_rules = db_agent.rules or ""

                    registry.register(company_id, db_agent.id, agent, tool_names=tool_names)
                except Exception as exc:
                    logger.warning("failed to load agent from DB", agent_id=db_agent.id, role=db_agent.role, error=str(exc))
                    continue

    logger.info("registry recovered from DB", companies=len(companies))
