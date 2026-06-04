from __future__ import annotations

from collections.abc import Callable
from typing import Any

import structlog
from fastapi import FastAPI, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse

logger = structlog.get_logger(__name__)

# Metrics
HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)

HTTP_REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 2.5, 5.0, 10.0),
)

LLM_CALLS_TOTAL = Counter(
    "llm_calls_total",
    "Total LLM calls",
    ["provider", "model", "status"],
)

LLM_TOKEN_USAGE = Counter(
    "llm_token_usage_total",
    "Total LLM tokens used",
    ["provider", "model", "type"],
)

TOOL_CALLS_TOTAL = Counter(
    "tool_calls_total",
    "Total tool calls",
    ["tool_name", "status"],
)

TOOL_CALL_DURATION = Histogram(
    "tool_call_duration_seconds",
    "Tool call duration in seconds",
    ["tool_name"],
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 2.5, 5.0),
)

ACTIVE_THREADS = Counter(
    "active_threads_total",
    "Total active conversation threads",
    ["company_id"],
)


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[..., Any]) -> Response:
        method = request.method
        endpoint = request.url.path

        with HTTP_REQUEST_DURATION.labels(method=method, endpoint=endpoint).time():
            response = await call_next(request)

        HTTP_REQUESTS_TOTAL.labels(
            method=method,
            endpoint=endpoint,
            status=response.status_code,
        ).inc()

        return response


def setup_metrics(app: FastAPI) -> None:
    app.add_middleware(MetricsMiddleware)

    @app.get("/metrics", include_in_schema=False)
    async def metrics() -> Response:
        data = generate_latest()
        return StarletteResponse(content=data, media_type=CONTENT_TYPE_LATEST)
