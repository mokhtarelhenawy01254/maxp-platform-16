from __future__ import annotations

import asyncio
import json
import re
from decimal import Decimal
from typing import Any

import structlog
from pydantic import ValidationError

from src.guardrails.input import INPUT_GUARDRAILS
from src.llm.client import LLMClient, ProviderResponse
from src.pipeline.context import PipelineContext
from src.pipeline.provider_errors import provider_error_result
from src.skills.integration import _iter_allowed_skills_meta as _iter_skill_meta, get_skills_block
from src.skills.registry import get_skill_registry

logger = structlog.get_logger(__name__)


async def _execute_one_tool(ctx: PipelineContext, registry: Any, tc: dict) -> dict:
    """Execute a single tool call from an LLM response."""
    func_name = tc.get("function", {}).get("name", "")
    arguments_str = tc.get("function", {}).get("arguments", "{}")

    if isinstance(arguments_str, str):
        try:
            arguments = json.loads(arguments_str)
        except json.JSONDecodeError:
            return {"tool": func_name, "status": "parse_error", "error": f"Invalid JSON: {arguments_str[:200]}"}
    else:
        arguments = arguments_str

    tool = registry.resolve(func_name)
    if not tool:
        logger.warning("unknown_tool_called", name=func_name)
        return {"tool": func_name, "status": "unknown"}

    # Approval signals may never originate from the model: strip `approved`
    # from LLM-provided arguments. The only legitimate source is
    # approval_service._execute_action, which calls tool.func directly and
    # never re-enters this pipeline.
    if isinstance(arguments, dict) and "approved" in arguments:
        logger.warning("approval_flag_stripped_from_llm_args", name=func_name)
        arguments = {k: v for k, v in arguments.items() if k != "approved"}

    if ctx.company_id and "company_id" not in arguments:
        arguments = {**arguments, "company_id": ctx.company_id}

    effective_user_id = ctx.customer_id if (ctx.customer_id and ctx.customer_id != "anonymous") else None
    if effective_user_id and "user_id" not in arguments:
        arguments = {**arguments, "user_id": str(effective_user_id)}

    # Approval gate: write tools (approval_mode='always_require') must NEVER
    # execute directly in the chat pipeline. Return the structured awaiting
    # payload — the chat endpoint turns it into an approval draft the merchant
    # confirms (execution happens only via approval_service._execute_action).
    from src.tools.registry import WRITE_TOOL_NAMES
    is_write_approval = (
        func_name in WRITE_TOOL_NAMES
        or getattr(tool, "approval_mode", "never_require") == "always_require"
    )
    if func_name == "manage_agent_skill" and arguments.get("action") == "get":
        is_write_approval = False

    if is_write_approval and not arguments.get("approved"):
        logger.info("tool_blocked_for_approval", name=func_name, company_id=ctx.company_id)
        if func_name in ("product_update_price", "product.updatePrice"):
            pid = arguments.get("product_id") or arguments.get("productId")
            if pid and not re.match(r"^c[a-z0-9]{20,}$", str(pid)):
                try:
                    from src.tools.definitions.product import _resolve_product_cuid
                    resolved = await _resolve_product_cuid(ctx.company_id, str(pid))
                    if resolved:
                        arguments["product_id"] = resolved
                        if "productId" in arguments:
                            arguments["productId"] = resolved
                except Exception as ex:
                    logger.warning("cuid_resolution_error", error=str(ex))

            # Policy Engine verification (deterministic business rules)
            try:
                from src.policy.engine import policy_engine
                new_price = float(arguments.get("new_price") or arguments.get("price") or 0)
                if new_price > 0:
                    val_res = policy_engine.validate_action(ctx.company_id or "", {
                        "type": "UPDATE_PRICE",
                        "params": {"newPrice": new_price, "productId": arguments.get("product_id")},
                    })
                    if not val_res.allowed:
                        err_msg = "; ".join(v.message for v in val_res.violations)
                        logger.warning("policy_engine_blocked_price_change", error=err_msg)
                        return {
                            "tool": func_name,
                            "status": "blocked_by_policy",
                            "error": err_msg,
                            "result": {"success": False, "error": err_msg},
                        }
            except Exception as pe_err:
                logger.debug("policy_engine_check_skipped", error=str(pe_err))

        # Log pending approval in audit trail
        if ctx.company_id:
            try:
                from src.tools.repositories.audit_repository import log_agent_audit_event
                await log_agent_audit_event(
                    company_id=ctx.company_id,
                    action=f"{func_name.upper()}_REQUESTED",
                    description=f"إجراء حساس ينتظر موافقة التاجر: {func_name}",
                    category="AI_AGENT",
                    severity="LOW",
                    metadata={"tool": func_name, "arguments": {k: str(v)[:150] for k, v in arguments.items() if k != "company_id"}},
                )
            except Exception:
                pass

        awaiting = {
            "status": "awaiting_approval",
            "action_type": func_name,
            "action_args": arguments,
            "company_id": ctx.company_id,
            "message": (
                "الإجراء حساس واترفع للاعتماد — مفيش أي خطأ حصل. ردّ على التاجر بالشكل ده بالظبط: "
                "«التعديل جاهز ومستني موافقتك بس — اضغط اعتماد وأكمّل فورًا»، وملخص سطرين لما اللي هيحصل بعد الموافقة. "
                "ممنوع منعًا باتًا: ادعاء أن الإجراء اتنفذ، الاعتذار، وصف الإجراء بالتعثر أو الفشل أو «مش راضي تعدي»، أو ذكر رفع الموضوع للدعم."
            ),
        }
        return {"tool": func_name, **awaiting, "result": awaiting}

    try:
        validated = tool.input_model(**arguments)
        result = await tool.func(validated)
        tool_status = "success"
        if isinstance(result, dict) and (result.get("success") is False or result.get("status") in ("DELEGATION_FAILED", "failed", "error")):
            tool_status = "failed"
        return {"tool": func_name, "status": tool_status, "result": result}
    except ValidationError as e:
        error_details = []
        for err in e.errors():
            loc = ".".join(str(x) for x in err.get("loc", []))
            msg = err.get("msg", "")
            error_details.append(f"- Parameter '{loc}': {msg}")
        error_msg = "Validation failed for tool arguments:\n" + "\n".join(error_details)
        logger.warning("tool_validation_failed", name=func_name, error=error_msg)
        return {"tool": func_name, "status": "error", "error": error_msg}
    except Exception as e:
        logger.error("tool_execution_failed", name=func_name, error=str(e))
        return {"tool": func_name, "status": "error", "error": str(e)}



def _is_direct_write_tool(func_name: str) -> bool:
    """True for tools that mutate state AND execute directly (no approval gate)."""
    try:
        from src.tools.registry import DIRECT_WRITE_TOOL_NAMES

        return func_name in DIRECT_WRITE_TOOL_NAMES
    except Exception:
        return False


async def _execute_tool_calls(ctx: PipelineContext, registry: Any, tool_calls: list[dict]) -> list[dict]:
    """Execute tool calls with read/write partitioning.

    Direct-write tools (order_confirm, order_update_details, ...) run
    SEQUENTIALLY in call order to avoid racing two mutations of the same
    entity (2026 review fix). Reads and approval-gated calls (which never
    execute) run in parallel. Returned results preserve tool_calls order —
    _build_followup_messages zips them by index.
    """
    results: list[dict | None] = [None] * len(tool_calls)
    parallel_idx: list[int] = []
    sequential_idx: list[int] = []

    for idx, tc in enumerate(tool_calls):
        name = tc.get("function", {}).get("name", "")
        if _is_direct_write_tool(name):
            sequential_idx.append(idx)
        else:
            parallel_idx.append(idx)

    if parallel_idx:
        parallel_results = await asyncio.gather(
            *[_execute_one_tool(ctx, registry, tool_calls[i]) for i in parallel_idx]
        )
        for i, res in zip(parallel_idx, parallel_results):
            results[i] = res

    for i in sequential_idx:
        results[i] = await _execute_one_tool(ctx, registry, tool_calls[i])

    return [r or {"tool": "unknown", "status": "error", "error": "tool result missing"} for r in results]


def _compact_for_llm(result: Any, tool_name: str = "") -> Any:
    """Compact oversized tool results before they enter the LLM message list.

    Full-fidelity results stay in ctx.executed_tools/tool_evidence for the
    validators; only what the model sees is compacted (Hermes ❽.9 law).
    Awaiting-approval payloads pass through untouched (the reply template
    inside must survive verbatim).
    """
    try:
        from src.agents.compactor import ToolResultCompactor

        compacted = ToolResultCompactor.compact(result, tool_name=tool_name)
    except Exception:
        compacted = result

    try:
        serialized = json.dumps(compacted, ensure_ascii=False, default=str)
        if len(serialized) > 8000:
            compacted = {
                "truncated": True,
                "note": "نتيجة الأداة ضخمة واتقتصت — استعلم بحدود أصغر لو محتاج تفاصيل أكتر.",
                "preview": serialized[:6000],
            }
    except Exception:
        pass
    return compacted


def _max_tool_calls(ctx: PipelineContext) -> int:
    """Per-run tool call budget from the agent manifest (default 10)."""
    agent = getattr(ctx, "agent", None)
    budget = getattr(getattr(agent, "config", None), "budget", None)
    if isinstance(budget, dict):
        try:
            return max(1, int(budget.get("maxToolCallsPerRun", 10)))
        except (TypeError, ValueError):
            pass
    return 10


def _compact_history_for_budget(
    messages: list[dict], token_budget: int, total_tokens: int
) -> tuple[list[dict], int]:
    """Hierarchical budget compaction: dropped history becomes a short
    <conversation_summary> block instead of vanishing (preserves entity
    facts — sizes, addresses, agreements — that blind FIFO deletes)."""
    dropped: list[dict] = []
    while total_tokens > token_budget and len(messages) > 2:
        dropped_msg = messages.pop(1)
        dropped.insert(0, dropped_msg)
        total_tokens -= len(str(dropped_msg.get("content", ""))) // 4

    if not dropped:
        return messages, total_tokens

    summary_lines = []
    for m in dropped[-20:]:
        role_ar = "العميل" if m.get("role") == "user" else "المساعد"
        content = " ".join(str(m.get("content", "")).split())[:140]
        if content:
            summary_lines.append(f"{role_ar}: {content}")
    summary_text = "\n".join(summary_lines)[-1600:]
    summary = (
        "<conversation_summary>ملخص مضغوط للجزء الأقدم من المحادثة "
        "(التفاصيل الكاملة قُصّت لضبط الحجم):\n"
        f"{summary_text}\n</conversation_summary>"
    )
    # Insert right after the system prompt so it survives further trimming.
    messages.insert(1, {"role": "system", "content": summary})
    total_tokens += len(summary) // 4
    return messages, total_tokens


_CUSTOMER_CHANNELS = {"chat", "facebook", "facebook_messenger", "messenger", "whatsapp", "telegram"}
_CUID_RE = None


def _looks_like_cuid(value: str | None) -> bool:
    global _CUID_RE
    if _CUID_RE is None:
        import re as _re
        _CUID_RE = _re.compile(r"^c[a-z0-9]{20,}$")
    return bool(value and _CUID_RE.match(str(value)))


async def _resolve_order_identifiers(ctx: PipelineContext) -> dict:
    """Resolve every identifier that can locate the customer's order:
    the conversation id itself (AI-created orders store it), the platform
    customer id, the customer phone — and as a last bridge, the phone the
    customer typed inside the conversation (customer rows are frequently
    duplicated or phone-less while the order carries the real one)."""
    out = {"conv": None, "cust": None, "phone": None}
    try:
        if _looks_like_cuid(ctx.conversation_id):
            out["conv"] = str(ctx.conversation_id)
        if _looks_like_cuid(ctx.customer_id):
            out["cust"] = str(ctx.customer_id)

        import src.db.session as _db_mod
        from sqlalchemy import text as _text

        if _db_mod.async_session is not None and _looks_like_cuid(ctx.conversation_id):
            async with _db_mod.async_session() as sess:
                row = (
                    await sess.execute(
                        _text(
                            'SELECT conv."customerId" AS cust, c.phone AS phone '
                            "FROM public.conversations conv "
                            "LEFT JOIN public.customers c ON c.id = conv.\"customerId\" "
                            "WHERE conv.id = :cid LIMIT 1"
                        ),
                        {"cid": ctx.conversation_id},
                    )
                ).mappings().first()
                if row:
                    if row["cust"]:
                        out["cust"] = str(row["cust"])
                    if row["phone"]:
                        out["phone"] = str(row["phone"]).strip()

                if not out["phone"]:
                    msgs = (
                        await sess.execute(
                            _text(
                                "SELECT m.content FROM public.messages m "
                                "WHERE m.\"conversationId\" = :cid AND m.\"isFromCustomer\" = true "
                                "ORDER BY m.\"createdAt\" DESC LIMIT 40"
                            ),
                            {"cid": ctx.conversation_id},
                        )
                    ).scalars().all()
                    phone_re = _re_phone()
                    for content in msgs:
                        match = phone_re.search(str(content or ""))
                        if match:
                            out["phone"] = match.group(0)
                            break
    except Exception as exc:
        logger.debug("order_identifier_resolve_failed", error=str(exc))
    return out


def _re_phone():
    import re as _re
    return _re.compile(r"(?<!\d)(?:\+?20)?01[0125]\d{8}(?!\d)")


async def _build_active_order_block(ctx: PipelineContext) -> str:
    """Minimal high-signal <active_order> block for customer-facing turns.

    2026 context-engineering consensus: pre-fetch the ONE active entity into
    context instead of hoping the model calls a lookup tool — the merchant's
    customer should never be re-asked for size/color/address that are already
    on the order. Deliberately tiny (no JSON dumps) and injected late in the
    prompt (dynamic suffix) to protect the static-prefix cache."""
    try:
        channel = str(getattr(ctx, "channel", "") or "").lower()
        if channel not in _CUSTOMER_CHANNELS:
            return ""

        ids = await _resolve_order_identifiers(ctx)
        if not any(ids.values()):
            return ""

        import src.db.session as _db_mod
        from sqlalchemy import text as _text

        if _db_mod.async_session is None:
            return ""
        async with _db_mod.async_session() as sess:
            order = (
                await sess.execute(
                    _text(
                        'SELECT o."orderNumber", o.status::text AS status, '
                        'o."paymentMethod"::text AS payment_method, o."paymentStatus"::text AS payment_status, '
                        "o.total::float8 AS total, o.currency, "
                        "coalesce(o.\"customerAddress\", o.\"shippingAddress\", '') AS address, "
                        "coalesce(o.governorate, '') AS governorate, coalesce(o.city, '') AS city, "
                        "to_char(o.\"createdAt\", 'YYYY-MM-DD') AS created_at "
                        "FROM public.orders o "
                        'WHERE o."companyId" = :cid AND ('
                        "(CAST(:conv AS text) IS NOT NULL AND o.\"conversationId\" = CAST(:conv AS text)) OR "
                        "(CAST(:cust AS text) IS NOT NULL AND o.\"customerId\" = CAST(:cust AS text)) OR "
                        "(CAST(:phone AS text) IS NOT NULL AND o.\"customerPhone\" = CAST(:phone AS text))"
                        ") "
                        "AND o.\"createdAt\" > now() - interval '30 days' "
                        "AND o.status NOT IN ('DELIVERED','CANCELLED','DUPLICATE_ORDER','REFUNDED',"
                        "'RETURNED','PARTIALLY_RETURNED','EXCHANGED','PARTIALLY_REFUNDED') "
                        "ORDER BY CASE WHEN :conv IS NOT NULL AND o.\"conversationId\" = :conv THEN 0 ELSE 1 END, "
                        "o.\"createdAt\" DESC LIMIT 1"
                    ),
                    {"cid": ctx.company_id, "conv": ids["conv"], "cust": ids["cust"], "phone": ids["phone"]},
                )
            ).mappings().first()
            if not order:
                return ""

            items = (
                await sess.execute(
                    _text(
                        "SELECT coalesce(\"productName\", '') AS name, coalesce(\"productSize\", '') AS size, "
                        "coalesce(\"productColor\", '') AS color, quantity "
                        "FROM public.order_items WHERE \"orderId\" = ("
                        'SELECT id FROM public.orders WHERE "orderNumber" = :num LIMIT 1) LIMIT 3'
                    ),
                    {"num": order["orderNumber"]},
                )
            ).mappings().all()

        item_lines = []
        for it in items:
            parts = [it["name"] or "منتج"]
            if it["size"]:
                parts.append(f"مقاس {it['size']}")
            if it["color"]:
                parts.append(f"لون {it['color']}")
            item_lines.append(f"  - {' — '.join(parts)} × {it['quantity']}")

        raw_address = order["address"] or ""
        if raw_address.startswith("{"):
            try:
                import json as _json

                addr_obj = _json.loads(raw_address)
                if isinstance(addr_obj, dict):
                    addr_vals: list[str] = []
                    for k, v in addr_obj.items():
                        v_str = str(v).strip()
                        if isinstance(v, str) and v_str and k not in {"city", "governorate"} and v_str not in addr_vals:
                            addr_vals.append(v_str)
                    raw_address = "، ".join(addr_vals)
            except Exception:
                pass
        address_parts: list[str] = []
        for p in [order["governorate"], order["city"], raw_address]:
            p_str = str(p).strip()
            if p_str and p_str not in address_parts:
                address_parts.append(p_str)
        address_ar = "، ".join(address_parts)

        lines = [
            "<active_order>",
            f"الأوردر النشط للعميل: {order['orderNumber']} | الحالة: {order['status']} | "
            f"الدفع: {order['payment_method']} ({order['payment_status']}) | الإجمالي: {order['total']} {order['currency']}",
        ]
        if item_lines:
            lines.append("المنتجات:\n" + "\n".join(item_lines))
        if address_ar:
            lines.append(f"عنوان التسليم: {address_ar}")
        lines.append(f"تاريخ الطلب: {order['created_at']}")
        lines.append(
            "استخدم هذه الحقائق مباشرة ولا تعيد سؤال العميل عنها إلا إذا طلب تغييرها صراحةً."
        )
        lines.append("</active_order>")
        return "\n".join(lines)
    except Exception as exc:
        logger.warning("active_order_block_failed", error=str(exc))
        return ""


def _filter_skills_for_agent(ctx: PipelineContext, registry: Any) -> list:
    """Tools offered to this agent: allowed_skills manifests ∪ allowed_tools
    ∪ catalog role grants (active ai.agent_tool_catalog rows granted to the
    agent's role). Empty allowlist ⇒ the whole registry (legacy fallback)."""
    all_available = registry.get_all_tools()
    if not ctx.agent:
        return all_available

    allowed_names: set[str] = set()
    if hasattr(ctx.agent, "allowed_skills") and ctx.agent.allowed_skills:
        try:
            for meta in _iter_skill_meta(set(ctx.agent.allowed_skills)):
                allowed_names.update(t.lower() for t in meta.get("allowed_tools", []))
        except Exception as e:
            logger.warning("skills_filter_failed", error=str(e))
    if hasattr(ctx.agent, "allowed_tools") and ctx.agent.allowed_tools:
        from src.tools.names import canonical_tool_name
        allowed_names.update(canonical_tool_name(t).lower() for t in ctx.agent.allowed_tools)
    # Catalog role grants (in-memory map built at startup by
    # register_catalog_tools). Without this, catalog tools register into
    # the registry but every agent's allowlist filter drops them.
    try:
        from src.tools.catalog import get_catalog_tools_for_role

        agent_role = getattr(ctx.agent, "role", None)
        for tool_name in get_catalog_tools_for_role(agent_role):
            allowed_names.add(tool_name.lower())
    except Exception as e:
        logger.warning("catalog_grants_filter_failed", error=str(e))

    if not allowed_names:
        return all_available

    skills = [s for s in all_available if s.name.lower() in allowed_names]
    logger.info(
        "skills_filtered_by_agent",
        agent=str(ctx.agent.name or ctx.agent.id),
        total=len(all_available),
        filtered=len(skills),
        filtered_names=[s.name for s in skills],
    )
    return skills


async def process_with_skills(ctx: PipelineContext) -> PipelineContext:
    """Replace resolve_intent + route_to_tools + execute_tools with one call.

    Uses LLM function calling: the LLM receives all available skills as tools,
    decides which (if any) to call, and returns the final reply in one pass.
    """
    # 0. Active-order context (customer-facing channels only): the facts the
    # model would otherwise re-ask the customer for. Computed once per turn.
    try:
        ctx.active_order_block = await _build_active_order_block(ctx)
    except Exception as exc:
        logger.debug("active_order_block_skipped", error=str(exc))
        ctx.active_order_block = ""

    # 1. Input guardrails
    for guardrail in INPUT_GUARDRAILS:
        result = await guardrail.validate(ctx, ctx.message)
        if not result.allowed:
            ctx.early_return = {
                "status": "GUARDRAIL_BLOCKED",
                "reason": result.reason,
                "violations": result.violations,
            }
            ctx.final_reply = "عذراً، لا يمكنني معالجة هذا الطلب."
            logger.warning("input_guardrail_blocked", guardrail=guardrail.name, reason=result.reason)
            return ctx

    # 2. Get skills (filtered by agent's allowed_skills and allowed_tools if present)
    registry = get_skill_registry()
    skills = _filter_skills_for_agent(ctx, registry)
    if not skills:
        logger.warning("no_skills_available_using_allowed_tools_fallback")

    # 3. Build system prompt with agent instructions (soul/persona from DB agent)
    agent_instructions = get_agent_instructions(ctx.agent) if ctx.agent else ""
    base_prompt = agent_instructions or ctx.system_prompt or _generic_system_prompt()
    ctx.system_prompt = base_prompt

    system_prompt = f"{base_prompt}\n\n{_technical_formatting_constraints()}"

    # Agent hooks: before_llm (domain-specific instructions, guardrails)
    if ctx.agent and hasattr(ctx.agent, "hooks"):
        for hook in ctx.agent.hooks:
            system_prompt = await hook.before_llm(ctx, system_prompt, skills)

    # 4. Single LLM call with skills as tools
    executed: list[dict] = []
    try:
        provider_response = await _llm_call(ctx, system_prompt, skills)
    except Exception as e:
        import logging as _log; _log.warning("LLM_CALL_EXCEPTION %s %s", type(e).__name__, str(e)[:300])
        logger.error("skills_pipeline_llm_failed_trying_fallbacks", error=str(e))

        # Call-time failover: retry with agent-configured fallback models
        # (model_policy.fallback) before surfacing an error to the customer.
        raw_fallbacks = []
        if ctx.agent is not None:
            policies = getattr(ctx.agent, "policies", None) or {}
            mp = policies.get("model_policy") or getattr(ctx.agent, "model_policy", None) or {}
            raw_fallbacks = mp.get("fallback") or []
        if isinstance(raw_fallbacks, (str, dict)):
            raw_fallbacks = [raw_fallbacks]
        elif not isinstance(raw_fallbacks, list):
            raw_fallbacks = []
        if not raw_fallbacks:
            raw_fallbacks = ["groq/openai/gpt-oss-120b", "gemini-2.5-flash"]

        recovered = False
        for fb in raw_fallbacks:
            fb_model = fb.get("model") if isinstance(fb, dict) else (str(fb).split("/", 1)[-1] if "/" in str(fb) else str(fb))
            if not fb_model:
                continue
            try:
                from src.llm.model_manager import model_manager

                routing = await model_manager.get_next_key(fb_model, ctx.company_id)
                ctx.llm_client = LLMClient(
                    provider=routing.provider,
                    model=routing.model,
                    api_key=routing.api_key,
                    base_url=routing.base_url,
                )
                logger.info("skills_pipeline_llm_fallback_activated", model=fb_model)
                provider_response = await _llm_call(ctx, system_prompt, skills)
                recovered = True
                break
            except Exception as fb_err:
                logger.warning("skills_pipeline_llm_fallback_failed", model=fb_model, error=str(fb_err)[:200])

        if not recovered:
            # Silent Escalation: never expose internal AI errors to customers.
            ctx.final_reply = None
            ctx.escalation_requested = True
            ctx.escalation_reason = f"llm_failed: {type(e).__name__}: {str(e)[:200]}"
            return ctx

    # 4b. Retry once on empty response (DeepSeek cold-start workaround)
    if not provider_response.text and not provider_response.tool_calls:
        logger.warning("skills_pipeline_empty_response_retrying")
        provider_response = await _llm_call(ctx, system_prompt, skills)

    # 5. Handle tool calls
    executed: list[dict] = []
    if provider_response.tool_calls:
        logger.info(
            "skills_pipeline_tool_calls",
            count=len(provider_response.tool_calls),
            skills=[tc.get("function", {}).get("name", "") for tc in provider_response.tool_calls],
        )

        # Identify and set the active skill context from the first executed skill tool call
        for tc in provider_response.tool_calls:
            func_name = tc.get("function", {}).get("name", "")
            skill = registry.get(func_name)
            if skill:
                ctx.active_skill_context = {
                    "skillId": skill.name,
                    "requiresHumanApproval": False,
                    "maxToolCount": 2,
                }
                break

        # Per-run tool call budget (agent.json budget.maxToolCallsPerRun)
        call_cap = _max_tool_calls(ctx)
        if len(provider_response.tool_calls) > call_cap:
            logger.warning("tool_calls_capped_first_round", kept=call_cap, total=len(provider_response.tool_calls))
            provider_response.tool_calls = provider_response.tool_calls[:call_cap]

        results = await _execute_tool_calls(ctx, registry, provider_response.tool_calls)
        for item in results:
            executed.append(item)
            if item["status"] == "success":
                ctx.tool_evidence.append({"tool": item["tool"], "result": item["result"]})

        # Self-correction: retry once on JSON parse errors
        parse_errors = [r for r in results if r.get("status") == "parse_error"]
        if parse_errors:
            logger.warning("skills_pipeline_json_parse_retry", errors=[r.get("error") for r in parse_errors])
            retry_messages = await _build_followup_messages(ctx, provider_response, executed)
            tool_dicts = _build_skill_tool_dicts(skills, ctx)
            retry_response = await _raw_llm_call(ctx, retry_messages, tools=tool_dicts)
            if retry_response.tool_calls:
                retry_results = await _execute_tool_calls(ctx, registry, retry_response.tool_calls)
                ri = 0
                for i, item in enumerate(executed):
                    if ri >= len(retry_results):
                        break
                    if item.get("status") == "parse_error":
                        executed[i] = retry_results[ri]
                        if retry_results[ri]["status"] == "success":
                            ctx.tool_evidence.append({"tool": retry_results[ri]["tool"], "result": retry_results[ri]["result"]})
                        ri += 1

        ctx.executed_tools = executed

    # 6. Agent hooks: after_tools (enforcement, validation, etc.)
    #     ponytail: agent-specific logic extracted to hooks, add when new domain needs enforcement
    if ctx.agent and hasattr(ctx.agent, "hooks"):
        for hook in ctx.agent.hooks:
            synthetic_tool_calls = await hook.after_tools(ctx, executed)
            if synthetic_tool_calls:
                if provider_response.tool_calls is None:
                    provider_response.tool_calls = []
                for tc in synthetic_tool_calls:
                    provider_response.tool_calls.append(tc)

    # Follow-up LLM call (only when tools were called or enforcement injected)
    if executed:
        # If we came from no-tool-calls path, provider_response may not have tool_calls
        # We need them for _build_followup_messages — build synthetic ones if missing
        if not provider_response.tool_calls:
            _tool_call_id = 0
            for item in executed:
                tc_func = item.get("tool", "")
                tc_id = f"call_{_tool_call_id}"
                _tool_call_id += 1
                tc_msg = {
                    "role": "assistant",
                    "content": "",
                    "tool_calls": [{
                        "id": tc_id,
                        "type": "function",
                        "function": {"name": tc_func, "arguments": "{}"},
                    }],
                }
                if provider_response.tool_calls is None:
                    provider_response.tool_calls = []
                provider_response.tool_calls.append(tc_msg["tool_calls"][0])

        try:
            from src.agents.stall_guard import ToolLoopGuard
            loop_guard = ToolLoopGuard(identical_threshold=2)

            tool_dicts = _build_skill_tool_dicts(skills, ctx)
            followup_messages = await _build_followup_messages(ctx, provider_response, executed)
            max_rounds = 4
            current_round = 0
            final_response = provider_response
            call_cap = _max_tool_calls(ctx)
            while current_round < max_rounds:
                current_round += 1
                if len(executed) >= call_cap:
                    logger.warning("tool_call_budget_exhausted", executed=len(executed), cap=call_cap)
                    followup_messages.append({
                        "role": "system",
                        "content": (
                            f"[Budget]: وصلت الحد الأقصى لعدد الأدوات في الجلسة ({call_cap}). "
                            "متستدعيش أي أداة تانية — لخص للعميل النتيجة بالمتاح فورًا."
                        ),
                    })
                    final_response = await _raw_llm_call(ctx, followup_messages, tools=[], tool_choice="none")
                    break
                final_response = await _raw_llm_call(ctx, followup_messages, tools=tool_dicts, tool_choice="auto")
                if final_response.tool_calls:
                    # 🛡️ 2026 Stall Guard & Failure Deduplication
                    valid_tool_calls = []
                    halt_triggered = False
                    halt_reason = None

                    # Tools already blocked pending merchant approval: the model
                    # retrying them is EXPECTED — never treat as failure or loop.
                    awaiting_names = {
                        ex.get("tool")
                        for ex in executed
                        if ex.get("status") == "awaiting_approval"
                    }

                    for tc in final_response.tool_calls:
                        f_name = tc.get("function", {}).get("name", "")
                        f_args = tc.get("function", {}).get("arguments", {})

                        if f_name in awaiting_names:
                            valid_tool_calls.append(tc)
                            continue

                        # Check for identical loop / stall
                        is_loop, reason = loop_guard.check_call(f_name, f_args)
                        if is_loop:
                            halt_triggered = True
                            halt_reason = reason
                            break

                        already_failed = any(
                            ex.get("tool") == f_name and ex.get("status") not in ("success", "awaiting_approval")
                            for ex in executed
                        )
                        if already_failed:
                            logger.warning("skipping_repeated_failed_tool_call", name=f_name)
                            continue
                        valid_tool_calls.append(tc)

                    if halt_triggered:
                        logger.warning("stall_guard_halted_tool_loop", reason=halt_reason)
                        if halt_reason:
                            followup_messages.append({"role": "system", "content": halt_reason})
                        break

                    if not valid_tool_calls:
                        logger.info("all_followup_tool_calls_were_failed_duplicates_breaking")
                        break

                    extra_results = await _execute_tool_calls(ctx, registry, valid_tool_calls)
                    executed.extend(extra_results)
                    for item in extra_results:
                        if item["status"] == "success":
                            ctx.tool_evidence.append({"tool": item["tool"], "result": item["result"]})
                    # Append assistant message with its tool_calls
                    asst_msg: dict[str, Any] = {
                        "role": "assistant",
                        "content": final_response.text or "",
                        "tool_calls": valid_tool_calls,
                    }
                    if getattr(final_response, "reasoning_content", None):
                        asst_msg["reasoning_content"] = final_response.reasoning_content
                    followup_messages.append(asst_msg)
                    # Append matching tool results
                    for idx, tc in enumerate(final_response.tool_calls):
                        res_item = extra_results[idx] if idx < len(extra_results) else {}
                        status = res_item.get("status", "unknown")
                        if status == "success" or status == "awaiting_approval":
                            # awaiting_approval must surface its full payload
                            # (with the Arabic reply template) — a generic
                            # {"error": "Failed"} makes the model apologize.
                            result_content = res_item.get("result", {})
                        else:
                            res_val = res_item.get("result")
                            if isinstance(res_val, dict) and res_val:
                                result_content = res_val
                            else:
                                result_content = {"error": res_item.get("error", "Failed")}
                        # Hermes Duplicate Result Stubbing
                        tc_name = tc.get("function", {}).get("name", "")
                        tc_args = tc.get("function", {}).get("arguments", {})
                        result_content = loop_guard.stub_if_duplicate(tc_name, tc_args, result_content)
                        if status == "success":
                            result_content = _compact_for_llm(result_content, tool_name=tc_name)

                        followup_messages.append({
                            "role": "tool",
                            "tool_call_id": tc.get("id", f"call_{current_round}_{idx}"),
                            "content": json.dumps(result_content, ensure_ascii=False, cls=DecimalEncoder, default=str),
                        })
                else:
                    break

            if not final_response.text:
                logger.warning("skills_pipeline_followup_empty_retrying")
                text_messages = _strip_tool_messages(followup_messages, executed)
                final_response = await _raw_llm_call(ctx, text_messages, tools=[], tool_choice="none")

            ctx.final_reply = final_response.text or await _synthesize_fallback_reply(ctx, executed)
            ctx.llm_response = final_response.text or ""
        except Exception as e:
            logger.error("skills_pipeline_followup_failed", error=str(e), exc_info=True)
            ctx.final_reply = await _synthesize_fallback_reply(ctx, executed)
    elif provider_response.text:
        ctx.final_reply = provider_response.text
        ctx.llm_response = provider_response.text
    else:
        logger.warning("skills_pipeline_empty_reply_no_tools")
        ctx.final_reply = ""
        ctx.llm_response = ""

    # Agent hooks: before_reply (attachments, post-processing)
    from src.pipeline.hooks import AttachmentHook
    hooks_to_run = list(getattr(ctx.agent, "hooks", None) or [])
    if not any(isinstance(h, AttachmentHook) for h in hooks_to_run):
        hooks_to_run.append(AttachmentHook())
    for hook in hooks_to_run:
        await hook.before_reply(ctx, executed)

    ctx.llm_result = provider_response
    return ctx


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)



def _unwrap_llm_client(client):
    if hasattr(client, "_llm_client"):
        return client._llm_client
    return client


async def _llm_call(ctx: PipelineContext, system_prompt: str, skills: list) -> ProviderResponse:
    """Make the primary LLM call with skills as available tools.

    Uses ContextAssembler for DB-backed conversation history, customer profile,
    session state, RAG evidence, and episodic memories.
    """
    from src.context.assembler import ContextAssembler
    assembler = ContextAssembler()

    ctx.system_prompt = system_prompt
    enriched_prompt = await assembler.build_system_prompt(ctx)
    ctx.system_prompt = enriched_prompt

    messages = [
        {"role": "system", "content": enriched_prompt},
    ]

    history = await assembler.fetch_message_history(ctx, limit=50)
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    from src.context.multimodal import build_user_content
    user_content = build_user_content(ctx.message, ctx.attachments)
    from datetime import datetime as _dt_now
    _now = _dt_now.now()
    time_ctx = f"[Time: {_now.strftime('%H:%M')} UTC]"
    active_order_ctx = getattr(ctx, "active_order_block", "") or ""
    if active_order_ctx:
        time_ctx = f"{time_ctx}\n\n{active_order_ctx}"
    if isinstance(user_content, str):
        user_content = f"{user_content}\n\n{time_ctx}"
    elif isinstance(user_content, list):
        for part in user_content:
            if isinstance(part, dict) and part.get("type") == "text":
                part["text"] = f"{part.get('text', '')}\n\n{time_ctx}"
                break
        else:
            user_content.insert(0, {"type": "text", "text": time_ctx})
    messages.append({"role": "user", "content": user_content})

    # Token budget: compact oldest history into a summary instead of blind
    # FIFO drops (2026 review fix — dropped messages used to erase entity
    # facts like sizes/addresses mid-conversation).
    total_tokens = sum(len(str(m.get("content", ""))) // 4 for m in messages)
    if total_tokens > ctx.token_budget:
        logger.warning("token_budget_exceeded", total=total_tokens, budget=ctx.token_budget)
        messages, total_tokens = _compact_history_for_budget(messages, ctx.token_budget, total_tokens)
        logger.info("token_budget_compacted", remaining=len(messages), final_tokens=total_tokens)

    # Get or create LLM client from context
    client = _unwrap_llm_client(ctx.llm_client) if ctx.llm_client else None
    if not client:
        from src.llm.model_manager import model_manager

        agent_model = ctx.agent.model if ctx.agent and hasattr(ctx.agent, "model") else "deepseek-flash"
        try:
            routing = await model_manager.get_next_key(agent_model, ctx.company_id)
            client = LLMClient(
                provider=routing.provider,
                model=routing.model,
                api_key=routing.api_key,
                base_url=routing.base_url,
            )
        except Exception as e:
            logger.error("no_llm_client_available", error=str(e))
            raise

    tool_dicts = _build_skill_tool_dicts(skills, ctx)

    tool_choice = ctx.agent.config.tool_choice if ctx.agent and hasattr(ctx.agent, "config") else None

    provider = (getattr(client, "provider", None) or "").upper()
    temperature = 1.0 if provider == "OLLAMA" else 0.3

    # Persist assembled messages for downstream stages (self-review judge context)
    ctx.messages = list(messages)

    return await client.generate(
        messages=messages,
        tools=tool_dicts,
        temperature=temperature,
        tool_choice=tool_choice,
    )


async def _raw_llm_call(ctx: PipelineContext, messages: list[dict], tools: list | None = None, tool_choice: str | None = None) -> ProviderResponse:
    """Make a follow-up LLM call (with or without tools)."""
    client = _unwrap_llm_client(ctx.llm_client) if ctx.llm_client else None
    if not client:
        from src.llm.client import LLMClient
        from src.llm.model_manager import model_manager

        agent_model = getattr(ctx.llm_client, "model", None) or (ctx.agent.model if ctx.agent and hasattr(ctx.agent, "model") else "deepseek-flash")
        routing = await model_manager.get_next_key(agent_model, ctx.company_id)
        client = LLMClient(
            provider=routing.provider,
            model=routing.model,
            api_key=routing.api_key,
            base_url=routing.base_url,
        )

    # Build tool definitions so DeepSeek can understand tool_call history
    if (tools is not None and len(tools) == 0) or tool_choice == "none":
        tool_dicts = None
        effective_tool_choice = "none"
    elif tools is None:
        from src.skills.registry import get_skill_registry
        _registry = get_skill_registry()
        _skills = _registry.get_all()
        tool_dicts = _build_skill_tool_dicts(_skills, ctx)
        effective_tool_choice = tool_choice or "auto"
    else:
        tool_dicts = tools
        effective_tool_choice = tool_choice or "auto"

    # If message has images but current model doesn't support vision, switch to Gemini
    has_images = any(
        isinstance(m.get("content"), list)
        and any(p.get("type") == "image_url" for p in m["content"])
        for m in messages
    )
    if has_images:
        from src.llm.model_capabilities import supports_vision
        client_model = getattr(client, "model", None)
        client_provider = getattr(client, "provider", None)
        if not supports_vision(client_model, client_provider):
            try:
                from src.llm.model_manager import model_manager
                vision_model = "gemini-2.5-flash"
                routing = await model_manager.get_next_key(vision_model, ctx.company_id)
                client = LLMClient(
                    provider=routing.provider,
                    model=routing.model,
                    api_key=routing.api_key,
                    base_url=routing.base_url,
                )
                logger.info("followup_vision_fallback_switched", original_model=client_model, new_model=vision_model)
            except Exception as e:
                logger.warning("followup_vision_fallback_unavailable", error=str(e))

    if tool_choice is None and ctx.agent and hasattr(ctx.agent, "config"):
        effective_tool_choice = ctx.agent.config.tool_choice or effective_tool_choice

    provider = (getattr(client, "provider", None) or "").upper()
    temperature = 1.0 if provider == "OLLAMA" else 0.3
    return await client.generate(
        messages=messages,
        tools=tool_dicts,
        temperature=temperature,
        tool_choice=effective_tool_choice,
    )


def _build_skill_tool_dicts(skills: list, ctx: PipelineContext) -> list[dict]:
    tool_dicts: list[dict] = []
    seen_names: set[str] = set()

    for s in skills:
        s_name = getattr(s, "name", "").lower()
        if not s_name or s_name in seen_names:
            continue
        if hasattr(s, "to_openai_tool"):
            spec = s.to_openai_tool()
        elif hasattr(s, "to_json_schema_spec"):
            spec = s.to_json_schema_spec()
        elif hasattr(s, "to_dict"):
            spec = s.to_dict()
        else:
            spec = {
                "type": "function",
                "function": {
                    "name": getattr(s, "name", ""),
                    "description": getattr(s, "description", ""),
                    "parameters": getattr(s, "parameters", {"type": "object", "properties": {}}),
                },
            }
        fn_name = spec.get("function", {}).get("name", s_name).lower()
        if fn_name not in seen_names:
            seen_names.add(fn_name)
            tool_dicts.append(spec)

    allowed = getattr(ctx.agent, "allowed_tools", None) or []
    registry = get_skill_registry()
    for tool_name in allowed:
        tname = str(tool_name).lower().replace(".", "_")
        if tname not in seen_names:
            tool = registry.resolve(tname)
            if tool:
                spec = (
                    tool.to_json_schema_spec() if hasattr(tool, "to_json_schema_spec")
                    else {
                        "type": "function",
                        "function": {"name": tool.name, "description": getattr(tool, "description", ""), "parameters": {"type": "object", "properties": {}}}
                    }
                )
                fn_name = spec.get("function", {}).get("name", tname).lower()
                if fn_name not in seen_names:
                    seen_names.add(fn_name)
                    tool_dicts.append(spec)

    # Tool-schema budget: tool specs ride along on EVERY call and follow-up
    # round but were never counted against ctx.token_budget — with hundreds
    # of catalog tools they could silently crowd out the conversation.
    import json as _json

    tools_chars = len(_json.dumps(tool_dicts, ensure_ascii=False))
    tools_tokens = tools_chars // 4
    ctx.tools_budget_tokens = tools_tokens  # exposed for logging/metrics
    if tools_tokens > 8_000:
        logger.warning(
            "tool_schema_budget_exceeded",
            tools=len(tool_dicts),
            approx_tokens=tools_tokens,
            hint="reduce role tool grants or rely on the store_capability index tool",
        )

    return tool_dicts


# Documented last resort when even the synthesis call fails: one neutral
# line — no persona, no emoji, no business phrasing (radar skill law:
# replies must be LLM-generated from structured context, never templates).
_FALLBACK_NEUTRAL_LINE = (
    "حصلت لحظة انقطاع في المعالجة وطلبك وصلني — جرّب تاني بعد لحظات وهرد عليك فورًا."
)


def _build_evidence_digest(executed: list[dict]) -> str:
    """Compact, LLM-ready digest of what actually executed."""
    lines: list[str] = []
    for item in executed[:8]:
        tool = item.get("tool", "unknown")
        status = item.get("status", "unknown")
        if status == "awaiting_approval":
            lines.append(f"- {tool}: (بانتظار موافقة التاجر — لم تُنفَّذ)")
            continue
        payload_src = (
            _compact_for_llm(item.get("result", {}), tool_name=tool)
            if status == "success"
            else {"error": item.get("error", "")}
        )
        try:
            payload = json.dumps(payload_src, ensure_ascii=False, cls=DecimalEncoder, default=str)[:1200]
        except Exception:
            payload = str(payload_src)[:1200]
        lines.append(f"- {tool} [{status}]: {payload}")
    return "\n".join(lines) or "(لم تُنفَّذ أي أداة)"


async def _synthesize_fallback_reply(ctx: PipelineContext, executed: list[dict]) -> str:
    """Degraded-mode reply synthesis (2026 law: replies are LLM-generated from
    structured context — never hardcoded templates).

    Fired only when the model returned an empty reply after all retries. One
    evidence-grounded call in the agent's own voice replaces the old hardcoded
    Arabic templates so the agent never breaks character."""
    agent = getattr(ctx, "agent", None)
    agent_name = (getattr(agent, "name", "") or "").strip()
    identity = f"اسمك: {agent_name}. " if agent_name else ""

    system_prompt = (
        "أنت مساعد متجر بتكتب رد للعميل بعد ما الأدوات اتنفذت فعليًا. "
        f"{identity}"
        "اكتب ردًا قصيرًا بأسلوبك الطبيعي بناءً على أدلة الأدوات فقط: "
        "لخص النتيجة بلغة أعمال واضحة، ولو فيه أداة فشلت أو مستنية موافقة اذكرها بصدق. "
        "ممنوع تخترع أي معلومة مش في الأدلة، وممنوع الإيموجي."
    )
    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": f"طلب العميل: {ctx.message}\n\nأدلة الأدوات المنفَّذة:\n{_build_evidence_digest(executed)}",
        },
    ]
    try:
        response = await _raw_llm_call(ctx, messages, tools=[], tool_choice="none")
        text = (getattr(response, "text", "") or "").strip()
        if text:
            return text
    except Exception as exc:
        logger.warning("fallback_synthesis_failed", error=str(exc))
    return _FALLBACK_NEUTRAL_LINE


async def _build_followup_messages(
    ctx: PipelineContext, first_response: ProviderResponse, executed: list[dict]
) -> list[dict]:
    """Build messages for the follow-up LLM call after tool execution.
    
    Preserves exact system_prompt and conversation prefix from the initial call
    to guarantee a near-100% KV Cache Hit with DeepSeek and OpenAI-compatible providers.
    """
    agent_instructions = get_agent_instructions(ctx.agent) if ctx.agent else ""
    # Reuse the exact enriched system prompt from _llm_call to preserve prefix cache
    system_prompt = ctx.system_prompt or agent_instructions or _generic_system_prompt()
    followup_directive = _get_followup_directive(ctx.agent)

    messages = [
        {"role": "system", "content": system_prompt},
    ]

    # Add DB-backed conversation history (exact same as primary _llm_call)
    from src.context.assembler import ContextAssembler
    assembler = ContextAssembler()
    history = await assembler.fetch_message_history(ctx, limit=50)
    for msg in history:
        messages.append({"role": msg["role"], "content": msg.get("content", "")})

    # Current user message — matches primary _llm_call exactly
    from src.context.multimodal import build_user_content
    user_content = build_user_content(ctx.message, ctx.attachments)
    from datetime import datetime as _dt_now
    _now = _dt_now.now()
    time_ctx = f"[Time: {_now.strftime('%H:%M')} UTC]"
    active_order_ctx = getattr(ctx, "active_order_block", "") or ""
    if active_order_ctx:
        time_ctx = f"{time_ctx}\n\n{active_order_ctx}"
    if isinstance(user_content, str):
        user_content = f"{user_content}\n\n{time_ctx}"
    elif isinstance(user_content, list):
        for part in user_content:
            if isinstance(part, dict) and part.get("type") == "text":
                part["text"] = f"{part.get('text', '')}\n\n{time_ctx}"
                break
        else:
            user_content.insert(0, {"type": "text", "text": time_ctx})
    messages.append({"role": "user", "content": user_content})

    # Assistant response with tool_calls (required by DeepSeek API)
    assistant_msg = {
        "role": "assistant",
        "content": "" if first_response.tool_calls else (first_response.text or ""),
    }
    if first_response.tool_calls:
        assistant_msg["tool_calls"] = first_response.tool_calls
    reasoning = getattr(first_response, "reasoning_content", None)
    if reasoning:
        assistant_msg["reasoning_content"] = reasoning
    messages.append(assistant_msg)

    # Tool results — iterate over tool_calls so every tool message matches an id in assistant.tool_calls
    tool_calls = first_response.tool_calls or []
    for idx, tc in enumerate(tool_calls):
        item = executed[idx] if idx < len(executed) else {}
        status = item.get("status", "unknown")
        result = item.get("result", {})
        error = item.get("error", "")

        tc_id = tc.get("id", f"call_{idx}")
        is_last = (idx == len(tool_calls) - 1)

        if status == "success":
            compacted = _compact_for_llm(result, tool_name=item.get("tool", ""))
            content_str = json.dumps(compacted, ensure_ascii=False, cls=DecimalEncoder, default=str)
            if is_last and followup_directive:
                content_str += f"\n\n[Directive]: {followup_directive}"
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc_id,
                    "content": content_str,
                }
            )
        else:
            if status == "awaiting_approval":
                # Approval gate: surface the full structured payload (including
                # the Arabic reply template) — sending a generic "Execution
                # failed" error made the model apologize or claim a malfunction.
                content_str = json.dumps(result, ensure_ascii=False, cls=DecimalEncoder, default=str)
                if is_last and followup_directive:
                    content_str += f"\n\n[Directive]: {followup_directive}"
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc_id,
                        "content": content_str,
                    }
                )
            else:
                err_dict = {"error": error or "Execution failed"}
                err_str = json.dumps(err_dict, ensure_ascii=False, cls=DecimalEncoder, default=str)
                if is_last and followup_directive:
                    err_str += f"\n\n[Directive]: {followup_directive}"
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc_id,
                        "content": err_str,
                    }
                )

    return messages


def _strip_tool_messages(messages: list[dict], executed: list[dict]) -> list[dict]:
    """Remove tool_calls from assistant msgs and convert tool role msgs to system for APIs without tool support."""
    from src.skills.registry import get_skill_registry

    registry = get_skill_registry()
    result = []
    for m in messages:
        if m.get("role") == "tool":
            continue
        msg_copy = dict(m)
        msg_copy.pop("tool_calls", None)
        # Clean empty assistant messages: OpenAI/DeepSeek reject assistant messages with empty text and no tool_calls
        if msg_copy.get("role") == "assistant" and not str(msg_copy.get("content") or "").strip():
            continue
        result.append(msg_copy)

    tool_summaries = []
    for item in executed:
        tool_name = item.get("tool", "")
        status = item.get("status", "")
        result_data = item.get("result", {})
        formatted = None
        tool = registry.resolve(tool_name)
        if tool and hasattr(tool, "format_result") and isinstance(result_data, dict):
            try:
                formatted = tool.format_result(result_data)
            except Exception:
                formatted = None
        if formatted:
            tool_summaries.append(f"[{tool_name}: {formatted}]")
        elif isinstance(result_data, dict) and result_data:
            data_str = json.dumps(result_data, ensure_ascii=False, cls=DecimalEncoder, default=str)
            tool_summaries.append(f"[{tool_name}: {data_str}]")
        else:
            tool_summaries.append(f"[{tool_name}: {'نجاح' if status == 'success' else 'فشل'}]")

    if tool_summaries:
        summary = "نتائج استدعاء الأدوات للطلب:\n" + "\n".join(tool_summaries)
        summary += "\n\n[توجيه حاسم]: بناءً على نتائج الأدوات أعلاه، اكتب الآن ردك للعميل بالعامية المصرية الطبيعية والمباشرة بدون أي وسوم أو أكواد برمجية."
        result.append({"role": "system", "content": summary})
    return result


def get_agent_instructions(agent: Any) -> str:
    """Extract the agent's instructions/system prompt from various agent representations."""
    if not agent:
        return ""
    if hasattr(agent, "_get_system_prompt"):
        try:
            prompt = agent._get_system_prompt()
            if prompt:
                return str(prompt)
        except Exception:
            pass
    if hasattr(agent, "instructions"):
        try:
            return str(agent.instructions or "")
        except AttributeError:
            pass
    if hasattr(agent, "default_options") and isinstance(agent.default_options, dict):
        inst = agent.default_options.get("instructions")
        if inst:
            return str(inst)
    if hasattr(agent, "soul") and agent.soul:
        return str(agent.soul)
    return ""


def _technical_formatting_constraints() -> str:
    return """تعليمات التنسيق واستدعاء الأدوات (هام جداً):
1. يجب استدعاء الأدوات باستخدام صيغة tool_calls الرسمية للـ API فقط.
2. يُمنع منعاً باتاً كتابة وسوم XML أو DSML مثل <｜DSML｜tool_calls> في الرد النصي للرسائل.
3. لا تكتب كود JSON داخل علامات اقتباس برمجية (markdown code blocks) في ردك النصي لاستدعاء أداة.
4. إذا قررت استدعاء أداة، يجب ألا تحتوي رسالتك النصية على أي ردود أو نصوص توضيحية — دع الرد النصي فارغاً تماماً واستخدم حقل tool_calls فقط."""


def _generic_system_prompt() -> str:
    return """You are a helpful AI assistant for a business platform.

Guidelines:
1. Use available tools when the user asks for specific information or actions.
2. If the user asks something outside the available tools, answer from general knowledge.
3. Be polite, concise, and professional.
4. Do not invent information not present in tool results.
5. Follow the language and tone set in your agent instructions."""


def _get_followup_directive(agent: Any) -> str:
    """Return the follow-up directive.
    
    Agent language/tone is already in the base_prompt via instructions.
    This just adds the tool-result instruction.
    """
    return "Write a natural reply based on the tool results above. If the results don't contain all the needed information, share what's available and ask for the rest."
