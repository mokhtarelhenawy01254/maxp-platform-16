from __future__ import annotations

import asyncio
import json
import uuid
from decimal import Decimal
from typing import Any

import structlog

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

    try:
        validated = tool.input_model(**arguments)
        result = await tool.func(validated)
        return {"tool": func_name, "status": "success", "result": result}
    except Exception as e:
        logger.error("tool_execution_failed", name=func_name, error=str(e))
        return {"tool": func_name, "status": "error", "error": str(e)}


async def _execute_hotel_reserve_enforcement(ctx: PipelineContext, registry: Any, executed: list[dict]) -> dict | None:
    """Build and execute hotel_reserve from conversation context.

    Scans ctx.tool_evidence and ctx.messages for hotel_info/check_availability
    results, extracts customer data from ctx.message, executes the tool
    directly, and appends the result to ``executed``.

    Returns the synthetic tool_call dict (for follow-up message building)
    or None if data is insufficient.
    """
    hotel_tc = _build_hotel_reserve_tool_call(ctx, registry)
    if not hotel_tc:
        return None
    hotel_tool = registry.resolve("hotel_reserve")
    if not hotel_tool or not ctx.company_id:
        return None
    hotel_tc["id"] = f"call_enforced_{uuid.uuid4().hex[:8]}"
    hotel_tc["type"] = "function"
    try:
        args = json.loads(hotel_tc["function"]["arguments"])
        if "company_id" not in args:
            args["company_id"] = ctx.company_id
        validated = hotel_tool.input_model(**args)
        result = await hotel_tool.func(validated)
        executed.append({"tool": "hotel_reserve", "status": "success", "result": result})
        ctx.tool_evidence.append({"tool": "hotel_reserve", "result": result})
        return hotel_tc
    except Exception as e:
        logger.error("skills_pipeline_hotel_reserve_direct_failed", error=str(e))
        executed.append({"tool": "hotel_reserve", "status": "error", "error": str(e)})
        return hotel_tc


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
            logger.warning(
                "input_guardrail_blocked", guardrail=guardrail.name, reason=result.reason
            )
            return ctx

    # 2. Get skills (filtered by agent's allowed_skills if present)
    registry = get_skill_registry()
    skills = registry.get_all()
    if ctx.agent and hasattr(ctx.agent, "allowed_skills") and ctx.agent.allowed_skills:
        try:
            allowed_names: set[str] = set()
            for meta in _iter_skill_meta(set(ctx.agent.allowed_skills)):
                allowed_names.update(t.lower() for t in meta.get("allowed_tools", []))
            if allowed_names:
                skills = [s for s in skills if s.name.lower() in allowed_names]
                logger.info(
                    "skills_filtered_by_agent",
                    agent=str(ctx.agent.name or ctx.agent.id),
                    total=len(registry.get_all()),
                    filtered=len(skills),
                )
        except Exception as e:
            logger.warning("skills_filter_failed", error=str(e))
    if not skills:
        logger.warning("no_skills_available_using_allowed_tools_fallback")

    # 3. Build system prompt with agent instructions (soul/persona from DB agent)
    agent_instructions = get_agent_instructions(ctx.agent) if ctx.agent else ""
    base_prompt = ctx.system_prompt or agent_instructions or _default_system_prompt()
    ctx.system_prompt = base_prompt

    system_prompt = f"{base_prompt}\n\n{_technical_formatting_constraints()}"

    # 4. Single LLM call with skills as tools
    try:
        provider_response = await _llm_call(ctx, system_prompt, skills)
    except Exception as e:
        import logging as _log; _log.warning("LLM_CALL_EXCEPTION %s %s", type(e).__name__, str(e)[:300])
        logger.error("skills_pipeline_llm_failed", error=str(e))
        error_details = provider_error_result(e)
        if error_details.get("error_code") == "LLM_RATE_LIMITED":
            ctx.final_reply = "عذراً، واجهت خدمة الذكاء الاصطناعي ضغطاً في الاستخدام حالياً. الرجاء المحاولة بعد قليل."
        else:
            ctx.final_reply = "عذراً، حدث خطأ في معالجة طلبك. الرجاء المحاولة مرة أخرى."
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

    # 6. Hotel booking enforcement (runs for both tool_calls and no-tool-calls paths)
    _has_hotel_reserve = any(
        e.get("tool") == "hotel_reserve" and e.get("status") in ("success", "error")
        for e in executed
    )
    if not _has_hotel_reserve and _message_indicates_hotel_confirmation(ctx):
        hotel_injected = await _execute_hotel_reserve_enforcement(ctx, registry, executed)
        if hotel_injected:
            if provider_response.tool_calls is None:
                provider_response.tool_calls = []
            provider_response.tool_calls.append(hotel_injected)
            logger.warning(
                "skills_pipeline_hotel_reserve_enforced",
                tool_calls_path=bool(provider_response.tool_calls),
            )
        else:
            logger.warning("skills_pipeline_hotel_enforcement_skipped_no_data")

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

        followup_messages = await _build_followup_messages(ctx, provider_response, executed)
        try:
            final_response = await _raw_llm_call(ctx, followup_messages, tool_choice="none")
            if final_response.tool_calls:
                extra_results = await asyncio.gather(*[_execute_one_tool(ctx, registry, tc) for tc in final_response.tool_calls])
                executed.extend(extra_results)
                for item in extra_results:
                    if item["status"] == "success":
                        ctx.tool_evidence.append({"tool": item["tool"], "result": item["result"]})
                followup_messages = await _build_followup_messages(ctx, final_response, extra_results)
                final_response = await _raw_llm_call(ctx, followup_messages, tool_choice="none")
            if not final_response.text:
                logger.warning("skills_pipeline_followup_empty_retrying")
                text_messages = _strip_tool_messages(followup_messages, executed)
                final_response = await _raw_llm_call(ctx, text_messages, tools=[], tool_choice=None)
            ctx.final_reply = final_response.text or _format_tool_results(executed)
            ctx.llm_response = final_response.text or ""
        except Exception as e:
            logger.error("skills_pipeline_followup_failed", error=str(e))
            ctx.final_reply = _format_tool_results(executed)
    elif provider_response.text:
        ctx.final_reply = provider_response.text
        ctx.llm_response = provider_response.text
    else:
        logger.warning("skills_pipeline_empty_reply_no_tools")
        ctx.final_reply = ""
        ctx.llm_response = ""

    # Auto-populate response_attachments from landmarkImage in tool evidence
    import os
    _maxp_api_url = os.getenv("MAXP_API_URL", "").rstrip("/")
    for evidence in ctx.tool_evidence:
        result = evidence.get("result", {})
        if isinstance(result, dict):
            for branch in (result.get("branches") or []):
                img = (branch.get("landmarkImage") or "")
                if not img:
                    continue
                # Only auto-populate if the image URL/path or its filename is present in the final reply text,
                # meaning the LLM explicitly intended to display/refer to the image.
                img_filename = os.path.basename(img)
                if not ctx.final_reply or (img not in ctx.final_reply and img_filename not in ctx.final_reply):
                    continue
                if img.startswith("data:") or img.startswith("http"):
                    ctx.response_attachments.append({
                        "type": "image",
                        "url": img,
                        "source": "tool_result",
                        "tool": evidence.get("tool", "booking_info"),
                    })
                elif img.startswith("/") and _maxp_api_url:
                    ctx.response_attachments.append({
                        "type": "image",
                        "url": f"{_maxp_api_url}{img}",
                        "source": "tool_result",
                        "tool": evidence.get("tool", "booking_info"),
                    })

    # Auto-populate response_attachments from product images in tool results
    for evidence in ctx.tool_evidence:
        result = evidence.get("result", {})
        if not isinstance(result, dict):
            continue
        for key in ("results", "products"):
            items = result.get(key) or []
            if not isinstance(items, list):
                continue
            for product in items:
                if not isinstance(product, dict):
                    continue
                for img in (product.get("images") or []):
                    if not img or not isinstance(img, str):
                        continue
                    if not ctx.final_reply or (img not in ctx.final_reply and os.path.basename(img) not in ctx.final_reply):
                        continue
                    if img.startswith(("http://", "https://", "data:")):
                        ctx.response_attachments.append({
                            "type": "image",
                            "url": img,
                            "source": "tool_result",
                            "tool": evidence.get("tool", "product_search"),
                        })

    if ctx.response_attachments:
        logger.info(
            "response_attachments_auto_populated",
            count=len(ctx.response_attachments),
            urls=[a.get("url", "")[:120] for a in ctx.response_attachments],
        )

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

    # If message has images but current model doesn't support vision:
    # Use Gemini ONLY for image description, then keep DeepSeek for tool calling
    has_images = bool(ctx.attachments)
    if has_images:
        from src.llm.model_capabilities import supports_vision

        client_model = getattr(client, "model", None)
        client_provider = getattr(client, "provider", None)
        if not supports_vision(client_model, client_provider):
            try:
                from src.llm.model_manager import model_manager

                vision_model = "gemini-2.5-flash"
                routing = await model_manager.get_next_key(vision_model, ctx.company_id)
                vision_client = LLMClient(
                    provider=routing.provider,
                    model=routing.model,
                    api_key=routing.api_key,
                    base_url=routing.base_url,
                )
                # Call Gemini WITHOUT tools just for image description
                vision_msgs = [
                    {"role": "system", "content": "صف المنتجات في الصورة بالتفصيل بالعربي: نوع المنتج، اللون، الشكل، أي نصوص أو علامات تجارية."},
                    {"role": "user", "content": user_content},
                ]
                desc_response = await vision_client.generate(messages=vision_msgs, tools=None, temperature=0.1)
                if desc_response.text:
                    desc = desc_response.text.strip()
                    logger.info("vision_description_extracted", chars=len(desc))
                    # Inject description into user message for tool-calling LLM (DeepSeek)
                    base_text = ctx.message
                    for att in (ctx.attachments or []):
                        url = ""
                        if att.get("type") == "image_url" and isinstance(att.get("image_url"), dict):
                            url = att["image_url"].get("url", "")
                        if url and url.startswith(("http://", "https://")):
                            base_text += "\n[image_url: " + url + "]"
                    base_text += "\n[وصف الصورة: " + desc + "]"
                    messages[-1] = {"role": "user", "content": base_text}
                logger.info("vision_two_step", original_model=client_model, vision=vision_model)
            except Exception as e:
                logger.warning("vision_description_failed", error=str(e))

    tool_dicts = _build_skill_tool_dicts(skills, ctx)

    tool_choice = None
    if ctx.agent and hasattr(ctx.agent, "config"):
        agent_tc = getattr(ctx.agent.config, "tool_choice", None) or getattr(ctx.agent.config, "config", {}).get("toolChoice")
        if agent_tc:
            tool_choice = agent_tc

    provider = (getattr(client, "provider", None) or "").upper()
    if tool_choice == "required" and provider == "DEEPSEEK":
        tool_choice = None

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
    if tools is None:
        from src.skills.registry import get_skill_registry
        _registry = get_skill_registry()
        _skills = _registry.get_all()
        tool_dicts = _build_skill_tool_dicts(_skills, ctx)
    else:
        tool_dicts = tools

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

    if tool_choice is None:
        if ctx.agent and hasattr(ctx.agent, "config"):
            agent_tc = getattr(ctx.agent.config, "tool_choice", None) or getattr(ctx.agent.config, "config", {}).get("toolChoice")
            if agent_tc:
                tool_choice = agent_tc

    provider = (getattr(client, "provider", None) or "").upper()
    temperature = 1.0 if provider == "OLLAMA" else 0.3
    return await client.generate(
        messages=messages,
        tools=tool_dicts,
        temperature=temperature,
        tool_choice=tool_choice or "auto",
    )


def _build_skill_tool_dicts(skills: list, ctx: PipelineContext) -> list[dict]:
    tool_dicts = [s.to_openai_tool() for s in skills]
    skill_names = {s.name.lower() for s in skills}
    allowed = getattr(ctx.agent, "allowed_tools", None) or []
    registry = get_skill_registry()
    for tool_name in allowed:
        tname = tool_name.lower()
        if tname not in skill_names:
            tool = registry.resolve(tname)
            if tool:
                tool_dicts.append(
                    tool.to_json_schema_spec() if hasattr(tool, "to_json_schema_spec")
                    else {
                        "type": "function",
                        "function": {"name": tool.name, "description": getattr(tool, "description", ""), "parameters": {"type": "object", "properties": {}}}
                    }
                )
    return tool_dicts


def _format_tool_results(executed: list[dict]) -> str:
    parts = []
    for item in executed:
        name = item.get("tool", "")
        status = item.get("status", "unknown")
        result = item.get("result", {})
        if status == "success" and isinstance(result, dict):
            handled = False
            code = result.get("code", "")
            if code == "MISSING_COMPANY":
                continue

            products = result.get("products") or result.get("items") or result.get("results") or []
            if not products and isinstance(result, dict) and result.get("productName"):
                products = [result]

            categories = result.get("categories") or []

            if isinstance(products, list) and len(products) > 0:
                names = [p.get("productName") or p.get("name") or "" for p in products[:5]]
                parts.append(f"{', '.join(filter(None, names))}{'...' if len(products) > 5 else ''}")
                handled = True
            elif isinstance(categories, list) and len(categories) > 0:
                names = [c.get("category") or "" for c in categories[:5]]
                parts.append(f"{', '.join(filter(None, names))}{'...' if len(categories) > 5 else ''}")
                handled = True
            elif name == "inventory_check" and not result.get("found"):
                parts.append(f"المنتج '{result.get('queriedName', '')}' غير متوفر حالياً.")
                handled = True
            elif name == "offers_list_active":
                handled = True
                active_parts = []
                if result.get("totalActiveCoupons", 0) > 0:
                    active_parts.append(f"كوبونات خصم ({result.get('totalActiveCoupons')})")
                if result.get("hasStorePromotion"):
                    active_parts.append("خصم تلقائي بالمتجر")
                if result.get("hasFreeShipping"):
                    active_parts.append("شحن مجاني")
                if active_parts:
                    parts.append(f"العروض المتاحة: {', '.join(active_parts)}")
            elif name == "coupon_validate":
                handled = True
                if result.get("valid"):
                    parts.append(f"الكوبون {result.get('code')} صالح (خصم بقيمة {result.get('discountAmount')})")
                else:
                    parts.append(f"الكوبون غير صالح: {result.get('error', '')}")
            elif name == "product_search" and not result.get("found"):
                parts.append(f"لم أعثر على منتجات مطابقة.")
                handled = True
            elif name == "order_lookup":
                handled = True
                if result.get("found") or result.get("order"):
                    order = result.get("order") or result
                    parts.append(f"الطلب #{order.get('id') or order.get('number')} حالته: {order.get('status')}")
            elif name == "customer_info":
                handled = True
                if result.get("found") or result.get("customer"):
                    cust = result.get("customer") or result
                    parts.append(f"بيانات العميل: {cust.get('name') or cust.get('customerName')}")
            elif name == "booking_info":
                handled = True
                branch_count = result.get('total_branches', 0) or len(result.get('branches') or [])
                svc_count = len(result.get('services') or [])
                doc_count = len(result.get('doctors') or [])
                parts.append(f"المركز لديه {branch_count} فرع{' و' if svc_count or doc_count else ''}{f' {svc_count} خدمة' if svc_count else ''}{f' و {doc_count} دكتور' if doc_count else ''}.")
            elif name == "booking_reserve_skill":
                handled = True
                err = result.get("error", "")
                if err:
                    parts.append(f"تعذر الحجز: {err}")
                elif result.get("needs_gender"):
                    parts.append(result.get("message", ""))
                else:
                    appt = result.get("appointment") or result
                    parts.append(
                        f"تم حجز موعد لـ {result.get('patient', '')} "
                        f"{'في ' + result.get('branch', '') if result.get('branch') else ''} "
                        f"{'يوم ' + result.get('day_arabic', '') if result.get('day_arabic') else result.get('date', '')} "
                        f"{'الساعة ' + result.get('time', '') if result.get('time') else ''} "
                        f"{'خدمة ' + result.get('service', '') if result.get('service') else ''}"
                    )
            elif name == "booking_slots":
                handled = True
                available = result.get("available") or []
                booked = result.get("booked") or []
                note = result.get("note", "")
                day = result.get("day", "")
                date = result.get("date", "")
                line = f"مواعيد {'يوم ' + day if day else ''} {date}: " if date else "مواعيد متاحة: "
                if available:
                    line += ', '.join(available)
                else:
                    line += "لا توجد مواعيد متاحة"
                if note:
                    line += f" ({note})"
                parts.append(line)
            elif name == "booking_status":
                handled = True
                if result.get("error"):
                    parts.append(f"خطأ: {result.get('error')}")
                elif result.get("cancelled") or result.get("success"):
                    parts.append("تم إلغاء الحجز بنجاح.")
                elif result.get("appointment"):
                    appt = result["appointment"]
                    parts.append(f"حالة الحجز: {appt.get('status', 'مؤكد')} في {appt.get('branchName', '')} يوم {appt.get('date', '')}")
                else:
                    parts.append(f"حالة الحجز: {result.get('status', 'غير معروف')}")

            if not handled:
                id_val = result.get("id") or result.get("number") or result.get("orderId")
                if id_val:
                    parts.append(f"تم تنفيذ {name}: # {id_val}")
                elif result.get("found") is False:
                    parts.append(f"لم يتم العثور على نتائج لـ {name}.")
                elif result.get("count") is not None:
                    parts.append(f"نتائج {name}: {result.get('count')}")
                elif result.get("status"):
                    parts.append(f"{name}: {result.get('status')}")
                else:
                    parts.append(f"تم تنفيذ {name} بنجاح.")
        elif status == "error":
            continue
    return "\n".join(parts) if parts else ""


async def _build_followup_messages(
    ctx: PipelineContext, first_response: ProviderResponse, executed: list[dict]
) -> list[dict]:
    """Build messages for the follow-up LLM call after tool execution."""
    agent_instructions = get_agent_instructions(ctx.agent) if ctx.agent else ""
    base_prompt = ctx.system_prompt or agent_instructions or _default_system_prompt()
    system_prompt = f"{base_prompt}\n\nاكتب رداً طبيعياً ومباشراً للعميل بالعامية المصرية. استخدم نتائج الأدوات أعلاه للرد. إذا كانت النتائج لا تحتوي على المعلومات المطلوبة بالكامل، رد بما هو متاح واسأل باستكمال الباقي."

    # Inject SKILL.md instructions (same as primary _llm_call)
    if ctx.agent and hasattr(ctx.agent, "allowed_skills") and ctx.agent.allowed_skills:
        skills_block = get_skills_block(ctx.agent.allowed_skills)
        if skills_block:
            system_prompt += f"\n\n{skills_block}"

    messages = [
        {"role": "system", "content": system_prompt},
    ]

    # Add DB-backed conversation history (same as primary _llm_call)
    from src.context.assembler import ContextAssembler
    assembler = ContextAssembler()
    history = await assembler.fetch_message_history(ctx, limit=50)
    for msg in history:
        messages.append({"role": msg["role"], "content": msg.get("content", "")})

    # Current user message — multipart if attachments present
    from src.context.multimodal import build_user_content
    user_content = build_user_content(ctx.message, ctx.attachments)
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

    # Tool results — match by index to avoid duplicate tool_call_id when same skill is called twice
    tool_calls = first_response.tool_calls or []
    for idx, item in enumerate(executed):
        status = item.get("status", "unknown")
        result = item.get("result", {})
        error = item.get("error", "")

        tc_id = tool_calls[idx].get("id", f"call_{idx}") if idx < len(tool_calls) else f"call_{idx}"

        if status == "success":
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc_id,
                    "content": json.dumps(result, ensure_ascii=False, cls=DecimalEncoder),
                }
            )
        else:
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc_id,
                    "content": json.dumps(
                        {"error": error or "Execution failed"},
                        ensure_ascii=False,
                        cls=DecimalEncoder,
                    ),
                }
            )

    return messages


def _strip_tool_messages(messages: list[dict], executed: list[dict]) -> list[dict]:
    """Remove tool_calls from assistant msgs and convert tool role msgs to system for APIs without tool support."""
    result = [m for m in messages if m["role"] != "tool"]
    for m in result:
        m.pop("tool_calls", None)
    tool_summaries = []
    for item in executed:
        tool_name = item.get("tool", "")
        status = item.get("status", "")
        result_data = item.get("result", {})
        if tool_name == "booking_info" and isinstance(result_data, dict):
            branches = len(result_data.get("branches", []))
            services = len(result_data.get("services", []))
            doctors = len(result_data.get("doctors", []))
            tool_summaries.append(f"[{tool_name}: {branches} فرع, {services} خدمة, {doctors} دكتور]")
        else:
            tool_summaries.append(f"[{tool_name}: {'نجاح' if status == 'success' else 'فشل'}]")
    if tool_summaries:
        summary = "نتائج الأدوات:\n" + "\n".join(tool_summaries)
        result.append({"role": "system", "content": summary})
    return result


def _inject_image_to_product_search(arguments: dict, attachments: list[dict]) -> None:
    """Inject image_bytes/mime_type into product_search args from context attachments.

    Called when the LLM calls product_search without image context even though the
    user message included an image attachment. This ensures embedding (vector) search
    runs instead of falling back to text-only search.
    """
    import re as _re
    _DATA_URL_RE = _re.compile(r"^data:(?P<mime>[^;,]+);base64,(?P<data>.+)$", _re.IGNORECASE | _re.DOTALL)
    for att in attachments:
        if not isinstance(att, dict):
            continue
        # Check direct base64 payload keys first
        b64 = (
            att.get("image_bytes") or att.get("imageBytes")
            or att.get("base64_data") or att.get("base64Data")
            or ""
        ).strip()
        if b64:
            mime = (
                att.get("mime_type") or att.get("mimeType")
                or att.get("content_type") or att.get("contentType")
                or "image/jpeg"
            ).strip() or "image/jpeg"
            arguments["image_bytes"] = b64
            arguments["mime_type"] = mime
            logger.info("product_search_image_bytes_injected", mime=mime, bytes_len=len(b64))
            return
        # Check already-converted OpenAI image_url format with data URI
        if att.get("type") == "image_url" and isinstance(att.get("image_url"), dict):
            url = att["image_url"].get("url", "")
            m = _DATA_URL_RE.match(url)
            if m:
                arguments["mime_type"] = m.group("mime")
                arguments["image_bytes"] = m.group("data")
                logger.info("product_search_image_bytes_injected_from_data_url", mime=m.group("mime"))
                return


def _message_indicates_hotel_confirmation(ctx: PipelineContext) -> bool:
    msg = (ctx.message or "").strip()
    if not msg:
        return False
    confirm_keywords = ["أكد", "وافق", "تمام", "تم", "احجز", "تأكيد", "موافق", "أوافق", "نعم"]
    has_keyword = any(kw in msg for kw in confirm_keywords)
    if not has_keyword:
        return False
    if any(
        ev.get("tool", "").startswith("hotel_") and ev.get("tool") != "hotel_reserve"
        for ev in getattr(ctx, "tool_evidence", [])
    ):
        return True
    for m in getattr(ctx, "messages", []):
        for tc in (m.get("tool_calls") or []):
            fn = tc.get("function", {}).get("name", "")
            if fn.startswith("hotel_") and fn != "hotel_reserve":
                return True
        if m.get("role") == "tool":
            try:
                result = json.loads(m["content"]) if isinstance(m["content"], str) else m["content"]
            except (json.JSONDecodeError, TypeError, ValueError):
                continue
            if isinstance(result, dict) and ("hotels" in result or "available_room_types" in result):
                return True
    return False


def _scan_messages_for_hotel_data(ctx: PipelineContext) -> tuple[str | None, list[dict], dict[str, Any]]:
    """Scan ctx.messages and ctx.tool_evidence for hotel_info and check_availability results."""
    property_id = None
    room_types_map = {}
    available_rooms = []

    for ev in getattr(ctx, "tool_evidence", []):
        if ev.get("tool") == "hotel_info":
            for hotel in (ev.get("result", {}).get("hotels") or []):
                property_id = hotel.get("id")
                for rt in (hotel.get("roomTypes") or []):
                    name_ar = rt.get("nameAr", "")
                    if name_ar and name_ar not in room_types_map:
                        room_types_map[name_ar] = rt
        if ev.get("tool") == "hotel_check_availability":
            for art in (ev.get("result", {}).get("available_room_types") or []):
                rt = art.get("roomType", {})
                for rm in (art.get("rooms") or []):
                    available_rooms.append({**rm, "roomType": rt})

    for m in getattr(ctx, "messages", []):
        if m.get("role") == "tool":
            try:
                result = json.loads(m["content"]) if isinstance(m["content"], str) else m["content"]
                if isinstance(result, dict):
                    for hotel in (result.get("hotels") or []):
                        if not property_id:
                            property_id = hotel.get("id")
                        for rt in (hotel.get("roomTypes") or []):
                            name_ar = rt.get("nameAr", "")
                            if name_ar and name_ar not in room_types_map:
                                room_types_map[name_ar] = rt
            except (json.JSONDecodeError, TypeError):
                pass

    return property_id, available_rooms, room_types_map


def _build_hotel_reserve_tool_call(ctx: PipelineContext, registry: Any) -> dict | None:
    """Extract booking data from context and build a hotel_reserve tool call dict."""
    msg = (ctx.message or "").strip()
    if not msg:
        return None

    import re
    from datetime import date as _date

    property_id, available_rooms, room_types_map = _scan_messages_for_hotel_data(ctx)

    # 2. Extract customer name
    customer_name = None
    for prefix in ["الاسم ", "اسمي ", "اسم الحاج ", "اسم الأستاذ "]:
        if prefix in msg:
            after = msg.split(prefix, 1)[1].strip()
            for sep in [" والموبايل ", " ورقم ", " والتليفون ", " الموبايل ", " رقم ", " ت:" ]:
                if sep in after:
                    after = after.split(sep, 1)[0].strip()
                    break
            customer_name = after
            break

    # 3. Extract phone (Egyptian mobile: 010/011/012/015 + 8 digits)
    phone_match = re.search(r'(01[0-2 5]\d{8}|01[0-9]{9})', msg.replace(" ", ""))
    customer_phone = phone_match.group(0) if phone_match else None

    # 4. Extract dates from message — also scan ctx.messages for prior tool results
    AR_MONTHS = {
        "يناير":"01", "فبراير":"02", "مارس":"03", "أبريل":"04", "إبريل":"04",
        "مايو":"05", "ماي":"05", "يونيه":"06", "يونيو":"06", "يوليه":"07",
        "يوليو":"07", "أغسطس":"08", "اغسطس":"08", "سبتمبر":"09",
        "أكتوبر":"10", "نوفمبر":"11", "ديسمبر":"12"
    }
    check_in = None
    check_out = None
    _year = str(_date.today().year)
    date_matches = re.findall(r'(\d{1,2})\s*(يناير|فبراير|مارس|أبريل|إبريل|مايو|ماي|يونيه|يونيو|يوليه|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)', msg)
    if len(date_matches) >= 2:
        day1, mon1 = date_matches[0]
        day2, mon2 = date_matches[1]
        month1 = AR_MONTHS.get(mon1, "07")
        month2 = AR_MONTHS.get(mon2, "07")
        check_in = f"{_year}-{month1}-{int(day1):02d}"
        check_out = f"{_year}-{month2}-{int(day2):02d}"

    # 5. Extract adults count
    adults = 2
    adult_match = re.search(r'(\d+)\s*(أشخاص|شخص|بالغين)', msg)
    if adult_match:
        adults = int(adult_match.group(1))

    # 6. Build rooms list — only include rooms matching user's requested type from available data
    rooms = []
    room_ar_names = {
        "ديلوكس": "غرفة ديلوكس", "مفردة": "غرفة مفردة", "مزدوجة": "غرفة مزدوجة",
        "جناح": "جناح", "سويت": "جناح", "suite": "جناح",
        "standard": "غرفة قياسية", "قياسية": "غرفة قياسية",
        "توأم": "غرفة توأم", "twin": "غرفة توأم",
        "triple": "غرفة ثلاثية", "ثلاثية": "غرفة ثلاثية",
        "family": "غرفة عائلية", "عائلية": "غرفة عائلية",
    }
    req_ar_name = None
    for keyword, ar_name in room_ar_names.items():
        if keyword in msg:
            req_ar_name = ar_name
            break

    if available_rooms:
        for rm in available_rooms:
            rt = rm.get("roomType", {})
            if req_ar_name and rt.get("nameAr") != req_ar_name:
                continue
            nightly_rate = rt.get("basePrice", 0)
            if rt.get("pricingModel") == "PER_PERSON":
                nightly_rate = rt.get("basePrice", 0) * adults
            rooms.append({
                "roomTypeId": rt.get("id", ""),
                "roomId": rm.get("id", ""),
                "nightlyRate": nightly_rate,
            })
    elif room_types_map and req_ar_name and req_ar_name in room_types_map:
        rt = room_types_map[req_ar_name]
        nightly_rate = rt.get("basePrice", 0)
        rooms.append({"roomTypeId": rt.get("id", ""), "nightlyRate": nightly_rate})

    if not customer_name or not customer_phone or not property_id or not rooms:
        return None

    args = {
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "property_id": property_id,
        "check_in": check_in or f"{_year}-07-20",
        "check_out": check_out or f"{_year}-07-22",
        "adults": adults,
        "rooms": rooms,
    }

    return {
        "function": {
            "name": "hotel_reserve",
            "arguments": json.dumps(args, ensure_ascii=False, cls=DecimalEncoder),
        }
    }


def get_agent_instructions(agent: Any) -> str:
    """Extract the agent's instructions/system prompt from various agent representations."""
    if not agent:
        return ""
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


def _default_system_prompt() -> str:
    return """أنت مساعد خدمة عملاء ذكي للمتجر.

تعليمات عامة:
1. استخدم الأدوات المتاحة عندما يحتاج المستخدم إلى معلومات أو إجراءات محددة.
2. إذا طلب المستخدم شيئاً خارج نطاق الأدوات المتاحة، أجب بقدرتك العامة.
3. استخدم اللغة العربية (اللهجة المصرية) في الردود.
4. إذا احتجت معلومات إضافية من المستخدم، اسأله بطريقة مهذبة.
5. لا تخترع معلومات غير موجودة في نتائج الأدوات.
6. تدفق الطلب: المستخدم يطلب شراء → استخدم product_search لتأكيد المنتج → ثم create_confirmed_order فوراً لإنشاء الطلب المباشر. اجمع بيانات العميل (الاسم، الهاتف، العنوان) أثناء المحادثة، وابتدأ الطلب بمجرد توفر البيانات الأساسية. لا تنتظر توفر المقاس/اللون في النظام — أنشئ الطلب والتاجر هيتأكد من التفاصيل.
7. لا تستخدم ask_merchant أبداً للاستفسار عن توفر المقاس أو اللون أو المنتج. أنشئ الطلب مباشرة بـ create_confirmed_order.
8. اللون والمقاس خياريان (optional) في create_confirmed_order. إذا أكد المستخدم الطلب ولم يذكر لوناً محدداً، أنشئ الطلب فوراً بدون لون. لا تسأل عن اللون أكثر من مرة واحدة."""
