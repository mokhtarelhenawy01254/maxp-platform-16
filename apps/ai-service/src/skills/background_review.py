from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from src.skills.learner import autonomous_skill_learner

logger = structlog.get_logger(__name__)


# Prompt Injection & Poisoning Detection Patterns
INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.IGNORECASE),
    re.compile(r"system\s+prompt", re.IGNORECASE),
    re.compile(r"admin\s+override", re.IGNORECASE),
    re.compile(r"jailbreak", re.IGNORECASE),
    re.compile(r"free\s+shipping\s+for\s+all", re.IGNORECASE),
    re.compile(r"give\s+me\s+90%", re.IGNORECASE),
    re.compile(r"خصم\s+90%", re.IGNORECASE),
    re.compile(r"شحن\s+مجاني\s+لكل\s+العملاء", re.IGNORECASE),
    re.compile(r"تجاهل\s+التعليمات", re.IGNORECASE),
    re.compile(r"أنا\s+(المدير|المالك|الإدارة)\s+التنفيذي", re.IGNORECASE),
]

from src.agents.role_registry import get_role, all_roles

# Canonical role-domain mapping derived from Role Registry
ROLE_DOMAIN_MAP = {k: spec.domain for k, spec in all_roles().items()}
ROLE_DOMAIN_MAP.update({
    "CUSTOMER_SUPPORT": "SUPPORT",
    "GENERAL": "GENERAL",
})



class HermesBackgroundReviewWorker:
    """Hermes-Grade Decoupled Background Review Worker.
    
    Equivalent to `agent/background_review.py` in NousResearch/hermes-agent.
    Runs asynchronously after conversation turns or task completion.
    Safeguards against prompt injection and distills verified playbooks.
    """

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    def scan_for_injection(self, text: str) -> bool:
        """Returns True if forbidden prompt injection patterns are detected."""
        for pattern in INJECTION_PATTERNS:
            if pattern.search(text):
                return True
        return False

    async def review_post_turn(
        self,
        company_id: str,
        agent_role: str,
        trajectory: list[dict[str, Any]] | str,
        ground_truth_outcome: str = "SUCCESS",
        metadata: dict[str, Any] | None = None,
        require_approval: bool = True,
        session: AsyncSession | None = None,
    ) -> dict[str, Any]:
        """Perform post-turn reflective review on completed interaction trajectory."""
        if not company_id:
            return {"success": False, "error": "company_id is required"}

        meta = dict(metadata or {})

        # 1. Flatten and scan trajectory for prompt injection
        if isinstance(trajectory, list):
            flattened_text = " ".join([
                str(t.get("content") or t.get("text") or t)
                for t in trajectory
            ])
        else:
            flattened_text = str(trajectory or "")

        if self.scan_for_injection(flattened_text):
            logger.warning(
                "background_review_injection_blocked",
                company_id=company_id,
                agent_role=agent_role,
            )
            return {
                "success": False,
                "blocked": True,
                "error": "POTENTIAL_INJECTION_DETECTED",
                "reason": "Trajectory contained forbidden instruction override attempt",
            }

        # 2. Outcome validation (Ground-Truth verification)
        is_success = ground_truth_outcome.upper() in (
            "SUCCESS", "CONFIRMED", "ORDER_CREATED", "ROAS_HIT", "OBJECTION_RESOLVED"
        )

        category = get_role(agent_role).domain

        # 3. Hermes Authoring Standard (Description <= 60 chars ending with a period)
        rule_title = meta.get("rule_title") or (
            f"تكتيك ناجح: {category}" if is_success else f"إجراء تصحيحي: {category}"
        )
        rule_desc = rule_title[:59].strip()
        if not rule_desc.endswith("."):
            rule_desc = f"{rule_desc}."

        rule_instruction = meta.get("rule_instructions") or (
            "أثبت التفاعل نجاح مسار الإجراء في تأكيد الطلب؛ اعتمد هذا الأسلوب عند تكرار نفس المعطيات."
            if is_success else
            "تجنب التكرار المباشر عند فشل المعالجة؛ وجه العميل لخيار بديل أو تصعيد مباشر."
        )

        # 4. Status determination: PENDING_APPROVAL by default
        status = "ACTIVE" if not require_approval else "PENDING_APPROVAL"

        # 5. Persist into tenant skill record
        result = await autonomous_skill_learner.record_universal_rule(
            company_id=company_id,
            rule_category=category,
            rule_title=rule_title,
            rule_instructions=rule_instruction,
            supporting_evidence={
                "source": "HERMES_BACKGROUND_REVIEW",
                "ground_truth_outcome": ground_truth_outcome,
                "status": status,
                "confidence_score": 0.88 if is_success else 0.40,
                "reviewed_at": self._now_iso(),
                **meta,
            },
            trigger_keywords=meta.get("trigger_keywords") or "",
            session=session,
        )

        logger.info(
            "background_review_completed",
            company_id=company_id,
            status=status,
            rule_title=rule_title,
        )
        return {
            "success": True,
            "status": status,
            "skill_id": result.get("skill_id"),
            "rule_added": result.get("rule_added"),
            "description": rule_desc,
        }


hermes_background_review_worker = HermesBackgroundReviewWorker()
