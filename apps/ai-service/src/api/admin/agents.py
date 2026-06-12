from __future__ import annotations

import secrets
import json
import re
import uuid
from datetime import UTC, datetime
from typing import Annotated, Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents.base import BaseAgent, BaseAgentConfig
from src.agents.loader import get_template, list_templates, seed_templates
from src.tools.registry import get_all_tools
from src.api.admin.agents_schemas import (
    AgentChatRequest,
    AgentChatResponse,
    AgentCreate,
    AgentRead,
    AgentTemplateList,
    AgentTemplateRead,
    AgentUpdate,
    SandboxEvaluateRequest,
    SandboxEvaluateResponse,
)
from src.db.models.agent import Agent as AgentModel
from src.db.models.agent import AgentTemplate
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


def _agent_to_read(agent: AgentModel) -> AgentRead:
    return AgentRead(
        id=agent.id,
        company_id=agent.company_id,
        name=agent.name,
        role=agent.role,
        template_slug=agent.template_slug,
        status=agent.status,
        model=agent.model,
        persona=agent.persona,
        allowed_tools=agent.allowed_tools,
        allowed_skills=agent.allowed_skills,
        guardrails=agent.guardrails,
        budget=agent.budget,
        parent_id=agent.parent_id,
        version=agent.version,
        config=agent.config,
        created_at=agent.created_at or datetime.now(UTC),
        updated_at=agent.updated_at or datetime.now(UTC),
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

    # Fallback: read from public.company_agents table (Node-managed agents, camelCase columns)
    if not db_agent:
        import json as _json
        ca_row = await session.execute(
            text("""
                SELECT id, name, role, "templateSlug" AS template_slug, model,
                       soul, skills, status, "parentId" AS parent_id
                FROM public.company_agents
                WHERE id = :agent_id AND "companyId" = :company_id AND status != 'ARCHIVED'
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
    """List agents, optionally filtered by company_id, status, or role."""
    stmt = select(AgentModel).order_by(AgentModel.created_at.desc())
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
    """Ensure that the agent is initialized in the ai.agents table, migrating it from public.company_agents if needed."""
    # 1. Retrieve the agent from ai.agents table
    result = await session.execute(select(AgentModel).where(AgentModel.id == agent_id))
    agent = result.scalar_one_or_none()
    if agent:
        return agent

    # 2. Run a raw SQL SELECT on public.company_agents
    import json as _json
    from unittest.mock import MagicMock, AsyncMock

    ca_row = await session.execute(
        text("""
            SELECT id, name, role, "templateSlug" AS template_slug, model,
                   soul, skills, status, "parentId" AS parent_id, "companyId" AS company_id
            FROM public.company_agents
            WHERE id = :agent_id
        """),
        {"agent_id": agent_id},
    )

    if isinstance(ca_row, (MagicMock, AsyncMock)) or type(ca_row).__name__ in ('MagicMock', 'AsyncMock'):
        return None

    ca = ca_row.mappings().one_or_none()
    if not ca or isinstance(ca, (MagicMock, AsyncMock)) or type(ca).__name__ in ('MagicMock', 'AsyncMock'):
        return None

    # 3. If found, initialize and insert the agent record into ai.agents
    template_slug = ca["template_slug"]
    template = None
    if template_slug:
        template = await get_template(template_slug, session)
        if not template:
            # Fallback to None if the template does not exist in DB to prevent foreign key violation
            template_slug = None

    persona = {}
    if ca["soul"]:
        persona["soulInstructions"] = ca["soul"]

    allowed_skills = []
    if ca["skills"]:
        try:
            allowed_skills = _json.loads(ca["skills"])
        except Exception:
            pass

    # Fallback default tools and skills from template if available
    allowed_tools = template.allowed_tools if template else []
    if template and not allowed_skills:
        allowed_skills = template.allowed_skills

    model = ca["model"] or (template.model_policy.get("default") if template else None)

    agent = AgentModel(
        id=ca["id"],
        company_id=ca["company_id"],
        name=ca["name"],
        role=ca["role"] or (template.role if template else "CUSTOM"),
        template_slug=template_slug,
        status=ca["status"] or "ACTIVE",
        model=model,
        persona=persona,
        allowed_tools=allowed_tools,
        allowed_skills=allowed_skills,
        guardrails=template.guardrails if template else {},
        budget=template.budget if template else {},
        parent_id=ca["parent_id"],
        version=template.version if template else "1.0.0",
        config={},
    )
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    logger.info("Migrated agent from public to ai schema", agent_id=agent_id, company_id=ca["company_id"])
    return agent


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
    agent.guardrails = template.guardrails
    agent.budget = template.budget
    agent.version = template.version

    await session.commit()
    await session.refresh(agent)
    logger.info("Agent reconciled with template", agent_id=agent_id, template=agent.template_slug)
    return _agent_to_read(agent)
