"""Inbound merchant-auth context for this MCP server.

A pure-ASGI middleware captures the presented bearer value of the inbound
request (per HTTP request, via a context variable) so tool handlers can
forward the caller's account key to the MaxP video bridge. The bridge
verifies the key (hash, activity, rate limit, audit) and derives the tenant
from the credential — never from tool parameters.

When MCP_REQUIRE_MERCHANT_AUTH=true the endpoint rejects any request that
does not present a merchant key — the mode used when this server is exposed
through the public gateway.
"""
from __future__ import annotations

import contextvars
import os
from typing import Any

from starlette.responses import JSONResponse

MERCHANT_KEY_PREFIX = "mxp_mcp_"

_inbound_value: contextvars.ContextVar[str] = contextvars.ContextVar("mcp_inbound_value", default="")


def get_inbound_value() -> str:
    """Presented bearer value of the current request ('' when absent)."""
    return _inbound_value.get()


def is_merchant_value(value: str) -> bool:
    return bool(value) and value.startswith(MERCHANT_KEY_PREFIX)


def require_merchant_auth() -> bool:
    raw = os.environ.get("MCP_REQUIRE_MERCHANT_AUTH", "")
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _extract_presented(scope: dict[str, Any]) -> str:
    for raw_key, raw_val in scope.get("headers") or []:
        if raw_key.lower() == b"authorization":
            decoded = raw_val.decode("latin-1").strip()
            if decoded[:7].lower() == "bearer ":
                return decoded[7:].strip()
            return decoded
    return ""


class MerchantAuthMiddleware:
    """Capture the presented key per request; optionally enforce presence."""

    def __init__(self, app: Any) -> None:
        self.app = app

    async def __call__(self, scope: dict[str, Any], receive: Any, send: Any) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        presented = _extract_presented(scope)

        if require_merchant_auth() and not is_merchant_value(presented):
            response = JSONResponse(
                status_code=401,
                content={
                    "error": "merchant_key_required",
                    "message": (
                        "This MCP endpoint requires an account key from the MaxP "
                        "Developer Hub (Settings → Developer)."
                    ),
                },
            )
            await response(scope, receive, send)
            return

        reset = _inbound_value.set(presented)
        try:
            await self.app(scope, receive, send)
        finally:
            _inbound_value.reset(reset)
