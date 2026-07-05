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
from src.tools.registry import ALL_TOOLS

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

    # Inject referred product mapping context (if present)
    referred_product = ctx.external_memory_context.get("referredProduct")
    if referred_product and isinstance(referred_product, dict):
        product_info = f"\n\n[معلومات النظام: العميل تواصل معنا عبر إعلان/منشور مرتبط بالمنتج التالي:\nالاسم: {referred_product.get('name')}\nالسعر: {referred_product.get('price')} جنيه\nالرابط/المعرف: {referred_product.get('id')}\nالرجاء افتراض اهتمام العميل المباشر بهذا المنتج وتوجيه المحادثة لتأكيد شرائه.]"
        system_prompt += product_info

    # Inject full skill instructions (SKILL.md) into system prompt
    if ctx.agent and hasattr(ctx.agent, "allowed_skills") and ctx.agent.allowed_skills:
        skills_block = get_skills_block(ctx.agent.allowed_skills)
        if skills_block:
            system_prompt += f"\n\n{skills_block}"

    # Inject image search instruction when customer sends an image
    if ctx.attachments:
        img_urls = [a.get("url", "") for a in ctx.attachments if a.get("type") in ("image", "photo")]
        if img_urls:
            system_prompt += (
                "\n\n[العميل أرسل صورة. حللها أولاً باستخدام قدراتك البصرية،"
                " ثم استخدم أداة product_search مع تمرير image_url من الصورة"
                " للبحث عن منتجات مشابهة في الكتالوج."
                f" رابط الصورة: {img_urls[0]}]"
            )

    # 4. Single LLM call with skills as tools
    try:
        provider_response = await _llm_call(ctx, system_prompt, skills)
    except Exception as e:
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

            skill = registry.get(func_name)
            if not skill:
                # Fallback: try native tool definitions
                tool = ALL_TOOLS.get(func_name)
                if tool:
                    if ctx.company_id and "company_id" not in arguments:
                        arguments = {**arguments, "company_id": ctx.company_id}
                    try:
                        validated = tool.input_model(**arguments)
                        result = await tool.func(validated)
                        return {"tool": func_name, "status": "success", "result": result}
                    except Exception as e:
                        logger.error("tool_execution_failed", name=func_name, error=str(e))
                        return {"tool": func_name, "status": "error", "error": str(e)}
                logger.warning("unknown_skill_called", name=func_name)
                return {"tool": func_name, "status": "unknown"}

            if ctx.company_id and "company_id" not in arguments:
                arguments = {**arguments, "company_id": ctx.company_id}

            try:
                result = await skill.execute(**arguments)
                return {"tool": func_name, "status": "success", "result": result}
            except Exception as e:
                logger.error("skill_execution_failed", name=func_name, error=str(e))
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
            retry_messages = _build_followup_messages(ctx, provider_response, executed)
            tool_dicts = [s.to_openai_tool() for s in skills]
            skill_names = {s.name.lower() for s in skills}
            for tool_name in (getattr(ctx.agent, "allowed_tools", None) or []):
                tn = tool_name.lower()
                if tn not in skill_names and tn in ALL_TOOLS:
                    tool_dicts.append(ALL_TOOLS[tn].to_json_schema_spec())
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
            followup_messages = _build_followup_messages(ctx, provider_response, executed)
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
    """Make the primary LLM call with skills as available tools."""
    messages = [
        {"role": "system", "content": system_prompt},
    ]
    # Add recent conversation history if available
    recent = ctx.external_memory_context.get("recentMessages", [])
    for msg in recent:
        role = "assistant" if msg.get("role") == "assistant" else "user"
        messages.append({"role": role, "content": msg.get("content", "")})

    # Build user message — multipart if attachments present
    from src.context.multimodal import build_user_content
    user_content = build_user_content(ctx.message, ctx.attachments)
    messages.append({"role": "user", "content": user_content})

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

    # If message has images but current model doesn't support vision, switch to Gemini
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
                client = LLMClient(
                    provider=routing.provider,
                    model=routing.model,
                    api_key=routing.api_key,
                    base_url=routing.base_url,
                )
                logger.info("vision_fallback_switched", original_model=client_model, new_model=vision_model)
            except Exception as e:
                logger.warning("vision_fallback_unavailable", error=str(e))

    tool_dicts = [s.to_openai_tool() for s in skills]

    skill_names = {s.name.lower() for s in skills}
    allowed = getattr(ctx.agent, "allowed_tools", None) or []
    for tool_name in allowed:
        tname = tool_name.lower()
        if tname not in skill_names and tname in ALL_TOOLS:
            tool_dicts.append(ALL_TOOLS[tname].to_json_schema_spec())

    return await client.generate(
        messages=messages,
        tools=tool_dicts,
        temperature=0.3,
    )


async def _raw_llm_call(ctx: PipelineContext, messages: list[dict], tools: list | None = None, tool_choice: str | None = "auto") -> ProviderResponse:
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

    return await client.generate(
        messages=messages,
        tools=tool_dicts,
        temperature=0.3,
        tool_choice=tool_choice,
    )


def _build_tool_dicts(ctx: PipelineContext) -> list[dict]:
    from src.tools.registry import ALL_TOOLS
    tool_dicts = []
    used_names = set()
    allowed = getattr(ctx.agent, "allowed_tools", None) or []
    for tool_name in allowed:
        tname = tool_name.lower()
        if tname in ALL_TOOLS:
            tool_dicts.append(ALL_TOOLS[tname].to_json_schema_spec())
            used_names.add(tname)
    return tool_dicts


def _format_tool_results(executed: list[dict]) -> str:
    parts = []
    for item in executed:
        name = item.get("tool", "")
        status = item.get("status", "unknown")
        result = item.get("result", {})
        if status == "success" and isinstance(result, dict):
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
            elif isinstance(categories, list) and len(categories) > 0:
                names = [c.get("category") or "" for c in categories[:5]]
                parts.append(f"{', '.join(filter(None, names))}{'...' if len(categories) > 5 else ''}")
            elif name == "inventory_check" and not result.get("found"):
                parts.append(f"المنتج '{result.get('queriedName', '')}' غير متوفر حالياً.")
            elif name == "offers_list_active":
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
                if result.get("valid"):
                    parts.append(f"الكوبون {result.get('code')} صالح (خصم بقيمة {result.get('discountAmount')})")
                else:
                    parts.append(f"الكوبون غير صالح: {result.get('error', '')}")
            elif name == "order_lookup":
                if result.get("found") or result.get("order"):
                    order = result.get("order") or result
                    parts.append(f"الطلب #{order.get('id') or order.get('number')} حالته: {order.get('status')}")
            elif name == "customer_info":
                if result.get("found") or result.get("customer"):
                    cust = result.get("customer") or result
                    parts.append(f"بيانات العميل: {cust.get('name') or cust.get('customerName')}")
        elif status == "error":
            continue
    return "\n".join(parts) if parts else ""


def _build_followup_messages(
    ctx: PipelineContext, first_response: ProviderResponse, executed: list[dict]
) -> list[dict]:
    """Build messages for the follow-up LLM call after tool execution."""
    agent_instructions = get_agent_instructions(ctx.agent) if ctx.agent else ""
    base_prompt = ctx.system_prompt or agent_instructions or _default_system_prompt()
    system_prompt = f"{base_prompt}\n\n{_technical_formatting_constraints()}"

    # Inject SKILL.md instructions (same as primary _llm_call)
    if ctx.agent and hasattr(ctx.agent, "allowed_skills") and ctx.agent.allowed_skills:
        skills_block = get_skills_block(ctx.agent.allowed_skills)
        if skills_block:
            system_prompt += f"\n\n{skills_block}"

    messages = [
        {"role": "system", "content": system_prompt},
    ]

    # Add recent conversation history (same as primary _llm_call)
    recent = ctx.external_memory_context.get("recentMessages", [])
    for msg in recent:
        role = "assistant" if msg.get("role") == "assistant" else "user"
        messages.append({"role": role, "content": msg.get("content", "")})

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
