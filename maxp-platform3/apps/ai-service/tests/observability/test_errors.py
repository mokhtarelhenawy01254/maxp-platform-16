from __future__ import annotations

from src.observability.errors import ERROR_STATUS_CODES, AppError, ErrorCode


class TestErrorCode:
    def test_error_code_values(self):
        assert ErrorCode.LLM_PROVIDER_ERROR.value == "llm_provider_error"
        assert ErrorCode.INTERNAL_ERROR.value == "internal_error"
        assert ErrorCode.RATE_LIMITED.value == "rate_limited"


class TestAppError:
    def test_create_with_default_message(self):
        err = AppError(ErrorCode.VALIDATION_ERROR)
        assert err.code == ErrorCode.VALIDATION_ERROR
        assert err.message == "Validation Error"
        assert err.details == {}
        assert err.status_code == 422

    def test_create_with_custom_message(self):
        err = AppError(ErrorCode.DATABASE_ERROR, message="Custom message", details={"table": "users"})
        assert err.message == "Custom message"
        assert err.details == {"table": "users"}
        assert err.status_code == 503

    def test_create_with_custom_status_code(self):
        err = AppError(ErrorCode.INTERNAL_ERROR, status_code=500)
        assert err.status_code == 500

    def test_str_representation(self):
        err = AppError(ErrorCode.LLM_RATE_LIMITED)
        assert str(err) == err.message


class TestErrorStatusCodes:
    def test_all_error_codes_have_status_codes(self):
        for code in ErrorCode:
            assert code in ERROR_STATUS_CODES, f"{code} missing from ERROR_STATUS_CODES"

    def test_specific_status_codes(self):
        assert ERROR_STATUS_CODES[ErrorCode.LLM_PROVIDER_ERROR] == 502
        assert ERROR_STATUS_CODES[ErrorCode.RATE_LIMITED] == 429
        assert ERROR_STATUS_CODES[ErrorCode.TENANT_ISOLATION] == 403
        assert ERROR_STATUS_CODES[ErrorCode.THREAD_CONCURRENCY] == 409
