from __future__ import annotations

import json
import re
import time
from typing import Any

import structlog

from src.contracts.response_schema import AgentResponse
from src.guardrails.output import OUTPUT_GUARDRAILS
from src.llm.client import LLMClient
from src.observability.context_metrics import compute_context_metrics
from src.pipeline.context import PipelineContext

logger = structlog.get_logger(__name__)

MAX_OUTPUT_RETRIES = 1
REVIEW_MODEL_PRIORITY = ["deepseek-v4-flash", "gemini-2.5-flash", "gpt-5.4-nano"]


# ─────────────────────────────────────────────────────────────────────
# Anti-hallucination guard for state-changing actions
# ─────────────────────────────────────────────────────────────────────
# When the agent's reply claims that a state-changing action succeeded
# (e.g. "تم التأكيد ✅", "confirmed", "shipped"), the LLM must have actually
# invoked the corresponding tool with a successful result. This guard runs
# BEFORE self-review and replaces the reply with a transparent fallback
# when the claim is unsupported by tool evidence. Fixes the "LLM says
# confirmed but order stays PENDING" hallucination.
_STATE_CHANGING_TOOLS = {
    "order_confirm",
    "order_update_details",
    "order_cancel",
    "order_refund",
    "order_create_draft",
    "order_create_confirmed",
}

_HALLUCINATION_PHRASES = [
    # Arabic success claims
    "اتأكد", "تم التأكيد", "اتنفذ", "اتعدل", "اتنقل للشحن",
    "اتنقل", "اتحفظ", "اتلغي", "تم الإلغاء", "اتعمله",
    "راح للشحن", "اتشحن", "اترد للعميل", "اترجع",
    "confirmed", "updated", "shipped", "cancelled", "canceled",
    "saved", "done", "refunded", "تم بنجاح",
]

_HALLUCINATION_FALLBACK = (
    "حاولت أعمل الخطوة دي بس مفيش استجابة من النظام، "
    "ممكن تجرب تاني بعد ثانية؟"
)


def _has_hallucinated_success_claim(text: str, executed_tools: list[dict[str, Any]]) -> bool:
    """Return True if the reply claims a state-changing action succeeded,
    but no such tool was actually executed with a successful result.

    This is a string-based check (no LLM call) — fast and deterministic.
    """
    if not text or not executed_tools:
        return False
    text_lower = text.lower()
    if not any(phrase in text_lower for phrase in _HALLUCINATION_PHRASES):
        return False
    # Did any state-changing tool succeed?
    for item in executed_tools:
        if not isinstance(item, dict):
            continue
        tool_name = item.get("tool", "")
        status = item.get("status", "")
        if tool_name in _STATE_CHANGING_TOOLS and status == "success":
            return False
    return True


def _build_hallucination_correction(
    ctx: PipelineContext, hallucinated_reply: str
) -> list[dict[str, Any]]:
    """Build a correction message that pushes the LLM to actually call the
    state-changing tool instead of claiming success in plain text.

    This is the SOTA 2026 pattern: when the agent hallucinates a success
    claim, we don't lie to the customer with a fake "system error" — we
    give the model another chance to do the real work and verify the
    tool's success before responding.
    """
    evidence_text = _summarize_evidence(ctx.tool_evidence)
    return [
        {
            "role": "user",
            "content": (
                f"ردك السابق كان: \n"
                f"\"{hallucinated_reply[:400]}\"\n\n"
                "⚠️ لكنك قلت للعميل إن العملية نجحت من غير ما تستدعي أي أداة "
                "state-changing فعلاً. ده hallucination ومش مسموح — ممنوع تقول "
                "\"اتأكد\" / \"confirmed\" / \"shipped\" / \"تم\" لحد ما الأداة ترجع success فعلاً.\n\n"
                f"الأدوات اللي اتنادت في الـ turn ده: "
                f"{[item.get('tool', '') for item in (ctx.executed_tools or []) if isinstance(item, dict)]}\n"
                f"نتائج الأدوات (tool evidence): {evidence_text or '(لا توجد)'}\n\n"
                "اعمل call للأداة الصح (order_confirm / order_update_details / "
                "order_cancel / order_refund) دلوقتي، استنى نتيجتها، وبعدين اتكلم "
                "مع العميل بناءً على النتيجة الفعلية. لو الأداة رجعت success → قول "
                "العميل. لو رجعت error → قول الحقيقة واطلب تاني."
            ),
        }
    ]


def _try_parse_json_object(text: str) -> dict[str, Any] | None:
    """Try multiple strategies to extract a JSON object from text."""
    if not text:
        return None
    try:
        obj = json.loads(text)
        return obj if isinstance(obj, dict) else None
    except (json.JSONDecodeError, TypeError, ValueError):
        pass
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence:
        try:
            obj = json.loads(fence.group(1))
            return obj if isinstance(obj, dict) else None
        except (json.JSONDecodeError, TypeError, ValueError):
            pass
    brace = re.search(r"\{.*\}", text, re.DOTALL)
    if brace:
        try:
            obj = json.loads(brace.group())
            return obj if isinstance(obj, dict) else None
        except (json.JSONDecodeError, TypeError, ValueError):
            pass
    return None


def _unwrap_llm_client(client):
    if hasattr(client, "_llm_client"):
        return client._llm_client
    return client


async def _raw_llm_call(ctx: PipelineContext, messages: list[dict]) -> str:
    client = _unwrap_llm_client(ctx.llm_client) if ctx.llm_client else None
    if not client:
        from src.llm.model_manager import model_manager

        agent_model = ctx.agent.model if ctx.agent and hasattr(ctx.agent, "model") else "deepseek-v4-flash"
        routing = await model_manager.get_next_key(agent_model, ctx.company_id)
        client = LLMClient(
            provider=routing.provider,
            model=routing.model,
            api_key=routing.api_key,
            base_url=routing.base_url,
        )
    response = await client.generate(messages=messages, tools=None, temperature=0.3)
    return response.text or ""


async def _raw_llm_call_with_tools(ctx: PipelineContext, messages: list[dict]) -> str:
    """LLM call WITH tools enabled — used by the hallucination re-prompt so the
    model can actually call the state-changing tool and verify the result.

    Returns the final text after tool calls are resolved (via the main pipeline's
    tool execution path). Falls back to text-only if the model still doesn't act.
    """
    from src.tools.registry import get_tool_names_for_role
    from src.tools.definitions._helpers import _execute_registry_tool
    from src.pipeline.stages.skills_pipeline import (
        _execute_one_tool,
        _build_skill_tool_dicts,
    )

    client = _unwrap_llm_client(ctx.llm_client) if ctx.llm_client else None
    if not client:
        from src.llm.model_manager import model_manager
        agent_model = ctx.agent.model if ctx.agent and hasattr(ctx.agent, "model") else "deepseek-v4-flash"
        routing = await model_manager.get_next_key(agent_model, ctx.company_id)
        client = LLMClient(
            provider=routing.provider,
            model=routing.model,
            api_key=routing.api_key,
            base_url=routing.base_url,
        )

    # Resolve tool dicts from the agent's allowed tools
    from src.pipeline.stages.skills_pipeline import _get_skills_for_agent
    skills = await _get_skills_for_agent(ctx)
    tool_dicts = _build_skill_tool_dicts(skills, ctx) if skills else None

    from src.tools.registry import ToolRegistry
    registry = ToolRegistry()

    # Single LLM call with tools; if the model emits a tool call, execute it
    # via the same path the main pipeline uses, then make a follow-up call.
    response = await client.generate(messages=messages, tools=tool_dicts, temperature=0.2)
    if not response.tool_calls:
        return response.text or ""

    # Execute the model's tool calls
    import asyncio
    executed = list(await asyncio.gather(*[_execute_one_tool(ctx, registry, tc) for tc in response.tool_calls]))
    # Persist executed_tools so the follow-up check sees the fresh call
    ctx.executed_tools = (ctx.executed_tools or []) + executed

    # Follow-up call to get the model's final text response, now that tools ran
    followup = list(messages) + [
        {"role": "assistant", "content": response.text or "", "tool_calls": response.tool_calls},
    ]
    for item in executed:
        followup.append({
            "role": "tool",
            "tool_call_id": item.get("tool_call_id", ""),
            "content": json.dumps(item.get("result", {}), ensure_ascii=False)[:2000],
        })
    final = await client.generate(messages=followup, tools=None, temperature=0.2)
    return final.text or ""


def _strip_internal_tags(text: str) -> str:
    text = re.sub(r"<thought\b[^>]*>.*?</thought>", "", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"</?thought\b[^>]*>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<function\b[^>]*>.*?</function>", "", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"</?function\b[^>]*>", "", text, flags=re.IGNORECASE)
    return text.strip()


async def _get_flash_review_client(ctx: PipelineContext) -> tuple[LLMClient | None, str]:
    """Returns (client, model_name). model_name used for logging."""
    from src.llm.model_manager import model_manager

    # 1. Per-agent override
    agent_config = ctx.agent.config if ctx.agent and hasattr(ctx.agent, "config") else {}
    preferred = agent_config.get("reviewModel") if isinstance(agent_config, dict) else None

    # 2. Global default from global_ai_config.settings
    global_review_model = None
    try:
        global_config = await model_manager.get_global_ui_config()
        global_review_model = (global_config or {}).get("settings", {}).get("reviewModel")
    except Exception:
        pass

    # 3. Build priority: per-agent > global > hardcoded REVIEW_MODEL_PRIORITY
    models_to_try = []
    if preferred:
        models_to_try.append(preferred)
    if global_review_model and global_review_model not in models_to_try:
        models_to_try.append(global_review_model)
    models_to_try.extend(m for m in REVIEW_MODEL_PRIORITY if m not in models_to_try)
    seen = set()
    for model_name in models_to_try:
        if not model_name or model_name in seen:
            continue
        seen.add(model_name)
        try:
            routing = await model_manager.get_next_key(model_name, ctx.company_id)
            if routing:
                return LLMClient(
                    provider=routing.provider,
                    model=routing.model,
                    api_key=routing.api_key,
                    base_url=routing.base_url,
                ), routing.model
        except Exception:
            continue
    client = _unwrap_llm_client(ctx.llm_client) if ctx.llm_client else None
    if client:
        return client, getattr(client, "model", REVIEW_MODEL_PRIORITY[-1])
    try:
        agent_model = ctx.agent.model if ctx.agent and hasattr(ctx.agent, "model") else "deepseek-v4-flash"
        routing = await model_manager.get_next_key(agent_model, ctx.company_id)
        return LLMClient(
            provider=routing.provider,
            model=routing.model,
            api_key=routing.api_key,
            base_url=routing.base_url,
        ), routing.model
    except Exception:
        return None, ""


def _summarize_evidence(evidence: list[dict]) -> str:
    if not evidence:
        return "(لا توجد أدوات مستخدمة)"
    parts = []
    for item in evidence:
        tool = item.get("tool", "unknown")
        result = item.get("result", {})
        if isinstance(result, dict):
            keys = list(result.keys())[:15]
            summary = ", ".join(f"{k}: {str(result[k])[:1500]}" for k in keys if result[k] is not None)
        else:
            summary = str(result)[:3000]
        parts.append(f"{tool}: {{{summary}}}")
    return " | ".join(parts)


def _extract_agent_identity(ctx: PipelineContext) -> str:
    """Extract a compact identity block from the agent's system prompt and config."""
    parts: list[str] = []

    # Agent template type
    template_slug = str(
        getattr(ctx.agent, "template_slug", None)
        or getattr(ctx.agent, "slug", None)
        or "unknown"
    ) if ctx.agent else "unknown"
    parts.append(f"نوع الأيجنت: {template_slug}")

    # Channel
    if ctx.channel:
        parts.append(f"القناة: {ctx.channel}")

    # System prompt summary (first 2000 chars to capture persona + core instructions)
    sys_prompt = ctx.system_prompt or ""
    if sys_prompt:
        # Take the first meaningful chunk — usually contains persona, role, and key rules
        prompt_summary = sys_prompt[:2000]
        if len(sys_prompt) > 2000:
            prompt_summary += "\n... (تم اختصار باقي التعليمات)"
        parts.append(f"تعليمات الأيجنت:\n{prompt_summary}")
    else:
        parts.append("تعليمات الأيجنت: (غير متوفرة)")

    return "\n".join(parts)


def _extract_conversation_context(ctx: PipelineContext, max_turns: int = 5) -> str:
    """Extract the last N conversation turns for review context."""
    if not ctx.messages:
        return "(لا يوجد تاريخ محادثة)"
    # Take the last `max_turns` messages (excluding the current user message which is passed separately)
    recent = ctx.messages[-(max_turns * 2):] if len(ctx.messages) > max_turns * 2 else ctx.messages
    lines = []
    for msg in recent:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        if isinstance(content, list):  # multimodal content
            content = " ".join(
                part.get("text", "[مرفق]") if isinstance(part, dict) else str(part)
                for part in content
            )
        # Truncate individual messages to keep context manageable
        content = str(content)[:400]
        if role == "user":
            lines.append(f"👤 العميل: {content}")
        elif role == "assistant":
            lines.append(f"🤖 المساعد: {content}")
        elif role == "tool":
            lines.append(f"🔧 أداة: {content[:200]}")
    return "\n".join(lines) if lines else "(لا يوجد تاريخ محادثة)"


async def _log_review(
    ctx: PipelineContext, status: str, *,
    reply: str = "", model_used: str = "", latency_ms: int = 0,
    verdict: dict | None = None,
    original_reply: str = "",
) -> None:
    try:
        from src.db import session
        from src.db.repo.review_log_repo import ReviewLogRepo
        async with session.async_session() as db:
            repo = ReviewLogRepo(db)
            agent_name = str(getattr(ctx.agent, "name", None) or "")
            metadata_: dict[str, Any] = {"agent_name": agent_name}
            if original_reply:
                metadata_["original_reply"] = original_reply[:200]
            await repo.create(
                company_id=ctx.company_id,
                agent_id=str(getattr(ctx.agent, "id", None) or getattr(ctx.agent, "agent_id", None) or ""),
                agent_slug=str(getattr(ctx.agent, "template_slug", None) or getattr(ctx.agent, "slug", None) or ""),
                reply_preview=reply[:200],
                model_used=model_used,
                latency_ms=latency_ms,
                status=status,
                violations=verdict.get("violations") if verdict else None,
                reason=verdict.get("reason") if verdict else None,
                verdict_raw=verdict,
                metadata_=metadata_,
            )
    except Exception as e:
        logger.warning("self_review.log_failed", error=str(e))


async def _self_review(ctx: PipelineContext, reply: str) -> str | None:
    """LLM-as-Judge: review reply quality, merchant rules, accuracy, tone.
    Returns None if approved, or a corrected reply string.
    """
    # Check global self-review toggle DIRECTLY from DB (no cache)
    try:
        from src.db import session as _db_session_module
        from src.db.models.provider import GlobalAiConfig as _G
        from sqlalchemy import select as _select
        async with _db_session_module.async_session() as _db:
            _r = await _db.execute(_select(_G))
            _gc = _r.scalar_one_or_none()
            if _gc and _gc.settings and _gc.settings.get("selfReviewEnabled") is False:
                await _log_review(ctx, "skipped", reply=reply)
                return None
    except Exception:
        pass

    client, model_name = await _get_flash_review_client(ctx)
    if not client:
        await _log_review(ctx, "skipped", reply=reply)
        return None

    # --- Gather full context for the judge ---

    # 1. Agent identity & instructions
    agent_identity = _extract_agent_identity(ctx)

    # 2. Conversation history
    conversation_context = _extract_conversation_context(ctx, max_turns=5)

    # 3. Merchant guardrail rules
    rules_text = "(لا توجد قوانين نشطة)"
    try:
        from src.db import session
        async with session.async_session() as db:
            from src.guardrails.merchant_rules import MerchantRuleGuardrail
            guardrail = MerchantRuleGuardrail()
            agent_id = str(getattr(ctx.agent, "id", None) or getattr(ctx.agent, "agent_id", None) or "")
            if agent_id:
                rules = await guardrail.get_relevant_rules(db, agent_id, ctx.message, top_k=5)
                if rules:
                    rules_text = "\n".join(
                        f"- {r['excuse']} => {r['rebuttal']} ({r['action']})"
                        for r in rules
                    )
    except Exception as e:
        logger.warning("self_review_rules_fetch_failed", error=str(e))

    # 4. Tool execution evidence
    evidence_text = _summarize_evidence(ctx.tool_evidence)

    # --- Build the comprehensive review prompt ---
    review_prompt = (
        "أنت مدقق جودة ومُحسِّن نشط لردود المساعد الذكي. "
        "لديك كامل السياق اللازم للحكم على جودة الرد وتحسينه إذا لزم الأمر.\n"
        "دورك ليس فقط الموافقة أو الرفض — بل أيضاً تحسين الرد ليبدو كأنه من موظف بشري محترف.\n\n"
        "═══════════════════════════════════════\n"
        "📋 هوية الأيجنت وتعليماته:\n"
        "═══════════════════════════════════════\n"
        f"{agent_identity}\n\n"
        "═══════════════════════════════════════\n"
        "💬 سياق المحادثة (آخر الرسائل):\n"
        "═══════════════════════════════════════\n"
        f"{conversation_context}\n\n"
        "═══════════════════════════════════════\n"
        "🔧 بيانات الأدوات المسترجعة من قاعدة البيانات:\n"
        "═══════════════════════════════════════\n"
        f"{evidence_text}\n\n"
        "═══════════════════════════════════════\n"
        "⚖️ قوانين التاجر النشطة:\n"
        "═══════════════════════════════════════\n"
        f"{rules_text}\n\n"
        "═══════════════════════════════════════\n"
        "🔴 تخيلات ضارة (يجب الرفض والتصحيح):\n"
        "═══════════════════════════════════════\n"
        "- اختراع أسعار أو خصومات أو عروض غير موجودة في بيانات الأدوات\n"
        "- ذكر فروع أو عناوين أو أرقام تليفونات وهمية\n"
        "- ذكر خدمات أو منتجات لا يقدمها المركز/الشركة\n"
        "- ذكر أسماء أطباء أو موظفين غير موجودين\n"
        "- تأكيد حجز أو طلب لم يتم فعلياً\n\n"
        "🟢 بداهة خدمية بشرية (مسموح بها ويجب الحفاظ عليها):\n"
        "═══════════════════════════════════════\n"
        "- اقتراح الدفع نقداً والحصول على فاتورة لتقديمها لشركة التأمين (بداهة خدمية عامة)\n"
        "- الترحيب اللطيف والاعتذار عن التأخير أو الإزعاج\n"
        "- اقتراح بدائل منطقية عامة (مثل: 'يمكنك زيارتنا في أي وقت خلال ساعات العمل')\n"
        "- التعاطف مع العميل وإظهار الاهتمام الشخصي\n"
        "- شرح إجراءات عامة معروفة (مثل: آلية التأمين، طريقة الحجز)\n"
        "- استخدام تعبيرات ودية طبيعية تضيف دفئاً بشرياً\n"
        "⚠️ هذه ليست هلوسة! هذه مبادرات يفعلها أي موظف استقبال بشري محترف.\n\n"
        "═══════════════════════════════════════\n"
        "معايير المراجعة (راجع كل نقطة):\n"
        "═══════════════════════════════════════\n"
        "1. الالتزام بالتعليمات — هل يتبع تعليمات الأيجنت وشخصيته المحددة أعلاه؟\n"
        "2. دقة المعلومات — هل المعلومات الواقعية (أسعار، خدمات، مواعيد، فروع) متطابقة مع بيانات الأدوات؟\n"
        "3. التخيلات الضارة فقط — هل يذكر معلومات واقعية مختلقة (وليس بداهة خدمية عامة)؟\n"
        "4. قوانين التاجر — هل يخالف أي قاعدة من القوانين النشطة؟\n"
        "5. النبرة واللغة — هل مناسبة لنوع الأيجنت والقناة المستخدمة؟\n"
        "6. الاتساق — هل الرد متسق مع ما قيل سابقاً في المحادثة؟\n"
        "7. البشرية — هل الرد يبدو طبيعياً كموظف بشري أم جاف وآلي؟\n\n"
        "═══════════════════════════════════════\n"
        "📝 قواعد القرار:\n"
        "═══════════════════════════════════════\n"
        "• إذا الرد صحيح وطبيعي ← approved: true, need_polish: false\n"
        "• إذا الرد صحيح لكن جاف/آلي/ممكن يتحسن ← approved: true, need_polish: true, واكتب polished_reply\n"
        "• إذا الرد فيه خطأ واقعي ضار ← approved: false, واكتب polished_reply بالتصحيح الكامل\n\n"
        "⚠️ عند كتابة polished_reply:\n"
        "- حافظ على نفس شخصية الأيجنت ونبرته المحددة في التعليمات أعلاه\n"
        "- اجعل الرد يبدو كأنه من موظف بشري حقيقي — ودود، طبيعي، وفيه لمسة شخصية\n"
        "- لا تكتب رداً جافاً أو رسمياً زائد عن اللزوم\n"
        "- حافظ على كل المعلومات الصحيحة من الرد الأصلي\n"
        "- صحح فقط الأخطاء الواقعية وحسّن الأسلوب البشري\n\n"
        'رد بصيغة JSON فقط:\n'
        '{"approved": true/false, "reason": "سبب التعديل أو الرفض إن وجد", '
        '"violations": ["قائمة المخالفات الواقعية فقط"], '
        '"need_polish": true/false, '
        '"polished_reply": "الرد بعد التحسين البشري الكامل (مطلوب إذا need_polish=true أو approved=false)"}'
    )

    messages = [
        {"role": "system", "content": review_prompt},
        {"role": "user", "content": f"رسالة العميل الحالية:\n{ctx.message}\n\nرد المساعد المطلوب مراجعته:\n{reply}"},
    ]

    t0 = time.monotonic()
    try:
        response = await client.generate(messages=messages, tools=None, temperature=0.1)
        latency = int((time.monotonic() - t0) * 1000)
        parsed_obj = _try_parse_json_object(response.text)
        if parsed_obj is None:
            raise json.JSONDecodeError("Failed to parse JSON object from review model output", response.text, 0)
        verdict = parsed_obj

        is_approved = verdict.get("approved", False)
        need_polish = verdict.get("need_polish", False)
        polished_reply = (verdict.get("polished_reply") or "").strip()
        reason = verdict.get("reason", "")
        violations = verdict.get("violations", [])
        agent_slug = str(getattr(ctx.agent, "template_slug", None) or getattr(ctx.agent, "slug", None) or "")

        # Case 1: Approved, no polish needed — pass through
        if is_approved and not need_polish:
            await _log_review(ctx, "approved", reply=reply, original_reply=reply, model_used=model_name, latency_ms=latency, verdict=verdict)
            return None

        # Case 2: Approved but needs polish — use polished_reply directly (saves an LLM call)
        if is_approved and need_polish and polished_reply:
            logger.info("self_review.polished",
                reason=reason, latency_ms=latency, agent_slug=agent_slug,
            )
            await _log_review(ctx, "polished", reply=polished_reply, original_reply=reply, model_used=model_name, latency_ms=latency, verdict=verdict)
            return polished_reply

        # Case 3: Rejected — use polished_reply if available, otherwise fall back to _correct_output
        if not is_approved:
            logger.info("self_review.rejected",
                reason=reason, violations=violations, latency_ms=latency, agent_slug=agent_slug,
            )
            if polished_reply:
                # Judge already provided a corrected version — use it directly
                logger.info("self_review.corrected_by_judge",
                    reason=reason, latency_ms=latency, agent_slug=agent_slug,
                )
                await _log_review(ctx, "corrected", reply=polished_reply, original_reply=reply, model_used=model_name, latency_ms=latency, verdict=verdict)
                return polished_reply
            else:
                # Fallback: ask the main model to correct (slower path)
                corrected = await _correct_output(ctx, reply, reason, violations)
                if corrected:
                    logger.info("self_review.corrected_by_main_model",
                        reason=reason, latency_ms=latency, agent_slug=agent_slug,
                    )
                    await _log_review(ctx, "corrected", reply=corrected, original_reply=reply, model_used=model_name, latency_ms=latency, verdict=verdict)
                else:
                    await _log_review(ctx, "rejected", reply=reply, original_reply=reply, model_used=model_name, latency_ms=latency, verdict=verdict)
                return corrected

        # Case 4: Approved + need_polish but no polished_reply provided — pass through
        await _log_review(ctx, "approved", reply=reply, original_reply=reply, model_used=model_name, latency_ms=latency, verdict=verdict)
        return None
    except (json.JSONDecodeError, KeyError) as e:
        logger.warning("self_review.parse_failed", error=str(e), text=getattr(response, 'text', '')[:200])
        await _log_review(ctx, "error", reply=reply, model_used=model_name, latency_ms=latency or 0)
        return None
    except Exception as e:
        logger.warning("self_review.failed", error=str(e), model=model_name)
        await _log_review(ctx, "error", reply=reply, model_used=model_name, latency_ms=latency or 0)
        return None


async def _correct_output(
    ctx: PipelineContext, reply: str, reason: str, violations: list[str]
) -> str | None:
    evidence_text = _summarize_evidence(ctx.tool_evidence)
    # Extract agent persona name from system prompt for identity reinforcement
    agent_name = ""
    if ctx.system_prompt:
        import re as _re
        name_match = _re.search(r"Name:\s*(.+)", ctx.system_prompt)
        if name_match:
            agent_name = name_match.group(1).strip()

    persona_reminder = ""
    if agent_name:
        persona_reminder = (
            f"\n\n⚠️ تذكير هام بالهوية: أنت {agent_name}. "
            "يجب أن يبدو ردك كأنه من موظف بشري حقيقي — ودود وطبيعي. "
            "لا تكتب رداً جافاً أو رسمياً أو آلياً. "
            "حافظ على شخصيتك ونبرتك البشرية الدافئة. "
            "استخدم تعبيرات طبيعية وأضف لمسة شخصية."
        )

    correction_msg = (
        f"تم حظر ردك السابق بسبب: {reason}\n"
        f"التفاصيل: {', '.join(violations)}\n"
        f"بيانات الأدوات الفعلية المسترجعة من قاعدة البيانات: {evidence_text}\n"
        "يرجى إعادة الصياغة لتجنب هذه المشكلة تماماً، مع الالتزام ببيانات الأدوات المتوفرة وعدم اختراع أي أسعار أو خدمات أو فروع غير موجودة فيها.\n"
        "لكن يمكنك استخدام البداهة الخدمية العامة مثل: اقتراح الدفع نقداً مع فاتورة، الترحيب، الاعتذار، اقتراح بدائل منطقية عامة."
        f"{persona_reminder}"
    )
    messages = [
        {"role": "system", "content": ctx.system_prompt or "أنت مساعد ذكي."},
        {"role": "user", "content": ctx.message},
        {"role": "assistant", "content": reply},
        {"role": "user", "content": correction_msg},
    ]
    try:
        # Use _raw_llm_call for guardrail corrections (main model, keeps quality)
        return await _raw_llm_call(ctx, messages)
    except Exception:
        logger.exception("output_guardrail_correction_failed")
        return None


async def _correct_validation_error(
    ctx: PipelineContext, reply: str, error_msg: str
) -> str | None:
    schema_desc = (
        "يجب أن يكون الرد عبارة عن كائن JSON صالح يطابق هذا المخطط (schema):\n"
        "{\n"
        '  "reply": "نص الرد الموجه للمستخدم باللغة العربية",\n'
        '  "confidence": 1.0, // قيمة عشرية بين 0.0 و 1.0\n'
        '  "action_taken": "اسم الإجراء المتخذ أو null",\n'
        '  "escalation_needed": false, // قيمة منطقية\n'
        '  "escalation_reason": "سبب التصعيد أو null",\n'
        '  "metadata": {}, // كائن يحتوي على أي بيانات إضافية\n'
        '  "attachments": [] // قائمة المرفقات: [{type: "image", url: "data:...", source: "tool_result", tool: "tool_name"}]\n'
        "}\n"
    )
    correction_msg = (
        f"فشل الرد السابق في مطابقة مخطط البيانات المعتمد بسبب الخطأ التالي:\n"
        f"{error_msg}\n\n"
        f"{schema_desc}\n"
        "يرجى إعادة كتابة الرد بصيغة JSON صالحة ومطابقة تماماً للمخطط أعلاه."
    )
    messages = [
        {"role": "system", "content": ctx.system_prompt or "أنت مساعد ذكي."},
        {"role": "user", "content": ctx.message},
        {"role": "assistant", "content": reply},
        {"role": "user", "content": correction_msg},
    ]
    try:
        return await _raw_llm_call(ctx, messages)
    except Exception:
        logger.exception("output_validation_correction_failed")
        return None


# ── Output risk scrubbing (2026 dual-guardrail gap fix) ──────────────
# Customer replies must never carry provider secrets, credentials, or
# stack traces. Phones are intentionally NOT masked — merchant order
# workflows legitimately surface customer phones.

_SECRET_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("api_key", re.compile(r"\bsk-[A-Za-z0-9]{16,}\b")),
    ("google_key", re.compile(r"\bAIza[0-9A-Za-z_\-]{30,}\b")),
    ("github_token", re.compile(r"\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,})\b")),
    ("slack_token", re.compile(r"\bxox[baprs]-[A-Za-z0-9\-]{10,}\b")),
    ("bearer_token", re.compile(r"\bBearer\s+[A-Za-z0-9._\-]{20,}\b", re.IGNORECASE)),
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{10,}\b")),
    ("credential_kv", re.compile(
        r"(?i)\b(api[_-]?key|secret|token|password|passwd)\b\s*[:=]\s*['\"]?[A-Za-z0-9._\-]{12,}"
    )),
    ("db_connection_string", re.compile(
        r"\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis)://[^\s:@/]+:[^\s:@/]+@", re.IGNORECASE
    )),
    ("long_hex_secret", re.compile(r"\b[0-9a-f]{40,}\b", re.IGNORECASE)),
]

_TRACEBACK_BLOCK = re.compile(
    r"Traceback \(most recent call last\):(?:.|\n)+", re.IGNORECASE
)

_INTERNAL_NOISE = re.compile(
    r"(?i)\b(?:asyncpg|sqlalchemy|httpx|pydantic)\.(?:exceptions\.)?\w*Error\b[^\n]*"
)


def _scrub_output_risks(text: str) -> tuple[str, list[str]]:
    """Mask provider secrets/credentials and strip stack traces from a
    customer-facing reply. Returns (scrubbed_text, detected_risk_kinds)."""
    if not text:
        return text, []

    detected: list[str] = []
    scrubbed = text
    for kind, pattern in _SECRET_PATTERNS:
        if pattern.search(scrubbed):
            scrubbed = pattern.sub("••••••", scrubbed)
            detected.append(kind)

    if _TRACEBACK_BLOCK.search(scrubbed):
        scrubbed = _TRACEBACK_BLOCK.sub(
            "حصل عطل داخلي لحظي وتم احتواؤه — جرّب تاني بعد لحظات.", scrubbed
        )
        detected.append("traceback")

    if _INTERNAL_NOISE.search(scrubbed):
        scrubbed = _INTERNAL_NOISE.sub("عطل داخلي لحظي", scrubbed)
        detected.append("internal_exception")

    return scrubbed, detected


async def validate_reply(ctx: PipelineContext) -> PipelineContext:
    reply = ctx.llm_response or ""
    reply = _strip_internal_tags(reply)

    # If no LLM response and a final_reply is already set (e.g., from skills_pipeline error),
    # the raw tool output fallback at skills_pipeline.py:228 can leak "success" claims
    # that never had a real tool behind them. We can't easily re-prompt here because
    # the LLM was bypassed — fall back to a one-shot prompt that asks the main model
    # to call the right tool and respond honestly based on the actual result.
    if not reply and ctx.final_reply:
        if _has_hallucinated_success_claim(
            ctx.final_reply or "", ctx.executed_tools or []
        ):
            agent_slug = str(
                getattr(ctx.agent, "template_slug", None)
                or getattr(ctx.agent, "slug", None)
                or ""
            )
            executed_names = [
                item.get("tool", "")
                for item in (ctx.executed_tools or [])
                if isinstance(item, dict)
            ]
            logger.warning(
                "hallucination_reprompt_final_reply",
                agent_slug=agent_slug,
                original_reply=(ctx.final_reply or "")[:200],
                executed_tools=executed_names,
            )
            # Re-prompt the LLM with tools enabled so it can actually call
            # the state-changing tool and verify success.
            correction_messages = _build_hallucination_correction(ctx, ctx.final_reply or "")
            corrected = await _raw_llm_call_with_tools(ctx, correction_messages)
            if corrected and corrected.strip():
                ctx.final_reply = _strip_internal_tags(corrected)
                logger.info(
                    "hallucination_reprompt_succeeded",
                    agent_slug=agent_slug,
                    new_reply_preview=ctx.final_reply[:200],
                )
                return ctx
            # Re-prompt failed — silent escalation (no lying fallback)
            ctx.escalation_requested = True
            ctx.escalation_reason = "hallucination_reprompt_failed"
            ctx.final_reply = None
            logger.warning(
                "hallucination_reprompt_failed_escalating",
                agent_slug=agent_slug,
            )
            return ctx
        return ctx

    validated = None
    for attempt in range(MAX_OUTPUT_RETRIES + 1):
        # 1. Guardrail Check
        guardrail_result = None
        for guardrail in OUTPUT_GUARDRAILS:
            result = await guardrail.validate(ctx, reply)
            if not result.allowed:
                guardrail_result = result
                break

        if guardrail_result is None:
            try:
                from src.guardrails.merchant_rules import MerchantRuleGuardrail
                merchant_guardrail = MerchantRuleGuardrail()
                res = await merchant_guardrail.validate(ctx, reply)
                if not res.allowed:
                    guardrail_result = res
            except Exception as e:
                logger.warning("merchant_guardrails_validation_failed", error=str(e))


        if guardrail_result is not None:
            if attempt >= MAX_OUTPUT_RETRIES:
                # Silent Escalation: suppress error message, flag for human takeover
                ctx.escalation_requested = True
                ctx.escalation_reason = f"guardrail_blocked: {guardrail_result.reason}"
                ctx.final_reply = None
                ctx.early_return = {
                    "status": "GUARDRAIL_BLOCKED",
                    "result": {
                        "reason": guardrail_result.reason,
                        "violations": guardrail_result.violations,
                    },
                }
                logger.warning(
                    "silent_escalation_guardrail",
                    reason=guardrail_result.reason,
                    violations=guardrail_result.violations,
                )
                return ctx

            logger.warning(
                "output_guardrail_retrying", reason=guardrail_result.reason, attempt=attempt + 1
            )
            corrected = await _correct_output(
                ctx, reply, guardrail_result.reason, guardrail_result.violations
            )
            if not corrected:
                # Silent Escalation: correction failed, flag for human takeover
                ctx.escalation_requested = True
                ctx.escalation_reason = f"guardrail_correction_failed: {guardrail_result.reason}"
                ctx.final_reply = None
                ctx.early_return = {
                    "status": "GUARDRAIL_BLOCKED",
                    "result": {
                        "reason": guardrail_result.reason,
                        "violations": guardrail_result.violations,
                    },
                }
                logger.warning(
                    "silent_escalation_guardrail_correction_failed",
                    reason=guardrail_result.reason,
                )
                return ctx
            reply = _strip_internal_tags(corrected)
            continue

        # 2. Output Contract Validation Check
        try:
            parsed = _try_parse_json_object(reply)
            if parsed is not None:
                response_data = parsed
            else:
                if "{" in reply or "```json" in reply:
                    raise ValueError("Failed to parse JSON from response that resembles JSON format.")
                response_data = {"reply": reply}

            validated = AgentResponse(**response_data)
            ctx.response_contract = validated
            ctx.final_reply = validated.reply

            # ── Anti-hallucination guard (runs BEFORE self-review) ──
            # If the LLM claims a state-changing action succeeded but no
            # such tool was actually executed, re-prompt the LLM with
            # tools enabled so it can actually do the work and verify
            # the tool result before responding. No lying fallback.
            if _has_hallucinated_success_claim(
                ctx.final_reply or "", ctx.executed_tools or []
            ):
                agent_slug = str(
                    getattr(ctx.agent, "template_slug", None)
                    or getattr(ctx.agent, "slug", None)
                    or ""
                )
                executed_names = [
                    item.get("tool", "")
                    for item in (ctx.executed_tools or [])
                    if isinstance(item, dict)
                ]
                logger.warning(
                    "hallucination_reprompt_main",
                    agent_slug=agent_slug,
                    original_reply=(ctx.final_reply or "")[:200],
                    executed_tools=executed_names,
                    attempt=attempt,
                )
                if attempt < MAX_OUTPUT_RETRIES:
                    # Re-prompt: give the LLM another chance to actually
                    # call the tool. Build correction context and reset
                    # reply so the next LLM call uses the correction.
                    correction_messages = _build_hallucination_correction(
                        ctx, ctx.final_reply or ""
                    )
                    corrected = await _raw_llm_call_with_tools(
                        ctx, correction_messages
                    )
                    if corrected and corrected.strip():
                        # Re-run the guard on the new reply; if it's
                        # clean, fall through. If still hallucinated, the
                        # loop will catch it on the next iteration or
                        # we'll hit MAX_OUTPUT_RETRIES and escalate.
                        reply = _strip_internal_tags(corrected)
                        ctx.final_reply = None
                        continue
                    # Re-prompt failed; let the loop's next iteration try
                    # again or fall through to escalation.
                    logger.warning(
                        "hallucination_reprompt_no_text",
                        agent_slug=agent_slug,
                    )
                    continue
                # Out of retries — silent escalation
                ctx.escalation_requested = True
                ctx.escalation_reason = "hallucination_repeated"
                ctx.final_reply = None
                logger.warning(
                    "hallucination_repeated_escalating",
                    agent_slug=agent_slug,
                    original_reply=ctx.final_reply[:200] if ctx.final_reply else "",
                )
                return ctx
            # Merge LLM-provided attachments on top of auto-populated ones (e.g. landmarkImage)
            if validated.attachments:
                existing = {a.get("url"): a for a in (ctx.response_attachments or []) if a.get("url")}
                for a in validated.attachments:
                    if a.get("url"):
                        existing[a.get("url")] = a
                ctx.response_attachments = list(existing.values())
            logger.info(
                "validate_reply_attachments_final",
                count=len(ctx.response_attachments or []),
                urls=[a.get("url", "")[:120] for a in (ctx.response_attachments or [])],
            )

            # 3. Self-Review quality check (LLM-as-Judge)
            reviewed = await _self_review(ctx, ctx.final_reply or reply)
            if reviewed:
                if attempt >= MAX_OUTPUT_RETRIES:
                    ctx.final_reply = reviewed
                    ctx.llm_response = reviewed
                    break
                reply = _strip_internal_tags(reviewed)
                ctx.final_reply = None
                continue

            logger.info("self_review.approved",
                agent_slug=str(getattr(ctx.agent, "template_slug", None) or getattr(ctx.agent, "slug", None) or ""),
            )
            ctx.llm_response = reply
            break  # Validation + review succeeded!
        except Exception as exc:
            if attempt >= MAX_OUTPUT_RETRIES:
                logger.error("agent_response_validation_failed_final", reply=reply[:150], error=str(exc))
                # Silent Escalation: all validation retries exhausted, flag for human takeover
                ctx.escalation_requested = True
                ctx.escalation_reason = f"validation_exhausted: {str(exc)}"
                ctx.final_reply = None
                logger.warning(
                    "silent_escalation_validation_exhausted",
                    error=str(exc),
                )
                return ctx

            logger.warning("agent_response_validation_failed_retrying", error=str(exc), attempt=attempt + 1)
            corrected = await _correct_validation_error(ctx, reply, str(exc))
            if not corrected:
                # Silent Escalation: correction failed, flag for human takeover
                ctx.escalation_requested = True
                ctx.escalation_reason = f"validation_correction_failed: {str(exc)}"
                ctx.final_reply = None
                logger.warning(
                    "silent_escalation_validation_correction_failed",
                    error=str(exc),
                )
                return ctx
            reply = _strip_internal_tags(corrected)

    # 3. Context Metrics
    try:
        metrics = compute_context_metrics(
            system_prompt=ctx.system_prompt,
            messages=ctx.messages,
            tool_context=ctx.tool_context,
            model_name=(ctx.agent.model if ctx.agent and hasattr(ctx.agent, "model") else None)
            or "deepseek-v4-flash",
            original_history_tokens=getattr(ctx, "original_history_tokens", 0),
            compressed_history_tokens=getattr(ctx, "compressed_history_tokens", 0),
        )
        ctx.context_metrics = metrics
        logger.debug(
            "context_metrics_computed",
            total_tokens=metrics.total_tokens,
            utilization=metrics.utilization_pct,
        )
    except Exception as e:
        logger.warning("context_metrics_failed", error=str(e))

    # Final safety: extract any image URLs to response_attachments and strip raw links from final_reply
    try:
        from src.pipeline.hooks import AttachmentHook
        AttachmentHook()._extract_and_strip_reply_images(ctx, "")
    except Exception as hook_err:
        logger.warning("validate_reply_final_attachment_strip_failed", error=str(hook_err))

    # Anti-AI slop: strip markdown asterisks, robotic bullets, and marketing emojis from final customer reply
    if ctx.final_reply:
        txt = ctx.final_reply
        txt = re.sub(r"\*\*([^*]+)\*\*", r"\1", txt)
        txt = re.sub(r"(?<!\w)\*([^*]+)\*(?!\w)", r"\1", txt)
        txt = re.sub(r"^\s*[-*•]\s+", "", txt, flags=re.MULTILINE)
        txt = re.sub(r"[💰👇🛍️✨🔥🚀🎯🛒📦]", "", txt)

        # 2026 output-risk scrub: secrets, credentials, and stack traces must
        # never reach the customer (dual-guardrail review gap fix).
        txt, scrubbed_risks = _scrub_output_risks(txt)
        if scrubbed_risks:
            logger.warning("output_risks_scrubbed", risks=scrubbed_risks)

        ctx.final_reply = txt.strip()

    return ctx
