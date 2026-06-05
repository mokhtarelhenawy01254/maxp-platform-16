from __future__ import annotations

from enum import StrEnum
from typing import Any

import structlog

from src.tools.registry import get_tool

logger = structlog.get_logger(__name__)


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

    async def execute(
        self,
        tool_name: str,
        company_id: str,
        agent_role: str | None = None,
        allowed_tools: list[str] | None = None,
        input_data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute a tool with permission checks.

        Args:
            tool_name: The tool name (e.g. 'product.search')
            company_id: Tenant ID
            agent_role: The agent's role for permission check
            allowed_tools: List of tools the agent is allowed to use
            input_data: Input parameters for the tool

        Returns:
            Execution result with status
        """
        tool = get_tool(tool_name.replace(".", "_"))
        if not tool:
            self._log.warning("tool not found", tool_name=tool_name)
            return {
                "status": ToolResultStatus.NOT_FOUND,
                "error": f"Tool '{tool_name}' not found",
            }

        is_write = tool_name in (
            "product.create", "product.updatePrice",
            "order.create_draft", "order.create_confirmed",
            "order.cancel", "order.refund",
            "inventory.adjust",
            "discount.create_draft", "discount.create",
            "competitor.generateReport",
            "scheduler.create_job",
            "knowledge.create_faq", "knowledge.create_policy",
            "facebook_ad.create_draft",
            "message.broadcast",
            "agent.spawn",
        )

        if allowed_tools is not None and agent_role and tool_name not in allowed_tools:
            self._log.warning(
                "tool not permitted for agent",
                tool_name=tool_name,
                agent_role=agent_role,
            )
            return {
                "status": ToolResultStatus.FORBIDDEN,
                "error": f"Agent role '{agent_role}' is not permitted to use '{tool_name}'",
            }

        if is_write:
            self._log.info(
                "tool requires approval, routing to draft",
                tool_name=tool_name,
                company_id=company_id,
            )
            return {
                "status": ToolResultStatus.AWAITING_APPROVAL,
                "action_type": tool_name,
                "action_args": input_data or {},
                "company_id": company_id,
            }

        if input_data is None:
            input_data = {}

        try:
            model_data = {k.replace("-", "_"): v for k, v in input_data.items()}
            model_data["company_id"] = company_id
            tool_input = tool.input_model(**model_data)
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
