from __future__ import annotations

import secrets
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents.loader import get_template, list_templates, seed_templates
from src.api.admin.agents_schemas import (
    AgentCreate,
    AgentRead,
    AgentTemplateList,
    AgentTemplateRead,
    AgentUpdate,
)
from src.db.models.agent import Agent, AgentTemplate
from src.db.session import get_session

logger = structlog.get_logger(__name__)
router = APIRouter()

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _generate_agent_id() -> str:
    return f"agent_{secrets.token_urlsafe(16)}"


def _agent_to_read(agent: Agent) -> AgentRead:
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
        created_at=agent.created_at,
        updated_at=agent.updated_at,
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
        select(Agent).where(
            Agent.company_id == body.company_id,
            Agent.name == name,
            Agent.status != "ARCHIVED",
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"Active agent with name '{name}' already exists for this company",
        )

    agent_id = _generate_agent_id()
    model = body.model or (template.model_policy.get("default") if template else None)
    agent = Agent(
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
    stmt = select(Agent).order_by(Agent.created_at.desc())
    if company_id:
        stmt = stmt.where(Agent.company_id == company_id)
    if status:
        stmt = stmt.where(Agent.status == status.upper())
    if role:
        stmt = stmt.where(Agent.role == role.upper())
    stmt = stmt.limit(limit)
    result = await session.execute(stmt)
    return [_agent_to_read(a) for a in result.scalars().all()]


@router.get("/agents/{agent_id}", response_model=AgentRead)
async def get_agent(agent_id: str, session: SessionDep) -> AgentRead:
    """Get a specific agent by ID."""
    result = await session.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
    return _agent_to_read(agent)


@router.put("/agents/{agent_id}", response_model=AgentRead)
async def update_agent(
    agent_id: str, body: AgentUpdate, session: SessionDep
) -> AgentRead:
    """Update an agent's configuration."""
    result = await session.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
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
    result = await session.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
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
    result = await session.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
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
