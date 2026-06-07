from __future__ import annotations

from enum import StrEnum
from typing import Any

import structlog
from agent_framework import FunctionInvocationContext

from src.mcp_integration.registry import get_mcp_registry
from src.tools.registry import get_tool

logger = structlog.get_logger(__name__)


def _canonical_tool_name(name: str) -> str:
    return name.replace(".", "_")


class ToolResultStatus(StrEnum):
    SUCCESS = "success"
    ERROR = "error"
    AWAITING_APPROVAL = "awaiting_approval"
    FORBIDDEN = "forbidden"
    NOT_FOUND = "not_found"


class ToolGateway:
    """Authorization and execution boundary for tools.

    Mirrors agentToolGatewayService.js behavior:
    - Validates tool exists
    - Checks agent permissions (tool allowed for agent role)
    - Routes write tools to approval flow
    - Calls backend bridge for execution
    - Logs audit trail
    """

    def __init__(self) -> None:
        self._log = logger

    async def _execute_mcp_tool(
        self,
        *,
        tool_name: str,
        company_id: str,
        agent_role: str | None,
        allowed_tools: list[str] | None,
        input_data: dict[str, Any] | None,
    ) -> dict[str, Any]:
        requested_tool_name = _canonical_tool_name(tool_name)
        registry = get_mcp_registry()
        tool = registry.get_tool(requested_tool_name)
        if not tool:
            self._log.warning("mcp tool not found", tool_name=tool_name)
            return {
                "status": ToolResultStatus.NOT_FOUND,
                "error": f"Tool '{tool_name}' not found",
            }

        allowed_tool_names = {_canonical_tool_name(name) for name in (allowed_tools or [])}
        if allowed_tools is not None and agent_role and requested_tool_name not in allowed_tool_names:
            self._log.warning(
                "mcp tool not permitted for agent",
                tool_name=tool_name,
                agent_role=agent_role,
            )
            return {
                "status": ToolResultStatus.FORBIDDEN,
                "error": f"Agent role '{agent_role}' is not permitted to use '{tool_name}'",
            }

        arguments = dict(input_data or {})
        arguments["company_id"] = company_id
        result = await registry.call_tool(requested_tool_name, arguments)
        if result.get("success") is True:
            self._log.info(
                "mcp tool executed successfully",
                tool_name=tool_name,
                company_id=company_id,
            )
            return {
                "status": ToolResultStatus.SUCCESS,
                "result": result.get("result", result),
            }

        self._log.error(
            "mcp tool execution failed",
            tool_name=tool_name,
            company_id=company_id,
            error=result.get("error"),
        )
        return {
            "status": ToolResultStatus.ERROR,
            "error": result.get("error", "MCP tool execution failed"),
        }

    async def execute(
        self,
        tool_name: str,
        company_id: str,
        agent_role: str | None = None,
        allowed_tools: list[str] | None = None,
        input_data: dict[str, Any] | None = None,
        approval_granted: bool = False,
        ctx: FunctionInvocationContext | None = None,
    ) -> dict[str, Any]:
        """Execute a tool with permission checks.

        Args:
            tool_name: The tool name (e.g. 'product.search')
            company_id: Tenant ID
            agent_role: The agent's role for permission check
            allowed_tools: List of tools the agent is allowed to use
            input_data: Input parameters for the tool
            ctx: Optional SDK FunctionInvocationContext for tools that need it (e.g. unlock_advanced_tools)

        Returns:
            Execution result with status
        """
        requested_tool_name = _canonical_tool_name(tool_name)
        if requested_tool_name.startswith("mcp_"):
            return await self._execute_mcp_tool(
                tool_name=tool_name,
                company_id=company_id,
                agent_role=agent_role,
                allowed_tools=allowed_tools,
                input_data=input_data,
            )

        tool = get_tool(requested_tool_name)
        if not tool:
            self._log.warning("tool not found", tool_name=tool_name)
            return {
                "status": ToolResultStatus.NOT_FOUND,
                "error": f"Tool '{tool_name}' not found",
            }

        requires_approval = getattr(tool, "approval_mode", "never_require") == "always_require"

        allowed_tool_names = {_canonical_tool_name(name) for name in (allowed_tools or [])}
        if allowed_tools is not None and agent_role and tool.name not in allowed_tool_names:
            self._log.warning(
                "tool not permitted for agent",
                tool_name=tool_name,
                agent_role=agent_role,
            )
            return {
                "status": ToolResultStatus.FORBIDDEN,
                "error": f"Agent role '{agent_role}' is not permitted to use '{tool_name}'",
            }

        if requires_approval and not approval_granted:
            self._log.info(
                "tool requires approval, routing to draft",
                tool_name=tool_name,
                company_id=company_id,
            )
            return {
                "status": ToolResultStatus.AWAITING_APPROVAL,
                "action_type": tool.name,
                "action_args": input_data or {},
                "company_id": company_id,
            }

        if input_data is None:
            input_data = {}

        try:
            model_data = {k.replace("-", "_"): v for k, v in input_data.items()}
            model_data["company_id"] = company_id
            tool_input = tool.input_model(**model_data)

            import inspect
            has_ctx = "ctx" in inspect.signature(tool.func).parameters
            if has_ctx:
                result = await tool.func(tool_input, ctx=ctx)
            else:
                result = await tool.func(tool_input)

            self._log.info(
                "tool executed successfully",
                tool_name=tool_name,
                company_id=company_id,
            )
            return {
                "status": ToolResultStatus.SUCCESS,
                "result": result,
            }
        except Exception as e:
            self._log.error(
                "tool execution failed",
                tool_name=tool_name,
                company_id=company_id,
                error=str(e),
            )
            return {
                "status": ToolResultStatus.ERROR,
                "error": str(e),
            }


gateway = ToolGateway()
