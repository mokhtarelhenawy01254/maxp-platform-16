from __future__ import annotations

from src.intent.planner import (
    get_deterministic_action_tool_execution,
    get_deterministic_read_tool_execution,
)
from src.pipeline.context import PipelineContext


async def route_to_tools(ctx: PipelineContext) -> PipelineContext:
    relevance_plan = ctx.relevance_plan
    if not relevance_plan:
        return ctx

    # Build execution plan
    read_exec = get_deterministic_read_tool_execution(
        relevance_plan, ctx.message, ctx.native_tools
    )
    action_exec = get_deterministic_action_tool_execution(
        relevance_plan, ctx.message, ctx.native_tools
    )

    ctx.execution_plan = {
        "deterministicReadExecution": read_exec,
        "deterministicActionExecution": action_exec,
        "plannedExecutions": [], # Complex goals not yet implemented in Python
    }

    # Build LLM messages
    ctx.messages = [
        {"role": "system", "content": ctx.system_prompt or ""},
        {"role": "user", "content": ctx.message},
    ]

    return ctx
