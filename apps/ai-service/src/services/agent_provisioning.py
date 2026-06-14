from __future__ import annotations

import secrets

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.agent import Agent, AgentTemplate

logger = structlog.get_logger(__name__)

GLOBAL_TEMPLATE_SLUGS: list[str] = [
    "sales-agent",
    "support-agent",
    "inventory-pricing-agent",
    "marketing-agent",
    "facebook-sales-support-agent",
    "sas-sales-agent",
]


def _generate_agent_id() -> str:
    return f"agent_{secrets.token_urlsafe(16)}"


async def ensure_global_template_agents(
    company_id: str, session: AsyncSession
) -> list[Agent]:
    """Auto-provision the 6 global template agents for a company if not present."""
    existing_result = await session.execute(
        select(Agent).where(
            Agent.company_id == company_id,
            Agent.status != "ARCHIVED",
        )
    )
    existing_agents = list(existing_result.scalars().all())
    existing_slugs = {a.template_slug for a in existing_agents if a.template_slug}
    existing_roles = {a.role for a in existing_agents}

    templates_result = await session.execute(
        select(AgentTemplate).where(AgentTemplate.slug.in_(GLOBAL_TEMPLATE_SLUGS))
    )
    templates = list(templates_result.scalars().all())
    template_map = {t.slug: t for t in templates}

    created: list[Agent] = []
    for slug in GLOBAL_TEMPLATE_SLUGS:
        template = template_map.get(slug)
        if not template:
            logger.warning("Template not found, skipping", slug=slug)
            continue

        if slug in existing_slugs or template.role in existing_roles:
            logger.debug("Agent already exists for company", company_id=company_id, role=template.role)
            continue

        agent = Agent(
            id=_generate_agent_id(),
            company_id=company_id,
            name=template.name,
            role=template.role,
            template_slug=slug,
            status="ACTIVE",
            model=template.model_policy.get("default") if template.model_policy else None,
            persona={},
            allowed_tools=template.allowed_tools,
            allowed_skills=template.allowed_skills,
            channels=template.channels,
            guardrails=template.guardrails,
            budget=template.budget,
            version=template.version,
        )
        session.add(agent)
        created.append(agent)

    if created:
        await session.commit()
        for a in created:
            await session.refresh(a)
        logger.info(
            "Auto-provisioned global agents",
            company_id=company_id,
            count=len(created),
            roles=[a.role for a in created],
        )
    else:
        logger.debug("No new agents needed for company", company_id=company_id)

    return created
