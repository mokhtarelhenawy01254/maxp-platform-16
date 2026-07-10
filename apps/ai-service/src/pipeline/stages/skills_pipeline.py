from __future__ import annotations

import asyncio
import json
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
        logger.warning("no_skills_available")
        ctx.final_reply = "عذراً، لا توجد أدوات متاحة حالياً."
        return ctx

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
    if provider_response.tool_calls:
        logger.info(
            "skills_pipeline_tool_calls",
            count=len(provider_response.tool_calls),
            skills=[tc.get("function", {}).get("name", "") for tc in provider_response.tool_calls],
        )

        async def _execute_one(tc: dict) -> dict:
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

        results = await asyncio.gather(*[_execute_one(tc) for tc in provider_response.tool_calls])
        executed = []
        for item in results:
            executed.append(item)
            if item["status"] == "success":
                ctx.tool_evidence.append({"tool": item["tool"], "result": item["result"]})

        # Self-correction: retry once on JSON parse errors
        parse_errors = [r for r in results if r.get("status") == "parse_error"]
        if parse_errors:
            logger.warning("skills_pipeline_json_parse_retry", errors=[r.get("error") for r in parse_errors])
            retry_messages = await _build_followup_messages(ctx, provider_response, executed)
            tool_dicts = [s.to_openai_tool() for s in skills]
            skill_names = {s.name.lower() for s in skills}
            for tool_name in (getattr(ctx.agent, "allowed_tools", None) or []):
                tn = tool_name.lower()
                if tn not in skill_names:
                    tool = registry.resolve(tn)
                    if tool:
                        tool_dicts.append(tool.to_json_schema_spec() if hasattr(tool, 'to_json_schema_spec') else {"type": "function", "function": {"name": tool.name, "description": getattr(tool, 'description', ''), "parameters": {"type": "object", "properties": {}}}})
            retry_response = await _raw_llm_call(ctx, retry_messages, tools=tool_dicts)
            if retry_response.tool_calls:
                retry_results = await asyncio.gather(*[_execute_one(tc) for tc in retry_response.tool_calls])
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

        # Follow-up LLM call for the final reply
        if executed:
            followup_messages = await _build_followup_messages(ctx, provider_response, executed)
            try:
                final_response = await _raw_llm_call(ctx, followup_messages, tool_choice="none")
                if not final_response.text:
                    logger.warning("skills_pipeline_followup_empty_retrying")
                    final_response = await _raw_llm_call(ctx, followup_messages, tool_choice="auto")
                ctx.final_reply = final_response.text or _format_tool_results(executed)
                ctx.llm_response = final_response.text or ""
            except Exception as e:
                logger.error("skills_pipeline_followup_failed", error=str(e))
                ctx.final_reply = _format_tool_results(executed)
    else:
        # Direct reply (no tool call — general chat)
        if provider_response.text:
            ctx.final_reply = provider_response.text
            ctx.llm_response = provider_response.text
        else:
            # LLM returned empty text with no tool calls — even after retry
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

    messages = [
        {"role": "system", "content": enriched_prompt},
    ]

    history = await assembler.fetch_message_history(ctx, limit=15)
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

        agent_model = ctx.agent.model if ctx.agent and hasattr(ctx.agent, "model") else "gemini-2.5-flash"
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

    tool_dicts = [s.to_openai_tool() for s in skills]

    skill_names = {s.name.lower() for s in skills}
    allowed = getattr(ctx.agent, "allowed_tools", None) or []
    sk_registry = get_skill_registry()
    for tool_name in allowed:
        tname = tool_name.lower()
        if tname not in skill_names:
            tool = sk_registry.resolve(tname)
            if tool:
                tool_dicts.append(tool.to_json_schema_spec() if hasattr(tool, 'to_json_schema_spec') else {
                    "type": "function",
                    "function": {"name": tool.name, "description": getattr(tool, 'description', ''), "parameters": {"type": "object", "properties": {}}}
                })

    tool_choice = None
    if ctx.agent and hasattr(ctx.agent, "config"):
        agent_tc = getattr(ctx.agent.config, "tool_choice", None) or getattr(ctx.agent.config, "config", {}).get("toolChoice")
        if agent_tc:
            tool_choice = agent_tc

    provider = (getattr(client, "provider", None) or "").upper()
    if tool_choice == "required" and provider == "DEEPSEEK":
        tool_choice = None

    temperature = 1.0 if provider == "OLLAMA" else 0.3
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

        agent_model = getattr(ctx.llm_client, "model", None) or (ctx.agent.model if ctx.agent and hasattr(ctx.agent, "model") else "gemini-2.5-flash")
        routing = await model_manager.get_next_key(agent_model, ctx.company_id)
        client = LLMClient(
            provider=routing.provider,
            model=routing.model,
            api_key=routing.api_key,
            base_url=routing.base_url,
        )

    # Build tool definitions so DeepSeek can understand tool_call history
    tool_dicts = tools or _build_tool_dicts(ctx)

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


def _build_tool_dicts(ctx: PipelineContext) -> list[dict]:
    from src.skills.registry import get_skill_registry
    registry = get_skill_registry()
    tool_dicts = []
    allowed = getattr(ctx.agent, "allowed_tools", None) or []
    for tool_name in allowed:
        tname = tool_name.lower()
        tool = registry.resolve(tname)
        if tool:
            tool_dicts.append(
                tool.to_json_schema_spec() if hasattr(tool, 'to_json_schema_spec')
                else {"type": "function", "function": {"name": tool.name, "description": getattr(tool, 'description', ''), "parameters": {"type": "object", "properties": {}}}}
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
    system_prompt = f"{base_prompt}\n\nاكتب رداً طبيعياً ومباشراً للعميل بالعامية المصرية بناءً على نتائج الأدوات أعلاه. لا تكرر التحية. لا تخبر العميل أنك استخدمت أدوات."

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
    history = await assembler.fetch_message_history(ctx, limit=15)
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
