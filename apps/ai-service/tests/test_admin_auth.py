"""Tests for the admin auth dependency layer.

The bulk-import silent-drop bug exposed that the legacy
``verify_admin_jwt`` returns ``None`` when ``JWT_SECRET`` is unset, so
endpoints that used it as ``Depends(verify_admin_jwt)`` with ``admin |
None`` were effectively unauthenticated. The fix introduces
``require_admin_or_service``, which mandates either a valid admin JWT
**or** a constant-time-matched ``MAXP_SERVICE_TOKEN``; otherwise it
returns 401.

These tests pin the new contract so the gap cannot reopen.
"""
from __future__ import annotations

import time
from unittest.mock import patch

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from src.api.admin.auth import (
    _is_service_token,
    require_admin_or_service,
    verify_admin_jwt,
)
from src.config import get_settings


# A test-only service token set in conftest.py.
_SERVICE_TOKEN = "test-service-token"


def _credentials(token: str | None) -> HTTPAuthorizationCredentials | None:
    if token is None:
        return None
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


@pytest.fixture(autouse=True)
def _reset_settings_cache():
    """Each test gets fresh settings (in case another test monkey-patched)."""
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


# ---------------------------------------------------------------------------
# _is_service_token
# ---------------------------------------------------------------------------

class TestIsServiceToken:
    def test_matching_tokens_returns_true(self):
        assert _is_service_token(_SERVICE_TOKEN, _SERVICE_TOKEN) is True

    def test_non_matching_tokens_returns_false(self):
        assert _is_service_token("wrong-token", _SERVICE_TOKEN) is False

    def test_missing_expected_returns_false(self):
        """A blank ``MAXP_SERVICE_TOKEN`` cannot match anything — even
        an empty string from the caller."""
        assert _is_service_token(_SERVICE_TOKEN, "") is False
        assert _is_service_token("", "") is False

    def test_uses_constant_time_comparison(self):
        """A regression to ``==`` would still pass the above tests, so
        we also assert the helper is ``hmac.compare_digest``. This is
        the only test that would fail if someone replaced the constant-
        time helper with a plain ``==``."""
        import hmac as _hmac
        import src.api.admin.auth as auth_mod

        assert auth_mod._is_service_token.__code__.co_filename.endswith(
            "auth.py"
        )
        # The function body should reference ``hmac.compare_digest``.
        import inspect
        source = inspect.getsource(auth_mod._is_service_token)
        assert "compare_digest" in source, (
            "_is_service_token must use hmac.compare_digest for "
            "constant-time comparison"
        )


# ---------------------------------------------------------------------------
# require_admin_or_service — the strict path
# ---------------------------------------------------------------------------

class TestRequireAdminOrService:
    @pytest.mark.asyncio
    async def test_no_credentials_raises_401(self):
        with pytest.raises(HTTPException) as excinfo:
            await require_admin_or_service(credentials=None)
        assert excinfo.value.status_code == 401
        assert "Missing" in excinfo.value.detail
        assert excinfo.value.headers.get("WWW-Authenticate") == "Bearer"

    @pytest.mark.asyncio
    async def test_wrong_token_raises_401(self):
        with pytest.raises(HTTPException) as excinfo:
            await require_admin_or_service(
                credentials=_credentials("totally-wrong-token")
            )
        assert excinfo.value.status_code == 401
        assert excinfo.value.headers.get("WWW-Authenticate") == "Bearer"

    @pytest.mark.asyncio
    async def test_service_token_is_accepted(self):
        """The MAXP backend forwards MAXP_SERVICE_TOKEN as a Bearer;
        the AI service must accept it."""
        result = await require_admin_or_service(
            credentials=_credentials(_SERVICE_TOKEN)
        )
        assert result["auth_kind"] == "service"
        assert result["sub"] == "service"

    @pytest.mark.asyncio
    async def test_valid_jwt_is_accepted(self):
        """An admin user logging in through the frontend gets a JWT
        signed with ``JWT_SECRET``; the AI service must accept it."""
        secret = "test-jwt-secret-for-admin"
        with patch.object(get_settings(), "jwt_secret", secret):
            token = jwt.encode(
                {"sub": "user_42", "role": "admin", "exp": int(time.time()) + 60},
                secret,
                algorithm="HS256",
            )
            result = await require_admin_or_service(credentials=_credentials(token))
        assert result["auth_kind"] == "jwt"
        assert result["sub"] == "user_42"
        assert result["role"] == "admin"

    @pytest.mark.asyncio
    async def test_expired_jwt_raises_401(self):
        secret = "test-jwt-secret-for-admin"
        with patch.object(get_settings(), "jwt_secret", secret):
            token = jwt.encode(
                {"sub": "user_42", "exp": int(time.time()) - 60},
                secret,
                algorithm="HS256",
            )
            with pytest.raises(HTTPException) as excinfo:
                await require_admin_or_service(credentials=_credentials(token))
        assert excinfo.value.status_code == 401
        assert "expired" in excinfo.value.detail.lower()

    @pytest.mark.asyncio
    async def test_jwt_signed_with_wrong_secret_raises_401(self):
        """Without the right secret, a JWT looks like a random string
        and must NOT be accepted."""
        with patch.object(get_settings(), "jwt_secret", "right-secret"):
            token = jwt.encode(
                {"sub": "user_42", "exp": int(time.time()) + 60},
                "wrong-secret",
                algorithm="HS256",
            )
            with pytest.raises(HTTPException) as excinfo:
                await require_admin_or_service(credentials=_credentials(token))
        assert excinfo.value.status_code == 401

    @pytest.mark.asyncio
    async def test_jwt_not_evaluated_when_jwt_secret_unset(self):
        """If ``JWT_SECRET`` is empty, JWT auth is disabled but the
        service-token path must still work. A random non-service token
        must be rejected."""
        with patch.object(get_settings(), "jwt_secret", ""):
            # Random non-service token → 401
            with pytest.raises(HTTPException):
                await require_admin_or_service(
                    credentials=_credentials("not-a-service-token")
                )
            # Service token still works
            result = await require_admin_or_service(
                credentials=_credentials(_SERVICE_TOKEN)
            )
            assert result["auth_kind"] == "service"


# ---------------------------------------------------------------------------
# verify_admin_jwt — the legacy path (must stay backward-compatible)
# ---------------------------------------------------------------------------

class TestVerifyAdminJwtLegacy:
    @pytest.mark.asyncio
    async def test_no_credentials_returns_none(self):
        """Legacy contract: when no Authorization header is present,
        return None so the endpoint can decide whether to require auth.
        (Modern endpoints use ``require_admin_or_service`` instead.)"""
        result = await verify_admin_jwt(credentials=None)
        assert result is None

    @pytest.mark.asyncio
    async def test_jwt_secret_unset_returns_none_for_any_token(self):
        """A misconfigured server (no JWT_SECRET) must not silently
        accept arbitrary tokens as admin."""
        with patch.object(get_settings(), "jwt_secret", ""):
            result = await verify_admin_jwt(credentials=_credentials("anything"))
        assert result is None

    @pytest.mark.asyncio
    async def test_valid_jwt_returns_payload(self):
        secret = "test-jwt-secret"
        with patch.object(get_settings(), "jwt_secret", secret):
            token = jwt.encode(
                {"sub": "user_1", "exp": int(time.time()) + 60},
                secret,
                algorithm="HS256",
            )
            result = await verify_admin_jwt(credentials=_credentials(token))
        assert result is not None
        assert result["sub"] == "user_1"
