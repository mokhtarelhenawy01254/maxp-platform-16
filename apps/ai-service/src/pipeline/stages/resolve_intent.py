from __future__ import annotations

import structlog

from src.context.assembler import ContextAssembler
from src.guardrails.input import INPUT_GUARDRAILS
from src.intent.planner import build_intent_contract, to_tool_plan
from src.intent.relevance import is_customer_channel, resolve_tool_plan
from src.pipeline.context import PipelineContext

logger = structlog.get_logger(__name__)


async def resolve_intent(ctx: PipelineContext) -> PipelineContext:
    # 0. Input Guardrails
    for guardrail in INPUT_GUARDRAILS:
        result = await guardrail.validate(ctx, ctx.message)
        if not result.allowed:
            ctx.early_return = {
                "status": "GUARDRAIL_BLOCKED",
                "result": {"reply": f"I cannot process this request. {result.reason}"},
            }
            return ctx

    # 1. Detect channel from context (set by API layer or orchestration flow)
    ctx.is_customer_channel = is_customer_channel(ctx.channel)

    # 2. Resolve relevance plan
    plan = resolve_tool_plan(
        message=ctx.message,
        available_tools=[],  # will be updated by the agent if it has any
        context={"companyId": ctx.company_id},
    )

    # 3. Build contract and tool plan
    contract = build_intent_contract(plan, [], {"companyId": ctx.company_id})
    ctx.relevance_plan = to_tool_plan(contract, [])

    # 4. Context Assembly (SOTA 2026): assemble the full system prompt with context injection
    assembler = ContextAssembler()
    try:
        ctx.system_prompt = await assembler.build_system_prompt(ctx)
    except Exception as exc:
        logger.warning("context_assembly_failed", error=str(exc))
        # Fallback: use base instructions
        if ctx.agent:
            ctx.system_prompt = ctx.agent.default_options.get("instructions")

    return ctx
