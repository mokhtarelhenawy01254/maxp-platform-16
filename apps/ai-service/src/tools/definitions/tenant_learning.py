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
    from src.tools.repositories.audit_repository import log_agent_audit_event

    res = await autonomous_skill_learner.record_universal_rule(
        company_id=company_id,
        rule_category=input_data.rule_category,
        rule_title=input_data.rule_title,
        rule_instructions=input_data.rule_instructions,
        supporting_evidence=input_data.supporting_evidence,
        trigger_keywords=input_data.trigger_keywords,
    )

    if res.get("success"):
        await log_agent_audit_event(
            company_id=company_id,
            action="LEARNED_RULE_RECORDED",
            description=f"تم تسجيل وتثبيت قاعدة تشغيلية في الذاكرة: '{input_data.rule_title}' (فئة: {input_data.rule_category})",
            category="AI_AGENT",
            severity="INFO",
            metadata={"rule_title": input_data.rule_title, "category": input_data.rule_category},
        )

    return res


def _format_record_learned_rule(result: dict) -> str:
    if not result.get("success"):
        return f"تعذر تسجيل القاعدة: {result.get('error', 'خطأ غير معروف')}"
    return f"تم حفظ وتثبيت القاعدة '{result.get('rule_title', '')}' في كتيب استراتيجيات المتجر بنجاح."


record_learned_rule_tool = FunctionTool(
    name="record_learned_rule",
    description="Record a newly learned operational rule or insight into the merchant's persistent playbook (Hermes self-learning for all agents: Sales, Support, Inventory, Ads, Operations).",
    func=record_learned_rule,
    input_model=RecordLearnedRuleInput,
    format_result=_format_record_learned_rule,
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
    name: str | None = Field(
        default=None,
        description="Human-readable display name of the skill (e.g. 'مهارة تسعير الباقات والعروض')",
    )
    description: str = Field(
        default="",
        description="Concise summary of what the skill does (Hermes style: max 60 chars ending with a period)",
    )
    instructions: str | None = Field(
        default=None,
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
    agent_id: str | None = Field(
        default=None,
        description="Optional agent ID to attach this skill to. If omitted, attaches to the active agent for this role/company.",
    )
    role: str | None = Field(
        default=None,
        description="Optional agent role (e.g. 'MEDIA_BUYER', 'CUSTOMER_SUPPORT') to locate the target agent.",
    )


async def manage_agent_skill(input_data: ManageAgentSkillInput) -> dict[str, Any]:
    """Hermes Dynamic Skill Management: create or update a custom, persistent skill for the merchant."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required"}

    from src.db.session import async_session
    from src.db.models.skill import Skill
    from src.skills.integration import register_tenant_skill_in_cache
    from src.tools.repositories.audit_repository import log_agent_audit_event
    from sqlalchemy import select
    import hashlib
    import re

    action = (input_data.action or "create").strip().lower()

    async with async_session() as session:
        target_id = input_data.skill_id
        skill_name = (input_data.name or "").strip()
        if not target_id:
            slug = re.sub(r'[^\w\-]+', '_', skill_name, flags=re.UNICODE).strip('_').lower()
            if not slug:
                hash_part = hashlib.md5((skill_name or "skill").encode()).hexdigest()[:8]
                slug = f"skill_{hash_part}"
            target_id = f"custom_{slug}_{company_id[:8]}"

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

        instructions_clean = (input_data.instructions or "").strip()
        if not skill_name or not instructions_clean:
            return {"success": False, "error": "Parameter 'name' and 'instructions' are required for create/update"}

        desc = input_data.description.strip() or skill_name
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
                name=skill_name,
                version="1.0.0",
                description=desc,
                trigger_phrases=triggers,
                instructions=instructions_clean,
                content=instructions_clean,
                allowed_tools=tools,
                channels=["facebook", "whatsapp", "dashboard"],
                priority=10,
                enabled=True,
                requires_human_approval=True,
                skill_metadata={
                    "source": "AGENT_CREATED_SKILL",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
            )
            session.add(skill)
        else:
            skill.name = skill_name
            skill.description = desc
            skill.trigger_phrases = triggers
            skill.instructions = instructions_clean
            skill.content = instructions_clean
            if tools:
                skill.allowed_tools = tools
            meta = dict(skill.skill_metadata or {})
            meta["last_updated_at"] = datetime.now(timezone.utc).isoformat()
            skill.skill_metadata = meta

        await session.commit()

        await log_agent_audit_event(
            company_id=company_id,
            action=f"AGENT_SKILL_{action.upper()}",
            description=f"تم حفظ مهارة مخصصة للمتجر: '{skill_name}' (ID: {target_id})",
            category="AI_AGENT",
            severity="MEDIUM",
            metadata={"skill_id": target_id, "name": skill_name, "action": action},
        )

        # Also ensure skill is attached to the active agent in ai.agents if present
        if target_id:
            try:
                from src.db.models.agent import Agent as AgentModel
                stmt_agent = select(AgentModel).where(
                    AgentModel.company_id == company_id,
                    AgentModel.status != "ARCHIVED",
                )
                if input_data.agent_id:
                    stmt_agent = stmt_agent.where(AgentModel.id == input_data.agent_id)
                elif input_data.role:
                    stmt_agent = stmt_agent.where(AgentModel.role == input_data.role.strip().upper())
                else:
                    stmt_agent = stmt_agent.order_by(
                        (AgentModel.role == "MEDIA_BUYER").desc(),
                        AgentModel.created_at.desc()
                    )
                agent_res = await session.execute(stmt_agent)
                target_agent = agent_res.scalars().first()
                if target_agent:
                    current_skills = list(target_agent.allowed_skills or [])
                    if target_id not in current_skills:
                        current_skills.append(target_id)
                        target_agent.allowed_skills = current_skills
                        session.add(target_agent)
                        await session.commit()
            except Exception:
                pass

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


def _format_manage_agent_skill(result: dict) -> str:
    if not result.get("success"):
        return f"تعذر حفظ المهارة: {result.get('error', 'خطأ غير معروف')}"
    skill = result.get("skill") or {}
    s_name = skill.get("name") or result.get("name") or "المهارة"
    return f"تم إنشاء وتفعيل مهارة '{s_name}' بنجاح في نظام المتجر الدائم."


manage_agent_skill_tool = FunctionTool(
    name="manage_agent_skill",
    description="Create, update, or retrieve a custom operational skill for the merchant (Hermes Dynamic Skill Creation).",
    func=manage_agent_skill,
    input_model=ManageAgentSkillInput,
    format_result=_format_manage_agent_skill,
)


class UpdateAgentIdentityInput(BaseModel):
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")
    name: str = Field(description="New official name or display name for the agent (e.g. 'عباس', 'صقر', 'سارة')")
    agent_id: str | None = Field(default=None, description="Optional specific agent ID to update")
    role: str | None = Field(default=None, description="Agent role (e.g. 'MEDIA_BUYER', 'CUSTOMER_SUPPORT'). If agent_id is omitted, updates the active agent for this role.")
    title: str | None = Field(default=None, description="Optional professional title (e.g. 'خبير إعلانات فيسبوك', 'مدير خدمة العملاء')")
    description: str | None = Field(default=None, description="Optional updated description for the agent profile")


async def update_agent_identity(input_data: UpdateAgentIdentityInput) -> dict[str, Any]:
    """Update an agent's official name, title, or identity in PostgreSQL (ai.agents) across all platform stores."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required"}

    from src.db.session import async_session
    from src.db.models.agent import Agent as AgentModel
    from sqlalchemy import select

    new_name = input_data.name.strip()
    if not new_name:
        return {"success": False, "error": "name cannot be empty"}

    full_display_name = new_name
    if input_data.title and input_data.title.strip() and "—" not in new_name and "-" not in new_name:
        full_display_name = f"{new_name} — {input_data.title.strip()}"

    async with async_session() as session:
        target_agent = None
        if input_data.agent_id:
            stmt = select(AgentModel).where(AgentModel.id == input_data.agent_id, AgentModel.company_id == company_id)
            res = await session.execute(stmt)
            target_agent = res.scalar_one_or_none()

        if not target_agent and input_data.role:
            stmt = select(AgentModel).where(
                AgentModel.company_id == company_id,
                AgentModel.role == input_data.role.strip().upper(),
                AgentModel.status != "ARCHIVED"
            ).order_by(AgentModel.created_at.desc())
            res = await session.execute(stmt)
            target_agent = res.scalars().first()

        if not target_agent:
            stmt = select(AgentModel).where(
                AgentModel.company_id == company_id,
                AgentModel.status != "ARCHIVED"
            ).order_by(
                (AgentModel.role == "MEDIA_BUYER").desc(),
                AgentModel.created_at.desc()
            )
            res = await session.execute(stmt)
            target_agent = res.scalars().first()

        if not target_agent:
            return {"success": False, "error": f"No active agent found for company '{company_id}' to update"}

        old_name = target_agent.name
        target_agent.name = full_display_name
        if input_data.description:
            target_agent.description = input_data.description.strip()

        persona_meta = dict(target_agent.persona_meta or {})
        persona_meta["agent_name"] = new_name
        persona_meta["display_name"] = full_display_name
        target_agent.persona_meta = persona_meta

        session.add(target_agent)
        await session.commit()

        from src.tools.repositories.audit_repository import log_agent_audit_event
        await log_agent_audit_event(
            company_id=company_id,
            action="AGENT_IDENTITY_UPDATED",
            description=f"تم تحديث هوية واسم الوكيل إلى: '{full_display_name}' (الدور: {target_agent.role})",
            category="AI_AGENT",
            severity="MEDIUM",
            metadata={"agent_id": target_agent.id, "new_name": full_display_name, "role": target_agent.role},
        )

        logger.info("agent_identity_updated", company_id=company_id, agent_id=target_agent.id, old_name=old_name, new_name=full_display_name)

        return {
            "success": True,
            "agent_id": target_agent.id,
            "old_name": old_name,
            "name": full_display_name,
            "role": target_agent.role,
            "message": f"تم تحديث اسم الوكيل بنجاح إلى '{full_display_name}' في قاعدة البيانات والملف التعريفي.",
        }


def _format_update_agent_identity(result: dict) -> str:
    if not result.get("success"):
        return f"تعذر تحديث اسم الوكيل: {result.get('error', 'خطأ غير معروف')}"
    return f"تم تحديث وتثبيت اسمي الرسمي في النظام وقاعدة البيانات إلى '{result.get('name', '')}' بنجاح."


update_agent_identity_tool = FunctionTool(
    name="update_agent_identity",
    description="Update the agent's official name, title, or identity in the database and company profile when the merchant assigns a new name or renames the agent (e.g. when merchant says 'أنا هسميك عباس' or 'سميتك صقر').",
    func=update_agent_identity,
    input_model=UpdateAgentIdentityInput,
    format_result=_format_update_agent_identity,
)


__all_tools__ = [
    record_learned_rule_tool,
    manage_agent_skill_tool,
    update_agent_identity_tool,
]

