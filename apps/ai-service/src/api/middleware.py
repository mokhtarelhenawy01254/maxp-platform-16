from __future__ import annotations

import time
from collections.abc import Callable
from threading import Lock
from typing import Any, ClassVar

import structlog
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from src.config import get_settings

logger = structlog.get_logger(__name__)


class TenantMiddleware(BaseHTTPMiddleware):
    PUBLIC_PATHS: ClassVar[set[str]] = {"/health", "/ready", "/metrics", "/docs", "/openapi.json", "/"}
    TENANT_EXEMPT_PREFIXES: ClassVar[tuple[str, ...]] = ("/admin",)

    async def dispatch(self, request: Request, call_next):
        if request.url.path in self.PUBLIC_PATHS:
            return await call_next(request)

        if any(request.url.path.startswith(p) for p in self.TENANT_EXEMPT_PREFIXES):
            return await call_next(request)

        # Merchant MCP keys (`mxp_mcp_…`) on the /mcp bridge carry their tenant
        # inside the verified credential — resolved by the handler itself.
        presented = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        if request.url.path.startswith("/mcp") and presented.startswith("mxp_mcp_"):
            request.state.company_id = ""
            request.state.customer_id = ""
            return await call_next(request)

        company_id = request.headers.get("X-Company-Id")
        if not company_id:
            return JSONResponse(
                status_code=401,
                content={"error": "Missing X-Company-Id header"},
            )

        request.state.company_id = company_id
        request.state.customer_id = request.headers.get("X-Customer-Id", "")

        response = await call_next(request)
        return response


class ServiceAuthMiddleware(BaseHTTPMiddleware):
    PUBLIC_PATHS: ClassVar[set[str]] = {"/health", "/ready", "/metrics", "/docs", "/openapi.json", "/"}

    async def dispatch(self, request: Request, call_next):
        if request.url.path in self.PUBLIC_PATHS:
            return await call_next(request)

        auth = request.headers.get("Authorization", "")
        token = auth.removeprefix("Bearer ").strip()

        # Merchant MCP keys on the /mcp bridge are verified (hash + activity +
        # rate limit + audit) inside the bridge handler via the Developer Hub
        # internal endpoint — every other route still requires the service token.
        if request.url.path.startswith("/mcp") and token.startswith("mxp_mcp_"):
            return await call_next(request)

        settings = get_settings()
        logger.debug("Service auth check", token_present=bool(token))
        if not token or token != settings.maxp_service_token:
            return JSONResponse(
                status_code=401,
                content={"error": "Invalid or missing Authorization token"},
            )

        return await call_next(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting per company_id."""

    def __init__(self, app, max_requests: int = 60, window_seconds: int = 60) -> None:
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._buckets: dict[str, list[float]] = {}
        self._lock = Lock()

    PUBLIC_PATHS: ClassVar[set[str]] = {"/health", "/ready", "/metrics", "/docs", "/openapi.json", "/"}
    TENANT_EXEMPT_PREFIXES: ClassVar[tuple[str, ...]] = ("/admin",)

    async def dispatch(self, request: Request, call_next: Callable[..., Any]):
        if request.url.path in self.PUBLIC_PATHS:
            return await call_next(request)

        if any(request.url.path.startswith(p) for p in self.TENANT_EXEMPT_PREFIXES):
            return await call_next(request)

        company_id = getattr(request.state, "company_id", "unknown")
        now = time.monotonic()

        with self._lock:
            timestamps = self._buckets.get(company_id, [])
            cutoff = now - self.window_seconds
            timestamps = [t for t in timestamps if t > cutoff]
            timestamps.append(now)
            self._buckets[company_id] = timestamps

            if len(timestamps) > self.max_requests:
                logger.warning("rate limit exceeded", company_id=company_id)
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "rate_limited",
                        "message": f"Rate limit exceeded: {self.max_requests} requests per {self.window_seconds}s",
                    },
                    headers={"Retry-After": str(self.window_seconds)},
                )

        return await call_next(request)


class ThreadConcurrencyMiddleware(BaseHTTPMiddleware):
    """Prevent concurrent requests on the same thread_id."""

    def __init__(self, app) -> None:
        super().__init__(app)
        self._active_threads: dict[str, float] = {}
        self._lock = Lock()

    PUBLIC_PATHS: ClassVar[set[str]] = {"/health", "/ready", "/metrics", "/docs", "/openapi.json", "/"}

    async def dispatch(self, request: Request, call_next: Callable[..., Any]):
        if request.url.path in self.PUBLIC_PATHS:
            return await call_next(request)

        if request.url.path != "/chat":
            return await call_next(request)

        thread_id = None
        try:
            body = await request.json()
            thread_id = body.get("thread_id") or f"{getattr(request.state, 'company_id', '?')}:{getattr(request.state, 'customer_id', '?')}:chat"
        except Exception:
            pass

        if thread_id:
            now = time.monotonic()
            with self._lock:
                if thread_id in self._active_threads:
                    age = now - self._active_threads[thread_id]
                    if age < 30.0:
                        logger.warning("thread concurrency exceeded", thread_id=thread_id)
                        return JSONResponse(
                            status_code=409,
                            content={
                                "error": "thread_concurrency",
                                "message": "A request is already in progress for this thread",
                            },
                        )
                self._active_threads[thread_id] = now

            try:
                response = await call_next(request)
            finally:
                with self._lock:
                    if thread_id in self._active_threads:
                        del self._active_threads[thread_id]

            return response

        return await call_next(request)
