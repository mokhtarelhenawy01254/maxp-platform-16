from __future__ import annotations

from src.i18n import t
from src.pipeline.context import PipelineContext


async def handle_fallback(ctx: PipelineContext) -> PipelineContext:
    # In the Node.js version, this handles multi-round loops and repair
    # For now, we just ensure there's a response
    if not ctx.llm_response:
        locale = "ar" if ctx.is_customer_channel else "en"
        ctx.llm_response = t("fallback.default", locale=locale)

    return ctx
