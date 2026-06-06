from __future__ import annotations

import json
import re
from typing import Any

import structlog

from src.contracts.response_schema import AgentResponse
from src.guardrails.output import OUTPUT_GUARDRAILS
from src.observability.context_metrics import compute_context_metrics
from src.pipeline.context import PipelineContext

logger = structlog.get_logger(__name__)


def _try_parse_json_object(text: str) -> dict[str, Any] | None:
    """Try multiple strategies to extract a JSON object from text."""
    if not text:
        return None
    # Strategy 1: direct parse
    try:
        obj = json.loads(text)
        return obj if isinstance(obj, dict) else None
    except (json.JSONDecodeError, TypeError, ValueError):
        pass
    # Strategy 2: extract from ```json ... ``` block
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence:
        try:
            obj = json.loads(fence.group(1))
            return obj if isinstance(obj, dict) else None
        except (json.JSONDecodeError, TypeError, ValueError):
            pass
    # Strategy 3: find first {...} block
    brace = re.search(r"\{.*\}", text, re.DOTALL)
    if brace:
        try:
            obj = json.loads(brace.group())
            return obj if isinstance(obj, dict) else None
        except (json.JSONDecodeError, TypeError, ValueError):
            pass
    return None


async def validate_reply(ctx: PipelineContext) -> PipelineContext:
    reply = ctx.llm_response or ""

    # Guardrails check
    for guardrail in OUTPUT_GUARDRAILS:
        result = await guardrail.validate(ctx, reply)
        if not result.allowed:
            ctx.early_return = {
                "status": "GUARDRAIL_BLOCKED",
                "result": {
                    "reason": result.reason,
                    "violations": result.violations,
                },
            }
            return ctx

    # Strip internal thought tags (like <thought>...</thought>)
    reply = re.sub(r"<thought\b[^>]*>.*?</thought>", "", reply, flags=re.IGNORECASE | re.DOTALL)
    reply = re.sub(r"</?thought\b[^>]*>", "", reply, flags=re.IGNORECASE)
    reply = reply.strip()

    # --- SOTA 2026: Output Contract Validation ---
    try:
        # Try to extract structured JSON from reply (handles raw JSON, fenced blocks, or plain text)
        parsed = _try_parse_json_object(reply)
        if parsed is not None and "reply" in parsed:
            response_data: dict[str, Any] = parsed
        else:
            response_data = {"reply": reply}

        # Validate against AgentResponse contract
        validated = AgentResponse(**response_data)
        ctx.response_contract = validated

        # Compute context metrics
        try:
            metrics = compute_context_metrics(
                system_prompt=ctx.system_prompt,
                messages=ctx.messages,
                tool_context=ctx.tool_context,
                model_name=(ctx.agent.default_options.get("model") if ctx.agent else None) or "gemini-2.5-flash",
                original_history_tokens=getattr(ctx, "original_history_tokens", 0),
                compressed_history_tokens=getattr(ctx, "compressed_history_tokens", 0),
            )
            ctx.context_metrics = metrics
            logger.debug("context_metrics_computed", total_tokens=metrics.total_tokens, utilization=metrics.utilization_pct)
        except Exception as e:
            logger.warning("context_metrics_failed", error=str(e))

        ctx.final_reply = validated.reply

    except Exception:
        # Validation failed — still return the reply but log it
        logger.warning("agent_response_validation_failed", reply=reply[:100])
        ctx.final_reply = reply

    return ctx
