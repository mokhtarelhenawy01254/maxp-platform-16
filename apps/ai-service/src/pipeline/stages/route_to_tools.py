from __future__ import annotations

from src.intent.planner import (
    get_deterministic_action_tool_execution,
    get_deterministic_read_tool_execution,
)
from src.pipeline.context import PipelineContext


def _scope_tools(ctx: PipelineContext) -> None:
    """JIT tool scoping: filter ``ctx.native_tools`` to the allowed list
    and remove any blocked tools based on the relevance plan.

    If ``ctx.relevance_plan`` is None, all tools pass through.
    """
    plan = ctx.relevance_plan
    if plan is None:
        return

    # MagicMock compatibility — guard attribute access
    allowed = set(getattr(plan, "allowedTools", []) or [])
    blocked = set(getattr(plan, "blockedTools", []) or [])

    if not allowed and not blocked:
        return

    def _name(tool: dict) -> str:
        return tool.get("name") if isinstance(tool, dict) else getattr(tool, "name", "")

    scoped: list = []
    for tool in ctx.native_tools:
        n = _name(tool)
        if n in blocked:
            continue
        if allowed and n not in allowed:
            continue
        scoped.append(tool)
    ctx.native_tools = scoped


async def route_to_tools(ctx: PipelineContext) -> PipelineContext:
    relevance_plan = ctx.relevance_plan
    if not relevance_plan:
        return ctx

    # JIT scope native tools based on allowedTools / blockedTools
    _scope_tools(ctx)

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
        "plannedExecutions": [],  # Complex goals not yet implemented in Python
    }

    # Build LLM messages
    ctx.messages = [
        {"role": "system", "content": ctx.system_prompt or ""},
        {"role": "user", "content": ctx.message},
    ]

    return ctx
