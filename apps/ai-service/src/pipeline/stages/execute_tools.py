from __future__ import annotations

import asyncio
import json

from agent_framework import Message

from src.pipeline.context import PipelineContext
from src.tools.gateway import ToolGateway


def _agent_role(ctx: PipelineContext) -> str | None:
    return str(getattr(ctx.agent, "role", "") or getattr(ctx.agent, "name", "") or "") or None


def _allowed_tools(ctx: PipelineContext) -> list[str] | None:
    if ctx.relevance_plan and getattr(ctx.relevance_plan, "allowedTools", None):
        return list(ctx.relevance_plan.allowedTools)
    if ctx.agent and hasattr(ctx.agent, "get_tools"):
        return list(ctx.agent.get_tools() or [])
    return None


def _append_tool_result(ctx: PipelineContext, planned: dict, result: dict) -> None:
    tool_name = planned["tool"]
    ctx.tool_context += (
        f"Tool result for {tool_name}:\n"
        f"{json.dumps(result, ensure_ascii=False, default=str)}\n\n"
    )
    evidence = {
        "tool": tool_name,
        "status": result.get("status"),
        "success": result.get("status") == "success",
        "result": result.get("result", result),
        **{k: v for k, v in result.items() if k not in {"result"}},
    }
    ctx.executed_tools.append(evidence)
    ctx.tool_evidence.append(evidence)


def _approval_action_args(function_call) -> dict:
    arguments = getattr(function_call, "arguments", None)
    if isinstance(arguments, dict):
        return dict(arguments)
    if isinstance(arguments, str) and arguments:
        try:
            parsed = json.loads(arguments)
            return parsed if isinstance(parsed, dict) else {}
        except (json.JSONDecodeError, TypeError, ValueError):
            return {}
    return {}


def _append_sdk_approval_requests(ctx: PipelineContext) -> None:
    requests = getattr(ctx.llm_result, "user_input_requests", None) or []
    existing_call_ids = {
        item.get("sdk_approval_id")
        for item in ctx.executed_tools
        if isinstance(item, dict) and item.get("sdk_approval_id")
    }
    for request in requests:
        if getattr(request, "type", None) != "function_approval_request":
            continue
        function_call = getattr(request, "function_call", None)
        if function_call is None:
            continue
        approval_id = getattr(request, "id", None) or getattr(function_call, "call_id", None)
        if approval_id in existing_call_ids:
            continue
        action_type = getattr(function_call, "name", None)
        if not action_type:
            continue
        evidence = {
            "tool": action_type,
            "status": "awaiting_approval",
            "success": False,
            "action_type": action_type,
            "action_args": _approval_action_args(function_call),
            "company_id": ctx.company_id,
            "sdk_approval_id": approval_id,
        }
        ctx.executed_tools.append(evidence)
        ctx.tool_evidence.append(evidence)
        existing_call_ids.add(approval_id)


async def _execute_planned_tool(
    gateway: ToolGateway,
    ctx: PipelineContext,
    planned: dict,
    *,
    agent_role: str | None,
    allowed_tools: list[str] | None,
) -> tuple[dict, dict]:
    result = await gateway.execute(
        tool_name=planned["nativeName"],
        company_id=ctx.company_id,
        agent_role=agent_role,
        allowed_tools=allowed_tools,
        input_data=planned.get("params") or {},
    )
    return planned, result


async def execute_tools(ctx: PipelineContext) -> PipelineContext:
    _append_sdk_approval_requests(ctx)
    if not ctx.execution_plan:
        return ctx

    gateway = ToolGateway()
    agent_role = _agent_role(ctx)
    allowed_tools = _allowed_tools(ctx)

    planned_tools = [
        planned
        for planned in (
            ctx.execution_plan.get("deterministicReadExecution"),
            ctx.execution_plan.get("deterministicActionExecution"),
            *(ctx.execution_plan.get("plannedExecutions") or []),
        )
        if planned
    ]
    if planned_tools:
        results = await asyncio.gather(*[
            _execute_planned_tool(
                gateway,
                ctx,
                planned,
                agent_role=agent_role,
                allowed_tools=allowed_tools,
            )
            for planned in planned_tools
        ])
        for planned, result in results:
            _append_tool_result(ctx, planned, result)

    # Call LLM to generate a response only when tool evidence exists. If the
    # model-classified plan required a tool but none executed, handle_fallback
    # will generate a safe clarification without letting the model invent facts
    # or emit provider-level tool-call syntax.
    if not ctx.tool_context:
        return ctx

    # Call LLM to generate response using tool results
    client = getattr(ctx.agent, "client", None) if ctx.agent else None
    if client:
        messages = [Message(role=m["role"], contents=[m["content"]]) for m in ctx.messages]
        if ctx.tool_context:
            messages.append(Message(
                role="user",
                contents=[
                    "[Tool Results]\n"
                    f"{ctx.tool_context}"
                    "[/Tool Results]\n\n"
                    "Generate the customer-facing reply from these structured results. "
                    "Do not invent data that is not present."
                ]
            ))

        try:
            response = await client.get_response(messages, options={"tools_enabled": False})
            ctx.llm_response = response.text
            ctx.llm_result = response
            _append_sdk_approval_requests(ctx)
        except Exception as exc:
            ctx.early_return = {
                "status": "PROVIDER_ERROR",
                "result": {
                    "reply": "",
                    "error": str(exc),
                },
            }

    return ctx
