from __future__ import annotations

from typing import Any

from src.intent.schema import ToolPlan


def resolve_admin_policy_plan(
    message: str,
    available_tools: list[str],
    context: dict[str, Any] | None = None,
) -> ToolPlan | None:
    """Deprecated compatibility hook.

    Admin, merchant, and customer routing is now owned by the structured LLM
    classifier in ``build_intent_contract_async``. This function intentionally
    does not classify with local keywords, regexes, or template rules.
    """
    return None


def resolve_tool_plan(
    message: str,
    available_tools: list[str],
    context: dict[str, Any] | None = None,
) -> ToolPlan:
    """Return a non-tool plan for legacy callers.

    The live pipeline always calls the async model classifier. Keeping this
    function conservative prevents old code paths from executing tools based on
    deterministic keyword routing.
    """
    return ToolPlan(
        intent="general.chat",
        requiresTool=False,
        allowedTools=[],
        blockedTools=[],
        blockedReason="MODEL_CLASSIFIER_REQUIRED",
        classification={"classifierRequired": True},
        reason="MODEL_CLASSIFIER_REQUIRED",
    )
