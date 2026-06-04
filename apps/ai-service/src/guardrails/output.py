from __future__ import annotations

from typing import Any

from src.guardrails.base import BaseGuardrail, GuardrailResult


class OutputGuardrail(BaseGuardrail):
    def __init__(self, name: str, check_fn):
        self.name = name
        self.check_fn = check_fn

    async def validate(self, context: Any, text: str) -> GuardrailResult:
        is_valid, reason = await self.check_fn(context, text)
        if not is_valid:
            return GuardrailResult(
                allowed=False,
                reason=f"Output blocked by {self.name}",
                violations=[reason],
            )
        return GuardrailResult(allowed=True)


async def _no_internal_syntax_check(context, text):
    if "CALL_TOOL:" in text or "InternalID:" in text:
        return False, "Internal tool syntax leaked into reply"
    return True, None


OUTPUT_GUARDRAILS = [
    OutputGuardrail("INTERNAL_SYNTAX", _no_internal_syntax_check),
]
