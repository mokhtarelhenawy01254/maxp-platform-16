from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from agent_framework import FunctionInvocationContext, FunctionTool
from pydantic import BaseModel

from src.tools.gateway import ToolGateway
from src.tools.registry import get_tool


def _dump_input(input_data: Any) -> dict[str, Any]:
    if isinstance(input_data, BaseModel):
        return input_data.model_dump(exclude_none=True)
    if isinstance(input_data, dict):
        return dict(input_data)
    return {}


def _canonical(name: str) -> str:
    return name.replace(".", "_")


def is_gateway_managed_tool(tool: FunctionTool) -> bool:
    return _canonical(tool.name).startswith("mcp_") or get_tool(_canonical(tool.name)) is not None


def requires_sdk_approval(tool: FunctionTool) -> bool:
    if _canonical(tool.name).startswith("mcp_"):
        return False
    registry_tool = get_tool(_canonical(tool.name))
    target = registry_tool or tool
    return getattr(target, "approval_mode", "never_require") == "always_require"


def wrap_tool_for_gateway(
    tool: FunctionTool,
    *,
    company_id: str | None,
    agent_role: str | None,
    allowed_tools: Iterable[str] | None = None,
) -> FunctionTool:
    """Return an SDK FunctionTool whose execution goes through ToolGateway."""
    if not isinstance(tool, FunctionTool):
        return tool
    if not is_gateway_managed_tool(tool):
        return tool

    allowed = list(allowed_tools or [])

    async def _gateway_func(input_data: Any, ctx: FunctionInvocationContext | None = None) -> dict[str, Any]:
        payload = _dump_input(input_data)
        tenant_id = str(payload.get("company_id") or company_id or "")
        approval_granted = requires_sdk_approval(tool)
        return await ToolGateway().execute(
            tool_name=tool.name,
            company_id=tenant_id,
            agent_role=agent_role,
            allowed_tools=allowed,
            input_data=payload,
            approval_granted=approval_granted,
            ctx=ctx,
        )

    return FunctionTool(
        name=tool.name,
        description=tool.description,
        func=_gateway_func,
        input_model=tool.input_model,
        approval_mode="always_require" if requires_sdk_approval(tool) else "never_require",
    )


def wrap_tools_for_gateway(
    tools: Iterable[FunctionTool],
    *,
    company_id: str | None,
    agent_role: str | None,
    allowed_tools: Iterable[str] | None = None,
) -> list[FunctionTool]:
    return [
        wrap_tool_for_gateway(
            tool,
            company_id=company_id,
            agent_role=agent_role,
            allowed_tools=allowed_tools,
        )
        for tool in tools
    ]
