from __future__ import annotations

import re
from typing import Any

from src.guardrails.base import BaseGuardrail, GuardrailResult


class InputGuardrail(BaseGuardrail):
    def __init__(self, name: str, pattern: str, message: str):
        self.name = name
        self.pattern = re.compile(pattern, re.IGNORECASE)
        self.message = message

    async def validate(self, context: Any, text: str) -> GuardrailResult:
        if self.pattern.search(text):
            return GuardrailResult(
                allowed=False,
                reason=f"Input blocked by {self.name}",
                violations=[self.message],
            )
        return GuardrailResult(allowed=True)


# Default input guardrails
INPUT_GUARDRAILS = [
    InputGuardrail("PROMPT_INJECTION", r"ignore previous instructions|system prompt", "Prompt injection detected"),
    InputGuardrail("SENSITIVE_DATA", r"password|secret|api_key", "Sensitive data detected in input"),
]
