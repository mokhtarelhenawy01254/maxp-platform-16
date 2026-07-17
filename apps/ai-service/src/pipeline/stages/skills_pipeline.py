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
    base_prompt = ctx.system_prompt or agent_instructions or _generic_system_prompt()
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

    # Agent hooks: before_reply (attachments, post-processing)
    if ctx.agent and hasattr(ctx.agent, "hooks"):
        for hook in ctx.agent.hooks:
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

    if tool_choice is None and ctx.agent and hasattr(ctx.agent, "config"):
        tool_choice = ctx.agent.config.tool_choice

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
                lines.append(f"[{name}]: {formatted}")
            else:
                content = json.dumps(result, ensure_ascii=False, cls=DecimalEncoder) if isinstance(result, dict) else str(result)
                lines.append(f"[{name}]: {content[:500]}")
        elif status == "error":
            lines.append(f"[{name}]: ERROR - {item.get('error', '')[:300]}")
    return "\n".join(lines)


async def _build_followup_messages(
    ctx: PipelineContext, first_response: ProviderResponse, executed: list[dict]
) -> list[dict]:
    """Build messages for the follow-up LLM call after tool execution."""
    agent_instructions = get_agent_instructions(ctx.agent) if ctx.agent else ""
    base_prompt = ctx.system_prompt or agent_instructions or _generic_system_prompt()
    followup_directive = _get_followup_directive(ctx.agent)
    system_prompt = f"{base_prompt}\n\n{followup_directive}"

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
    from src.skills.registry import get_skill_registry

    registry = get_skill_registry()
    result = [m for m in messages if m["role"] != "tool"]
    for m in result:
        m.pop("tool_calls", None)
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
        else:
            tool_summaries.append(f"[{tool_name}: {'نجاح' if status == 'success' else 'فشل'}]")
    if tool_summaries:
        summary = "نتائج الأدوات:\n" + "\n".join(tool_summaries)
        result.append({"role": "system", "content": summary})
    return result


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
