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
    approved: bool = Field(default=False, description="Whether merchant approval was granted")


async def record_learned_rule(input_data: RecordLearnedRuleInput) -> dict[str, Any]:
    """Hermes Universal Learning tool for ANY agent role: record an operational rule into the merchant's persistent domain playbook."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required"}

    from src.tools.repositories.audit_repository import log_agent_audit_event

    if not input_data.approved:
        if company_id:
            await log_agent_audit_event(
                company_id=company_id,
                action="LEARNED_RULE_REQUESTED",
                description=f"طلب تسجيل وتثبيت قاعدة تشغيلية في الذاكرة ينتظر موافقة التاجر: '{input_data.rule_title}' (فئة: {input_data.rule_category})",
                category="AI_AGENT",
                severity="LOW",
                metadata={
                    "rule_title": input_data.rule_title,
                    "category": input_data.rule_category,
                    "instructions": input_data.rule_instructions,
                },
            )
        return {
            "status": "awaiting_approval",
            "action_type": "record_learned_rule",
            "action_args": {
                "company_id": company_id,
                "rule_category": input_data.rule_category,
                "rule_title": input_data.rule_title,
                "rule_instructions": input_data.rule_instructions,
                "supporting_evidence": input_data.supporting_evidence,
                "trigger_keywords": input_data.trigger_keywords,
                "approved": True,
            },
            "company_id": company_id,
            "message": f"طلب حفظ وتثبيت القاعدة «{input_data.rule_title}» في كتيب استراتيجيات المتجر مستني اعتمادك. اضغط اعتماد لتطبيقها.",
        }

    from src.skills.learner import autonomous_skill_learner

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
    if result.get("status") == "awaiting_approval":
        return result.get("message", "طلب حفظ القاعدة بانتظار الاعتماد.")
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
        description="Action: 'create' a new skill, 'update' an existing skill, 'delete' or 'revert' a skill, or 'get' skill details",
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
    approved: bool = Field(default=False, description="Whether merchant approval was granted")


async def manage_agent_skill(input_data: ManageAgentSkillInput) -> dict[str, Any]:
    """Hermes Dynamic Skill Management: create, update, delete, or revert a custom, persistent skill for the merchant."""
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

        previous_state = None
        if skill:
            previous_state = {
                "name": skill.name,
                "description": skill.description,
                "instructions": skill.instructions,
                "allowed_tools": skill.allowed_tools,
                "enabled": skill.enabled,
            }

        # Approval gate for state mutations (create, update, delete, revert)
        if not input_data.approved:
            action_labels = {
                "create": "إنشاء",
                "update": "تعديل",
                "delete": "حذف",
                "revert": "استرجاع",
            }
            action_label = action_labels.get(action, "إدارة")
            display_title = skill_name or (skill.name if skill else target_id)
            if company_id:
                await log_agent_audit_event(
                    company_id=company_id,
                    action=f"AGENT_SKILL_{action.upper()}_REQUESTED",
                    description=f"طلب {action_label} لمهارة '{display_title}' ينتظر موافقة التاجر (ID: {target_id})",
                    category="AI_AGENT",
                    severity="MEDIUM",
                    metadata={
                        "skill_id": target_id,
                        "name": display_title,
                        "action": action,
                        "previous_state": previous_state,
                    },
                )

            return {
                "status": "awaiting_approval",
                "action_type": "manage_agent_skill",
                "action_args": {
                    "company_id": company_id,
                    "action": action,
                    "skill_id": target_id,
                    "name": skill_name or (skill.name if skill else ""),
                    "description": input_data.description,
                    "instructions": input_data.instructions,
                    "trigger_phrases": input_data.trigger_phrases,
                    "allowed_tools": input_data.allowed_tools,
                    "agent_id": input_data.agent_id,
                    "role": input_data.role,
                    "previous_state": previous_state,
                    "approved": True,
                },
                "company_id": company_id,
                "message": (
                    f"طلب {action_label} لمهارة «{display_title}» مستني اعتمادك. اضغط اعتماد لتطبيق التغيير."
                ),
            }

        # Execution when approved
        if action == "delete":
            if not skill:
                return {"success": False, "error": f"Skill '{target_id}' not found to delete"}
            skill.enabled = False
            meta = dict(skill.skill_metadata or {})
            meta["deleted_at"] = datetime.now(timezone.utc).isoformat()
            skill.skill_metadata = meta
            await session.commit()
            await log_agent_audit_event(
                company_id=company_id,
                action="AGENT_SKILL_DELETED",
                description=f"تم تعطيل وحذف مهارة المتجر: '{skill.name}' (ID: {target_id})",
                category="AI_AGENT",
                severity="MEDIUM",
                metadata={"skill_id": target_id, "previous_state": previous_state},
            )
            return {"success": True, "action": "delete", "message": f"تم تعطيل وحذف مهارة '{skill.name}' بنجاح."}

        if action == "revert":
            if not skill:
                return {"success": False, "error": f"Skill '{target_id}' not found to revert"}
            meta = dict(skill.skill_metadata or {})
            revisions = list(meta.get("revisions") or [])
            if not revisions:
                return {"success": False, "error": f"No previous revisions found for skill '{target_id}' to revert"}
            last_rev = revisions.pop()
            skill.name = last_rev.get("name", skill.name)
            skill.description = last_rev.get("description", skill.description)
            skill.instructions = last_rev.get("instructions", skill.instructions)
            skill.content = last_rev.get("instructions", skill.content)
            if "allowed_tools" in last_rev:
                skill.allowed_tools = last_rev["allowed_tools"]
            meta["revisions"] = revisions
            meta["last_reverted_at"] = datetime.now(timezone.utc).isoformat()
            skill.skill_metadata = meta
            await session.commit()
            await log_agent_audit_event(
                company_id=company_id,
                action="AGENT_SKILL_REVERTED",
                description=f"تم استرجاع الإصدار السابق لمهارة المتجر: '{skill.name}' (ID: {target_id})",
                category="AI_AGENT",
                severity="MEDIUM",
                metadata={"skill_id": target_id, "restored_revision": last_rev},
            )
            return {
                "success": True,
                "action": "revert",
                "skill": {
                    "id": skill.id,
                    "name": skill.name,
                    "message": f"تم استرجاع الإصدار السابق لمهارة '{skill.name}' بنجاح.",
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
                    "revisions": [],
                },
            )
            session.add(skill)
        else:
            meta = dict(skill.skill_metadata or {})
            revisions = list(meta.get("revisions") or [])
            revisions.append({
                "name": skill.name,
                "description": skill.description,
                "instructions": skill.instructions,
                "allowed_tools": skill.allowed_tools,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            meta["revisions"] = revisions[-10:]
            meta["last_updated_at"] = datetime.now(timezone.utc).isoformat()
            skill.skill_metadata = meta
            skill.name = skill_name
            skill.description = desc
            skill.trigger_phrases = triggers
            skill.instructions = instructions_clean
            skill.content = instructions_clean
            if tools:
                skill.allowed_tools = tools

        await session.commit()

        await log_agent_audit_event(
            company_id=company_id,
            action=f"AGENT_SKILL_{action.upper()}_COMPLETED",
            description=f"تم حفظ وتفعيل مهارة مخصصة للمتجر: '{skill_name}' (ID: {target_id})",
            category="AI_AGENT",
            severity="MEDIUM",
            metadata={"skill_id": target_id, "name": skill_name, "action": action, "previous_state": previous_state},
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
    if result.get("status") == "awaiting_approval":
        return result.get("message", "طلب إدارة المهارة بانتظار الاعتماد.")
    if not result.get("success"):
        return f"تعذر حفظ المهارة: {result.get('error', 'خطأ غير معروف')}"
    skill = result.get("skill") or {}
    s_name = skill.get("name") or result.get("name") or "المهارة"
    act = result.get("action", "إنشاء وتفعيل")
    return f"تم {act} مهارة '{s_name}' بنجاح في نظام المتجر الدائم."


manage_agent_skill_tool = FunctionTool(
    name="manage_agent_skill",
    description="Create, update, delete, or retrieve a custom operational skill for the merchant (Hermes Dynamic Skill Creation).",
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
    action: str = Field(default="update", description="Action: 'update' to apply new identity, 'revert' to restore previous identity")
    approved: bool = Field(default=False, description="Whether merchant approval was granted")


async def update_agent_identity(input_data: UpdateAgentIdentityInput) -> dict[str, Any]:
    """Update an agent's official name, title, or identity in PostgreSQL (ai.agents) across all platform stores."""
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required"}

    from src.db.session import async_session
    from src.db.models.agent import Agent as AgentModel
    from src.tools.repositories.audit_repository import log_agent_audit_event
    from sqlalchemy import select

    new_name = input_data.name.strip()
    if not new_name:
        return {"success": False, "error": "name cannot be empty"}

    full_display_name = new_name
    if input_data.title and input_data.title.strip() and "—" not in new_name and "-" not in new_name:
        full_display_name = f"{new_name} — {input_data.title.strip()}"

    action = (input_data.action or "update").strip().lower()

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
        old_desc = target_agent.description
        previous_state = {"name": old_name, "description": old_desc}

        # Approval gate for identity update/revert
        if not input_data.approved:
            if company_id:
                action_text = "استرجاع الهوية السابقة" if action == "revert" else f"تغيير اسم وهوية الوكيل من '{old_name}' إلى '{full_display_name}'"
                await log_agent_audit_event(
                    company_id=company_id,
                    action="AGENT_IDENTITY_UPDATE_REQUESTED",
                    description=f"طلب {action_text} ينتظر موافقة التاجر (الدور: {target_agent.role})",
                    category="AI_AGENT",
                    severity="MEDIUM",
                    metadata={
                        "agent_id": target_agent.id,
                        "old_name": old_name,
                        "new_name": full_display_name,
                        "role": target_agent.role,
                        "action": action,
                        "previous_state": previous_state,
                    },
                )

            return {
                "status": "awaiting_approval",
                "action_type": "update_agent_identity",
                "action_args": {
                    "company_id": company_id,
                    "agent_id": target_agent.id,
                    "name": new_name,
                    "title": input_data.title,
                    "description": input_data.description,
                    "role": target_agent.role,
                    "action": action,
                    "previous_name": old_name,
                    "previous_state": previous_state,
                    "approved": True,
                },
                "company_id": company_id,
                "message": (
                    f"طلب تغيير اسم وهوية المساعد إلى «{full_display_name}» مستني اعتمادك. اضغط اعتماد لتثبيت الهوية."
                ),
            }

        # Execution when approved
        persona_meta = dict(target_agent.persona_meta or {})
        history = list(persona_meta.get("identity_history") or [])

        if action == "revert":
            if not history:
                return {"success": False, "error": f"No previous identity history found for agent '{target_agent.id}' to revert"}
            last_id = history.pop()
            restored_name = last_id.get("name", target_agent.name)
            target_agent.name = restored_name
            if "description" in last_id:
                target_agent.description = last_id["description"]
            persona_meta["identity_history"] = history
            persona_meta["agent_name"] = restored_name.split(" — ")[0]
            persona_meta["display_name"] = restored_name
            target_agent.persona_meta = persona_meta
            session.add(target_agent)
            await session.commit()

            await log_agent_audit_event(
                company_id=company_id,
                action="AGENT_IDENTITY_REVERTED",
                description=f"تم التراجع واسترجاع اسم وهوية الوكيل السابقة: '{restored_name}' (الدور: {target_agent.role})",
                category="AI_AGENT",
                severity="MEDIUM",
                metadata={"agent_id": target_agent.id, "restored_identity": last_id},
            )

            return {
                "success": True,
                "agent_id": target_agent.id,
                "name": restored_name,
                "role": target_agent.role,
                "message": f"تم التراجع واسترجاع اسم الوكيل إلى '{restored_name}' بنجاح.",
            }

        # Save previous identity in history for future reversibility
        history.append({
            "name": old_name,
            "description": old_desc,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        persona_meta["identity_history"] = history[-10:]
        persona_meta["agent_name"] = new_name
        persona_meta["display_name"] = full_display_name
        target_agent.name = full_display_name
        if input_data.description:
            target_agent.description = input_data.description.strip()
        target_agent.persona_meta = persona_meta

        session.add(target_agent)
        await session.commit()

        await log_agent_audit_event(
            company_id=company_id,
            action="AGENT_IDENTITY_UPDATED",
            description=f"تم تحديث هوية واسم الوكيل إلى: '{full_display_name}' (الدور: {target_agent.role})",
            category="AI_AGENT",
            severity="MEDIUM",
            metadata={
                "agent_id": target_agent.id,
                "old_name": old_name,
                "new_name": full_display_name,
                "role": target_agent.role,
                "previous_state": previous_state,
            },
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
    if result.get("status") == "awaiting_approval":
        return result.get("message", "طلب تحديث هوية الوكيل بانتظار الاعتماد.")
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

