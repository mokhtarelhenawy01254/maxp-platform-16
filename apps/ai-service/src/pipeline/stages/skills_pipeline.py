from __future__ import annotations

import json
from decimal import Decimal
from typing import Any

import structlog

from src.llm.client import LLMClient
from src.skills.registry import get_skill_registry
from src.guardrails.input import INPUT_GUARDRAILS
from src.pipeline.context import PipelineContext
from src.llm.providers.base import ProviderResponse

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
            logger.warning("input_guardrail_blocked", guardrail=guardrail.name, reason=result.reason)
            return ctx

    # 2. Get skills
    registry = get_skill_registry()
    skills = registry.get_all()
    if not skills:
        logger.warning("no_skills_registered")
        ctx.final_reply = "عذراً، لا توجد أدوات متاحة حالياً."
        return ctx

    # 3. Build system prompt with agent instructions
    system_prompt = ctx.system_prompt or _default_system_prompt()

    # 4. Single LLM call with skills as tools
    try:
        provider_response = await _llm_call(ctx, system_prompt, skills)
    except Exception as e:
        logger.error("skills_pipeline_llm_failed", error=str(e))
        ctx.final_reply = "عذراً، حدث خطأ في معالجة طلبك. الرجاء المحاولة مرة أخرى."
        return ctx

    # 5. Handle tool calls
    if provider_response.tool_calls:
        logger.info("skills_pipeline_tool_calls", count=len(provider_response.tool_calls), skills=[tc.get("function", {}).get("name", "") for tc in provider_response.tool_calls])
        executed = []
        for tc in provider_response.tool_calls:
            func_name = tc.get("function", {}).get("name", "")
            arguments_str = tc.get("function", {}).get("arguments", "{}")

            if isinstance(arguments_str, str):
                try:
                    arguments = json.loads(arguments_str)
                except json.JSONDecodeError:
                    arguments = {}
            else:
                arguments = arguments_str

            skill = registry.get(func_name)
            if not skill:
                logger.warning("unknown_skill_called", name=func_name)
                executed.append({"tool": func_name, "status": "unknown"})
                continue

            try:
                if ctx.company_id and "company_id" not in arguments:
                    arguments["company_id"] = ctx.company_id
                result = await skill.execute(**arguments)
                executed.append({"tool": func_name, "status": "success", "result": result})
                ctx.tool_evidence.append({"tool": func_name, "result": result})
            except Exception as e:
                logger.error("skill_execution_failed", name=func_name, error=str(e))
                executed.append({"tool": func_name, "status": "error", "error": str(e)})

        ctx.executed_tools = executed

        # If tools were executed, make a follow-up LLM call for the final reply
        if executed:
            # Build follow-up messages with tool results
            followup_messages = _build_followup_messages(ctx, provider_response, executed)
            try:
                final_response = await _raw_llm_call(ctx, followup_messages)
                ctx.final_reply = final_response.text or "تم تنفيذ طلبك."
                ctx.llm_response = final_response.text or ""
            except Exception as e:
                logger.error("skills_pipeline_followup_failed", error=str(e))
                ctx.final_reply = "تم تنفيذ طلبك."
    else:
        # Direct reply (no tool call — general chat)
        ctx.final_reply = provider_response.text or ""
        ctx.llm_response = provider_response.text or ""

    ctx.llm_result = provider_response
    return ctx


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def _unwrap_llm_client(client):
    if hasattr(client, '_llm_client'):
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

    messages.append({"role": "user", "content": ctx.message})

    # Get or create LLM client from context
    client = _unwrap_llm_client(ctx.llm_client) if ctx.llm_client else None
    if not client:
        # ponytail: uses first available provider — refine for multi-tenant routing
        from src.llm.model_manager import model_manager
        try:
            routing = await model_manager.get_next_key(
                "gemini-2.5-flash", ctx.company_id
            )
            client = LLMClient(
                provider=routing.provider,
                model=routing.model,
                api_key=routing.api_key,
                base_url=routing.base_url,
            )
        except Exception as e:
            logger.error("no_llm_client_available", error=str(e))
            raise

    # Attachments (vision)
    has_images = bool(ctx.attachments)
    tool_dicts = [s.to_openai_tool() for s in skills]

    return await client.generate(
        messages=messages,
        tools=tool_dicts,
        temperature=0.3,
    )


async def _raw_llm_call(ctx: PipelineContext, messages: list[dict]) -> ProviderResponse:
    """Make a follow-up LLM call without tools (for final reply synthesis)."""
    client = _unwrap_llm_client(ctx.llm_client) if ctx.llm_client else None
    if not client:
        from src.llm.model_manager import model_manager
        from src.llm.client import LLMClient
        routing = await model_manager.get_next_key(
            "gemini-2.5-flash", ctx.company_id
        )
        client = LLMClient(
            provider=routing.provider,
            model=routing.model,
            api_key=routing.api_key,
            base_url=routing.base_url,
        )

    return await client.generate(
        messages=messages,
        tools=None,
        temperature=0.3,
    )


def _build_followup_messages(ctx: PipelineContext, first_response: ProviderResponse, executed: list[dict]) -> list[dict]:
    """Build messages for the follow-up LLM call after tool execution."""
    messages = [
        {"role": "system", "content": ctx.system_prompt or _default_system_prompt()},
    ]

    # Original user message
    messages.append({"role": "user", "content": ctx.message})

    # Assistant response with tool_calls (required by DeepSeek API)
    assistant_msg = {"role": "assistant", "content": first_response.text or ""}
    if first_response.tool_calls:
        assistant_msg["tool_calls"] = first_response.tool_calls
    messages.append(assistant_msg)

    # Tool results — match by index to avoid duplicate tool_call_id when same skill is called twice
    tool_calls = first_response.tool_calls or []
    for idx, item in enumerate(executed):
        status = item.get("status", "unknown")
        result = item.get("result", {})
        error = item.get("error", "")

        tc_id = tool_calls[idx].get("id", f"call_{idx}") if idx < len(tool_calls) else f"call_{idx}"

        if status == "success":
            messages.append({
                "role": "tool",
                "tool_call_id": tc_id,
                "content": json.dumps(result, ensure_ascii=False, cls=DecimalEncoder),
            })
        else:
            messages.append({
                "role": "tool",
                "tool_call_id": tc_id,
                "content": json.dumps({"error": error or "Execution failed"}, ensure_ascii=False, cls=DecimalEncoder),
            })

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


def _default_system_prompt() -> str:
    return """أنت مساعد ذكي لمنصة MaxP للتجارة الإلكترونية.

تعليمات:
1. استخدم الأدوات المتاحة عندما يحتاج المستخدم إلى معلومات أو إجراءات محددة.
2. إذا طلب المستخدم شيئاً خارج نطاق الأدوات المتاحة، أجب بقدرتك العامة.
3. استخدم اللغة العربية (اللهجة المصرية) في الردود.
4. إذا احتجت معلومات إضافية من المستخدم، اسأله بطريقة مهذبة.
5. لا تخترع معلومات غير موجودة في نتائج الأدوات.
6. للاستعلام عن المنتجات أو الطلبات أو الحجوزات، استخدم الأداة المناسبة."""
