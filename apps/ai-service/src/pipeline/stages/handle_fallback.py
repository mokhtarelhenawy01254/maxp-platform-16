from __future__ import annotations

from src.pipeline.context import PipelineContext


async def handle_fallback(ctx: PipelineContext) -> PipelineContext:
    # In the Node.js version, this handles multi-round loops and repair
    # For now, we just ensure there's a response
    if not ctx.llm_response:
        ctx.llm_response = "عذراً، لم أتمكن من معالجة طلبك حالياً."

    return ctx
