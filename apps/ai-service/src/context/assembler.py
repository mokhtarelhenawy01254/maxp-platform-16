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
                return self._dedupe_adjacent_messages(history_messages)

        lookup_id = ctx.conversation_id or ctx.thread_id
        if not lookup_id or not ctx.session:
            return []

        history_messages = []
        try:
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

        return self._dedupe_adjacent_messages(history_messages)

    async def fetch_session_state(self, ctx: PipelineContext) -> dict[str, Any] | None:
        """Fetch current working memory session state (cart, search filters, etc.)."""
        external_memory = getattr(ctx, "external_memory_context", None) or {}
        if external_memory:
            filtered = {k: v for k, v in external_memory.items() if v}
            if filtered:
                ctx.session_state = filtered
                return filtered

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

        # Channel-specific: Facebook continuation instructions
        # Prevents the agent from introducing itself or changing direction when
        # the customer was already talking to a human agent before AI activation.
        if ctx.channel == "facebook":
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
        agent = ctx.agent
        if agent and hasattr(agent, "allowed_skills") and agent.allowed_skills:
            from src.skills.integration import get_skills_block
            full_skills_block = get_skills_block(agent.allowed_skills)
            if full_skills_block:
                static_sections.append(("skills", full_skills_block))
                logger.info(
                    "injected_full_skills",
                    skill_count=len(agent.allowed_skills),
                    skills=sorted(agent.allowed_skills),
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

            if state_lines:
                state_xml = "\n<session_state>\n" + "\n".join(state_lines) + "\n</session_state>"
                dynamic_sections.append(("session_state", state_xml))

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
