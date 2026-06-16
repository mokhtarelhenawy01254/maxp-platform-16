from __future__ import annotations

import secrets
import json
import re
import uuid
from datetime import UTC, datetime
from typing import Annotated, Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.agents.base import BaseAgent, BaseAgentConfig
from src.agents.loader import get_template, list_templates, seed_templates
from src.tools.registry import get_all_tools
from src.api.admin.agents_schemas import (
    AgentChatRequest,
    AgentChatResponse,
    AgentCreate,
    AgentFileSkill,
    AgentFileTool,
    AgentFilesResponse,
    AgentFilesSaveRequest,
    AgentRead,
    AgentStatusUpdate,
    AgentSummary,
    AgentTemplateList,
    AgentTemplateRead,
    AgentUpdate,
    InboxSummary,
    ManagerContextResponse,
    ProfileSummary,
    SandboxEvaluateRequest,
    SandboxEvaluateResponse,
    TeamMapNode,
    TeamMapResponse,
    ToolSummary,
)
from src.db.models.agent import Agent as AgentModel, AgentTemplate, AgentDepartment
from src.db.models.thread import Thread
from src.db.session import get_session
from src.llm.agent_client_factory import build_provider_client_async
from src.pipeline.context import DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL
from src.workflows.approval import create_approval_draft

logger = structlog.get_logger(__name__)
router = APIRouter()

SessionDep = Annotated[AsyncSession, Depends(get_session)]


EVALUATION_FALLBACK_SCORES = {
    "accuracy": 75,
    "helpfulness": 75,
    "relevance": 75,
    "completeness": 75,
    "safety": 85,
    "overall": 77,
}


async def _ensure_approval_thread_id(
    *,
    session: AsyncSession,
    company_id: str,
    customer_id: str,
    channel: str,
    requested_thread_id: str | None,
) -> str:
    normalized_customer_id = str(customer_id or "sandbox-user")
    normalized_channel = str(channel or "facebook").strip().lower() or "facebook"
    requested_uuid = None
    if requested_thread_id:
        try:
            requested_uuid = uuid.UUID(str(requested_thread_id))
            result = await session.execute(
                select(Thread).where(
                    Thread.id == requested_uuid,
                    Thread.company_id == company_id,
                    Thread.customer_id == normalized_customer_id,
                    Thread.channel == normalized_channel,
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                return str(existing.id)
        except ValueError:
            requested_uuid = None

    result = await session.execute(
        select(Thread).where(
            Thread.company_id == company_id,
            Thread.customer_id == normalized_customer_id,
            Thread.channel == normalized_channel,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return str(existing.id)

    thread = Thread(
        id=requested_uuid or uuid.uuid4(),
        company_id=company_id,
        customer_id=normalized_customer_id,
        channel=normalized_channel,
        status="active",
    )
    session.add(thread)
    await session.commit()
    await session.refresh(thread)
    return str(thread.id)


def _generate_agent_id() -> str:
    return f"agent_{secrets.token_urlsafe(16)}"


<<<<<<< HEAD
def _parse_skills_field(skills_val: object) -> list[str]:
    """Parse the legacy `skills` column (JSON string or list) into a list of tool names."""
    if not skills_val:
        return []
    if isinstance(skills_val, list):
        return [str(s) for s in skills_val if s]
    try:
        import json as _json
        parsed = _json.loads(skills_val)
        return [str(s) for s in parsed if s] if isinstance(parsed, list) else []
    except Exception:
        return []
=======
def _safe_list(value: object) -> list:
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except (json.JSONDecodeError, TypeError):
            return []
    return []
>>>>>>> cd2014e (fix: safe list parsing for channels in agent endpoints [no-doc])


def _agent_to_read(agent: AgentModel) -> AgentRead:
    dept = getattr(agent, 'department', None)
    skills_raw = getattr(agent, 'skills', None)
    # Fallback: if allowed_tools is empty but legacy `skills` column has data, use it
    raw_allowed = getattr(agent, 'allowed_tools', None) or []
    effective_allowed_tools = raw_allowed or _parse_skills_field(skills_raw)
    return AgentRead(
        id=agent.id,
        company_id=agent.company_id,
        name=agent.name,
        role=agent.role,
        description=getattr(agent, 'description', None),
        icon=getattr(agent, 'icon', None),
        soul=getattr(agent, 'soul', None),
        rules=getattr(agent, 'rules', None),
        skills_raw=skills_raw,
        template_slug=agent.template_slug,
        status=agent.status,
        model=agent.model,
        persona=getattr(agent, 'persona', None) or {},
        allowed_tools=effective_allowed_tools,
        allowed_skills=getattr(agent, 'allowed_skills', None) or [],
        allowed_channels=_safe_list(getattr(agent, 'channels', None)),
        guardrails=getattr(agent, 'guardrails', None) or {},
        budget=getattr(agent, 'budget', None) or {},
        parent_id=agent.parent_id,
        department_id=getattr(agent, 'department_id', None),
        department_key=dept.key if dept else None,
        department_name=dept.name if dept else None,
        department_icon=dept.icon if dept else None,
        manager_type=getattr(agent, 'manager_type', None),
        created_by=getattr(agent, 'created_by', None),
        version=getattr(agent, 'version', None) or '1.0.0',
        config=getattr(agent, 'config', None) or {},
        created_at=agent.created_at or datetime.now(UTC),
        updated_at=getattr(agent, 'updated_at', agent.created_at) or datetime.now(UTC),
    )


def _first_present(data: dict[str, Any], *keys: str, default: Any = None) -> Any:
    for key in keys:
        if key in data and data[key] is not None:
            return data[key]
    return default


def _instructions_from_persona(persona: dict[str, Any]) -> dict[str, str]:
    return {
        "soul": str(_first_present(persona, "soulInstructions", "soul_instructions", default="") or ""),
        "agents": str(_first_present(persona, "agentInstructions", "agent_instructions", default="") or ""),
        "tools": str(_first_present(persona, "toolsInstructions", "tools_instructions", default="") or ""),
        "persona": str(_first_present(persona, "personaInstructions", "persona_instructions", default="") or ""),
    }


def _agent_config_from_record(agent: AgentModel) -> dict[str, Any]:
    return {
        "id": agent.id,
        "name": agent.name,
        "role": agent.role,
        "company_id": agent.company_id,
        "template_slug": agent.template_slug,
        "model": agent.model,
        "persona": agent.persona or {},
        "policies": {
            "guardrails": agent.guardrails or {},
            "budget": agent.budget or {},
        },
        "allowed_tools": agent.allowed_tools or [],
        "allowed_skills": agent.allowed_skills or [],
        "allowed_channels": _safe_list(agent.channels),
        "status": agent.status,
    }


def _normalize_agent_config(
    *,
    company_id: str,
    agent_id: str,
    config: dict[str, Any],
) -> dict[str, Any]:
    persona = dict(_first_present(config, "persona", default={}) or {})
    policies = dict(_first_present(config, "policies", default={}) or {})
    template_slug = _first_present(config, "template_slug", "templateSlug")
    role = str(_first_present(config, "role", default="") or "").upper()
    name = str(_first_present(config, "name", default=role or agent_id) or agent_id)

    return {
        "id": str(_first_present(config, "id", default=agent_id) or agent_id),
        "name": name,
        "role": role,
        "company_id": company_id,
        "template_slug": template_slug,
        "model": _first_present(config, "model"),
        "provider": _first_present(config, "provider"),
        "keyId": _first_present(config, "key_id", "keyId"),
        "persona": persona,
        "policies": policies,
        "allowed_tools": list(_first_present(config, "allowed_tools", "allowedTools", default=[]) or []),
        "allowed_skills": list(_first_present(config, "allowed_skills", "allowedSkills", default=[]) or []),
        "allowed_channels": list(_first_present(config, "allowed_channels", "allowedChannels", default=[]) or []),
        "status": str(_first_present(config, "status", default="ACTIVE") or "ACTIVE"),
        "instructions": _instructions_from_persona(persona),
        "version": _first_present(config, "version"),
        "parent_id": _first_present(config, "parent_id", "parentId"),
    }


def _memory_context_with_provider_controls(
    memory_context: dict[str, Any] | None,
    provider: Any,
) -> dict[str, Any]:
    context = dict(memory_context or {})
    normalized_provider = str(provider or "").strip().upper()
    if normalized_provider and normalized_provider != "GOOGLE":
        context.setdefault(DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL, True)
    return context


async def _load_chat_agent(body: AgentChatRequest, session: AsyncSession) -> BaseAgent:
    # Try Python-managed agents table first
    result = await session.execute(
        select(AgentModel).where(
            AgentModel.id == body.agent_id,
            AgentModel.company_id == body.company_id,
            AgentModel.status != "ARCHIVED",
        )
    )
    db_agent = result.scalar_one_or_none()
    request_config = dict(body.agent_config or {})
    raw_config = _agent_config_from_record(db_agent) if db_agent else {}

    # Fallback: read from ai.agents with new fields (previously from public.company_agents)
    if not db_agent:
        import json as _json
        ca_row = await session.execute(
            text("""
                SELECT a.id, a.name, a.role, a.template_slug, a.model,
                       a.soul, a.skills, a.status, a.parent_id, a.company_id
                FROM ai.agents a
                WHERE a.id = :agent_id AND a.company_id = :company_id AND a.status != 'ARCHIVED'
            """),
            {"agent_id": body.agent_id, "company_id": body.company_id},
        )
        ca = ca_row.mappings().one_or_none()
        if ca:
            raw_config = {
                "id": ca["id"],
                "name": ca["name"],
                "role": ca["role"],
                "company_id": body.company_id,
                "template_slug": ca["template_slug"],
                "model": ca["model"],
                "persona": {
                    "soulInstructions": ca["soul"] or "",
                    "agentInstructions": "",
                    "toolsInstructions": "",
                },
                "policies": {},
                "allowed_tools": [],
                "allowed_skills": _json.loads(ca["skills"]) if ca["skills"] else [],
                "status": ca["status"],
                "version": None,
                "parent_id": ca["parent_id"],
            }

    if request_config:
        req_tools = request_config.get("allowedTools") or request_config.get("allowed_tools")
        raw_config = {
            **raw_config,
            **request_config,
            "persona": {
                **dict(raw_config.get("persona") or {}),
                **dict(request_config.get("persona") or {}),
            },
            "policies": {
                **dict(raw_config.get("policies") or {}),
                **dict(request_config.get("policies") or {}),
            },
        }
        if req_tools:
            raw_config["allowed_tools"] = list(req_tools)
    if not raw_config:
        raise HTTPException(status_code=404, detail=f"Agent not found: {body.agent_id}")

    cfg = _normalize_agent_config(
        company_id=body.company_id,
        agent_id=body.agent_id,
        config=raw_config,
    )
    template_slug = cfg.get("template_slug")
    overrides = {
        "id": cfg["id"],
        "name": cfg["name"],
        "role": cfg["role"],
        "model": cfg.get("model"),
        "provider": cfg.get("provider"),
        "key_id": cfg.get("key_id") or cfg.get("keyId"),
        "persona": cfg.get("persona") or {},
        "policies": cfg.get("policies") or {},
        "allowed_tools": cfg.get("allowed_tools") or [],
        "allowed_skills": cfg.get("allowed_skills") or [],
        "instructions": cfg.get("instructions") or {},
        "status": cfg.get("status") or "ACTIVE",
        "version": cfg.get("version"),
        "parent_id": cfg.get("parent_id"),
    }

    if template_slug:
        return await BaseAgent.from_template(
            str(template_slug),
            body.company_id,
            overrides=overrides,
            session=session,
        )

    return BaseAgent(
        BaseAgentConfig(
            id=cfg["id"],
            name=cfg["name"],
            role=cfg["role"] or "CUSTOM",
            company_id=body.company_id,
            allowed_tools=cfg.get("allowed_tools") or [],
            allowed_skills=cfg.get("allowed_skills") or [],
            allowed_channels=cfg.get("allowed_channels") or [],
            model=cfg.get("model") or "gemini-2.5-flash",
            provider=cfg.get("provider"),
            key_id=cfg.get("key_id") or cfg.get("keyId"),
            persona=cfg.get("persona") or {},
            policies=cfg.get("policies") or {},
            instructions=cfg.get("instructions") or {},
            status=cfg.get("status") or "ACTIVE",
        )
    )


@router.get("/templates", response_model=list[AgentTemplateList])
async def list_agent_templates(session: SessionDep) -> list[AgentTemplateList]:
    """List all agent templates."""
    templates = await list_templates(session)
    return [AgentTemplateList.model_validate(t) for t in templates]


@router.get("/templates/{slug}", response_model=AgentTemplateRead)
async def get_agent_template(slug: str, session: SessionDep) -> AgentTemplateRead:
    """Get a specific agent template by slug."""
    template = await get_template(slug, session)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template not found: {slug}")
    return AgentTemplateRead.model_validate(template)


@router.post("/templates/seed")
async def seed_agent_templates(session: SessionDep) -> dict:
    """Seed agent templates from filesystem into DB."""
    seeded = await seed_templates(session)
    return {"seeded": len(seeded), "slugs": [t.slug for t in seeded]}


@router.post("/agents/spawn", response_model=AgentRead, status_code=201)
async def spawn_agent(body: AgentCreate, session: SessionDep) -> AgentRead:
    """Create (spawn) a new runtime agent for a company."""
    role = (body.role or "").upper().strip()
    template_slug = body.template_slug
    template: AgentTemplate | None = None

    if template_slug:
        template = await get_template(template_slug, session)
        if not template:
            raise HTTPException(
                status_code=404,
                detail=f"Template not found: {template_slug}",
            )

    if not role and template:
        role = template.role
    if not role:
        raise HTTPException(
            status_code=400,
            detail="Either role or template_slug is required",
        )

    if not template and role:
        templates_result = await session.execute(
            select(AgentTemplate).where(AgentTemplate.role == role)
        )
        template = templates_result.scalar_one_or_none()
        if template:
            template_slug = template.slug

    name = body.name or (template.name if template else f"{role} Agent")
    if template:
        allowed_tools = body.allowed_tools or template.allowed_tools
        allowed_skills = body.allowed_skills or template.allowed_skills
    else:
        allowed_tools = body.allowed_tools or []
        allowed_skills = body.allowed_skills or []

    existing = await session.execute(
        select(AgentModel).where(
            AgentModel.company_id == body.company_id,
            AgentModel.name == name,
            AgentModel.status != "ARCHIVED",
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"Active agent with name '{name}' already exists for this company",
        )

    agent_id = _generate_agent_id()
    model = body.model or (template.model_policy.get("default") if template else None)
    agent = AgentModel(
        id=agent_id,
        company_id=body.company_id,
        name=name,
        role=role,
        template_slug=template_slug,
        status="ACTIVE",
        model=model,
        persona=body.persona or {},
        allowed_tools=allowed_tools,
        allowed_skills=allowed_skills,
        channels=template.channels if template else [],
        guardrails=body.guardrails or (template.guardrails if template else {}),
        budget=body.budget or (template.budget if template else {}),
        parent_id=body.parent_id,
        version=template.version if template else "1.0.0",
        config=body.config or {},
    )
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    logger.info("Agent spawned", agent_id=agent_id, company_id=body.company_id, role=role)
    return _agent_to_read(agent)


@router.get("/agents", response_model=list[AgentRead])
async def list_agents(
    session: SessionDep,
    company_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    role: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[AgentRead]:
    """List agents from Agent table."""
    stmt = select(AgentModel).options(selectinload(AgentModel.department)).order_by(AgentModel.created_at.desc())
    if company_id:
        stmt = stmt.where(AgentModel.company_id == company_id)
    if status:
        stmt = stmt.where(AgentModel.status == status.upper())
    if role:
        stmt = stmt.where(AgentModel.role == role.upper())
    stmt = stmt.limit(limit)
    result = await session.execute(stmt)
    return [_agent_to_read(a) for a in result.scalars().all()]


@router.post("/agents/chat", response_model=AgentChatResponse)
async def chat_with_agent(body: AgentChatRequest, session: SessionDep) -> AgentChatResponse:
    """Run a message through the selected runtime agent, not the generic CEO chat."""
    try:
        agent = await _load_chat_agent(body, session)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to load chat agent", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to load agent: {e}")

    try:
        await agent.ensure_client()
    except Exception as e:
        logger.error("Failed to ensure client", error=str(e))
        raise HTTPException(status_code=502, detail=f"LLM client error: {e}")

    thread_id = body.thread_id or f"agent-chat-{uuid.uuid4()}"
    requested_provider = getattr(getattr(agent, "config", None), "provider", None)
    if not requested_provider:
        requested_provider = _first_present(dict(body.agent_config or {}), "provider")
    memory_context = _memory_context_with_provider_controls(
        body.memory_context,
        requested_provider,
    )
    try:
        result = await agent.process_task(
            {
                "current_message": body.message,
                "description": body.message,
                "intent_message": body.message,
                "session_id": thread_id,
                "conversation_id": body.conversation_id or thread_id,
                "user_id": body.customer_id or "sandbox-user",
                "customer_id": body.customer_id or "sandbox-user",
                "channel": body.channel or "facebook",
                "source_channel": body.channel or "facebook",
                "memory_context": memory_context,
                "attachments": [item.model_dump(exclude_none=True) for item in body.attachments],
                "_db_session": session,
                "force_pipeline": True,
            }
        )
    except Exception as e:
        logger.error("Agent process_task failed", error=str(e))
        raise HTTPException(status_code=502, detail=f"Agent processing failed: {e}")

    result_data = result if isinstance(result, dict) else {}
    payload = result_data.get("result", {}) if isinstance(result_data, dict) else {}
    tools = payload.get("tools") or []
    awaiting = next(
        (
            tool
            for tool in tools
            if isinstance(tool, dict)
            and tool.get("status") in {"awaiting_approval", "AWAITING_APPROVAL"}
        ),
        None,
    )
    if awaiting and not awaiting.get("draft_id") and awaiting.get("action_type"):
        approval_thread_id = await _ensure_approval_thread_id(
            session=session,
            company_id=body.company_id,
            customer_id=body.customer_id or "sandbox-user",
            channel=body.channel or "facebook",
            requested_thread_id=thread_id,
        )
        draft_info = await create_approval_draft(
            action_type=str(awaiting.get("action_type")),
            action_args=dict(awaiting.get("action_args") or {}),
            company_id=str(awaiting.get("company_id") or body.company_id),
            customer_id=body.customer_id or "sandbox-user",
            thread_id=approval_thread_id,
            session=session,
            sdk_approval_id=awaiting.get("sdk_approval_id"),
            channel=body.channel or "facebook",
        )
        awaiting["draft_id"] = draft_info["draft_id"]
    status = "awaiting_approval" if awaiting else "ok"
    if result_data.get("status") == "ERROR":
        status = "error"
    error_code = payload.get("errorCode") or payload.get("error_code") or result_data.get("errorCode")
    error_message = payload.get("error") or result_data.get("error")
    response_attachments = payload.get("response_attachments")

    return AgentChatResponse(
        status=status,
        thread_id=thread_id,
        reply=payload.get("reply") or payload.get("summary") or "",
        response_attachments=response_attachments if isinstance(response_attachments, list) else [],
        error=error_message if status == "error" else None,
        error_code=error_code if status == "error" else None,
        draft_id=(awaiting or {}).get("draft_id") or payload.get("draft_id"),
        agent_id=agent.id,
        agent_role=agent.role,
        runtime=str(payload.get("runtime") or "agent"),
        tool_calls=list(tools) if isinstance(tools, list) else [],
        pipeline_trace=payload.get("pipeline_trace") if isinstance(payload.get("pipeline_trace"), dict) else None,
        compiled_system_prompt=payload.get("compiled_system_prompt") or None,
    )


def _clamp_score(value: Any, fallback: int) -> int:
    try:
        numeric = int(round(float(value)))
    except (TypeError, ValueError):
        return fallback
    return max(0, min(100, numeric))


def _extract_json_object(text: str) -> dict[str, Any] | None:
    if not text:
        return None
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None


@router.post("/sandbox/evaluate-response", response_model=SandboxEvaluateResponse)
async def evaluate_sandbox_response(body: SandboxEvaluateRequest) -> SandboxEvaluateResponse:
    """Evaluate a sandbox answer through Python ai-service, keeping AI work out of Node."""
    criteria = body.criteria or ["accuracy", "helpfulness", "relevance", "completeness", "safety"]
    prompt = (
        "Evaluate this AI agent sandbox response. Return only JSON with keys "
        "scores, overall, and comment. Scores must be integers from 0 to 100.\n\n"
        f"User message:\n{body.message}\n\n"
        f"Agent response:\n{body.response}\n\n"
        f"Tool calls:\n{json.dumps(body.tool_calls[:20], ensure_ascii=False, default=str)}\n\n"
        f"Criteria:\n{json.dumps(criteria, ensure_ascii=False)}\n\n"
        "Expected JSON shape: "
        "{\"scores\":{\"accuracy\":85,\"helpfulness\":90,\"relevance\":88,"
        "\"completeness\":75,\"safety\":100},\"overall\":88,\"comment\":\"...\"}"
    )

    try:
        client = await build_provider_client_async(
            body.provider or "GOOGLE",
            model=body.model or "gemini-2.5-flash",
            company_id=body.company_id,
        )
        response = await client.get_response(
            [{"role": "user", "content": prompt}],
            {"temperature": 0.1, "max_tokens": 1024, "tools_enabled": False},
        )
        parsed = _extract_json_object(str(getattr(response, "text", "") or ""))
    except Exception as exc:
        logger.warning("sandbox_evaluation_unavailable", error=str(exc))
        parsed = None

    if not parsed or not isinstance(parsed.get("scores"), dict):
        return SandboxEvaluateResponse(
            scores=dict(EVALUATION_FALLBACK_SCORES),
            overall=EVALUATION_FALLBACK_SCORES["overall"],
            comment="EVALUATION_UNAVAILABLE",
        )

    raw_scores = parsed["scores"]
    scores = {
        "accuracy": _clamp_score(raw_scores.get("accuracy"), EVALUATION_FALLBACK_SCORES["accuracy"]),
        "helpfulness": _clamp_score(raw_scores.get("helpfulness"), EVALUATION_FALLBACK_SCORES["helpfulness"]),
        "relevance": _clamp_score(raw_scores.get("relevance"), EVALUATION_FALLBACK_SCORES["relevance"]),
        "completeness": _clamp_score(raw_scores.get("completeness"), EVALUATION_FALLBACK_SCORES["completeness"]),
        "safety": _clamp_score(raw_scores.get("safety"), EVALUATION_FALLBACK_SCORES["safety"]),
    }
    overall = _clamp_score(parsed.get("overall", raw_scores.get("overall")), round(sum(scores.values()) / len(scores)))
    scores["overall"] = overall

    return SandboxEvaluateResponse(
        scores=scores,
        overall=overall,
        comment=str(parsed.get("comment") or "Evaluation complete")[:1000],
    )


async def _ensure_agent_in_db(agent_id: str, session: AsyncSession) -> AgentModel | None:
    """Retrieve agent from ai.agents table.

    2026: The migration bridge from public.company_agents has been removed.
    All agents should exist in ai.agent_templates or ai.agents.
    """
    result = await session.execute(
        select(AgentModel)
        .options(selectinload(AgentModel.department))
        .where(AgentModel.id == agent_id)
    )
    return result.scalar_one_or_none()


@router.get("/manager/context", response_model=ManagerContextResponse)
async def get_manager_context(
    session: SessionDep,
    company_id: str = Query(..., min_length=1),
) -> ManagerContextResponse:
    """Full manager context: agents, tools, profiles, skills, inbox counts."""
    agents_map: dict[str, AgentSummary] = {}

    agents_stmt = (
        select(AgentModel)
        .where(AgentModel.company_id == company_id, AgentModel.status != "ARCHIVED")
        .order_by(AgentModel.created_at)
    )
    for a in (await session.execute(agents_stmt)).scalars().all():
        agents_map[a.id] = AgentSummary(
            id=a.id, name=a.name, role=a.role, status=a.status,
            model=a.model, template_slug=a.template_slug, version=a.version,
            allowed_tools=list(a.allowed_tools or []),
            allowed_skills=list(a.allowed_skills or []),
            allowed_channels=_safe_list(a.channels),
        )
    ca_stmt = (
        select(AgentModel)
        .options(selectinload(AgentModel.department))
        .where(AgentModel.company_id == company_id, AgentModel.status != 'ARCHIVED')
        .order_by(AgentModel.created_at)
    )
    for ca in (await session.execute(ca_stmt)).scalars().all():
        if ca.id not in agents_map:
            agents_map[ca.id] = AgentSummary(
                id=ca.id, name=ca.name, role=ca.role, status=ca.status,
                model=ca.model, template_slug=ca.template_slug,
                allowed_tools=list(ca.allowed_tools or []),
                allowed_skills=list(ca.allowed_skills or []),
                allowed_channels=_safe_list(ca.channels),
            )
    agents = list(agents_map.values())
    manager = next((a for a in agents if a.role == "CEO"), agents[0] if agents else None)

    all_tools_data = get_all_tools()
    tools: list[ToolSummary] = []
    for t in all_tools_data:
        side_effects = getattr(t, "side_effects", "read")
        tools.append(ToolSummary(
            name=t.name, description=t.description or "",
            side_effects=side_effects,
            requires_approval=side_effects == "write",
            handler=t.name.split(".")[0] if "." in t.name else "agent",
        ))

    templates = await list_templates(session)
    profiles = [ProfileSummary(
        slug=t.slug, name=t.name, role=t.role, version=t.version,
        allowed_tools=list(t.allowed_tools or []),
        allowed_skills=list(t.allowed_skills or []),
    ) for t in templates]

    # Build full skill metadata from skill.json + SKILL.md files
    from src.skills.integration import _skill_metadata_from_dir, _SKILLS_ROOT

    seen: set[str] = set()
    skills = []
    for t in templates:
        for s in (t.allowed_skills or []):
            if s in seen:
                continue
            seen.add(s)
            skill_dir = _SKILLS_ROOT / s
            meta = _skill_metadata_from_dir(skill_dir)
            if meta:
                skills.append({
                    "id": meta["id"],
                    "displayName": meta["name"],
                    "description": meta.get("description", ""),
                    "allowedTools": meta.get("allowed_tools", []),
                    "requiresHumanApproval": meta.get("requires_human_approval", False),
                    "maxToolCount": meta.get("max_tool_count", 0),
                    "skillMd": meta.get("instructions", ""),
                    "version": "1.0.0",
                })
            else:
                skills.append({"id": s, "displayName": s})


    inbox = InboxSummary()
    try:
        from sqlalchemy import func as sa_func
        from src.db.models.task import AiAgentTask
        c = select(
            sa_func.count().label("total"),
            sa_func.sum(case((AiAgentTask.status.in_(["PENDING","CHECKED_OUT","IN_PROGRESS"]), 1), else_=0)).label("active"),
            sa_func.sum(case((AiAgentTask.status == "PENDING", 1), else_=0)).label("pending"),
            sa_func.sum(case((AiAgentTask.status == "CHECKED_OUT", 1), else_=0)).label("checked_out"),
            sa_func.sum(case((AiAgentTask.status == "COMPLETED", 1), else_=0)).label("completed"),
            sa_func.sum(case((AiAgentTask.status == "FAILED", 1), else_=0)).label("failed"),
        ).where(AiAgentTask.company_id == company_id)
        row = (await session.execute(c)).one()
        inbox = InboxSummary(total=row.total or 0, active=row.active or 0, pending=row.pending or 0,
                            checked_out=row.checked_out or 0, completed=row.completed or 0, failed=row.failed or 0)
    except Exception:
        logger.warning("inbox table not available", company_id=company_id)

    return ManagerContextResponse(manager=manager, agents=agents, profiles=profiles,
                                  tools=tools, skills=skills, inbox=inbox)


@router.get("/tools")
async def list_tools() -> list[dict[str, Any]]:
    """List all available tools from the tool registry."""
    tools = get_all_tools()
    result = []
    for t in tools:
        schema = None
        if t.input_model is not None:
            if hasattr(t.input_model, "model_json_schema"):
                schema = t.input_model.model_json_schema()
            elif isinstance(t.input_model, dict):
                schema = t.input_model
        result.append({
            "name": t.name,
            "description": t.description,
            "input_schema": schema,
        })
    return result


@router.get("/agents/{agent_id}", response_model=AgentRead)
async def get_agent(agent_id: str, session: SessionDep) -> AgentRead:
    """Get a specific agent by ID."""
    agent = await _ensure_agent_in_db(agent_id, session)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
    return _agent_to_read(agent)


@router.put("/agents/{agent_id}", response_model=AgentRead)
async def update_agent(
    agent_id: str, body: AgentUpdate, session: SessionDep
) -> AgentRead:
    """Update an agent's configuration."""
    agent = await _ensure_agent_in_db(agent_id, session)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")

    if body.name is not None:
        agent.name = body.name
    if body.model is not None:
        agent.model = body.model
    if body.allowed_tools is not None:
        agent.allowed_tools = body.allowed_tools
    if body.allowed_skills is not None:
        agent.allowed_skills = body.allowed_skills
    if body.allowed_channels is not None:
        agent.channels = body.allowed_channels
    if body.persona is not None:
        agent.persona = body.persona
    if body.guardrails is not None:
        agent.guardrails = body.guardrails
    if body.budget is not None:
        agent.budget = body.budget
    if body.config is not None:
        agent.config = body.config

    await session.commit()
    await session.refresh(agent)
    logger.info("Agent updated", agent_id=agent_id)
    return _agent_to_read(agent)


@router.patch("/agents/{agent_id}/status", response_model=AgentRead)
async def patch_agent_status(
    agent_id: str, body: AgentStatusUpdate, session: SessionDep
) -> AgentRead:
    """Update an agent's active status (ACTIVE / INACTIVE)."""
    if body.status not in ("ACTIVE", "INACTIVE"):
        raise HTTPException(status_code=422, detail="Status must be ACTIVE or INACTIVE")
    agent = await _ensure_agent_in_db(agent_id, session)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
    if agent.role == "CEO" and body.status == "INACTIVE":
        raise HTTPException(status_code=400, detail="Cannot deactivate the CEO agent")
    agent.status = body.status
    await session.commit()
    await session.refresh(agent)
    logger.info("Agent status updated", agent_id=agent_id, status=body.status)
    return _agent_to_read(agent)


@router.delete("/agents/{agent_id}", response_model=AgentRead)
async def archive_agent(agent_id: str, session: SessionDep) -> AgentRead:
    """Archive (soft-delete) an agent."""
    agent = await _ensure_agent_in_db(agent_id, session)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")

    if agent.role == "CEO":
        raise HTTPException(status_code=400, detail="Cannot archive the CEO agent")

    agent.status = "ARCHIVED"
    await session.commit()
    await session.refresh(agent)
    logger.info("Agent archived", agent_id=agent_id)
    return _agent_to_read(agent)


@router.post("/agents/{agent_id}/reconcile", response_model=AgentRead)
async def reconcile_agent(agent_id: str, session: SessionDep) -> AgentRead:
    """Reconcile agent with its template defaults."""
    agent = await _ensure_agent_in_db(agent_id, session)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")

    if not agent.template_slug:
        raise HTTPException(status_code=400, detail="Agent has no template to reconcile with")

    template = await get_template(agent.template_slug, session)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template not found: {agent.template_slug}")

    agent.allowed_tools = template.allowed_tools
    agent.allowed_skills = template.allowed_skills
    agent.channels = template.channels
    agent.guardrails = template.guardrails
    agent.budget = template.budget
    agent.version = template.version

    await session.commit()
    await session.refresh(agent)
    logger.info("Agent reconciled with template", agent_id=agent_id, template=agent.template_slug)
    return _agent_to_read(agent)


@router.get("/team-map", response_model=TeamMapResponse)
async def get_team_map(
    session: SessionDep,
    company_id: str = Query(..., min_length=1),
) -> TeamMapResponse:
    """Build agent hierarchy tree with department metadata."""
    agents_map: dict[str, dict[str, Any]] = {}

    agents_stmt = (
        select(AgentModel)
        .where(
            AgentModel.company_id == company_id,
            AgentModel.status != "ARCHIVED",
        )
        .order_by(AgentModel.created_at)
    )
    for a in (await session.execute(agents_stmt)).scalars().all():
        agents_map[a.id] = {
            "id": a.id, "name": a.name, "role": a.role,
            "status": a.status, "model": a.model,
            "template_slug": a.template_slug, "parent_id": a.parent_id,
            "department_name": None, "department_icon": None, "manager_type": None,
        }
    ca_stmt = (
        select(AgentModel)
        .options(selectinload(AgentModel.department))
        .where(
            AgentModel.company_id == company_id,
            AgentModel.status != 'ARCHIVED',
        )
        .order_by(AgentModel.created_at)
    )
    for ca in (await session.execute(ca_stmt)).scalars().all():
        dept_name = ca.department.name if ca.department else None
        dept_icon = ca.department.icon if ca.department else None
        if ca.id in agents_map:
            agents_map[ca.id]["department_name"] = dept_name
            agents_map[ca.id]["department_icon"] = dept_icon
            agents_map[ca.id]["manager_type"] = ca.manager_type
        else:
            agents_map[ca.id] = {
                "id": ca.id, "name": ca.name, "role": ca.role,
                "status": ca.status, "model": ca.model,
                "template_slug": ca.template_slug, "parent_id": ca.parent_id,
                "department_name": dept_name, "department_icon": dept_icon,
                "manager_type": ca.manager_type,
            }

    agents_list = list(agents_map.values())
    summary_list = [AgentSummary(
        id=a["id"], name=a["name"], role=a["role"],
        status=a["status"], model=a["model"], template_slug=a["template_slug"],
    ) for a in agents_list]

    node_by_id: dict[str, dict[str, Any]] = {}
    for a in agents_list:
        node_by_id[a["id"]] = {
            "id": a["id"], "name": a["name"], "role": a["role"],
            "status": a["status"], "model": a["model"],
            "template_slug": a["template_slug"],
            "department_name": a["department_name"],
            "department_icon": a["department_icon"],
            "manager_type": a["manager_type"],
            "children": [],
        }

    roots: list[dict[str, Any]] = []
    for a in agents_list:
        node = node_by_id[a["id"]]
        parent = node_by_id.get(a["parent_id"])
        if parent and parent["id"] != node["id"]:
            parent["children"].append(node)
        else:
            roots.append(node)

    roots.sort(key=lambda n: (-1 if n["role"] == "CEO" else 1, n["name"]))

    return TeamMapResponse(
        tree=[TeamMapNode.model_validate(r) for r in roots],
        agents=summary_list,
        count=len(summary_list),
    )


async def _load_agent_for_files(
    agent_id: str,
    company_id: str | None,
    session: AsyncSession,
) -> tuple[AgentModel | None, dict[str, Any] | None]:
    result = await session.execute(
        select(AgentModel).where(
            AgentModel.id == agent_id,
            AgentModel.status != "ARCHIVED",
        )
    )
    agent = result.scalar_one_or_none()
    if agent:
        return agent, _agent_config_from_record(agent)

    import json as _json
    ca_row = await session.execute(
        text("""
            SELECT a.id, a.name, a.role, a.icon, a.description, a.soul,
                   a.rules, a.skills, a.channels, a.model, a.status, a.parent_id,
                   a.template_slug, a.created_by,
                   a.created_at, a.department_id, a.manager_type,
                   ad.key AS department_key, ad.name AS department_name,
                   ad.icon AS department_icon
            FROM ai.agents a
            LEFT JOIN ai.agent_departments ad ON ad.id = a.department_id
            WHERE a.id = :agent_id
              AND (a.company_id = :company_id OR :company_id IS NULL)
        """),
        {"agent_id": agent_id, "company_id": company_id or ""},
    )
    ca = ca_row.mappings().one_or_none()
    if not ca:
        return None, None

    raw = {
        "id": ca["id"], "name": ca["name"], "role": ca["role"],
        "status": ca["status"], "model": ca["model"],
        "template_slug": ca["template_slug"], "parent_id": ca["parent_id"],
        "icon": ca["icon"] or "🤖", "description": ca["description"] or "",
        "soul": ca["soul"] or "", "rules": [],
        "skills": _json.loads(ca["skills"]) if ca["skills"] else [],
        "channels": _json.loads(ca["channels"]) if ca.get("channels") else [],
        "allowed_tools": [], "allowed_skills": [],
        "created_by": ca["created_by"],
        "created_at": str(ca["created_at"]) if ca["created_at"] else "",
        "department_id": ca["department_id"], "department_key": ca["department_key"],
        "department_name": ca["department_name"], "department_icon": ca["department_icon"],
        "manager_type": ca["manager_type"],
        "persona": {"soulInstructions": ca["soul"] or ""} if ca["soul"] else {},
        "policies": {}, "config": {},
    }
    return None, raw


async def _build_agent_files_response(
    agent_id: str,
    company_id: str | None,
    session: AsyncSession,
) -> AgentFilesResponse:
    agent_model, agent_raw = await _load_agent_for_files(agent_id, company_id, session)
    if not agent_raw:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")

    if agent_model:
        agent_raw.update({
            "id": agent_model.id, "name": agent_model.name, "role": agent_model.role,
            "status": agent_model.status, "model": agent_model.model,
            "template_slug": agent_model.template_slug, "parent_id": agent_model.parent_id,
            "persona": agent_model.persona or {},
            "policies": {"guardrails": agent_model.guardrails or {}, "budget": agent_model.budget or {}},
            "config": agent_model.config or {},
            "allowed_tools": list(agent_model.allowed_tools or []),
            "allowed_skills": list(agent_model.allowed_skills or []),
        })

    template_slug = agent_raw.get("template_slug")
    profile = None
    template = None
    if template_slug:
        template = await get_template(template_slug, session)
        if template:
            profile = {
                "slug": template.slug, "name": template.name, "role": template.role,
                "version": template.version, "modelPolicy": template.model_policy or {},
            }

    persona = agent_raw.get("persona") or {}
    soul = persona.get("soulInstructions") or (template.instructions_soul if template else "")
    agents_i = persona.get("agentInstructions") or (template.instructions_agents if template else "")
    tools_i = persona.get("toolsInstructions") or (template.instructions_tools if template else "")
    persona_i = persona.get("personaInstructions") or (template.instructions_persona if template else "")

    allowed_skill_ids = agent_raw.get("allowed_skills") or agent_raw.get("skills") or []
    skill_details: list[dict[str, Any]] = []
    if allowed_skill_ids:
        skill_rows = await session.execute(
            select(SkillModel).where(SkillModel.id.in_(allowed_skill_ids))
        )
        for s in skill_rows.scalars().all():
            skill_details.append({
                "id": s.id, "displayName": s.name,
                "description": s.description or "",
                "allowedTools": s.allowed_tools or [],
            })

    skills_json = json.dumps({
        "allowedSkills": allowed_skill_ids,
        "skills": skill_details,
    }, ensure_ascii=False, default=str)

    all_tools = get_all_tools()
    allowed_tool_names = agent_raw.get("allowed_tools") or []
    tools_list: list[dict[str, Any]] = []
    for t in all_tools:
        if not allowed_tool_names or t.name in allowed_tool_names:
            se = "read"
            if hasattr(t, "side_effects") and t.side_effects:
                se = t.side_effects
            tools_list.append({"name": t.name, "description": t.description or "", "sideEffects": se})

    agent_dict = {
        "id": agent_raw["id"], "name": agent_raw["name"], "role": agent_raw["role"],
        "status": agent_raw["status"], "model": agent_raw.get("model"),
        "templateSlug": agent_raw.get("template_slug"),
        "parentId": agent_raw.get("parent_id"),
        "icon": agent_raw.get("icon") or "🤖",
        "description": agent_raw.get("description") or "",
        "soul": agent_raw.get("soul") or soul,
        "rules": agent_raw.get("rules") or [],
        "skills": agent_raw.get("skills") or [],
        "allowedTools": agent_raw.get("allowed_tools") or [],
        "allowedSkills": agent_raw.get("allowed_skills") or [],
        "createdBy": agent_raw.get("created_by"),
        "createdAt": agent_raw.get("created_at") or "",
        "departmentId": agent_raw.get("department_id"),
        "departmentKey": agent_raw.get("department_key"),
        "departmentName": agent_raw.get("department_name"),
        "departmentIcon": agent_raw.get("department_icon"),
        "managerType": agent_raw.get("manager_type"),
        "persona": persona,
        "policies": agent_raw.get("policies") or {},
        "config": agent_raw.get("config") or {},
    }

    files = {
        "SOUL.md": soul or "",
        "AGENTS.md": agents_i or "",
        "TOOLS.md": tools_i or "",
        "SKILLS.json": skills_json,
        "PERSONA.md": persona_i or "",
    }

    return AgentFilesResponse(
        agent=agent_dict, profile=profile, files=files,
        tools=[AgentFileTool(**t) for t in tools_list],
        skills=[AgentFileSkill(**s) for s in skill_details],
    )


@router.get("/agents/{agent_id}/files", response_model=AgentFilesResponse)
async def get_agent_files(
    agent_id: str,
    session: SessionDep,
    company_id: str | None = Query(default=None),
) -> AgentFilesResponse:
    """Load agent profile files (SOUL.md, SKILLS.json, tools, skills)."""
    return await _build_agent_files_response(agent_id, company_id, session)


@router.put("/agents/{agent_id}/files", response_model=AgentFilesResponse)
async def save_agent_files(
    agent_id: str,
    body: AgentFilesSaveRequest,
    session: SessionDep,
    company_id: str | None = Query(default=None),
) -> AgentFilesResponse:
    """Save agent profile changes and return updated files."""
    agent_model, agent_raw = await _load_agent_for_files(agent_id, company_id, session)
    if not agent_raw:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")

    if agent_model:
        if body.name is not None:
            agent_model.name = body.name
        if body.model is not None:
            agent_model.model = body.model
        if body.allowedTools is not None:
            agent_model.allowed_tools = body.allowedTools
        if body.allowedSkills is not None:
            agent_model.allowed_skills = body.allowedSkills
        if body.allowedChannels is not None:
            agent_model.channels = body.allowedChannels

        persona = dict(agent_model.persona or {})
        if body.soulInstructions is not None:
            persona["soulInstructions"] = body.soulInstructions
        if body.agentInstructions is not None:
            persona["agentInstructions"] = body.agentInstructions
        if body.toolsInstructions is not None:
            persona["toolsInstructions"] = body.toolsInstructions
        if body.personaInstructions is not None:
            persona["personaInstructions"] = body.personaInstructions
        if persona:
            agent_model.persona = persona

        if body.policies is not None:
            agent_model.guardrails = body.policies.get("guardrails", agent_model.guardrails)
            agent_model.budget = body.policies.get("budget", agent_model.budget)

        await session.commit()
        await session.refresh(agent_model)
    else:
        ca_updates: list[str] = []
        if body.soulInstructions is not None:
            ca_updates.append('"soul" = :soul')
        if body.name is not None:
            ca_updates.append('"name" = :name')
        if body.model is not None:
            ca_updates.append('"model" = :model')
        if ca_updates:
            set_clause = ", ".join(ca_updates)
            params = {"agent_id": agent_id}
            if body.soulInstructions is not None:
                params["soul"] = body.soulInstructions
            if body.name is not None:
                params["name"] = body.name
            if body.model is not None:
                params["model"] = body.model
            await session.execute(
                text(f'UPDATE ai.agents SET {set_clause} WHERE id = :agent_id'),
                params,
            )
            await session.commit()

    return await _build_agent_files_response(agent_id, company_id, session)



# ── Agent Template Management (2026 unified approach) ────────────────────


@router.get("/agent-templates")
async def list_agent_templates(
    session: SessionDep,
) -> list[dict[str, Any]]:
    """List all agent templates (source of truth for agent definitions)."""
    from src.agents.loader import list_templates
    templates = await list_templates(session)
    return [
        {
            "slug": t.slug,
            "name": t.name,
            "role": t.role,
            "version": t.version,
            "channels": t.channels,
            "allowedTools": t.allowed_tools,
            "allowedSkills": t.allowed_skills,
            "instructionsSoul": t.instructions_soul or "",
            "instructionsPersona": t.instructions_persona or "",
            "instructionsTools": t.instructions_tools or "",
            "instructionsAgents": t.instructions_agents or "",
            "guardrails": t.guardrails,
            "budget": t.budget,
            "personaMeta": t.persona_meta,
            "humanApproval": t.human_approval,
            "handoffs": t.handoffs,
            "mcpServers": t.mcp_servers,
        }
        for t in templates
    ]


@router.get("/agent-templates/{slug}")
async def get_agent_template(
    slug: str,
    session: SessionDep,
) -> dict[str, Any]:
    """Get a single agent template by slug."""
    from src.agents.loader import get_template
    template = await get_template(slug, session)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template not found: {slug}")
    return {
        "slug": template.slug,
        "name": template.name,
        "role": template.role,
        "version": template.version,
        "channels": template.channels,
        "allowedTools": template.allowed_tools,
        "allowedSkills": template.allowed_skills,
        "instructionsSoul": template.instructions_soul or "",
        "instructionsPersona": template.instructions_persona or "",
        "instructionsTools": template.instructions_tools or "",
        "instructionsAgents": template.instructions_agents or "",
        "guardrails": template.guardrails,
        "budget": template.budget,
        "personaMeta": template.persona_meta,
        "humanApproval": template.human_approval,
        "handoffs": template.handoffs,
        "mcpServers": template.mcp_servers,
    }


@router.post("/agent-templates")
async def create_agent_template(
    body: dict[str, Any],
    session: SessionDep,
) -> dict[str, Any]:
    """Create a new agent template."""
    from src.db.models.agent import AgentTemplate
    slug = body.get("slug", "")
    if not slug:
        raise HTTPException(status_code=400, detail="slug is required")
    existing = await session.execute(
        select(AgentTemplate).where(AgentTemplate.slug == slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Template already exists: {slug}")
    template = AgentTemplate(
        slug=slug,
        role=body.get("role", slug.upper()),
        name=body.get("name", slug),
        version=body.get("version", "1.0.0"),
        model_policy=body.get("modelPolicy", {}),
        allowed_tools=body.get("allowedTools", []),
        allowed_skills=body.get("allowedSkills", []),
        channels=body.get("channels", []),
        guardrails=body.get("guardrails", {}),
        persona_meta=body.get("personaMeta", {}),
        instructions_soul=body.get("soulInstructions") or body.get("instructionsSoul"),
        instructions_persona=body.get("personaInstructions") or body.get("instructionsPersona"),
        instructions_tools=body.get("toolsInstructions") or body.get("instructionsTools"),
        instructions_agents=body.get("agentInstructions") or body.get("instructionsAgents"),
        human_approval=body.get("humanApproval", {}),
        handoffs=body.get("handoffs", []),
        mcp_servers=body.get("mcpServers", []),
        budget=body.get("budget", {}),
        config=body.get("config", {}),
    )
    session.add(template)
    await session.commit()
    await session.refresh(template)
    return {"slug": template.slug, "name": template.name, "role": template.role}


@router.put("/agent-templates/{slug}")
async def update_agent_template(
    slug: str,
    body: dict[str, Any],
    session: SessionDep,
) -> dict[str, Any]:
    """Update an agent template."""
    from src.agents.loader import get_template
    template = await get_template(slug, session)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template not found: {slug}")
    updatable = [
        "name", "role", "version", "model_policy", "allowed_tools", "allowed_skills",
        "channels", "guardrails", "persona_meta", "human_approval", "handoffs",
        "mcp_servers", "budget", "config",
    ]
    for field in updatable:
        if field in body:
            setattr(template, field, body[field])
    # Handle instruction fields (camelCase API → snake_case model)
    instruction_map = {
        "soulInstructions": "instructions_soul",
        "instructionsSoul": "instructions_soul",
        "personaInstructions": "instructions_persona",
        "instructionsPersona": "instructions_persona",
        "toolsInstructions": "instructions_tools",
        "instructionsTools": "instructions_tools",
        "agentInstructions": "instructions_agents",
        "instructionsAgents": "instructions_agents",
    }
    for api_key, model_key in instruction_map.items():
        if api_key in body:
            setattr(template, model_key, body[api_key])
    # Handle allowedSkills list
    if "allowedSkills" in body or "rules" in body:
        if "allowedSkills" in body:
            template.allowed_skills = body["allowedSkills"]
    await session.commit()
    await session.refresh(template)
    return {"slug": template.slug, "name": template.name, "role": template.role}


@router.delete("/agent-templates/{slug}")
async def delete_agent_template(
    slug: str,
    session: SessionDep,
) -> dict[str, Any]:
    """Delete an agent template."""
    from src.agents.loader import get_template
    template = await get_template(slug, session)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template not found: {slug}")
    # Check if any agents reference this template
    agents_using = await session.execute(
        select(AgentModel).where(AgentModel.template_slug == slug)
    )
    if agents_using.scalars().first():
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete template: agents are using it",
        )
    await session.delete(template)
    await session.commit()
    return {"success": True, "deleted": slug}
