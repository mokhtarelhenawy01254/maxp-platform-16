from __future__ import annotations

import time
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from agent_framework.a2a import A2AAgent

from src.agents.ceo import create_ceo_agent, create_channel_agent
from src.config import get_settings
from src.observability.llm_fallback import LLMFallbackProvider
from src.pipeline.checkpointer import PipelineCheckpointer
from src.pipeline.context import PipelineContext
from src.pipeline.runner import execute_pipeline
from src.pipeline.stages.execute_tools import execute_tools
from src.pipeline.stages.handle_fallback import handle_fallback
from src.pipeline.stages.resolve_intent import resolve_intent
from src.pipeline.stages.retrieve_knowledge import retrieve_knowledge
from src.pipeline.stages.route_to_tools import route_to_tools
from src.pipeline.stages.validate_reply import validate_reply
from src.services.agent_manager_service import get_agent_manager_service
from src.services.agent_registry import get_agent_registry
from src.services.a2a_bridge import AGENT_CARD_META
from src.services.agent_feedback import AgentFeedbackTracker
from src.services.memory_router import get_ceo_lessons
from src.services.run_state_manager import RunStateManager
from src.tools.registry import get_tool_names_for_role
from src.workflows.magentic_orchestration import MagenticOrchestrator
from src.workflows.postgres_checkpoint import PostgresCheckpointStorage

logger = structlog.get_logger(__name__)


async def run_orchestration(
    message: str,
    thread_id: str,
    company_id: str,
    customer_id: str,
    session: AsyncSession | None = None,
    is_merchant: bool = False,
    channel: str | None = None,
    memory_context: dict[str, Any] | None = None,
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

    # Find the agent assigned to this channel — that agent IS the responder, not CEO
    _channel_agent = None
    for _aid, _agent, _ in registry.list_agents(company_id):
        _cfg = getattr(_agent, "config", None)
        _channels = [c.lower() for c in (getattr(_cfg, "allowed_channels", None) or [])]
        if _channel_normalized in _channels:
            _channel_agent = _agent
            logger.info("orchestration_channel_agent_found", agent=_aid, channel=_channel_normalized)
            break

    # Get the LLM client from the channel agent (or fall back)
    client = None
    if _channel_agent:
        try:
            client = await _channel_agent.ensure_client()
            _prov = getattr(getattr(_channel_agent, "config", None), "provider", None)
            logger.info("orchestration_using_channel_agent", agent=_aid, provider=_prov, channel=_channel_normalized)
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
            try:
                ceo_lessons = await get_ceo_lessons(company_id, session, message)
            except Exception:
                pass
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
            external_memory_context=external_context,
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
