from __future__ import annotations

import asyncio
import json
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

    if ctx.company_id and "company_id" not in arguments:
        arguments = {**arguments, "company_id": ctx.company_id}

    # Approval gate: write tools (approval_mode='always_require') must NEVER
    # execute directly in the chat pipeline. Return the structured awaiting
    # payload — the chat endpoint turns it into an approval draft the merchant
    # confirms (execution happens only via approval_service._execute_action).
    approval_mode = getattr(tool, "approval_mode", "never_require")
    if approval_mode == "always_require":
        logger.info("tool_blocked_for_approval", name=func_name, company_id=ctx.company_id)
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
        return {"tool": func_name, "status": "success", "result": result}
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



async def process_with_skills(ctx: PipelineContext) -> PipelineContext:
    """Replace resolve_intent + route_to_tools + execute_tools with one call.

    Uses LLM function calling: the LLM receives all available skills as tools,
    decides which (if any) to call, and returns the final reply in one pass.
    """
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
    all_available = registry.get_all_tools()
    skills = all_available
    if ctx.agent:
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
        if allowed_names:
            skills = [s for s in all_available if s.name.lower() in allowed_names]
            logger.info(
                "skills_filtered_by_agent",
                agent=str(ctx.agent.name or ctx.agent.id),
                total=len(all_available),
                filtered=len(skills),
                filtered_names=[s.name for s in skills],
            )
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
            raw_fallbacks = ["groq/llama-3.3-70b-versatile", "gemini-2.5-flash"]

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

        results = await asyncio.gather(*[_execute_one_tool(ctx, registry, tc) for tc in provider_response.tool_calls])
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
                retry_results = await asyncio.gather(*[_execute_one_tool(ctx, registry, tc) for tc in retry_response.tool_calls])
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
            while current_round < max_rounds:
                current_round += 1
                final_response = await _raw_llm_call(ctx, followup_messages, tools=tool_dicts, tool_choice="auto")
                if final_response.tool_calls:
                    # 🛡️ 2026 Stall Guard & Failure Deduplication
                    valid_tool_calls = []
                    halt_triggered = False
                    halt_reason = None

                    for tc in final_response.tool_calls:
                        f_name = tc.get("function", {}).get("name", "")
                        f_args = tc.get("function", {}).get("arguments", {})

                        # Check for identical loop / stall
                        is_loop, reason = loop_guard.check_call(f_name, f_args)
                        if is_loop:
                            halt_triggered = True
                            halt_reason = reason
                            break

                        already_failed = any(
                            ex.get("tool") == f_name and ex.get("status") != "success"
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

                    extra_results = await asyncio.gather(*[_execute_one_tool(ctx, registry, tc) for tc in valid_tool_calls])
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
                        result_content = res_item.get("result", {}) if status == "success" else {"error": res_item.get("error", "Failed")}
                        # Hermes Duplicate Result Stubbing
                        tc_name = tc.get("function", {}).get("name", "")
                        tc_args = tc.get("function", {}).get("arguments", {})
                        result_content = loop_guard.stub_if_duplicate(tc_name, tc_args, result_content)

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

            ctx.final_reply = final_response.text or _format_fallback_reply(ctx, executed)
            ctx.llm_response = final_response.text or ""
        except Exception as e:
            logger.error("skills_pipeline_followup_failed", error=str(e), exc_info=True)
            ctx.final_reply = _format_fallback_reply(ctx, executed)
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

    # Token budget: drop oldest history messages if over budget
    # ponytail: simple char/4 estimation, msg-by-msg trimming
    total_tokens = sum(len(str(m.get("content", ""))) // 4 for m in messages)
    if total_tokens > ctx.token_budget:
        logger.warning("token_budget_exceeded", total=total_tokens, budget=ctx.token_budget)
        while total_tokens > ctx.token_budget and len(messages) > 2:
            dropped = messages.pop(1)
            total_tokens -= len(str(dropped.get("content", ""))) // 4
        logger.info("token_budget_trimmed", remaining=len(messages), final_tokens=total_tokens)

    # Get or create LLM client from context
    client = _unwrap_llm_client(ctx.llm_client) if ctx.llm_client else None
    if not client:
        from src.llm.model_manager import model_manager

        agent_model = ctx.agent.model if ctx.agent and hasattr(ctx.agent, "model") else "deepseek-v4-flash"
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

        agent_model = getattr(ctx.llm_client, "model", None) or (ctx.agent.model if ctx.agent and hasattr(ctx.agent, "model") else "deepseek-v4-flash")
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

    return tool_dicts


def _format_fallback_reply(ctx: PipelineContext, executed: list[dict]) -> str:
    """Format safe, human-like Arabic fallback response for customer-facing channels."""
    channel = str(getattr(ctx, "channel", "") or "").lower()
    customer_channels = {"chat", "facebook", "facebook_messenger", "messenger", "whatsapp", "telegram"}

    # 1. Synthesize order tracking if an order lookup tool executed
    for item in executed:
        t_name = str(item.get("tool", "")).lower()
        if "order" in t_name:
            res = item.get("result", {})
            order = res.get("order") if isinstance(res.get("order"), dict) else res
            if isinstance(order, dict) and order.get("found"):
                raw_status = str(order.get("status", "")).upper()
                status_ar = {
                    "PENDING": "قيد المراجعة والتجهيز",
                    "CONFIRMED": "تم تأكيد طلبك وجاري تجهيزه للشحن",
                    "SHIPPED": "تم شحن طلبك وهو حالياً في الطريق لحضرتك مع مندوب الشحن",
                    "DELIVERED": "تم تسليم الطلب بنجاح",
                    "CANCELLED": "ملغي",
                    "RETURNED": "مرتجع",
                }.get(raw_status, raw_status or "مسجل")
                num = order.get("orderNumber") or order.get("number") or ""
                return f"أهلاً بحضرتك يا فندم، راجعتلك الطلب رقم {num} وحالته حالياً: {status_ar}. لو حابب تستفسر عن أي تفاصيل تانية أنا معاك وتحت أمرك 😊"
            elif isinstance(order, dict) and order.get("found") is False:
                num = order.get("orderNumber") or ""
                return f"أهلاً بحضرتك يا فندم، بحثت برقم الطلب {num} ومش ظاهر عندي في السيستم، ممكن تتأكد من رقم الطلب أو تبعتلي رقم الموبايل اللي سجلت بيه الأوردر وهراجعلك فوراً 🙏"

    if channel in customer_channels or not channel or channel in ("unknown", "sandbox"):
        tool_names = {item.get("tool", "") for item in executed}
        if any("product" in t or "search" in t or "catalog" in t for t in tool_names):
            return "معاك يا فندم، راجعتلك الموديلات المتاحة أهو وبشوفلك أنسب حاجة تناسب طلبك 😊 تحب تسأل عن مقاس معين أو ألوان تانية؟"
        return "معاك يا فندم وتحت أمرك في أي استفسار، تحب أساعدك في إيه بالظبط؟ 😊"
    return _format_tool_results(executed)


def _format_tool_results(executed: list[dict]) -> str:
    from src.skills.registry import get_skill_registry

    registry = get_skill_registry()
    lines = []
    for item in executed:
        name = item.get("tool", "")
        status = item.get("status", "unknown")
        result = item.get("result", {})
        if status == "success":
            formatted = None
            tool = registry.resolve(name)
            if tool and hasattr(tool, "format_result"):
                try:
                    formatted = tool.format_result(result)
                except Exception:
                    formatted = None
            if formatted:
                lines.append(f"{formatted}")
            elif name in {"facebook_ad_create_full_draft", "facebook_ad.create_full_draft"}:
                lines.append("تم حفظ وتجهيز مسودة الحملة الإعلانية بنجاح في لوحة التحكم للمراجعة والاعتماد ✅")
            elif name in {"facebook_ad_publish_draft", "facebook_ad.publish_draft"}:
                lines.append("تم نشر الحملة الإعلانية بنجاح على فيسبوك بحالة متوقفة مؤقتاً لحفظ الميزانية ✅")
            elif name in {"facebook_ad_analyze_product", "facebook_ad.analyze_product"}:
                lines.append("تم فحص وتحليل بيانات المنتج واقتصادياته التسويقية بنجاح 📊")
            elif name in {"facebook_ad_account_info", "facebook_ad.account_info"}:
                lines.append("تم فحص حالة الحساب الإعلاني وأصول ميتا بنجاح 🔎")
            elif name in {"facebook_ad_inspect_targeting", "facebook_ad.inspect_targeting"}:
                lines.append("تم فحص وتأكيد الاستهداف الجغرافي والديموغرافي من سيرفرات Meta بنجاح 🎯")
            elif name in {"facebook_ad_get_decision", "facebook_ad.get_decision"}:
                lines.append("تم فحص مؤشرات الأداء والقرارات الاستثمارية للحملات بنجاح 📈")
            else:
                lines.append("تم تحديث ومراجعة البيانات بنجاح ✅")

        elif status == "error":
            err_text = str(item.get("error", ""))
            if "2490487" in err_text or "bid" in err_text.lower() or "عرض الأسعار" in err_text:
                lines.append("تعذر النشر التلقائي بسبب قيود استراتيجية المزايدة في حساب فيسبوك. تم حفظ المسودة بأمان في لوحة الإعلانات للمراجعة.")
            elif "pixel" in err_text.lower() or "بكسل" in err_text:
                lines.append("تعذر النشر لأن بكسل المتجر غير مرتبط بالحساب الإعلاني المختار حالياً.")
            else:
                lines.append("تعذر استكمال جزء من الإجراء وتم حفظ البيانات للمراجعة.")
    return "\n".join(lines)


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
