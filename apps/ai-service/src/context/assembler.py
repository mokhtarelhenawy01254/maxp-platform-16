from __future__ import annotations

from typing import Any, ClassVar

import structlog
from sqlalchemy import text

from src.context.compressor import compress_history, count_tokens
from src.context.multimodal import build_user_content
from src.memory.working_memory import working_memory_service
from src.pipeline.context import PipelineContext

logger = structlog.get_logger(__name__)


class ContextAssembler:
    """SOTA 2026 Context Assembler.

    Dynamically compiles the system prompt and chat history list:
    1. Queries database for customer profiles and recent messages.
    2. Fetches working memory session state (cart, filters, etc.).
    3. Injects RAG evidence as structured <company_knowledge> block.
    4. Injects episodic memories as <relevant_memories> block.
    5. Compresses older conversation turns into a summary block.
    6. Enforces a hard token budget, truncating/dropping sections as needed.
    """

    # ─── Section priority (lower = more important, dropped last) ───
    SECTION_PRIORITY: ClassVar[dict[str, int]] = {
        "base_prompt": 0,
        "customer_profile": 1,
        "session_state": 2,
        "company_knowledge": 3,
        "relevant_memories": 4,
        "conversation_summary": 5,
    }

    @staticmethod
    def _sanitize_content(content: str) -> str:
        """Escapes XML special characters to prevent structure-breaking prompt injection."""
        return content.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    @staticmethod
    def _dedupe_adjacent_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Collapse adjacent duplicate role/content pairs created by sync echoes."""
        deduped: list[dict[str, Any]] = []
        for message in messages:
            role = str(message.get("role") or "").strip().lower()
            content = str(message.get("content") or "").strip()
            if not role or not content:
                continue
            if deduped and deduped[-1]["role"] == role and deduped[-1]["content"] == content:
                continue
            deduped.append({"role": role, "content": content})
        return deduped

    # ─── Data Fetchers ────────────────────────────────────────────

    async def fetch_customer_profile(self, ctx: PipelineContext) -> dict[str, Any] | None:
        """Fetch customer profile from public.customers."""
        if not ctx.customer_id or not ctx.session:
            return None

        try:
            query = text(
                'SELECT "firstName", "lastName", phone, email, metadata '
                'FROM public.customers WHERE id = :id'
            )
            result = await ctx.session.execute(query, {"id": ctx.customer_id})
            row = result.fetchone()
            if row:
                return {
                    "first_name": row[0] or "",
                    "last_name": row[1] or "",
                    "phone": row[2] or "",
                    "email": row[3] or "",
                    "metadata": row[4] or ""
                }
        except Exception as e:
            logger.warning("failed to fetch customer profile from DB", error=str(e))

        return None

    async def fetch_message_history(self, ctx: PipelineContext, limit: int = 15) -> list[dict[str, Any]]:
        """Fetch recent message history for the active conversation from public.messages."""
        external_memory = getattr(ctx, "external_memory_context", None) or {}
        memory_history = external_memory.get("recentMessages")
        if isinstance(memory_history, list):
            history_messages = []
            for message in memory_history[-limit:]:
                if not isinstance(message, dict):
                    continue
                role = str(message.get("role") or "user").lower()
                content = str(message.get("content") or "").strip()
                if role in {"user", "assistant"} and content:
                    history_messages.append({"role": role, "content": content})
            if history_messages:
                res = self._dedupe_adjacent_messages(history_messages)
                current_clean = (ctx.message or "").strip()
                if res and res[-1].get("role") == "user" and res[-1].get("content", "").strip() == current_clean:
                    res.pop()
                return res


        lookup_id = ctx.conversation_id or ctx.thread_id
        if not lookup_id or not ctx.session:
            return []

        history_messages = []
        try:
            # Check for dashboard marketing copilot sessions
            clean_session_id = str(lookup_id)
            if "mb_sess_" in clean_session_id:
                parts = clean_session_id.split("_")
                if len(parts) >= 4 and parts[0] == "mb" and parts[1] == "sess":
                    clean_session_id = f"{parts[0]}_{parts[1]}_{parts[2]}_{parts[3]}"

            # 1. Marketing copilot session table
            if str(lookup_id).startswith("mb_sess_") or clean_session_id.startswith("mb_sess_"):
                try:
                    fb_query = text(
                        'SELECT content, role FROM public.facebook_ads_ai_chat_messages '
                        'WHERE ("sessionId" = :clean_id OR "sessionId" = :raw_id) '
                        'ORDER BY "createdAt" DESC LIMIT :limit'
                    )
                    fb_result = await ctx.session.execute(
                        fb_query,
                        {"clean_id": clean_session_id, "raw_id": str(lookup_id), "limit": limit}
                    )
                    fb_rows = fb_result.fetchall()
                    if fb_rows:
                        for row in reversed(fb_rows):
                            content = row[0] or ""
                            r = str(row[1] or "assistant").lower()
                            role = "user" if r == "user" else "assistant"
                            if content:
                                history_messages.append({"role": role, "content": content})
                        if history_messages:
                            deduped = self._dedupe_adjacent_messages(history_messages)
                            current_clean = (ctx.message or "").strip()
                            if deduped and deduped[-1].get("role") == "user" and deduped[-1].get("content", "").strip() == current_clean:
                                deduped.pop()
                            return deduped
                except Exception as fb_err:
                    try:
                        await ctx.session.rollback()
                    except Exception:
                        pass
                    logger.warning("failed to fetch marketing message history from DB", error=str(fb_err))

            # 2. General Agent Studio sessions table (Merchant Copilot, Specialist Agents, Operations, Inventory, etc.)
            try:
                studio_query = text(
                    'SELECT content, role FROM public.agent_studio_messages '
                    'WHERE ("sessionId" = :clean_id OR "sessionId" = :raw_id) AND ("isDeleted" IS FALSE OR "isDeleted" IS NULL) '
                    'ORDER BY "createdAt" DESC LIMIT :limit'
                )
                studio_result = await ctx.session.execute(
                    studio_query,
                    {"clean_id": clean_session_id, "raw_id": str(lookup_id), "limit": limit}
                )
                studio_rows = studio_result.fetchall()
                if studio_rows:
                    for row in reversed(studio_rows):
                        content = row[0] or ""
                        r = str(row[1] or "assistant").lower()
                        role = "user" if r == "user" else "assistant"
                        if content:
                            history_messages.append({"role": role, "content": content})
                    if history_messages:
                        deduped = self._dedupe_adjacent_messages(history_messages)
                        current_clean = (ctx.message or "").strip()
                        if deduped and deduped[-1].get("role") == "user" and deduped[-1].get("content", "").strip() == current_clean:
                            deduped.pop()
                        return deduped
            except Exception as studio_err:
                try:
                    await ctx.session.rollback()
                except Exception:
                    pass
                logger.warning("failed to fetch agent studio message history from DB", error=str(studio_err))

            # 3. Fallback to facebook_ads_ai_chat_messages if not checked above
            if not (str(lookup_id).startswith("mb_sess_") or clean_session_id.startswith("mb_sess_")):
                try:
                    fb_query = text(
                        'SELECT content, role FROM public.facebook_ads_ai_chat_messages '
                        'WHERE ("sessionId" = :clean_id OR "sessionId" = :raw_id) '
                        'ORDER BY "createdAt" DESC LIMIT :limit'
                    )
                    fb_result = await ctx.session.execute(
                        fb_query,
                        {"clean_id": clean_session_id, "raw_id": str(lookup_id), "limit": limit}
                    )
                    fb_rows = fb_result.fetchall()
                    if fb_rows:
                        for row in reversed(fb_rows):
                            content = row[0] or ""
                            r = str(row[1] or "assistant").lower()
                            role = "user" if r == "user" else "assistant"
                            if content:
                                history_messages.append({"role": role, "content": content})
                        if history_messages:
                            deduped = self._dedupe_adjacent_messages(history_messages)
                            current_clean = (ctx.message or "").strip()
                            if deduped and deduped[-1].get("role") == "user" and deduped[-1].get("content", "").strip() == current_clean:
                                deduped.pop()
                            return deduped
                except Exception as fb_err:
                    try:
                        await ctx.session.rollback()
                    except Exception:
                        pass
                    logger.warning("failed to fetch dashboard message history from DB", error=str(fb_err))

            query = text(
                'SELECT content, "isFromCustomer", type, attachments FROM public.messages '
                'WHERE "conversationId" = :conversation_id '
                'ORDER BY "createdAt" DESC LIMIT :limit'
            )
            result = await ctx.session.execute(
                query,
                {"conversation_id": lookup_id, "limit": limit}
            )
            rows = result.fetchall()

            for row in reversed(rows):
                content = row[0] or ""
                is_from_customer = bool(row[1])
                msg_type = row[2] or "TEXT"
                attachments_json = row[3] if len(row) > 3 else None

                role = "user" if is_from_customer else "assistant"

                if not content and msg_type != "TEXT":
                    if attachments_json:
                        try:
                            import json as _json
                            parsed = _json.loads(attachments_json) if isinstance(attachments_json, str) else attachments_json
                            urls = []
                            if isinstance(parsed, list):
                                for a in parsed:
                                    u = a.get("url") or a.get("image_url") or ""
                                    if u:
                                        urls.append(u)
                            if urls:
                                content = f"[{msg_type}: {', '.join(urls[:3])}]"
                        except Exception:
                            pass
                    if not content:
                        content = f"[{msg_type} Attachment]"

                if content:
                    history_messages.append({
                        "role": role,
                        "content": content
                    })
        except Exception as e:
            logger.warning("failed to fetch message history from DB", error=str(e))

        deduped = self._dedupe_adjacent_messages(history_messages)
        current_clean = (ctx.message or "").strip()
        if deduped and deduped[-1].get("role") == "user" and deduped[-1].get("content", "").strip() == current_clean:
            deduped.pop()
        return deduped


    async def fetch_session_state(self, ctx: PipelineContext) -> dict[str, Any] | None:
        """Fetch current working memory session state (cart, search filters, etc.)."""
        if getattr(ctx, "session_state", None):
            return ctx.session_state
        external_memory = getattr(ctx, "external_memory_context", None) or {}
        session_state = {}
        if external_memory:
            session_state = {k: v for k, v in external_memory.items() if v}

        # Check if active product is present in external_memory
        has_active_prod = (
            session_state.get("activeProduct")
            or session_state.get("active_product")
            or session_state.get("active_product_context")
            or session_state.get("referredProduct")
        )

        # Automatic DB fallback: recover activeProduct from public.agent_studio_sessions or public.facebook_ads_ai_chat_sessions if missing
        lookup_id = ctx.conversation_id or ctx.thread_id
        if not has_active_prod and lookup_id and ctx.session:
            clean_session_id = str(lookup_id)
            if "mb_sess_" in clean_session_id:
                parts = clean_session_id.split("_")
                if len(parts) >= 4 and parts[0] == "mb" and parts[1] == "sess":
                    clean_session_id = f"{parts[0]}_{parts[1]}_{parts[2]}_{parts[3]}"
            try:
                import json as _json
                # Check agent_studio_sessions first
                sess_res = await ctx.session.execute(
                    text('SELECT context FROM public.agent_studio_sessions WHERE id = :clean_id OR id = :raw_id LIMIT 1'),
                    {"clean_id": clean_session_id, "raw_id": str(lookup_id)}
                )
                sess_row = sess_res.fetchone()
                if not sess_row or not sess_row[0]:
                    sess_res = await ctx.session.execute(
                        text('SELECT context FROM public.facebook_ads_ai_chat_sessions WHERE id = :clean_id OR id = :raw_id LIMIT 1'),
                        {"clean_id": clean_session_id, "raw_id": str(lookup_id)}
                    )
                    sess_row = sess_res.fetchone()

                if sess_row and sess_row[0]:
                    db_ctx = sess_row[0] if isinstance(sess_row[0], dict) else _json.loads(sess_row[0])
                    db_prod = db_ctx.get("activeProduct") or db_ctx.get("active_product")
                    if db_prod:
                        session_state["activeProduct"] = db_prod
            except Exception as sess_err:
                logger.warning("failed to fetch activeProduct from studio sessions", error=str(sess_err))

        if session_state:
            ctx.session_state = session_state
            return session_state

        if not ctx.company_id or not ctx.thread_id:
            return None

        try:
            lookup_id = ctx.conversation_id or ctx.thread_id
            state = await working_memory_service.get_context(
                company_id=ctx.company_id,
                conversation_id=lookup_id,
            )
            if state:
                # Filter out empty values to reduce token waste
                filtered = {k: v for k, v in state.items() if v}
                if filtered:
                    ctx.session_state = filtered
                    logger.debug(
                        "session_state_fetched",
                        keys=list(filtered.keys()),
                    )
                    return filtered
        except Exception as e:
            logger.warning("failed to fetch session state", error=str(e))

        return None

    # ─── System Prompt Builder ────────────────────────────────────

    async def build_system_prompt(self, ctx: PipelineContext) -> str:
        """Assemble the system prompt by injecting structured XML sections.

        Sections injected (in order):
        1. Base agent instructions
        2. <customer_profile> — customer details
        3. <session_state> — cart, filters, last shown products
        4. <company_knowledge> — RAG evidence from knowledge base
        5. <relevant_memories> — episodic memories for this customer
        """
        from src.pipeline.stages.skills_pipeline import get_agent_instructions
        base_prompt = ctx.system_prompt or (get_agent_instructions(ctx.agent) if ctx.agent else "") or ""

        # Inject DB-level rules (only injected here, not inside the contract)
        _agent = ctx.agent
        if _agent:
            _db_rules = (getattr(_agent, "_db_rules", "") or "").strip()
            if _db_rules:
                base_prompt += f"\n\n<rules>\n{_db_rules}\n</rules>"

        # Inject company-level custom instructions / prompt from public.ai_settings
        if ctx.company_id and ctx.session:
            try:
                ai_set_res = await ctx.session.execute(
                    text('SELECT "promptTemplate", "responsePrompt" FROM public.ai_settings WHERE "companyId" = :cid LIMIT 1'),
                    {"cid": ctx.company_id}
                )
                ai_set_row = ai_set_res.fetchone()
                if ai_set_row:
                    co_prompt = (ai_set_row[1] or ai_set_row[0] or "").strip()
                    if co_prompt:
                        base_prompt += f"\n\n<store_instructions>\n{co_prompt}\n</store_instructions>"
            except Exception as e:
                logger.debug("fetch_ai_settings_prompt_failed", error=str(e))

        # Channel-specific: Facebook continuation instructions
        # Prevents the agent from introducing itself or changing direction when
        # the customer was already talking to a human agent before AI activation.
        if (ctx.channel or "").lower() in ("facebook", "messenger"):
            base_prompt += """
<continuation>
You are continuing an existing conversation on Facebook Messenger that was previously handled by a human agent.

- Do NOT introduce yourself as if starting a new conversation
- Do NOT apologize for being an AI or mention that you are an AI
- Do NOT change the topic or direction of the conversation
- Continue naturally in the same tone, language, and style as the human agent's previous replies
- The human agent's replies are in the message history — follow their lead on formality, length, and approach
- If images or products were discussed previously, reference them contextually when relevant
- Your role is to provide seamless continuity so the customer does not notice any transition
</continuation>"""

        # ─── Context Caching Optimized Prompt Assembly ───
        # Static sections (Prefix): Invariant across turns -> Maximize KV Cache Hits (DeepSeek/OpenAI/Gemini)
        static_sections: list[tuple[str, str]] = []
        # Dynamic sections (Tail): Query/turn-dependent -> Appended at the end
        dynamic_sections: list[tuple[str, str]] = []

        # 1. Skills Instructions (Static per agent — largest block, high cache priority)
        # Always inject full skill instructions right after base instructions so this large block
        # is part of the fixed cacheable prefix across all turns.
        company_id = getattr(ctx, "company_id", None)
        if company_id and ctx.session:
            try:
                from src.skills.integration import hydrate_tenant_skills_from_db
                await hydrate_tenant_skills_from_db(company_id, ctx.session)
            except Exception as exc:
                logger.warning("hydrate_tenant_skills_failed", company_id=company_id, error=str(exc))

        agent = ctx.agent
        allowed_skills = getattr(agent, "allowed_skills", set()) if agent else set()
        agent_role = getattr(agent, "role", None) or getattr(agent, "name", None)
        user_msg = getattr(ctx, "user_message", None)
        if allowed_skills or company_id:
            from src.skills.integration import get_skills_block
            full_skills_block = get_skills_block(
                allowed_skills=allowed_skills,
                company_id=company_id,
                agent_role=agent_role,
                user_message=user_msg,
            )
            if full_skills_block:
                static_sections.append(("skills", full_skills_block))
                logger.info(
                    "injected_full_skills",
                    skill_count=len(allowed_skills) if allowed_skills else 0,
                    company_id=company_id,
                )

        # 2. Current Date (Prefix-stable: Date only, avoids minute-by-minute cache invalidation)
        from datetime import datetime as _dt_now
        _now = _dt_now.now()
        static_sections.append(("current_datetime",
            f"\n<current_datetime>\n"
            f"  Today: {_now.strftime('%A, %Y-%m-%d')}\n"
            f"  Timezone: UTC\n"
            f"</current_datetime>"
        ))

        # 3. Customer Profile (Static per customer conversation)
        customer = await self.fetch_customer_profile(ctx)
        if customer:
            full_name = f"{customer['first_name']} {customer['last_name']}".strip()
            profile_xml = (
                "\n<customer_profile>\n"
                f"  Name: {full_name or 'Unknown'}\n"
                f"  Phone: {customer['phone'] or 'N/A'}\n"
                f"  Email: {customer['email'] or 'N/A'}\n"
                "</customer_profile>"
            )
            static_sections.append(("customer_profile", profile_xml))

        # ─── Dynamic Sections (Tail) ───

        # 4. Session State (Working Memory — Cart, active filters, last shown products)
        # Note: recentMessages is omitted here because message history is already passed
        # in the messages array. Omitting it prevents mutating the system prompt on every turn.
        session_state = await self.fetch_session_state(ctx)
        if session_state:
            state_lines = []
            if session_state.get("cart"):
                state_lines.append(f"  Cart: {session_state['cart']}")
            if session_state.get("lastShownProductIds"):
                state_lines.append(f"  Last Shown Products: {', '.join(session_state['lastShownProductIds'][:10])}")
            if session_state.get("activeSearchFilters"):
                state_lines.append(f"  Active Filters: {session_state['activeSearchFilters']}")
            if session_state.get("queriedProducts"):
                recent = session_state["queriedProducts"][-5:]
                state_lines.append(f"  Recently Queried: {recent}")
            if session_state.get("referredProduct"):
                prod = session_state["referredProduct"]
                name = prod.get("name", prod.get("id", ""))
                state_lines.append(f"  Referred Product: {name}")
                price = prod.get("price")
                if price:
                    state_lines.append(f"  Referred Product Price: {price}")
                desc = prod.get("description", "")
                if desc:
                    state_lines.append(f"  Referred Product Description: {desc[:240]}")

            # SOTA 2026 Working Memory Scratchpad:
            # Anchors active focus entity, current objective, and context resolution
            active_prod = (
                session_state.get("activeProduct")
                or session_state.get("active_product")
                or session_state.get("active_product_context")
                or session_state.get("referredProduct")
            )
            ap_name = ""
            ap_id = ""
            ap_sku = ""
            ap_stock = None
            ap_price = None
            ap_url = None
            if active_prod:
                if isinstance(active_prod, dict):
                    ap_name = active_prod.get("name") or active_prod.get("title") or ""
                    ap_id = str(active_prod.get("id") or "")
                    ap_sku = active_prod.get("sku") or ""
                    ap_stock = active_prod.get("stock")
                    ap_price = active_prod.get("price")
                    ap_url = active_prod.get("url") or active_prod.get("product_url")
                elif isinstance(active_prod, str):
                    ap_name = active_prod

            working_memory_lines = ["<session_working_memory>"]
            if ap_name or ap_id:
                working_memory_lines.append("  <active_focus_entity>")
                if ap_name:
                    working_memory_lines.append(f"    Name: {ap_name}")
                if ap_id:
                    working_memory_lines.append(f"    ID: {ap_id}")
                if ap_sku:
                    working_memory_lines.append(f"    SKU: {ap_sku}")
                if ap_stock is not None:
                    working_memory_lines.append(f"    Stock: {ap_stock}")
                if ap_price is not None:
                    working_memory_lines.append(f"    Price: {ap_price}")
                if ap_url:
                    working_memory_lines.append(f"    URL: {ap_url}")
                is_customer = getattr(ctx, "is_customer_channel", False) or (ctx.channel or "").lower() in ("whatsapp", "facebook", "messenger", "telegram", "instagram")
                if is_customer:
                    working_memory_lines.append(
                        f"    Context: The customer may have arrived from an ad or link referring to '{ap_name or ap_id}'. "
                        f"If the customer says 'المنتج ده' or asks about the advertised item, reference '{ap_name or ap_id}'. "
                        "IMPORTANT: If the customer asks about a different product, different model, or general questions, answer their request directly and do NOT force this product onto them!"
                    )
                else:
                    working_memory_lines.append(
                        f"    Directive: When merchant says 'المنتج ده' (this product), 'إعلانه', 'سعره', 'مخزونه', "
                        f"or asks 'شايف المنتج المحدد ؟' / 'المنتج المختار', they strictly refer to '{ap_name or ap_id}'. "
                        f"Confirm immediately that you see '{ap_name or ap_id}' and provide its details directly without asking for the product name again! "
                        "IMPORTANT: If the merchant asks a general, analytical, or administrative question, treat this entity only as background context."
                    )
                working_memory_lines.append("  </active_focus_entity>")

            active_obj = session_state.get("activeObjective") or session_state.get("current_objective")
            if active_obj:
                working_memory_lines.append(f"  <current_objective>{active_obj}</current_objective>")

            # Anchor Merchant Screen & Executive Context (2026 Global Copilot)
            exec_ctx = session_state.get("executiveContext") or session_state.get("pageContext")
            if isinstance(exec_ctx, dict):
                working_memory_lines.append("  <merchant_screen_context>")
                r_path = exec_ctx.get("pathname") or exec_ctx.get("currentRoute")
                if r_path:
                    working_memory_lines.append(f"    Current Route: {r_path}")
                if exec_ctx.get("pageTitle"):
                    working_memory_lines.append(f"    Page Title: {exec_ctx.get('pageTitle')}")
                if exec_ctx.get("businessType"):
                    working_memory_lines.append(f"    Business Vertical: {exec_ctx.get('businessType')}")
                if exec_ctx.get("activeApps"):
                    working_memory_lines.append(f"    Active Apps: {', '.join(str(a) for a in exec_ctx.get('activeApps'))}")
                if exec_ctx.get("entityId"):
                    working_memory_lines.append(f"    Screen Entity ID: {exec_ctx.get('entityId')} (Type: {exec_ctx.get('entityType', 'item')})")
                working_memory_lines.append(
                    "    Directive: The merchant is actively on this page. When they say 'الأوردر ده', 'شايف الشاشة دي؟', 'الطلب المعروض', "
                    "or ask for summary/actions on the current page, use this context immediately without asking for the entity ID or URL again."
                )
                working_memory_lines.append("  </merchant_screen_context>")

            working_memory_lines.append("</session_working_memory>")

            scratchpad_xml = "\n" + "\n".join(working_memory_lines)
            if state_lines:
                scratchpad_xml += "\n<session_state>\n" + "\n".join(state_lines) + "\n</session_state>"
            dynamic_sections.append(("session_state", scratchpad_xml))

        # 5. Merchant Guardrails (Dynamic rules matching current user query)
        _agent = ctx.agent
        if _agent and ctx.session:
            try:
                from src.guardrails.merchant_rules import MerchantRuleGuardrail
                guardrail = MerchantRuleGuardrail()
                matched_rules = await guardrail.get_relevant_rules(
                    session=ctx.session,
                    agent_id=_agent.id,
                    message=ctx.message,
                    top_k=5,
                )
                if matched_rules:
                    guardrails_block = guardrail.format_as_prompt_block(matched_rules)
                    dynamic_sections.append(("merchant_guardrails", f"\n{guardrails_block}"))
                    
                    if ctx.session_state is None:
                        ctx.session_state = {}
                    ctx.session_state["applied_guardrail_ids"] = [r["id"] for r in matched_rules]
            except Exception as e:
                logger.warning("failed to fetch merchant guardrails", error=str(e))

        # 6. RAG evidence (Company Knowledge — query dependent)
        if ctx.rag_evidence:
            sanitized_knowledge = self._sanitize_content(ctx.rag_evidence)
            knowledge_xml = f"\n<company_knowledge>\n{sanitized_knowledge}\n</company_knowledge>"
            dynamic_sections.append(("company_knowledge", knowledge_xml))

        # 7. Episodic memories (Customer specific & query matched)
        if ctx.episodic_memories:
            memory_lines = []
            for mem in ctx.episodic_memories[:5]:
                similarity = mem.get("similarity", 0)
                content = mem.get("content", "")
                sanitized_content = self._sanitize_content(content)
                memory_lines.append(f"  [{similarity:.2f}] {sanitized_content}")

            if memory_lines:
                memories_xml = "\n<relevant_memories>\n" + "\n".join(memory_lines) + "\n</relevant_memories>"
                dynamic_sections.append(("relevant_memories", memories_xml))

        # 8. Pristine Elliptical Query Resolution & Multi-Turn Blocker Reflection
        raw_msg = (ctx.message or "").strip().lower()
        elliptical_queries = {"؟", "?", "ليه", "ليه؟", "ليه ?", "وقفت ليه", "وقفت ليه ؟", "ها", "وبعدين", "وبعدين ؟", "وبعدين؟", "كمل", "متابعة", "ايه الاخبار", "نفذ", "تمام", "اوك", "ماشى", "ماشي"}
        is_elliptical = raw_msg in elliptical_queries or len(raw_msg) <= 3
        if is_elliptical:
            try:
                history_list = await self.fetch_message_history(ctx, limit=10)
                last_explicit_request = ""
                last_assistant_reply = ""
                has_assistant_blocker = False

                for m in reversed(history_list):
                    role = m.get("role")
                    content = (m.get("content") or "").strip()
                    if not last_assistant_reply and role == "assistant" and content:
                        last_assistant_reply = content
                        blocker_keywords = ("فشل", "تعذر", "خطأ", "error", "failed", "invalid parameter", "سقف", "مطلوب مبلغ", "بانتظار", "مشكلة")
                        if any(k in content.lower() for k in blocker_keywords):
                            has_assistant_blocker = True
                    if not last_explicit_request and role == "user":
                        if content and content.lower() not in elliptical_queries and len(content) > 3:
                            last_explicit_request = content

                if has_assistant_blocker and last_assistant_reply and raw_msg in {"؟", "?", "ليه", "ليه؟", "ليه ?", "وقفت ليه", "وقفت ليه ؟", "ها", "وبعدين", "وبعدين ؟"}:
                    resolution_xml = (
                        f"\n<context_resolution>\n"
                        f"تنبيه SOTA 2026: التاجر يستفسر عن سبب التوقف أو العائق الأخير المذكور في رسالتك السابقة برسالة مقتضبة (\"{ctx.message}\").\n"
                        f"آخر إفادة للمساعد تضمنت عائقاً أو تعثراً: \"{last_assistant_reply[:240]}...\"\n"
                        "المطلوب الحتمي: اشرح للتاجر سبب العائق بدقة بلغة أعمال احترافية وودودة باللغة العربية، "
                        "وقدم له الحل المباشر والخطوة التالية لتجاوز هذا العائق فوراً.\n"
                        "يُمنع منعاً باتاً: البدء برسالة ترحيب عامة أو القول 'وصلتني رسالتك فاضية' أو تكرار المحاولة الفاشلة بنفس الطريقة!\n"
                        "</context_resolution>"
                    )
                    dynamic_sections.append(("context_resolution", resolution_xml))
                elif last_explicit_request:
                    resolution_xml = (
                        f"\n<context_resolution>\n"
                        f"التاجر يتابع ويطلب استكمال طلبه السابق: \"{last_explicit_request}\" برسالة مقتضبة (\"{ctx.message}\").\n"
                        "المطلوب: نفذ أو أجب عن هذا الطلب فوراً بالأرقام والتفاصيل وبأسلوبك البشري الودود، "
                        "ويُمنع منعاً باتاً اعتبار الرسالة فارغة أو قول 'وصلتني رسالتك فاضية' أو طلب إعادة تحديد المنتج.\n"
                        "</context_resolution>"
                    )
                    dynamic_sections.append(("context_resolution", resolution_xml))
            except Exception as ell_err:
                logger.warning("elliptical_resolution_failed", error=str(ell_err))

        # Combine base + static prefix + dynamic tail
        full_prompt = base_prompt
        for _name, xml_content in static_sections:
            full_prompt += xml_content
        for _name, xml_content in dynamic_sections:
            full_prompt += xml_content

        return full_prompt

    # ─── Token Budget Enforcement ─────────────────────────────────

    def _enforce_token_budget(
        self,
        system_prompt: str,
        history: list[dict[str, Any]],
        current_message: str,
        budget: int,
    ) -> tuple[str, list[dict[str, Any]]]:
        """Hard-enforce token budget by truncating/dropping sections.

        Priority: base prompt > history > droppable prompt sections.
        Returns (possibly truncated system_prompt, possibly trimmed history).
        """
        system_tokens = count_tokens(system_prompt)
        message_tokens = count_tokens(current_message)
        history_tokens = sum(count_tokens(m.get("content", "")) for m in history)

        total = system_tokens + history_tokens + message_tokens
        if total <= budget:
            return system_prompt, history

        overshoot = total - budget
        logger.warning(
            "token_budget_exceeded",
            total=total,
            budget=budget,
            overshoot=overshoot,
        )

        # Strategy 1: Trim oldest history messages first
        while overshoot > 0 and len(history) > 1:
            removed = history.pop(0)
            freed = count_tokens(removed.get("content", ""))
            overshoot -= freed
            logger.debug("dropped_history_message", freed=freed, remaining_overshoot=overshoot)

        if overshoot <= 0:
            return system_prompt, history

        # Strategy 2: Drop low-priority sections from system prompt
        # Order: least important dropped first, most important preserved
        droppable_tags = [
            ("session_state", "<session_state>", "</session_state>"),
            ("conversation_summary", "<conversation_summary>", "</conversation_summary>"),
            ("company_knowledge", "<company_knowledge>", "</company_knowledge>"),
            ("relevant_memories", "<relevant_memories>", "</relevant_memories>"),
        ]

        for tag_name, open_tag, close_tag in droppable_tags:
            if overshoot <= 0:
                break
            start_idx = system_prompt.find(open_tag)
            if start_idx == -1:
                continue
            end_idx = system_prompt.find(close_tag)
            if end_idx == -1:
                continue
            end_idx += len(close_tag)
            section = system_prompt[start_idx:end_idx]
            freed = count_tokens(section)
            system_prompt = system_prompt[:start_idx] + system_prompt[end_idx:]
            overshoot -= freed
            logger.info("dropped_section", section=tag_name, freed=freed, remaining_overshoot=overshoot)

        return system_prompt, history

    # ─── Main Assembly ────────────────────────────────────────────

    async def assemble_messages(self, ctx: PipelineContext) -> list[dict[str, Any]]:
        """Fetch history, compress it, and compile the full list of messages for LLM processing."""
        # Retrieve recent history messages from DB
        history = await self.fetch_message_history(ctx, limit=50)

        # Calculate original tokens in history
        ctx.original_history_tokens = sum(count_tokens(m.get("content", "")) for m in history)

        # Compress history if needed
        llm_client = getattr(ctx, "llm_client", None) or (
            ctx.agent.client if (ctx.agent and hasattr(ctx.agent, "client")) else None
        )
        retained_history, summary_text = await compress_history(
            messages=history,
            max_tokens=1000,
            keep_recent=30,
            llm_client=llm_client
        )

        # Calculate compressed tokens
        comp_tokens = sum(count_tokens(m.get("content", "")) for m in retained_history)
        if summary_text:
            comp_tokens += count_tokens(summary_text)
        ctx.compressed_history_tokens = comp_tokens

        # Build system prompt (incorporating all context sources)
        system_prompt = await self.build_system_prompt(ctx)
        if summary_text:
            system_prompt += f"\n\n<conversation_summary>\n{summary_text}\n</conversation_summary>"

        # Enforce hard token budget
        system_prompt, retained_history = self._enforce_token_budget(
            system_prompt=system_prompt,
            history=retained_history,
            current_message=ctx.message,
            budget=ctx.token_budget,
        )

        # Detect elliptical/punctuation queries (e.g. "؟", "?", "ليه ؟", "وقفت ليه ؟", "ها", "وبعدين")
        # and resolve context against immediate preceding user turn.
        raw_user_msg = (ctx.message or "").strip()
        is_elliptical = (
            raw_user_msg in {"؟", "?", "؟؟", "??", "ليه", "ليه؟", "ليه ؟", "ها", "ها؟", "وبعدين", "وبعدين؟", "وقفت ليه", "وقفت ليه؟", "وقفت ليه ؟", "ايه الاخبار", "ايه الأخبار", "كمل", "تمام؟", "تمام ؟"}
            or (len(raw_user_msg) <= 4 and bool(re.match(r"^[\s\.\?؟!]+$", raw_user_msg)))
        )
        if is_elliptical and retained_history:
            # Find the most recent prior user request in history
            prior_user_turns = [
                m["content"] for m in reversed(retained_history)
                if m.get("role") == "user" and m.get("content", "").strip() not in {"؟", "?", "ليه", "ها", "وقفت ليه"}
            ]
            if prior_user_turns:
                last_request = prior_user_turns[0].strip()
                resolution_instruction = (
                    f"\n\n<context_resolution>\n"
                    f"[HERMES CONVERSATIONAL CONTINUITY]:\n"
                    f"The merchant just sent a short elliptical prompt or inquiry ('{raw_user_msg}'). "
                    f"They are specifically following up on and waiting for their prior request: \"{last_request}\".\n"
                    f"Fulfill and address that prior request directly and completely right now. "
                    f"Do NOT treat this as an empty message, do NOT greet or re-introduce yourself, and NEVER say 'وصلتني رسالتك فاضية'.\n"
                    f"</context_resolution>"
                )
                system_prompt += resolution_instruction

        # Update context prompt
        ctx.system_prompt = system_prompt

        # Assemble message list
        compiled = [{"role": "system", "content": system_prompt}]

        # Append history messages (recent turns)
        for msg in retained_history:
            compiled.append({"role": msg["role"], "content": msg["content"]})

        # Append current user message, preserving image attachments as
        # provider-native multimodal content parts.
        compiled.append({
            "role": "user",
            "content": build_user_content(ctx.message, getattr(ctx, "attachments", []) or []),
        })

        return compiled

