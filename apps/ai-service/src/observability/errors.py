from __future__ import annotations

import enum
from typing import Any

import structlog
from fastapi.responses import JSONResponse

logger = structlog.get_logger(__name__)


class ErrorCode(enum.Enum):
    LLM_PROVIDER_ERROR = "llm_provider_error"
    LLM_RATE_LIMITED = "llm_rate_limited"
    MAXP_API_DOWN = "maxp_api_down"
    DATABASE_ERROR = "database_error"
    TENANT_ISOLATION = "tenant_isolation"
    VALIDATION_ERROR = "validation_error"
    INTERNAL_ERROR = "internal_error"
    RATE_LIMITED = "rate_limited"
    THREAD_CONCURRENCY = "thread_concurrency"


ERROR_STATUS_CODES: dict[ErrorCode, int] = {
    ErrorCode.LLM_PROVIDER_ERROR: 502,
    ErrorCode.LLM_RATE_LIMITED: 429,
    ErrorCode.MAXP_API_DOWN: 502,
    ErrorCode.DATABASE_ERROR: 503,
    ErrorCode.TENANT_ISOLATION: 403,
    ErrorCode.VALIDATION_ERROR: 422,
    ErrorCode.INTERNAL_ERROR: 500,
    ErrorCode.RATE_LIMITED: 429,
    ErrorCode.THREAD_CONCURRENCY: 409,
}


class AppError(Exception):
    """Base application error with error code."""

    def __init__(
        self,
        code: ErrorCode,
        message: str = "",
        details: dict[str, Any] | None = None,
        status_code: int | None = None,
    ) -> None:
        self.code = code
        self.message = message or code.value.replace("_", " ").title()
        self.details = details or {}
        self.status_code = status_code or ERROR_STATUS_CODES.get(code, 500)
        super().__init__(self.message)


async def app_error_handler(request, exc: AppError):
    logger.error(
        "app_error",
        code=exc.code.value,
        message=exc.message,
        details=exc.details,
        path=request.url.path,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.code.value,
            "message": exc.message,
            "details": exc.details,
        },
    )


async def generic_error_handler(request, exc: Exception):
    logger.exception("unhandled_error", path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "error": ErrorCode.INTERNAL_ERROR.value,
            "message": "Internal server error",
        },
    )


def setup_error_handlers(app) -> None:
    """Register error handlers on the FastAPI app."""
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, generic_error_handler)
