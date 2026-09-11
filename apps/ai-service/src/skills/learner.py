from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import src.db.session as _db_mod
from src.db.models.skill import Skill

logger = structlog.get_logger(__name__)


class AutonomousSkillLearner:
    """Hermes-inspired Autonomous Skill & Playbook Distillation Engine.
    
    Extracts actionable, operational instructions (playbooks) directly from
    live ad performance metrics and customer sales dialogues, persisting them
    as tenant-scoped skills in the `ai.skills` database table.
    """

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    async def distill_ad_performance(
        self,
        company_id: str,
        ad_metrics: dict[str, Any],
        session: AsyncSession | None = None,
    ) -> dict[str, Any]:
        """Distill actionable media buyer rules from ad campaign metrics.
        
        Evaluates ROAS, CPA, CTR, frequency, and creative angles, then updates
        or creates the tenant-specific Media Buyer Playbook.
        """
        if not company_id:
            return {"success": False, "error": "company_id is required"}

        ad_name = str(ad_metrics.get("ad_name") or ad_metrics.get("name") or "حملة إعلانية")
        angle_name = str(ad_metrics.get("angle") or ad_metrics.get("angle_name") or "عام")
        format_type = str(ad_metrics.get("format") or ad_metrics.get("creative_type") or "Reels/Video")
        product_name = str(ad_metrics.get("product_name") or "منتج المتجر")
        
        spend = float(ad_metrics.get("spend") or ad_metrics.get("total_spend") or 0.0)
        revenue = float(ad_metrics.get("revenue") or ad_metrics.get("total_revenue") or 0.0)
        purchases = int(ad_metrics.get("purchases") or ad_metrics.get("total_purchases") or 0)
        ctr = float(ad_metrics.get("ctr") or ad_metrics.get("avg_ctr") or 0.0)
        frequency = float(ad_metrics.get("frequency") or 1.0)
        cpa = round(spend / purchases, 2) if purchases > 0 else 0.0
        roas = round(revenue / spend, 2) if spend > 0 else 0.0
        target_cpa = float(ad_metrics.get("target_cpa") or 60.0)
        currency = str(ad_metrics.get("currency") or "EGP").upper()

        rule_type = "WATCH"
        rule_text = ""

        # 1. Winning Scale Rule
        if purchases >= 2 and roas >= 2.2 and (cpa <= target_cpa or target_cpa == 0):
            rule_type = "WINNING_SCALE"
            rule_text = (
                f"- [رابح / SCALE] زاوية '{angle_name}' للمنتج '{product_name}' بصيغة ({format_type}) "
                f"حققت ROAS = {roas}x وتكلفة شراء {cpa} {currency} (أقل من المستهدف {target_cpa} {currency}). "
                f"القاعدة: خصص 70%+ من الميزانية لهذه الزاوية وارفع الميزانية بنسبة 20% كل 48 ساعة."
            )
        # 2. Fatigue Rule
        elif frequency >= 2.3 and cpa > (target_cpa * 1.25):
            rule_type = "CREATIVE_FATIGUE"
            rule_text = (
                f"- [إرهاق إعلاني / FATIGUE] الإعلان '{ad_name}' وصل تكراره إلى {frequency:.1f} مع ارتفاع CPA إلى {cpa} {currency}. "
                f"القاعدة: أوقف هذه المجموعة فوراً أو استبدل الفيديو والخطاف (Hook) لتفادي حرق الميزانية."
            )
        # 3. Bleeding Cut Rule
        elif spend > 250.0 and purchases == 0:
            rule_type = "BLEEDING_KILL"
            rule_text = (
                f"- [نزيف مالي / KILL] الإعلان '{ad_name}' بزاوية '{angle_name}' أنفق {spend} {currency} دون أي مبيعات (CTR: {ctr*100:.1f}%). "
                f"القاعدة: تجنب هذا الاستهداف/الزاوية، واختبر زاوية عرض سعر أقوى أو باقة شحن مجاني بديلة."
            )
        # 4. Creative Angle Improvement
        elif ctr < 0.01 and spend > 100.0:
            rule_type = "LOW_CTR_CREATIVE"
            rule_text = (
                f"- [نسبة نقر ضعيفة / FIX_CREATIVE] زاوية '{angle_name}' للمنتج '{product_name}' حققت نسبة نقر ضعيفة ({ctr*100:.1f}%). "
                f"القاعدة: غيّر أول 3 ثوانٍ في الفيديو أو اجعل العنوان الرئيسي يركز على حل المشكلة فوراً."
            )
        else:
            rule_type = "STABLE_WATCH"
            rule_text = (
                f"- [متابعة / WATCH] أداء معتدل للإعلان '{ad_name}' (ROAS: {roas}x, إنفاق: {spend} {currency}). "
                f"القاعدة: استمر في مراقبة الحملة حتى تكتمل مرحلة التعلم (50 تحويل)."
            )

        skill_id = f"media_buyer_playbook_{company_id}"
        return await self._upsert_playbook_rule(
            company_id=company_id,
            skill_id=skill_id,
            skill_name=f"كتيب استراتيجيات إعلانات المتجر",
            skill_type="MEDIA_BUYER",
            new_rule_line=rule_text,
            rule_metadata={
                "last_distilled_at": self._now_iso(),
                "rule_type": rule_type,
                "ad_metrics": {
                    "ad_name": ad_name,
                    "angle": angle_name,
                    "spend": spend,
                    "roas": roas,
                    "cpa": cpa,
                    "purchases": purchases,
                    "frequency": frequency,
                },
            },
            session=session,
        )

    async def distill_sales_dialogue(
        self,
        company_id: str,
        outcome: str,
        customer_objection: str,
        closing_angle: str,
        product_name: str = "",
        session: AsyncSession | None = None,
    ) -> dict[str, Any]:
        """Distill sales conversion & objection handling rules from customer dialogues."""
        if not company_id:
            return {"success": False, "error": "company_id is required"}

        rule_text = ""
        is_success = outcome.upper() in ("CONFIRMED", "SUCCESS", "ORDER_CREATED")

        if is_success:
            rule_text = (
                f"- [إغلاق ناجح] عند اعتراض العميل على '{customer_objection}' لمنتج '{product_name or 'عام'}'، "
                f"أثبت أسلوب '{closing_angle}' نجاحه في تأكيد الطلب. "
                f"القاعدة: استخدم هذا المدخل فوراً عند تكرار نفس الاعتراض."
            )
        else:
            rule_text = (
                f"- [انسحاب عميل] انسحب العميل عند الاعتراض على '{customer_objection}'. "
                f"القاعدة: تجنب الإلحاح الجاف؛ واقترح بدلاً من ذلك باقة بديلة أو ضمان استرجاع مجاني."
            )

        skill_id = f"sales_closing_playbook_{company_id}"
        return await self._upsert_playbook_rule(
            company_id=company_id,
            skill_id=skill_id,
            skill_name=f"كتيب إغلاق المبيعات والرد على الاعتراضات",
            skill_type="SALES_CLOSING",
            new_rule_line=rule_text,
            rule_metadata={
                "last_distilled_at": self._now_iso(),
                "outcome": outcome,
                "objection": customer_objection,
                "closing_angle": closing_angle,
            },
            session=session,
        )

    async def _upsert_playbook_rule(
        self,
        company_id: str,
        skill_id: str,
        skill_name: str,
        skill_type: str,
        new_rule_line: str,
        rule_metadata: dict[str, Any],
        session: AsyncSession | None = None,
    ) -> dict[str, Any]:
        """Upserts a learned rule into the tenant's persistent Skill record in DB."""
        if session is not None:
            return await self._do_upsert(session, company_id, skill_id, skill_name, skill_type, new_rule_line, rule_metadata)

        sf = _db_mod.async_session
        if not sf:
            return {"success": False, "error": "Database session unavailable"}

        async with sf() as new_session:
            return await self._do_upsert(new_session, company_id, skill_id, skill_name, skill_type, new_rule_line, rule_metadata)

    async def _do_upsert(
        self,
        session: AsyncSession,
        company_id: str,
        skill_id: str,
        skill_name: str,
        skill_type: str,
        new_rule_line: str,
        rule_metadata: dict[str, Any],
    ) -> dict[str, Any]:
        try:
            stmt = select(Skill).where(Skill.id == skill_id, Skill.company_id == company_id)
            res = await session.execute(stmt)
            skill = res.scalar_one_or_none()

            base_header = (
                f"# {skill_name} ({company_id})\n"
                f"> مهارة تم استخلاصها وتطويرها ذاتياً بناءً على بيانات وتجارب المتجر الفعلية (Hermes Self-Learning Engine).\n\n"
                f"## القواعد والدروس التشغيلية المعتمدة:\n"
            )

            if not skill:
                initial_instructions = f"{base_header}\n{new_rule_line}\n"
                skill = Skill(
                    id=skill_id,
                    company_id=company_id,
                    name=skill_name,
                    version="1.0.0",
                    description=f"مهارة تشغيلية متعلمة ذاتياً لمتجر {company_id} ({skill_type})",
                    trigger_phrases="حملة,إعلان,تقرير,مبيعات,استهداف,أداء,خصم,شحن",
                    instructions=initial_instructions,
                    content=initial_instructions,
                    allowed_tools=["facebook_ad_analyze_product", "facebook_ad_get_decision", "product_search"],
                    channels=["facebook", "whatsapp", "dashboard"],
                    priority=10,  # High priority to take precedence over generic instructions
                    enabled=True,
                    requires_human_approval=False,
                    max_tool_count=5,
                    skill_metadata={
                        "source": "AUTONOMOUS_LEARNED",
                        "skill_type": skill_type,
                        "rules_count": 1,
                        "history": [rule_metadata],
                    },
                )
                session.add(skill)
            else:
                existing_instructions = skill.instructions or skill.content or base_header
                # Prevent exact duplicate lines
                lines = [l.strip() for l in existing_instructions.splitlines() if l.strip()]
                clean_new_rule = new_rule_line.strip()
                if clean_new_rule not in lines:
                    updated_instructions = f"{existing_instructions.strip()}\n{clean_new_rule}\n"
                else:
                    updated_instructions = existing_instructions

                meta = dict(skill.skill_metadata or {})
                history = list(meta.get("history") or [])
                history.append(rule_metadata)
                # Keep last 25 distillation history events
                meta["history"] = history[-25:]
                meta["rules_count"] = len([l for l in updated_instructions.splitlines() if l.startswith("- [")])
                meta["source"] = "AUTONOMOUS_LEARNED"
                meta["skill_type"] = skill_type
                meta["last_updated_at"] = self._now_iso()

                skill.instructions = updated_instructions
                skill.content = updated_instructions
                skill.skill_metadata = meta

            await session.commit()

            # Hermes In-Memory Live Sync
            try:
                from src.skills.integration import register_tenant_skill_in_cache
                register_tenant_skill_in_cache(company_id, {
                    "id": skill.id,
                    "name": skill.name,
                    "description": skill.description,
                    "instructions": skill.instructions,
                    "content": skill.content,
                    "enabled": skill.enabled,
                    "priority": skill.priority,
                    "skill_metadata": skill.skill_metadata,
                })
            except Exception as cache_exc:
                logger.warning("failed_to_sync_skill_cache", error=str(cache_exc))

            logger.info("tenant_skill_distilled", company_id=company_id, skill_id=skill_id, rule_type=rule_metadata.get("rule_type"))
            return {
                "success": True,
                "skill_id": skill_id,
                "skill_name": skill_name,
                "rule_added": new_rule_line,
                "total_rules": (skill.skill_metadata or {}).get("rules_count", 1),
                "enabled": skill.enabled,
            }
        except Exception as exc:
            logger.exception("tenant_skill_upsert_failed", company_id=company_id, error=str(exc))
            try:
                await session.rollback()
            except Exception:
                pass
            return {"success": False, "error": str(exc)}

    async def get_merchant_playbook(
        self,
        company_id: str,
        skill_type: str | None = None,
        session: AsyncSession | None = None,
    ) -> str:
        """Fetch compiled learned playbook markdown for a given merchant."""
        if not company_id:
            return ""

        async def _query(s: AsyncSession) -> str:
            stmt = select(Skill).where(Skill.company_id == company_id, Skill.enabled.is_(True))
            res = await s.execute(stmt)
            skills = res.scalars().all()
            if not skills:
                return ""

            blocks = []
            for sk in skills:
                meta = sk.skill_metadata or {}
                if skill_type and meta.get("skill_type") != skill_type:
                    continue
                instr = sk.instructions or sk.content or ""
                if instr:
                    blocks.append(instr.strip())
            return "\n\n".join(blocks)

        if session is not None:
            return await _query(session)

        sf = _db_mod.async_session
        if not sf:
            return ""
        async with sf() as s:
            return await _query(s)


autonomous_skill_learner = AutonomousSkillLearner()
