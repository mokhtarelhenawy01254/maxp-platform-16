from __future__ import annotations

import hmac
import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.config import get_settings

logger = structlog.get_logger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)


def _is_service_token(token: str, expected: str | None) -> bool:
    """Constant-time comparison of the inbound bearer token against the
    service-to-service secret (``MAXP_SERVICE_TOKEN``).

    Using ``hmac.compare_digest`` instead of ``==`` prevents a timing
    side-channel from leaking the secret length or content.
    """
    if not expected:
        return False
    return hmac.compare_digest(token.encode("utf-8"), expected.encode("utf-8"))


async def verify_admin_jwt(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict | None:
    """Backward-compatible JWT-only check.

    Returns the decoded JWT payload, or ``None`` if no credentials were
    presented. **Endpoints that require auth should NOT use this directly**
    — use :func:`require_admin_or_service` instead.
    """
    if credentials is None:
        return None

    token = credentials.credentials
    settings = get_settings()

    if not settings.jwt_secret:
        logger.warning("JWT_SECRET not configured, skipping JWT verification")
        return None

    try:
        import jwt

        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        )


async def require_admin_or_service(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    """Strict auth dependency: accept either a valid admin JWT **or** the
    service-to-service token. Reject everything else with ``401``.

    Use this on any endpoint that mutates data so the AI service is not
    an open relay. The MAXP backend forwards the user JWT; service-to-
    service callers (cron jobs, internal workers) use ``MAXP_SERVICE_TOKEN``.

    Returns a small dict with ``{"sub": ..., "auth_kind": "jwt"|"service"}``
    so endpoints can audit who did what.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_settings()
    token = credentials.credentials

    # 1) Service-to-service token (constant-time check).
    if _is_service_token(token, settings.maxp_service_token):
        return {"sub": "service", "user_id": "service", "auth_kind": "service"}

    # 2) Admin JWT (only if a secret is configured).
    if settings.jwt_secret:
        try:
            import jwt

            payload = jwt.decode(
                token, settings.jwt_secret, algorithms=["HS256"]
            )
            payload["auth_kind"] = "jwt"
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
            )
        except jwt.InvalidTokenError:
            pass  # fall through to the generic 401 below

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing Authorization token",
        headers={"WWW-Authenticate": "Bearer"},
    )
