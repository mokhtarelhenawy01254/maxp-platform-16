from __future__ import annotations

import json
import time
from contextlib import suppress
from typing import Any

import structlog
from agent_framework.a2a import A2AAgent
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents.base import BaseAgent, BaseAgentConfig
from src.agents.ceo import create_ceo_agent, create_channel_agent
from src.config import get_settings
from src.db.models.agent import Agent as AgentModel
from src.db.repo.agent_repo import AgentRepository
from src.observability.llm_fallback import LLMFallbackProvider
from src.pipeline.checkpointer import PipelineCheckpointer
from src.pipeline.context import PipelineContext
from src.pipeline.runner import execute_pipeline
from src.pipeline.stages.execute_tools import execute_tools
from src.pipeline.stages.handle_fallback import handle_fallback
from src.pipeline.stages.resolve_intent import resolve_intent
from src.pipeline.stages.route_to_tools import route_to_tools
from src.pipeline.stages.validate_reply import validate_reply
from src.services.a2a_bridge import AGENT_CARD_META
from src.services.agent_feedback import AgentFeedbackTracker
from src.services.agent_manager_service import get_agent_manager_service
from src.services.agent_registry import get_agent_registry
from src.services.memory_router import get_ceo_lessons
from src.services.run_state_manager import RunStateManager
from src.tools.registry import get_tool_names_for_role
from src.workflows.magentic_orchestration import MagenticOrchestrator
from src.workflows.postgres_checkpoint import PostgresCheckpointStorage

logger = structlog.get_logger(__name__)


def _agent_channels(channels: object) -> list[str]:
    if isinstance(channels, list):
        return [str(channel).strip().lower() for channel in channels if str(channel).strip()]
    return []


def _sync_agent_config_from_db(agent: Any, db_agent: AgentModel) -> None:
    config = getattr(agent, "config", None)
    if not config:
        return

    config.allowed_channels = list(db_agent.channels or [])
    if db_agent.model:
        config.model = db_agent.model

    db_config = db_agent.config or {}
    provider = db_config.get("provider")
    key_id = db_config.get("keyId") or db_config.get("key_id")
    if provider:
        config.provider = provider
    if key_id:
        config.key_id = key_id


def _build_runtime_agent_from_db(db_agent: AgentModel) -> tuple[BaseAgent, list[str]]:
    tool_names: list[str] = []
    if db_agent.skills:
        if isinstance(db_agent.skills, list):
            tool_names = [str(tool) for tool in db_agent.skills]
        elif isinstance(db_agent.skills, str):
            with suppress(json.JSONDecodeError, TypeError):
                parsed = json.loads(db_agent.skills)
                if isinstance(parsed, list):
                    tool_names = [str(tool) for tool in parsed]

    if not tool_names:
        tool_names = get_tool_names_for_role(db_agent.role)

    db_config = db_agent.config or {}
    config = BaseAgentConfig(
        id=db_agent.id,
        name=db_agent.name,
        role=db_agent.role,
        company_id=db_agent.company_id,
        allowed_tools=tool_names,
        allowed_channels=list(db_agent.channels or []),
        model=db_agent.model or get_settings().default_model,
        allowed_skills=list(db_agent.allowed_skills or []),
        persona=db_agent.persona or {},
        provider=db_config.get("provider") or None,
        key_id=db_config.get("keyId") or db_config.get("key_id") or None,
        template_slug=db_agent.template_slug or None,
        policies={
            "model_policy": db_agent.model_policy or {},
            "guardrails": db_agent.guardrails or {},
        },
    )
    agent = BaseAgent(config)
    agent._db_rules = db_agent.rules or ""
    return agent, tool_names


async def _resolve_channel_agent(
    *,
    company_id: str,
    channel: str,
    registry,
    session: AsyncSession | None,
) -> tuple[str | None, Any | None, str]:
    channel_normalized = channel.lower()

    if session:
        try:
            repo = AgentRepository(session)
            db_agents = await repo.list_active_agents(company_id)
            matches = [
                db_agent
                for db_agent in db_agents
                if channel_normalized in _agent_channels(db_agent.channels or [])
            ]
            if len(matches) > 1:
                logger.warning(
                    "orchestration_channel_assignment_conflict",
                    company_id=company_id,
                    channel=channel_normalized,
                    agent_ids=[agent.id for agent in matches],
                )
            if matches:
                db_agent = matches[0]
                runtime_agent = registry.get(company_id, db_agent.id)
                if runtime_agent:
                    _sync_agent_config_from_db(runtime_agent, db_agent)
                    return db_agent.id, runtime_agent, "db"
                runtime_agent, tool_names = _build_runtime_agent_from_db(db_agent)
                registry.register(company_id, db_agent.id, runtime_agent, tool_names=tool_names)
                logger.info(
                    "orchestration_db_channel_agent_loaded_into_registry",
                    company_id=company_id,
                    channel=channel_normalized,
                    agent_id=db_agent.id,
                )
                return db_agent.id, runtime_agent, "db_loaded"
            logger.info(
                "orchestration_no_db_channel_agent",
                company_id=company_id,
                channel=channel_normalized,
            )
            return None, None, "db"
        except Exception as exc:
            logger.warning(
                "orchestration_db_channel_assignment_lookup_failed",
                company_id=company_id,
                channel=channel_normalized,
                error=str(exc),
            )

    for agent_id, agent, _ in registry.list_agents(company_id):
        config = getattr(agent, "config", None)
        channels = _agent_channels(getattr(config, "allowed_channels", None) or [])
        if channel_normalized in channels:
            return agent_id, agent, "registry"

    return None, None, "none"


async def run_orchestration(
    message: str,
    thread_id: str,
    company_id: str,
    customer_id: str,
    session: AsyncSession | None = None,
    is_merchant: bool = False,
    channel: str | None = None,
    memory_context: dict[str, Any] | None = None,
    conversation_id: str | None = None,
) -> dict[str, Any]:
    settings = get_settings()
    effective_channel = channel or ("merchant" if is_merchant else "chat")

    # Load registry early so we can pick the agent's configured provider
    manager = get_agent_manager_service()
    registry = get_agent_registry()
    state_manager = RunStateManager(session) if session else None
    checkpointer = PipelineCheckpointer(session) if session else None
    checkpoint_storage = PostgresCheckpointStorage(session) if session else None

    await _ensure_default_agents(company_id, manager, registry, session)

    _channel_normalized = effective_channel.lower()

    # Find the agent assigned to this channel — that agent IS the responder, not CEO.
    _channel_agent_id, _channel_agent, _assignment_source = await _resolve_channel_agent(
        company_id=company_id,
        channel=_channel_normalized,
        registry=registry,
        session=session,
    )
    if _channel_agent:
        logger.info(
            "orchestration_channel_agent_found",
            agent=_channel_agent_id,
            channel=_channel_normalized,
            assignment_source=_assignment_source,
        )

    # Get the LLM client from the channel agent (or fall back)
    client = None
    if _channel_agent:
        try:
            client = await _channel_agent.ensure_client()
            _prov = getattr(getattr(_channel_agent, "config", None), "provider", None)
            _model = getattr(getattr(_channel_agent, "config", None), "model", None)
            logger.info(
                "orchestration_using_channel_agent",
                agent=_channel_agent_id,
                provider=_prov,
                model=_model,
                channel=_channel_normalized,
                assignment_source=_assignment_source,
            )
        except Exception as _exc:
            logger.warning("channel_agent_provider_unavailable", error=str(_exc))

    if not client:
        # Fall back: any agent with a custom provider
        for _aid, _agent, _ in registry.list_agents(company_id):
            _provider = getattr(getattr(_agent, "config", None), "provider", None)
            if _provider:
                try:
                    client = await _agent.ensure_client()
                    logger.info("orchestration_using_fallback_provider_agent", agent=_aid, provider=_provider)
                    break
                except Exception as _exc:
                    logger.warning("agent_provider_unavailable", agent=_aid, provider=_provider, error=str(_exc))

    if not client:
        _fallback = LLMFallbackProvider()
        client = await _fallback.get_client(company_id=company_id, system_prompt=None)
        logger.info("orchestration_using_google_fallback", channel=_channel_normalized)

    if not client:
        raise RuntimeError("No LLM provider available for orchestration")

    # Try Magentic orchestration only for merchant/internal requests until the
    # Magentic path is wrapped with MaxP's customer intent, approval, and audit
    # gates.
    if settings.enable_magentic_orchestration and is_merchant:
        try:
            orchestrator = MagenticOrchestrator(llm_client=client)
            result = await orchestrator.run(
                message=message,
                company_id=company_id,
                thread_id=thread_id,
                is_merchant=is_merchant,
            )
            return {
                "reply": str(result),
                "thread_id": thread_id,
                "tool_results": [],
            }
        except Exception as exc:
            logger.warning("magentic orchestration failed, falling back to pipeline", error=str(exc))

    # Fall back to standard pipeline orchestration

    previous_state = None
    if state_manager:
        previous_state = await state_manager.get_latest_state(thread_id)

    sub_agent_tools = []
    for _agent_id, agent, tool_names in registry.list_agents(company_id):
        role = getattr(agent, "role", "UNKNOWN").lower()
        meta = AGENT_CARD_META.get(agent.role.upper(), {})
        tool_name = f"{role}_specialist"
        tool_description = (
            meta.get("description")
            or f"Specialist agent for {role} tasks. "
            f"Tools: {', '.join(tool_names)}. "
            f"Send the customer message to this agent to handle {role}-related requests."
        )
        try:
            a2a_agent = A2AAgent(
                name=meta.get("name", agent.name or role),
                description=tool_description,
                url=f"http://localhost:8000/a2a/agents/{_agent_id}",
            )
            a2a_tool = a2a_agent.as_tool(
                name=tool_name,
                description=tool_description,
                arg_name="task",
                arg_description=tool_description,
            )
            sub_agent_tools.append(a2a_tool)
        except Exception as exc:
            logger.warning("could not create A2A agent tool", role=role, error=str(exc))
            # Fallback: use in-process agent tool
            try:
                sub_agent_tools.append(agent.as_tool(name=tool_name, description=tool_description))
            except Exception as exc2:
                logger.warning("could not convert agent to tool", role=role, error=str(exc2))

    if _channel_agent:
        ceo_agent = await create_channel_agent(
            channel_agent=_channel_agent,
            specialized_agents_tools=sub_agent_tools,
            company_id=company_id,
            client=client,
        )
    else:
        ceo_agent = await create_ceo_agent(
            specialized_agents_tools=sub_agent_tools,
            is_merchant=is_merchant,
            company_id=company_id,
            client=client,
        )

    if previous_state:
        state_id, _state_data = previous_state
        logger.info("resuming from previous state", state_id=state_id, thread_id=thread_id)

    try:
        # Restore from checkpoint if available
        if checkpointer:
            saved = await checkpointer.get_latest_checkpoint(thread_id)
            if saved and saved.final_reply:
                logger.info("using cached pipeline result", thread_id=thread_id)
                return {
                    "reply": saved.final_reply,
                    "thread_id": thread_id,
                    "tool_results": saved.executed_tools,
                }

        external_context = dict(memory_context or {})

        ceo_lessons = ""
        if session:
            with suppress(Exception):
                ceo_lessons = await get_ceo_lessons(company_id, session, message)
        if ceo_lessons:
            existing = external_context.get("ceo_lessons", "")
            external_context["ceo_lessons"] = existing + ceo_lessons

        ctx = PipelineContext(
            message=message,
            thread_id=thread_id,
            company_id=company_id,
            customer_id=customer_id,
            agent=ceo_agent,
            session=session,
            channel=effective_channel,
            conversation_id=conversation_id,
            external_memory_context=external_context,
            llm_client=client,
        )

        pipeline_stages = [
            resolve_intent,
            route_to_tools,
            execute_tools,
            handle_fallback,
            validate_reply,
        ]

        final_ctx = await execute_pipeline(
            ctx,
            pipeline_stages,
            checkpointer=checkpointer,
            checkpoint_storage=checkpoint_storage,
        )

        feedback = AgentFeedbackTracker(
            company_id=company_id,
            agent_role="CEO",
            agent_name="CEO Orchestrator",
            thread_id=thread_id,
        )
        await feedback.record_outcome(
            status=final_ctx.early_return.get("status", "SUCCESS") if final_ctx.early_return else "SUCCESS",
            executed_tools=final_ctx.executed_tools,
            context_message=message,
        )

        if state_manager:
            state_id = f"state_{int(time.time())}"
            await state_manager.save_state(
                thread_id=thread_id,
                state_id=state_id,
                state={
                    "last_reply": final_ctx.final_reply or final_ctx.llm_response,
                    "status": "completed",
                },
            )

        return {
            "reply": final_ctx.final_reply or final_ctx.llm_response,
            "thread_id": thread_id,
            "tool_results": final_ctx.executed_tools,
        }
    except Exception as exc:
        logger.error("orchestration failed", error=str(exc), thread_id=thread_id)
        raise


async def _ensure_default_agents(
    company_id: str,
    manager,
    registry,
    session: AsyncSession | None = None,
) -> None:
    existing = registry.list_agents(company_id)
    existing_roles = {getattr(agent, "role", "").upper() for _, agent, _ in existing}

    defaults = [
        ("SUPPORT", "Support Agent", get_tool_names_for_role("SUPPORT")),
        ("ORDER", "Order Agent", get_tool_names_for_role("ORDER")),
    ]

    for role, name, tool_names in defaults:
        if role not in existing_roles:
            await manager.hire_agent(
                company_id=company_id,
                role=role,
                name=name,
                allowed_tools=tool_names,
                company_name="MaxP",
                session=session,
            )
            logger.info("default agent created", role=role, tools=tool_names)
