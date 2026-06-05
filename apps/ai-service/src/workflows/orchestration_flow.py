from __future__ import annotations

import time
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents.ceo import create_ceo_agent
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
from src.services.run_state_manager import RunStateManager
from src.tools.registry import get_tool_names_for_role
from src.workflows.magentic_orchestration import MagenticOrchestrator

logger = structlog.get_logger(__name__)


async def run_orchestration(
    message: str,
    thread_id: str,
    company_id: str,
    customer_id: str,
    session: AsyncSession | None = None,
    is_merchant: bool = False,
) -> dict[str, Any]:
    settings = get_settings()

    fallback = LLMFallbackProvider()
    client = await fallback.get_client(
        company_id=company_id,
        system_prompt=None,
    )

    if not client:
        raise RuntimeError("No LLM provider available for orchestration")

    # Try Magentic orchestration if enabled
    if settings.enable_magentic_orchestration:
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
    manager = get_agent_manager_service()
    registry = get_agent_registry()
    state_manager = RunStateManager(session) if session else None
    checkpointer = PipelineCheckpointer(session) if session else None

    await _ensure_default_agents(company_id, manager, registry, session)

    previous_state = None
    if state_manager:
        previous_state = await state_manager.get_latest_state(thread_id)

    sub_agent_tools = []
    for _agent_id, agent, tool_names in registry.list_agents(company_id):
        role = getattr(agent, "role", "UNKNOWN").lower()
        tool_name = f"{role}_specialist"
        tool_description = (
            f"Specialist agent for {role} tasks. "
            f"Tools: {', '.join(tool_names)}. "
            f"Send the customer message to this agent to handle {role}-related requests."
        )
        try:
            sub_agent_tools.append(agent.as_tool(name=tool_name, description=tool_description))
        except Exception as exc:
            logger.warning("could not convert agent to tool", role=role, error=str(exc))

    ceo_agent = create_ceo_agent(
        specialized_agents_tools=sub_agent_tools,
        is_merchant=is_merchant,
    )
    ceo_agent.client = client

    agent_session = ceo_agent.create_session(session_id=thread_id)

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

        ctx = PipelineContext(
            message=message,
            thread_id=thread_id,
            company_id=company_id,
            customer_id=customer_id,
            agent=ceo_agent,
            session=agent_session,
            channel="merchant" if is_merchant else "chat",
        )

        pipeline_stages = [
            resolve_intent,
            retrieve_knowledge,
            route_to_tools,
            execute_tools,
            handle_fallback,
            validate_reply,
        ]

        final_ctx = await execute_pipeline(ctx, pipeline_stages, checkpointer=checkpointer)

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
