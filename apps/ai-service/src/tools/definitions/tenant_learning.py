from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import structlog
from agent_framework import FunctionTool
from pydantic import BaseModel, Field

logger = structlog.get_logger(__name__)


class RecordLearnedRuleInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    rule_category: str = Field(
        default="GENERAL",
        description="Category / Domain of the rule: e.g. 'CUSTOMER_SUPPORT', 'SALES', 'INVENTORY', 'MEDIA_BUYER', 'OPERATIONS', 'CLINIC', 'HOTEL', 'DENTAL_LAB', 'GENERAL'",
    )
    rule_title: str = Field(description="Brief headline/summary of the learned rule (e.g. 'معالجة اعتراض مصاريف الشحن', 'تنبيه نقص مقاسات الأحذية', 'إعادة طلب عاجل للمخزون')")
    rule_instructions: str = Field(description="Actionable operational instruction to remember and apply in future turns or tasks")
    supporting_evidence: dict[str, Any] | None = Field(default=None, description="Optional metrics, customer dialogue snippet, or context that proved this rule works")
    trigger_keywords: str | None = Field(default=None, description="Optional comma-separated keywords that should trigger this rule")


async def record_learned_rule(input_data: RecordLearnedRuleInput) -> dict[str, Any]:
    """Hermes Universal Learning tool for ANY agent role: record an operational rule into the merchant's persistent domain playbook."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required"}

    from src.skills.learner import autonomous_skill_learner
    return await autonomous_skill_learner.record_universal_rule(
        company_id=company_id,
        rule_category=input_data.rule_category,
        rule_title=input_data.rule_title,
        rule_instructions=input_data.rule_instructions,
        supporting_evidence=input_data.supporting_evidence,
        trigger_keywords=input_data.trigger_keywords,
    )


record_learned_rule_tool = FunctionTool(
    name="record_learned_rule",
    description="Record a newly learned operational rule or insight into the merchant's persistent playbook (Hermes self-learning for all agents: Sales, Support, Inventory, Ads, Operations).",
    func=record_learned_rule,
    input_model=RecordLearnedRuleInput,
)


class ManageAgentSkillInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    action: str = Field(
        default="create",
        description="Action: 'create' a new skill, 'update' an existing skill, or 'get' skill details",
    )
    skill_id: str | None = Field(
        default=None,
        description="Unique skill ID slug (e.g. 'bundle_pricing_expert', 'black_friday_campaigns'). Auto-generated if omitted on create.",
    )
    name: str = Field(description="Human-readable display name of the skill (e.g. 'مهارة تسعير الباقات والعروض')")
    description: str = Field(
        default="",
        description="Concise summary of what the skill does (Hermes style: max 60 chars ending with a period)",
    )
    instructions: str = Field(
        description="Detailed operational instructions, step-by-step workflow, and rules for this skill",
    )
    trigger_phrases: str | None = Field(
        default=None,
        description="Comma-separated trigger keywords or phrases that activate this skill",
    )
    allowed_tools: list[str] | None = Field(
        default=None,
        description="List of tool names permitted for this skill",
    )


async def manage_agent_skill(input_data: ManageAgentSkillInput) -> dict[str, Any]:
    """Hermes Dynamic Skill Management: create or update a custom, persistent skill for the merchant."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required"}

    from src.db.session import async_session
    from src.db.models.skill import Skill
    from src.skills.integration import register_tenant_skill_in_cache
    from sqlalchemy import select
    import re

    action = (input_data.action or "create").strip().lower()

    async with async_session() as session:
        target_id = input_data.skill_id
        if not target_id:
            slug = re.sub(r'[^a-zA-Z0-9_]+', '_', input_data.name.lower()).strip('_')
            target_id = f"custom_{slug}_{company_id[:8]}" if slug else f"custom_skill_{int(datetime.now().timestamp())}_{company_id[:8]}"

        stmt = select(Skill).where(Skill.id == target_id, Skill.company_id == company_id)
        res = await session.execute(stmt)
        skill = res.scalar_one_or_none()

        if action == "get":
            if not skill:
                return {"success": False, "error": f"Skill '{target_id}' not found for this company"}
            return {
                "success": True,
                "skill": {
                    "id": skill.id,
                    "name": skill.name,
                    "description": skill.description,
                    "instructions": skill.instructions,
                    "trigger_phrases": skill.trigger_phrases,
                    "allowed_tools": skill.allowed_tools,
                    "enabled": skill.enabled,
                }
            }

        desc = input_data.description.strip() or input_data.name
        if len(desc) > 59:
            desc = desc[:58]
        if not desc.endswith("."):
            desc = f"{desc}."

        triggers = input_data.trigger_phrases or "مهارة,خطة,استراتيجية,عرض"
        tools = input_data.allowed_tools or []

        if not skill:
            skill = Skill(
                id=target_id,
                company_id=company_id,
                name=input_data.name.strip(),
                version="1.0.0",
                description=desc,
                trigger_phrases=triggers,
                instructions=input_data.instructions.strip(),
                content=input_data.instructions.strip(),
                allowed_tools=tools,
                channels=["facebook", "whatsapp", "dashboard"],
                priority=10,
                enabled=True,
                requires_human_approval=False,
                skill_metadata={
                    "source": "AGENT_CREATED_SKILL",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
            )
            session.add(skill)
        else:
            skill.name = input_data.name.strip()
            skill.description = desc
            skill.trigger_phrases = triggers
            skill.instructions = input_data.instructions.strip()
            skill.content = input_data.instructions.strip()
            if tools:
                skill.allowed_tools = tools
            meta = dict(skill.skill_metadata or {})
            meta["last_updated_at"] = datetime.now(timezone.utc).isoformat()
            skill.skill_metadata = meta

        await session.commit()

        # Update Hermes in-memory cache
        register_tenant_skill_in_cache(company_id, {
            "id": skill.id,
            "name": skill.name,
            "description": skill.description,
            "instructions": skill.instructions,
            "content": skill.content,
            "enabled": skill.enabled,
            "priority": skill.priority,
            "skill_metadata": skill.skill_metadata,
            "trigger_phrases": skill.trigger_phrases,
            "allowed_tools": skill.allowed_tools,
        })

        return {
            "success": True,
            "action": action,
            "skill": {
                "id": skill.id,
                "name": skill.name,
                "description": skill.description,
                "triggers": skill.trigger_phrases,
                "message": f"تم حفظ وتفعيل المهارة '{skill.name}' بنجاح في نظام المتجر الدائم.",
            }
        }


manage_agent_skill_tool = FunctionTool(
    name="manage_agent_skill",
    description="Create, update, or retrieve a custom operational skill for the merchant (Hermes Dynamic Skill Creation).",
    func=manage_agent_skill,
    input_model=ManageAgentSkillInput,
)


__all_tools__ = [
    record_learned_rule_tool,
    manage_agent_skill_tool,
]

