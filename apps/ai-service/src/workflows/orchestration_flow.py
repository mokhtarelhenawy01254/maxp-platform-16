from __future__ import annotations

import json
import time
from contextlib import suppress
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents.base import BaseAgent, BaseAgentConfig
from src.agents.loader import get_template
from src.db.models.agent import Agent as AgentModel
from src.db.repo.agent_repo import AgentRepository
from src.observability.llm_fallback import LLMFallbackProvider
from src.pipeline.checkpointer import PipelineCheckpointer
from src.pipeline.context import PipelineContext
from src.pipeline.runner import execute_pipeline
from src.pipeline.stages.skills_pipeline import process_with_skills
from src.pipeline.stages.validate_reply import validate_reply
from src.pipeline.stages.visual_match import match_product_by_image
from src.services.agent_feedback import AgentFeedbackTracker
from src.services.agent_registry import _resolve_agent_model, get_agent_registry
from src.memory.working_memory import working_memory_service
from src.services.memory_router import get_ceo_lessons
from src.services.run_state_manager import RunStateManager
from src.tools.registry import get_tool_names_for_role
from src.workflows.postgres_checkpoint import PostgresCheckpointStorage

logger = structlog.get_logger(__name__)


def _agent_channels(channels: object) -> list[str]:
    if isinstance(channels, list):
        normalized = []
        for channel in channels:
            c = str(channel).strip().lower()
            if c:
                normalized.append(c)
                if c == "messenger":
                    normalized.append("facebook")
                elif c == "facebook":
                    normalized.append("messenger")
        return normalized
    return []


async def _sync_agent_config_from_db(agent: Any, db_agent: AgentModel, session: AsyncSession | None = None) -> None:
    config = getattr(agent, "config", None)
    if not config:
        return

    config.allowed_channels = list(db_agent.channels or [])
    if session:
        resolved = await _resolve_agent_model(db_agent, session)
        if resolved:
            config.model = resolved
    elif db_agent.model:
        config.model = db_agent.model

    db_config = db_agent.config or {}
    provider = db_config.get("provider")
    key_id = db_config.get("keyId") or db_config.get("key_id")
    if provider:
        config.provider = provider
    if key_id:
        config.key_id = key_id

    # Sync live agent with DB-driven model changes and invalidate any cached
    # LLM client so ensure_client() rebuilds it with the new model.
    new_model = getattr(config, "model", None)
    if new_model and getattr(agent, "model", None) != new_model:
        logger.info(
            "runtime_agent_model_synced",
            agent_id=getattr(db_agent, "id", None),
            old_model=getattr(agent, "model", None),
            new_model=new_model,
        )
        agent.model = new_model
        agent.client = None


def _build_runtime_agent_from_db(
    db_agent: AgentModel, *, model: str | None = None, template_instructions: dict[str, str] | None = None
) -> tuple[BaseAgent, list[str]]:
    tool_names: list[str] = []
    # 2026 Primary: allowed_tools JSONB/list
    allowed_tools = getattr(db_agent, "allowed_tools", None)
    if allowed_tools:
        if isinstance(allowed_tools, list):
            tool_names = [str(tool) for tool in allowed_tools]
        elif isinstance(allowed_tools, str):
            with suppress(json.JSONDecodeError, TypeError):
                parsed = json.loads(allowed_tools)
                if isinstance(parsed, list):
                    tool_names = [str(tool) for tool in parsed]

    # Legacy fallback: skills column
    if not tool_names and db_agent.skills:
        if isinstance(db_agent.skills, list):
            tool_names = [str(tool) for tool in db_agent.skills]
        elif isinstance(db_agent.skills, str):
            with suppress(json.JSONDecodeError, TypeError):
                parsed = json.loads(db_agent.skills)
                if isinstance(parsed, list):
                    tool_names = [str(tool) for tool in parsed]

    if not tool_names:
        tool_names = get_tool_names_for_role(db_agent.role)

    from src.agents.base import _load_hooks_for_template
    agent_hooks = _load_hooks_for_template(db_agent.template_slug or None)

    # 2026-11-13: thinking level → model adjustment (deepseek deep → reasoner)
    from src.services.thinking_level import resolve_agent_model
    resolved_model = resolve_agent_model(
        model or getattr(db_agent, "model", "deepseek-flash"),
        db_config,
        getattr(db_agent, "model_policy", None) or {},
    )

    db_config = db_agent.config or {}
    config = BaseAgentConfig(
        id=getattr(db_agent, "id", None),
        name=getattr(db_agent, "name", ""),
        role=getattr(db_agent, "role", "AGENT"),
        company_id=getattr(db_agent, "company_id", None),
        allowed_tools=tool_names,
        allowed_channels=list(getattr(db_agent, "channels", []) or []),
        model=resolved_model,
        allowed_skills=list(getattr(db_agent, "allowed_skills", []) or []),
        tool_choice=db_config.get("toolChoice"),
        persona=getattr(db_agent, "persona", {}) or {},
        instructions={
            "soul": (getattr(db_agent, "persona", {}) or {}).get("soulInstructions") or getattr(db_agent, "soul", "") or (template_instructions or {}).get("soul", ""),
            "persona": (getattr(db_agent, "persona", {}) or {}).get("personaInstructions") or (template_instructions or {}).get("persona", ""),
            "agents": (getattr(db_agent, "persona", {}) or {}).get("agentInstructions") or (template_instructions or {}).get("agents", ""),
            "tools": (getattr(db_agent, "persona", {}) or {}).get("toolsInstructions") or (template_instructions or {}).get("tools", ""),
        },
        provider=db_config.get("provider") or None,
        key_id=db_config.get("keyId") or db_config.get("key_id") or None,
        template_slug=getattr(db_agent, "template_slug", None) or None,
        hooks=agent_hooks,
        policies={
            "model_policy": getattr(db_agent, "model_policy", {}) or {},
            "guardrails": getattr(db_agent, "guardrails", {}) or {},
        },
    )
    agent = BaseAgent(config)
    agent._db_rules = getattr(db_agent, "rules", "") or ""
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
                resolved_model = await _resolve_agent_model(db_agent, session)
                # Fetch template instructions for fallback (persona, agents, tools)
                tmpl_instr = None
                if db_agent.template_slug:
                    try:
                        tmpl = await get_template(db_agent.template_slug, session)
                        if tmpl:
                            tmpl_instr = {
                                "soul": tmpl.instructions_soul or "",
                                "persona": tmpl.instructions_persona or "",
                                "agents": tmpl.instructions_agents or "",
                                "tools": tmpl.instructions_tools or "",
                            }
                    except Exception:
                        logger.warning("template_instructions_fetch_failed", template_slug=db_agent.template_slug)
                runtime_agent = registry.get(company_id, db_agent.id)
                if runtime_agent:
                    await _sync_agent_config_from_db(runtime_agent, db_agent, session)
                    return db_agent.id, runtime_agent, "db"
                runtime_agent, tool_names = _build_runtime_agent_from_db(
                    db_agent, model=resolved_model, template_instructions=tmpl_instr
                )
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
    agent_id: str | None = None,
    memory_context: dict[str, Any] | None = None,
    conversation_id: str | None = None,
    attachments: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    effective_channel = channel or ("merchant" if is_merchant else "chat")

    if session is not None and not is_merchant:
        try:
            from src.api.admin.settings import is_channel_reply_enabled, agent_pause_state

            # Global pause — agent deliberately stopped by the merchant.
            paused, pause_reason = await agent_pause_state(company_id, session)
            if paused:
                logger.info(
                    "orchestration_agent_paused",
                    company_id=company_id,
                    channel=effective_channel,
                    pause_reason=pause_reason,
                )
                return {
                    "reply": "",
                    "reply_hint": pause_reason,
                    "paused": True,
                    "thread_id": thread_id,
                    "tool_results": [],
                    "response_attachments": [],
                }

            if not await is_channel_reply_enabled(company_id, effective_channel, session):
                logger.info(
                    "orchestration_channel_reply_disabled",
                    company_id=company_id,
                    channel=effective_channel,
                )
                return {
                    "reply": "",
                    "thread_id": thread_id,
                    "tool_results": [],
                    "response_attachments": [],
                }
        except Exception:
            logger.warning("orchestration_channel_reply_check_failed", exc_info=True)

    # Load registry early so we can pick the agent's configured provider
    registry = get_agent_registry()
    state_manager = RunStateManager(session) if session else None
    checkpointer = PipelineCheckpointer(session) if session else None
    checkpoint_storage = PostgresCheckpointStorage(session) if session else None

    _channel_normalized = effective_channel.lower()

    _channel_agent_id = None
    _channel_agent = None
    _assignment_source = "none"

    # Direct agent routing (e.g. per-WhatsApp-number dedicated agent assignment)
    # Assigned-agent-only policy: the pinned agent must be ACTIVE to reply —
    # an INACTIVE/ARCHIVED pin means NO ONE replies (no channel-agent takeover).
    direct_agent_requested = bool(agent_id)
    if agent_id and session:
        try:
            repo = AgentRepository(session)
            db_agent = await repo.get_agent(agent_id, company_id)
            if db_agent and db_agent.status == "ACTIVE":
                resolved_model = await _resolve_agent_model(db_agent, session)
                tmpl_instr = None
                if db_agent.template_slug:
                    try:
                        tmpl = await get_template(db_agent.template_slug, session)
                        if tmpl:
                            tmpl_instr = {
                                "soul": tmpl.instructions_soul or "",
                                "persona": tmpl.instructions_persona or "",
                                "agents": tmpl.instructions_agents or "",
                                "tools": tmpl.instructions_tools or "",
                            }
                    except Exception:
                        pass
                runtime_agent = registry.get(company_id, db_agent.id)
                if runtime_agent:
                    await _sync_agent_config_from_db(runtime_agent, db_agent, session)
                    _channel_agent_id, _channel_agent, _assignment_source = db_agent.id, runtime_agent, "direct_agent_id"
                else:
                    runtime_agent, tool_names = _build_runtime_agent_from_db(
                        db_agent, model=resolved_model, template_instructions=tmpl_instr
                    )
                    registry.register(company_id, db_agent.id, runtime_agent, tool_names=tool_names)
                    _channel_agent_id, _channel_agent, _assignment_source = db_agent.id, runtime_agent, "direct_agent_id"
                logger.info(
                    "orchestration_direct_agent_resolved",
                    agent_id=_channel_agent_id,
                    company_id=company_id,
                    channel=_channel_normalized,
                )
        except Exception as exc:
            logger.warning("direct_agent_lookup_failed", agent_id=agent_id, error=str(exc))

    is_customer = _channel_normalized in ("whatsapp", "facebook", "messenger", "telegram", "instagram", "web_chat", "site")

    # If no direct agent was assigned or found, fall back to channel routing —
    # but only when no agent was explicitly requested. A pinned-but-inactive
    # agent means NO ONE replies (assigned-agent-only policy).
    if not _channel_agent and not direct_agent_requested:
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

    if not _channel_agent and is_customer:
        # Assigned-agent-only policy: customer channels NEVER fall back to a
        # generic template. No assigned ACTIVE agent → silence for the customer
        # and a silent escalation to the company team.
        logger.warning(
            "orchestration_no_assigned_agent",
            company_id=company_id,
            channel=_channel_normalized,
            requested_agent_id=agent_id,
        )
        return {
            "reply": None,
            "thread_id": thread_id,
            "tool_results": [],
            "response_attachments": [],
            "escalation_requested": True,
            "escalation_meta": {"reason": "no_agent_assigned", "channel": _channel_normalized},
        }

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

    previous_state = None
    if state_manager:
        previous_state = await state_manager.get_latest_state(thread_id)

    if not _channel_agent:
        # Internal channels only (e.g. dashboard). Customer channels never
        # reach this line — the assigned-agent-only policy above returns an
        # escalation instead of substituting a generic template.
        # (2026-11-14 owner decision: NO template fallback for customers —
        # the assigned agent replies or NO ONE does.)
        _channel_agent = await BaseAgent.from_template("manager-ceo", company_id, session=session)

    if previous_state:
        state_id, _state_data = previous_state
        logger.info("resuming from previous state", state_id=state_id, thread_id=thread_id)

    try:
        # Restore from checkpoint if exact message retry (idempotency)
        if checkpointer:
            saved = await checkpointer.get_latest_checkpoint(thread_id)
            if saved and saved.final_reply and saved.message == message:
                logger.info("using cached pipeline result for identical message retry", thread_id=thread_id)
                return {
                    "reply": saved.final_reply,
                    "thread_id": thread_id,
                    "tool_results": saved.executed_tools,
                    "response_attachments": list(saved.response_attachments or []),
                }

        external_context = dict(memory_context or {})

        ceo_lessons = ""
        if session:
            with suppress(Exception):
                ceo_lessons = await get_ceo_lessons(company_id, session, message)
        if ceo_lessons:
            existing = external_context.get("ceo_lessons", "")
            external_context["ceo_lessons"] = existing + ceo_lessons

        # Load recent messages from working memory for conversation continuity
        if session:
            try:
                wm_key = conversation_id or thread_id
                if wm_key:
                    wm_ctx = await working_memory_service.get_context(company_id, wm_key)
                    if wm_ctx and wm_ctx.get("recentMessages"):
                        external_context.setdefault("recentMessages", wm_ctx["recentMessages"])
            except Exception:
                logger.warning("failed to load working memory", exc_info=True)

        ctx = PipelineContext(
            message=message,
            thread_id=thread_id,
            company_id=company_id,
            customer_id=customer_id,
            agent=_channel_agent,
            session=session,
            channel=effective_channel,
            is_customer_channel=is_customer,
            conversation_id=conversation_id,
            external_memory_context=external_context,
            llm_client=client,
            attachments=attachments or [],
        )

        pipeline_stages = [
            match_product_by_image,
            process_with_skills,
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

        # Save messages to working memory for conversation continuity
        # If escalation was requested, never record a hallucinated/rejected LLM text as the assistant reply
        reply_text = final_ctx.final_reply or ("" if final_ctx.escalation_requested else (final_ctx.llm_response or ""))
        if session:
            try:
                wm_key = conversation_id or thread_id
                if wm_key and message:
                    user_msg: dict[str, Any] = {"role": "user", "content": message}
                    if attachments:
                        img_urls = [a.get("url", "") for a in attachments if a.get("type") in ("image", "photo")]
                        if img_urls:
                            user_msg["attachments"] = [{"type": "image", "url": u} for u in img_urls]
                            user_msg["content"] += "\n[أرفق صورة]"
                    await working_memory_service.add_message(company_id, wm_key, user_msg)
                if wm_key and reply_text:
                    await working_memory_service.add_message(company_id, wm_key, {"role": "assistant", "content": reply_text})
            except Exception:
                logger.warning("failed to save working memory", exc_info=True)

        if state_manager:
            state_id = f"state_{int(time.time())}"
            await state_manager.save_state(
                thread_id=thread_id,
                state_id=state_id,
                state={
                    "last_reply": reply_text,
                    "status": "completed",
                },
            )

        return {
            "reply": final_ctx.final_reply or (None if final_ctx.escalation_requested else final_ctx.llm_response),
            "thread_id": thread_id,
            "tool_results": final_ctx.executed_tools,
            "response_attachments": list(final_ctx.response_attachments or []),
            "reasoning_content": getattr(final_ctx, "reasoning_content", None),
            "reasoning_effort": getattr(final_ctx, "reasoning_effort", None),
            "escalation_requested": final_ctx.escalation_requested,
            "escalation_meta": {
                "reason": final_ctx.escalation_reason,
                "customer_message": message,
                "channel": effective_channel,
            } if final_ctx.escalation_requested else None,
        }
    except Exception as exc:
        logger.error("orchestration failed", error=str(exc), thread_id=thread_id)
        raise


