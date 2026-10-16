from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from src.deps import get_company_id
from src.tools.backend_client import BackendAPIError, BackendClient
from src.tools.gateway import ToolGateway, ToolResultStatus, gateway

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/mcp", tags=["mcp"])

MERCHANT_KEY_PREFIX = "mxp_mcp_"

# Tools a merchant MCP key may execute, derived from its Developer Hub scopes.
SCOPE_TO_TOOLS: dict[str, tuple[str, ...]] = {
    "products:read": ("product.search", "product.get_by_id"),
    "inventory:read": ("inventory.check",),
}

_backend_client: BackendClient | None = None


def _get_backend_client() -> BackendClient:
    global _backend_client
    if _backend_client is None:
        _backend_client = BackendClient()
    return _backend_client


def _presented_value(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    return auth.removeprefix("Bearer ").strip()


async def _verify_merchant_key(presented: str, *, tool: str, request: Request) -> dict:
    """Verify a merchant MCP key via the Node Developer Hub bridge.

    Returns {"ok": bool, "reason": str, "company_id": str, "scopes": list}.
    The tenant scope is produced by the credential itself — never by request input.
    """
    payload = {
        "presentedKey": presented,
        "source": "MCP",
        "method": "POST",
        "path": "/mcp/tools/execute",
        "tool": tool,
        "ip": request.client.host if request.client else None,
    }
    try:
        data = await _get_backend_client()._request(
            "POST",
            "/api/v1/internal/developer/verify-consume",
            json_body=payload,
        )
    except BackendAPIError as exc:
        status = getattr(exc, "status_code", 503)
        if status == 429:
            return {"ok": False, "reason": "rate_limited", "company_id": "", "scopes": []}
        if status in (401, 403):
            details = getattr(exc, "details", None) or {}
            reason = str(details.get("reason") or "invalid") if isinstance(details, dict) else "invalid"
            return {"ok": False, "reason": reason, "company_id": "", "scopes": []}
        logger.warning("merchant key verification failed", status=status, error=str(exc))
        raise HTTPException(status_code=503, detail="verification_unavailable") from exc

    if isinstance(data, dict) and data.get("success"):
        return {
            "ok": True,
            "reason": "",
            "company_id": data.get("companyId") or "",
            "scopes": data.get("scopes") or [],
        }
    return {
        "ok": False,
        "reason": str((data or {}).get("reason") or "invalid"),
        "company_id": "",
        "scopes": [],
    }


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
    tool_name = body.tool
    input_data = body.params or {}

    presented = _presented_value(request)

    if presented.startswith(MERCHANT_KEY_PREFIX):
        # Tenant scope comes from the verified credential — the body company_id
        # is intentionally ignored on this path (cross-tenant IDOR guard).
        verified = await _verify_merchant_key(presented, tool=tool_name, request=request)
        if not verified["ok"]:
            status_map = {"invalid": 401, "inactive": 403, "expired": 403, "rate_limited": 429}
            raise HTTPException(
                status_code=status_map.get(verified["reason"], 401),
                detail=f"merchant_key_{verified['reason'] or 'invalid'}",
            )

        company_id = verified["company_id"]
        if not company_id:
            raise HTTPException(status_code=401, detail="merchant_key_without_tenant")

        allowed_tools: list[str] | None = []
        for scope in verified["scopes"]:
            allowed_tools.extend(SCOPE_TO_TOOLS.get(scope, ()))
        if tool_name not in allowed_tools:
            raise HTTPException(status_code=403, detail="tool_not_allowed_for_key")
    else:
        company_id = body.company_id or get_company_id(request)
        if not company_id:
            raise HTTPException(status_code=400, detail="company_id is required")
        allowed_tools = None

    logger.info("MCP tool execute request", tool=tool_name, company_id=company_id)

    result = await gateway.execute(
        tool_name=tool_name,
        company_id=company_id,
        agent_role="mcp-server",
        allowed_tools=allowed_tools,
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