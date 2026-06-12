from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from src.deps import get_company_id
from src.tools.gateway import ToolGateway, ToolResultStatus, gateway

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/mcp", tags=["mcp"])


class MCPToolExecuteRequest(BaseModel):
    tool: str
    params: dict = {}
    company_id: str | None = None
    thread_id: str | None = None


class MCPToolExecuteResponse(BaseModel):
    success: bool
    result: dict | None = None
    error: str | None = None


@router.post("/tools/execute", response_model=MCPToolExecuteResponse)
async def execute_mcp_tool(
    body: MCPToolExecuteRequest,
    request: Request,
) -> MCPToolExecuteResponse:
    """
    Execute a tool via MCP bridge.
    Used by external MCP servers (e.g., catalog-mcp) to call MaxP tools directly.
    """
    company_id = body.company_id or get_company_id(request)
    if not company_id:
        raise HTTPException(status_code=400, detail="company_id is required")

    tool_name = body.tool
    input_data = body.params or {}

    logger.info("MCP tool execute request", tool=tool_name, company_id=company_id)

    result = await gateway.execute(
        tool_name=tool_name,
        company_id=company_id,
        agent_role="mcp-server",
        allowed_tools=None,
        input_data=input_data,
    )

    status = result.get("status", ToolResultStatus.ERROR)

    if status == ToolResultStatus.SUCCESS:
        return MCPToolExecuteResponse(success=True, result=result.get("result"))

    if status == ToolResultStatus.AWAITING_APPROVAL:
        return MCPToolExecuteResponse(
            success=False,
            error="awaiting_approval",
            result={
                "action_type": result.get("action_type"),
                "action_args": result.get("action_args"),
                "company_id": result.get("company_id"),
            },
        )

    error_msg = result.get("error", "Tool execution failed")
    logger.warning("MCP tool execution failed", tool=tool_name, company_id=company_id, error=error_msg)
    return MCPToolExecuteResponse(success=False, error=error_msg)


@router.get("/tools/list")
async def list_mcp_tools(request: Request) -> dict:
    """List available MCP tools."""
    from src.tools.registry import get_all_tools

    tools = get_all_tools()
    mcp_tools = [
        {
            "name": tool.name,
            "description": tool.description,
            "input_schema": tool.input_model.model_json_schema() if tool.input_model else {},
        }
        for tool in tools
    ]
    return {"tools": mcp_tools}