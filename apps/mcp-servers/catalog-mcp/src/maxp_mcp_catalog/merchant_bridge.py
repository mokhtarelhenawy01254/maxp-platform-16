"""Merchant-context bridge calls to the MaxP ai-service.

When an inbound request presents a merchant key (``mxp_mcp_…``), tool calls
are executed through this module instead of the legacy service-token path:
the presented key is forwarded verbatim and the ai-service derives the tenant
from the verified credential — never from tool parameters or the request body.
"""
from __future__ import annotations

import os

import httpx
import structlog

from maxp_mcp_catalog.backend_client import BackendError

logger = structlog.get_logger(__name__)

_BRIDGE_TIMEOUT = 30.0


def _bridge_base_url() -> str:
    return (
        os.environ.get("MAXP_AI_SERVICE_URL")
        or os.environ.get("MAXP_API_URL")
        or "http://localhost:8000"
    ).rstrip("/")


def _bridge_headers(presented_value: str) -> httpx.Headers:
    # Tuple-pairs construction keeps the header assembly in one auditable place.
    return httpx.Headers([("Authorization", f"Bearer {presented_value}")])


async def execute_merchant_tool(
    *,
    tool: str,
    params: dict[str, object],
    presented_value: str,
) -> dict[str, object]:
    """POST a presented-key tool call to the ai-service MCP bridge."""
    body: dict[str, object] = {"tool": tool, "params": params}
    url = f"{_bridge_base_url()}/mcp/tools/execute"
    headers = _bridge_headers(presented_value)

    last_error: BackendError | None = None
    response: httpx.Response | None = None

    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=_BRIDGE_TIMEOUT, trust_env=False) as client:
                response = await client.post(url, json=body, headers=headers)
        except httpx.RequestError as exc:
            last_error = BackendError(f"bridge unreachable: {exc}")
            logger.warning("bridge_request_error", tool=tool, attempt=attempt, error=str(exc))
            continue

        if response.status_code >= 500:
            last_error = BackendError(
                f"bridge returned {response.status_code}: {response.text}",
                status_code=response.status_code,
            )
            logger.warning("bridge_5xx", tool=tool, attempt=attempt, status=response.status_code)
            continue
        break

    if response is None:
        raise last_error or BackendError("bridge request failed without a captured error")

    if response.status_code >= 400:
        raise BackendError(
            f"bridge returned {response.status_code}: {response.text}",
            status_code=response.status_code,
        )

    try:
        data = response.json()
    except ValueError as exc:
        raise BackendError(f"bridge returned non-JSON body: {exc}") from exc

    if not isinstance(data, dict):
        raise BackendError(f"bridge returned non-object body: {type(data).__name__}")

    if data.get("success") is False:
        raise BackendError(
            str(data.get("error") or "bridge reported failure"),
            status_code=response.status_code,
        )

    result = data.get("result")
    if result is None:
        return {}
    if not isinstance(result, dict):
        return {"value": result}
    return result
