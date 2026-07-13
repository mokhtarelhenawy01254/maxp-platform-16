from __future__ import annotations

from src.observability.pii import log_safe, redact_pii_deep


def test_redact_pii_deep_phone_email():
    data = {
        "name": "Ahmed",
        "email": "ahmed@example.com",
        "phone": "01012345678",
        "message": "Hello world",
    }
    result = redact_pii_deep(data)
    assert result["name"] == "Ahmed"
    assert result["email"] == "[REDACTED]"
    assert result["phone"] == "[REDACTED]"
    assert result["message"] == "Hello world"


def test_redact_pii_deep_nested():
    data = {
        "user": {
            "email": "test@test.com",
            "address": "123 Main St",
        },
        "items": [{"note": "call me at 01012345678"}],
    }
    result = redact_pii_deep(data)
    assert result["user"]["email"] == "[REDACTED]"
    assert result["user"]["address"] == "[REDACTED]"
    assert "[PHONE]" in result["items"][0]["note"]


def test_log_safe_with_nested():
    data = {
        "level": "info",
        "user": {"phone": "01122334455", "name": "Ali"},
        "tags": ["a", "b"],
    }
    result = log_safe(data)
    assert result["user"]["phone"] == "[REDACTED]"
    assert result["user"]["name"] == "Ali"
    assert result["tags"] == ["a", "b"]


def test_log_safe_passes_unknown_types_through():
    class ArbitraryObject:
        pass

    data = {"bad": ArbitraryObject()}
    result = log_safe(data)
    assert isinstance(result["bad"], ArbitraryObject)


def test_redact_pii_deep_arabic_phone():
    data = {"msg": "اتصل على 01012345678"}
    result = redact_pii_deep(data)
    assert "[PHONE]" in result["msg"] or "[PHONE_EG]" in result["msg"]


def test_redact_pii_deep_credit_card():
    data = {"cc": "4111111111111111"}
    result = redact_pii_deep(data)
    assert result["cc"] == "[CREDIT_CARD]"
