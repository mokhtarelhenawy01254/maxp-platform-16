from __future__ import annotations

from typing import Any

from src.observability.errors import ErrorCode


def provider_error_result(exc: Exception) -> dict[str, Any]:
    response = getattr(exc, "response", None)
    status_code = getattr(response, "status_code", None)
    headers = getattr(response, "headers", {}) or {}
    message = str(exc)
    lowered = message.lower()
    is_rate_limited = (
        status_code == 429
        or "rate limit" in lowered
        or "rate_limit" in lowered
        or "quota" in lowered
    )
    retry_after = None
    try:
        retry_after = headers.get("retry-after")
    except Exception:
        retry_after = None

    result: dict[str, Any] = {
        "reply": "",
        "error": message,
        "error_code": (
            ErrorCode.LLM_RATE_LIMITED.value
            if is_rate_limited
            else ErrorCode.LLM_PROVIDER_ERROR.value
        ),
    }
    if status_code:
        result["provider_status_code"] = status_code
    if retry_after:
        result["retry_after"] = retry_after
    return result
