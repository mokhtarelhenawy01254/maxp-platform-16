from __future__ import annotations

import re
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

PII_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r'\b[\w\.-]+@[\w\.-]+\.\w+\b'), '[EMAIL]'),
    (re.compile(r'\b(\+?20|٠٢)?0?1[0-9]{9}\b'), '[PHONE]'),
    (re.compile(r'\b(\+?20|٠٢)?0?1[0-9]{2}\s[0-9]{7}\b'), '[PHONE]'),
    (re.compile(r'\b(?:ش|ال)[^،\.]{5,50}(?:ة|تان|ون|ين)\b'), '[ADDRESS_AR]'),
    (re.compile(r'\b\d{1,5}\s+[A-Za-z0-9\s,]+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane)\b'), '[ADDRESS_EN]'),
    (re.compile(r'\b(010|011|012|015)\d{8}\b'), '[PHONE_EG]'),
    (re.compile(r'\b\d{14,16}\b'), '[CREDIT_CARD]'),
]

PII_FIELD_NAMES = {"phone", "mobile", "tel", "telephone", "email", "address", "location", "full_name", "national_id", "ssn", "passport"}


def redact_pii_deep(data: dict[str, Any] | list[Any] | str) -> dict[str, Any] | list[Any] | str:
    if isinstance(data, dict):
        result: dict[str, Any] = {}
        for key, value in data.items():
            if key.lower() in PII_FIELD_NAMES:
                result[key] = "[REDACTED]"
            elif isinstance(value, (dict, list)):
                result[key] = redact_pii_deep(value)
            elif isinstance(value, str):
                result[key] = _redact_string(value)
            else:
                result[key] = value
        return result
    elif isinstance(data, list):
        return [redact_pii_deep(item) if isinstance(item, (dict, list, str)) else item for item in data]
    elif isinstance(data, str):
        return _redact_string(data)
    return data


def _redact_string(text: str) -> str:
    for pattern, replacement in PII_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def log_safe(data: dict[str, Any]) -> dict[str, Any]:
    try:
        result = redact_pii_deep(data)
        assert isinstance(result, dict)
        return result
    except Exception as e:
        logger.warning("pii_redaction_failed", error=str(e))
        return {"[REDACTED]": True}
