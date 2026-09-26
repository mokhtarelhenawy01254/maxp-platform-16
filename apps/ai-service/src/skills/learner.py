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

    async def record_universal_rule(
        self,
        company_id: str,
        rule_category: str,
        rule_title: str,
        rule_instructions: str,
        supporting_evidence: dict[str, Any] | None = None,
        trigger_keywords: str | None = None,
        session: AsyncSession | None = None,
    ) -> dict[str, Any]:
        """Hermes Universal Learning for ANY Agent role in the platform."""
        if not company_id:
            return {"success": False, "error": "company_id is required"}

        category_clean = (rule_category or "GENERAL").strip().upper()
        category_titles = {
            "CUSTOMER_SUPPORT": "كتيب خدمة العملاء والاستفسارات",
            "SUPPORT": "كتيب خدمة العملاء والاستفسارات",
            "SALES": "كتيب مبيعات وإغلاق الصفقات",
            "SALES_CLOSING": "كتيب مبيعات وإغلاق الصفقات",
            "INVENTORY": "كتيب إدارة وحركة المخزون",
            "MEDIA_BUYER": "كتيب استراتيجيات إعلانات المتجر",
            "OPERATIONS": "كتيب العمليات التشغيلية والتأكيد",
            "CLINIC": "كتيب العيادات والمواعيد الطبية",
            "HOTEL": "كتيب حجوزات الفنادق والضيافة",
            "DENTAL_LAB": "كتيب تشغيل معمل الأسنان",
            "GENERAL": "كتيب القواعد العامة للمتجر",
        }
        skill_name = category_titles.get(category_clean, f"كتيب {category_clean}")
        skill_id = f"{category_clean.lower()}_playbook_{company_id}"

        rule_line = f"- [{rule_title.strip()}] {rule_instructions.strip()}"

        return await self._upsert_playbook_rule(
            company_id=company_id,
            skill_id=skill_id,
            skill_name=skill_name,
            skill_type=category_clean,
            new_rule_line=rule_line,
            rule_metadata={
                "last_distilled_at": self._now_iso(),
                "title": rule_title,
                "category": category_clean,
                "evidence": supporting_evidence or {},
                "trigger_keywords": trigger_keywords or "",
                "source": "AGENT_UNIVERSAL_LEARN",
            },
            session=session,
        )

    async def distill_inventory_insight(
        self,
        company_id: str,
        product_name: str,
        current_stock: int,
        daily_sales: float,
        supplier_lead_time_days: int = 3,
        session: AsyncSession | None = None,
    ) -> dict[str, Any]:
        """Distill inventory reorder and safety rules for inventory agents."""
        if not company_id:
            return {"success": False, "error": "company_id is required"}

        days_remaining = (current_stock / daily_sales) if daily_sales > 0 else 999
        rule_title = "مخزون طبيعي"
        rule_instruction = ""

        if days_remaining <= (supplier_lead_time_days + 1):
            rule_title = "إعادة طلب عاجل"
            rule_instruction = (
                f"صنف '{product_name}' متبقي منه {current_stock} قطع فقط بمعدل بيع {daily_sales:.1f} يومياً "
                f"(المخزون يكفي {days_remaining:.1f} أيام، والتوريد يستغرق {supplier_lead_time_days} أيام). "
                f"القاعدة: أنشئ أمر شراء فوري للمورد أو نبه فريق المبيعات لتخفيض الصرف الإعلاني عنه فوراً."
            )
        elif daily_sales == 0 and current_stock > 50:
            rule_title = "مخزون راكد"
            rule_instruction = (
                f"صنف '{product_name}' متوفر بـ {current_stock} قطعة دون أي مبيعات خلال الفترة الماضية. "
                f"القاعدة: اقترح حزمة تخفيضات (Bundle) أو استخدامه كهدية ترويجية مع المنتجات الأكثر طلباً."
            )
        else:
            rule_title = "متابعة المخزون"
            rule_instruction = f"صنف '{product_name}' بوضع تشغيلي مستقر (الرصيد: {current_stock}، البيع اليومي: {daily_sales:.1f})."

        return await self.record_universal_rule(
            company_id=company_id,
            rule_category="INVENTORY",
            rule_title=rule_title,
            rule_instructions=rule_instruction,
            supporting_evidence={"current_stock": current_stock, "daily_sales": daily_sales},
            session=session,
        )

    async def distill_customer_support_insight(
        self,
        company_id: str,
        customer_issue: str,
        resolution_method: str,
        was_customer_satisfied: bool = True,
        session: AsyncSession | None = None,
    ) -> dict[str, Any]:
        """Distill customer support & satisfaction resolution rules for support agents."""
        if not company_id:
            return {"success": False, "error": "company_id is required"}

        status_tag = "حل معتمد" if was_customer_satisfied else "إجراء بديل"
        instruction = (
            f"عند مواجهة مشكلة '{customer_issue}'، أثبت الإجراء التالي نجاحه: '{resolution_method}'."
            if was_customer_satisfied else
            f"عند مواجهة مشكلة '{customer_issue}'، أسلوب '{resolution_method}' لم يحقق رضا العميل؛ اقترح تعويضاً أو تصعيداً فورياً."
        )

        return await self.record_universal_rule(
            company_id=company_id,
            rule_category="CUSTOMER_SUPPORT",
            rule_title=f"{status_tag}: {customer_issue[:30]}",
            rule_instructions=instruction,
            supporting_evidence={"satisfied": was_customer_satisfied, "issue": customer_issue},
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

    @staticmethod
    def _consolidate_playbook_rules(existing_instructions: str, new_rule_line: str, new_title: str, base_header: str) -> str:
        """Hermes Canonical Rule Consolidation:
        Parses existing rule blocks, identifies semantic relationships (EXCEPTION_TO, SUPERSEDES, REINFORCES),
        and merges exceptions into compound canonical rules rather than accumulating messy duplicate bullets.
        """
        clean_new = new_rule_line.strip()
        if not existing_instructions or not existing_instructions.strip():
            return f"{base_header}\n{clean_new}\n"

        # Split existing content into header vs rule blocks
        header_part = base_header.strip()
        if "## القواعد والدروس التشغيلية المعتمدة:" in existing_instructions:
            parts = existing_instructions.split("## القواعد والدروس التشغيلية المعتمدة:", 1)
            header_part = parts[0].strip() + "\n\n## القواعد والدروس التشغيلية المعتمدة:"
            body_part = parts[1].strip()
        else:
            body_part = existing_instructions.replace(base_header, "").strip()

        # Parse existing rule blocks
        rule_blocks: list[dict[str, str]] = []
        current_title = ""
        current_lines: list[str] = []

        for line in body_part.splitlines():
            sline = line.strip()
            if sline.startswith("- ["):
                if current_lines:
                    rule_blocks.append({
                        "title": current_title,
                        "text": "\n".join(current_lines).strip()
                    })
                    current_lines = []
                end_idx = sline.find("]")
                if end_idx != -1:
                    current_title = sline[3:end_idx].strip()
                else:
                    current_title = ""
                current_lines.append(sline)
            elif current_lines:
                current_lines.append(line)

        if current_lines:
            rule_blocks.append({
                "title": current_title,
                "text": "\n".join(current_lines).strip()
            })

        # Relationship Detection & Reconciliation
        new_title_clean = (new_title or "").strip()
        is_exception = any(kw in new_title_clean or kw in clean_new for kw in ["استثناء", "حجز مسبق", "Pre-Order", "pre_order"])
        
        merged = False
        updated_blocks: list[dict[str, str]] = []

        for b in rule_blocks:
            b_title = b["title"]
            b_text = b["text"]

            # Case 1: Exception / Qualification to an existing rule
            if is_exception and ("مخزون" in b_title or "مخزون" in b_text or "حماية" in b_title):
                if "حجز مسبق" in b_text or "Pre-Order" in b_text:
                    b_text = clean_new
                else:
                    raw_rule_body = clean_new
                    if raw_rule_body.startswith("- ["):
                        c_idx = raw_rule_body.find("]")
                        if c_idx != -1:
                            raw_rule_body = raw_rule_body[c_idx+1:].strip()
                    b_text = f"{b_text.rstrip()}\n  ↳ [استثناء التاجر المعتمد (Pre-Order)]: {raw_rule_body}"
                merged = True
                updated_blocks.append({"title": b_title, "text": b_text})
                continue

            # Case 2: Direct Override / Topic Overlap (e.g. duplicate discount or style rules)
            is_same_topic = False
            if new_title_clean and b_title:
                if new_title_clean in b_title or b_title in new_title_clean:
                    is_same_topic = True
                elif ("خصم" in new_title_clean and "خصم" in b_title) or ("معاينة" in new_title_clean and "معاينة" in b_title):
                    is_same_topic = True

            if is_same_topic:
                updated_blocks.append({"title": new_title_clean, "text": clean_new})
                merged = True
                continue

            # Case 3: Exact or near duplicate check
            if clean_new in b_text or b_text in clean_new:
                updated_blocks.append(b)
                merged = True
                continue

            updated_blocks.append(b)

        if not merged:
            updated_blocks.append({"title": new_title_clean, "text": clean_new})

        assembled_body = "\n\n".join(b["text"] for b in updated_blocks)
        return f"{header_part}\n\n{assembled_body}\n"

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
                    requires_human_approval=True,
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
                new_title = str(rule_metadata.get("title") or "")
                updated_instructions = self._consolidate_playbook_rules(
                    existing_instructions=existing_instructions,
                    new_rule_line=new_rule_line,
                    new_title=new_title,
                    base_header=base_header,
                )

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
