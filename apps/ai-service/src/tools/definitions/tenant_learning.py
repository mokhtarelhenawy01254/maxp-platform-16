from __future__ import annotations

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

__all_tools__ = [
    record_learned_rule_tool,
]
