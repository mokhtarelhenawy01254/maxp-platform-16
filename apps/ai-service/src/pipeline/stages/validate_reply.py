from __future__ import annotations

import json
import re
from typing import Any

import structlog

from src.contracts.response_schema import AgentResponse
from src.guardrails.output import OUTPUT_GUARDRAILS
from src.llm.client import LLMClient
from src.observability.context_metrics import compute_context_metrics
from src.pipeline.context import PipelineContext

logger = structlog.get_logger(__name__)

MAX_OUTPUT_RETRIES = 2


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


def _strip_internal_tags(text: str) -> str:
    text = re.sub(r"<thought\b[^>]*>.*?</thought>", "", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"</?thought\b[^>]*>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<function\b[^>]*>.*?</function>", "", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"</?function\b[^>]*>", "", text, flags=re.IGNORECASE)
    return text.strip()


async def _correct_output(
    ctx: PipelineContext, reply: str, reason: str, violations: list[str]
) -> str | None:
    correction_msg = (
        f"تم حظر ردك السابق بسبب: {reason}\n"
        f"التفاصيل: {', '.join(violations)}\n"
        "يرجى إعادة الصياغة بدون هذه المشكلة."
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


async def validate_reply(ctx: PipelineContext) -> PipelineContext:
    reply = ctx.llm_response or ""
    reply = _strip_internal_tags(reply)

    # If no LLM response and a final_reply is already set (e.g., from skills_pipeline error),
    # skip validation to avoid overwriting the error message
    if not reply and ctx.final_reply:
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
            ctx.llm_response = reply
            break  # Validation succeeded!
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

    return ctx
