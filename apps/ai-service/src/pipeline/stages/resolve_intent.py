from __future__ import annotations

from typing import Any

import structlog

from src.guardrails.input import INPUT_GUARDRAILS
from src.intent.planner import build_intent_contract_async, to_tool_plan
from src.intent.relevance import is_customer_channel
from src.pipeline.context import PipelineContext

logger = structlog.get_logger(__name__)


def _tool_name(tool: Any) -> str:
    if isinstance(tool, dict):
        return str(tool.get("name") or tool.get("tool") or "")
    return str(getattr(tool, "name", "") or getattr(tool, "__name__", ""))


def _available_tools(ctx: PipelineContext) -> list[str]:
    if ctx.native_tools:
        return [name for tool in ctx.native_tools if (name := _tool_name(tool))]

    agent = ctx.agent
    tools = list(getattr(agent, "tools", []) or [])
    if not tools and hasattr(agent, "get_tools"):
        tools = [{"name": name} for name in (agent.get_tools() or [])]

    ctx.native_tools = tools
    return [name for tool in tools if (name := _tool_name(tool))]


async def resolve_intent(ctx: PipelineContext) -> PipelineContext:
    # 0. Input Guardrails
    for guardrail in INPUT_GUARDRAILS:
        result = await guardrail.validate(ctx, ctx.message)
        if not result.allowed:
            ctx.early_return = {
                "status": "GUARDRAIL_BLOCKED",
                "result": {
                    "reason": result.reason,
                    "violations": result.violations,
                },
            }
            return ctx

    # 1. Detect channel from context (set by API layer or orchestration flow)
    ctx.is_customer_channel = is_customer_channel(ctx.channel)
    available_tools = _available_tools(ctx)

    # 2. Resolve relevance plan
    intent_context = {
        "companyId": ctx.company_id,
        "channel": ctx.channel,
        "availableTools": available_tools,
        "preferredModel": getattr(ctx.agent, "model", None),
        "preferredProvider": getattr(getattr(ctx.agent, "config", None), "provider", None),
        "attachments": list(getattr(ctx, "attachments", []) or []),
    }
    contract = await build_intent_contract_async(
        message=ctx.message,
        available_tools=available_tools,
        context=intent_context,
        company_id=ctx.company_id,
    )

    # 3. Build tool plan
    ctx.relevance_plan = to_tool_plan(contract, available_tools)

    # 4. Prepare the base system prompt. Full context assembly happens later
    # after RAG and episodic memory stages have populated the context.
    try:
        if ctx.agent:
            ctx.system_prompt = ctx.agent.instructions
    except Exception as exc:
        logger.warning("base_prompt_load_failed", error=str(exc))
        # Fallback: use base instructions
        if ctx.agent:
            ctx.system_prompt = ctx.agent.default_options.get("instructions")

    return ctx
