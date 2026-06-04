from __future__ import annotations

import re

from src.guardrails.output import OUTPUT_GUARDRAILS
from src.pipeline.context import PipelineContext


async def validate_reply(ctx: PipelineContext) -> PipelineContext:
    reply = ctx.llm_response or ""

    # Guardrails check
    for guardrail in OUTPUT_GUARDRAILS:
        result = await guardrail.validate(ctx, reply)
        if not result.allowed:
            ctx.early_return = {
                "status": "GUARDRAIL_BLOCKED",
                "result": {"reply": f"Sorry, my response was blocked by a guardrail: {result.reason}"}
            }
            return ctx

    # Strip internal thought tags (like <thought>...</thought>)
    reply = re.sub(r"<thought\b[^>]*>.*?</thought>", "", reply, flags=re.IGNORECASE | re.DOTALL)
    reply = re.sub(r"</?thought\b[^>]*>", "", reply, flags=re.IGNORECASE)

    ctx.final_reply = reply.strip() or "عذراً، حدث خطأ في توليد الرد."

    return ctx
