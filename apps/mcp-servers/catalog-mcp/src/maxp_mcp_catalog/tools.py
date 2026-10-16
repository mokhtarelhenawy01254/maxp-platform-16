from __future__ import annotations

import json
from typing import Annotated

import structlog
from mcp.types import CallToolResult, TextContent
from pydantic import Field

from maxp_mcp_catalog.auth_context import get_inbound_value, is_merchant_value
from maxp_mcp_catalog.backend_client import BackendError, MaxPBackendClient, get_backend_client
from maxp_mcp_catalog.merchant_bridge import execute_merchant_tool

logger = structlog.get_logger(__name__)


def _ok(result: dict[str, object]) -> CallToolResult:
    return CallToolResult(
        content=[TextContent(type="text", text=json.dumps(result, ensure_ascii=False))],
        structuredContent={"result": result},
        isError=False,
    )


def _err(message: str, *, status_code: int | None = None) -> CallToolResult:
    payload: dict[str, object] = {"error": message}
    if status_code is not None:
        payload["status_code"] = status_code
    return CallToolResult(
        content=[TextContent(type="text", text=json.dumps(payload, ensure_ascii=False))],
        structuredContent=payload,
        isError=True,
    )


async def _call(
    client: MaxPBackendClient,
    tool: str,
    params: dict[str, object],
    company_id: str,
) -> CallToolResult:
    presented = get_inbound_value()
    try:
        if is_merchant_value(presented):
            # Merchant key path: the tenant scope is derived server-side from the
            # verified credential — tool parameters never select the tenant.
            result = await execute_merchant_tool(
                tool=tool,
                params=params,
                presented_value=presented,
            )
        else:
            result = await client.execute_tool(tool=tool, params=params, company_id=company_id)
    except BackendError as exc:
        logger.warning("tool_call_failed", tool=tool, error=str(exc), status=exc.status_code)
        return _err(str(exc), status_code=exc.status_code)
    return _ok(result)


def register_tools(
    mcp: object,
    client: MaxPBackendClient | None = None,
    company_id: str = "default",
) -> None:
    backend = client or get_backend_client()

    @mcp.tool(name="search", description="Search the merchant product catalog by free-text query.")  # type: ignore[union-attr]
    async def search(
        query: Annotated[str, Field(description="Free-text search query against product name, SKU, or description.")],
        limit: Annotated[int, Field(description="Maximum number of results to return.", ge=1, le=100)] = 20,
    ) -> CallToolResult:
        return await _call(
            backend,
            "product.search",
            {"query": query, "limit": limit},
            company_id,
        )

    @mcp.tool(name="inventory_check", description="Check current inventory level for a single product.")  # type: ignore[union-attr]
    async def inventory_check(
        product_id: Annotated[str, Field(description="The product identifier (id or SKU) to inspect inventory for.")],
    ) -> CallToolResult:
        return await _call(
            backend,
            "inventory.check",
            {"product_id": product_id},
            company_id,
        )

    @mcp.tool(name="product_get", description="Fetch full product details for a single product.")  # type: ignore[union-attr]
    async def product_get(
        product_id: Annotated[str, Field(description="The product identifier (id or SKU) to fetch.")],
    ) -> CallToolResult:
        return await _call(
            backend,
            "product.get_by_id",
            {"product_id": product_id},
            company_id,
        )


__all__: list[str] = ["_call", "_err", "_ok", "register_tools"]
