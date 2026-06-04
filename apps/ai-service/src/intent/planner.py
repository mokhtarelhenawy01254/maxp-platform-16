from __future__ import annotations

from typing import Any

import structlog

from src.intent.schema import (
    INTENT_CONFIGURED_TOOLS,
    ClassifierResult,
    IntentContract,
    ToolPlan,
    get_policy,
)

logger = structlog.get_logger(__name__)

CONTRACT_SCHEMA_VERSION = "2026-05-model-intent-v2"


def _unique(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result


def _filter_available(tools: list[str], available_tools: list[str]) -> list[str]:
    available = set(available_tools or [])
    return _unique(t for t in tools if t in available)


def _infer_source(policy_plan: ToolPlan, context: dict[str, Any] | None = None) -> str:
    if policy_plan.goalRunId:
        return "state-machine"
    if policy_plan.requiresTool and policy_plan.primaryTool:
        return "tool-policy-gate"
    if policy_plan.intent in ("general.chat", "implementation.advice"):
        return "semantic-chat"
    return "typed-policy"


def _infer_decision(policy_plan: ToolPlan, policy: dict[str, Any], source: str, missing_slots: list[str]) -> str:
    if policy_plan.ambiguous:
        return "ask_followup"
    if missing_slots:
        return "ask_followup"
    if source == "state-machine":
        return "continue_goal"
    if not policy_plan.requiresTool:
        return "answer"
    if policy.get("actionType") == "handoff":
        return "delegate"
    return "execute_tool"


def _estimate_confidence(policy_plan: ToolPlan, source: str, missing_slots: list[str]) -> float:
    if policy_plan.ambiguous:
        return 0.42
    if missing_slots:
        return 0.58
    if source == "state-machine":
        return 0.99
    if policy_plan.requiresTool and policy_plan.primaryTool:
        return 0.9
    if policy_plan.intent == "general.chat":
        return 0.66
    if policy_plan.intent == "implementation.advice":
        return 0.82
    return 0.76


def build_route(policy_plan: ToolPlan, policy: dict[str, Any]) -> dict[str, Any]:
    return {
        "primaryTool": policy_plan.primaryTool,
        "allowedTools": policy_plan.allowedTools or [],
        "blockedTools": policy_plan.blockedTools or [],
    }


def build_intent_contract(
    policy_plan: ToolPlan,
    available_tools: list[str],
    context: dict[str, Any] | None = None,
) -> IntentContract:
    policy = get_policy(policy_plan.intent)
    source = _infer_source(policy_plan, context)
    missing_slots = _unique(policy_plan.missingSlots or [])
    decision = _infer_decision(policy_plan, policy, source, missing_slots)
    confidence = _estimate_confidence(policy_plan, source, missing_slots)
    route = build_route(policy_plan, policy)

    return IntentContract(
        schemaVersion=CONTRACT_SCHEMA_VERSION,
        intent=policy_plan.intent,
        confidence=confidence,
        source=source,
        decision=decision,
        actionType=policy.get("actionType", "chat"),
        riskLevel=policy.get("riskLevel", "low"),
        requiresTool=policy_plan.requiresTool,
        route=route,
        requiredSlots=policy.get("requiredSlots", []),
        missingSlots=missing_slots,
        guardrails=policy.get("guardrails", []),
        reason=policy_plan.reason or "",
    )


async def build_intent_contract_async(
    message: str,
    available_tools: list[str],
    context: dict[str, Any] | None = None,
    policy_plan: ToolPlan | None = None,
    company_id: str | None = None,
) -> IntentContract:
    from src.intent.classifier import classify_intent

    if policy_plan is None:
        policy_plan = ToolPlan()

    policy = get_policy(policy_plan.intent)
    source = _infer_source(policy_plan, context)
    missing_slots = _unique(policy_plan.missingSlots or [])

    # Run LLM classifier
    classifier_result: ClassifierResult | None = None
    try:
        classifier_result = await classify_intent(
            message=message,
            company_id=company_id or "",
            context=context or {},
        )
    except Exception as exc:
        logger.error("intent classification failed", error=str(exc), message=message[:100])

    if classifier_result and classifier_result.intent != policy_plan.intent:
        policy = get_policy(classifier_result.intent)
        policy_plan.intent = classifier_result.intent
        config = INTENT_CONFIGURED_TOOLS.get(classifier_result.intent)

        if config:
            policy_plan.primaryTool = config["primaryTool"]
            policy_plan.allowedTools = _filter_available(config["allowedTools"], available_tools)
        else:
            policy_plan.primaryTool = None
            policy_plan.allowedTools = []

        policy_plan.requiresTool = bool(policy_plan.primaryTool)
        missing_slots = _unique(classifier_result.missingSlots or [])

    if not classifier_result and not missing_slots:
        policy_plan.requiresTool = False
        policy_plan.primaryTool = None
        policy_plan.allowedTools = []

    decision = _infer_decision(policy_plan, policy, source, missing_slots)
    confidence = classifier_result.confidence if classifier_result else _estimate_confidence(policy_plan, source, missing_slots)
    route = build_route(policy_plan, policy)

    return IntentContract(
        schemaVersion=CONTRACT_SCHEMA_VERSION,
        intent=policy_plan.intent,
        confidence=confidence,
        source=source,
        decision=decision,
        actionType=policy.get("actionType", "chat"),
        riskLevel=policy.get("riskLevel", "low"),
        requiresTool=policy_plan.requiresTool,
        route=route,
        requiredSlots=policy.get("requiredSlots", []),
        missingSlots=missing_slots,
        guardrails=policy.get("guardrails", []),
        reason=policy_plan.reason or "",
    )


def to_tool_plan(contract: IntentContract, available_tools: list[str]) -> ToolPlan:
    return ToolPlan(
        intent=contract.intent,
        requiresTool=contract.requiresTool,
        primaryTool=contract.route.get("primaryTool"),
        allowedTools=_filter_available(contract.route.get("allowedTools", []), available_tools),
        blockedTools=_filter_available(contract.route.get("blockedTools", []), available_tools),
        reason=contract.reason,
        missingSlots=contract.missingSlots,
        goalRunId=None,
    )


def get_planned_tool_executions(relevance_plan: ToolPlan, intent_context: dict[str, Any]) -> list[dict[str, Any]]:
    return []


def get_deterministic_read_tool_execution(
    relevance_plan: ToolPlan,
    message: str,
    native_tools: list[dict[str, Any]],
    options: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    if not relevance_plan.requiresTool or not relevance_plan.primaryTool:
        return None
    return {
        "tool": relevance_plan.primaryTool,
        "nativeName": relevance_plan.primaryTool,
        "params": {},
    }


def get_deterministic_action_tool_execution(
    relevance_plan: ToolPlan,
    message: str,
    native_tools: list[dict[str, Any]],
    options: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    if relevance_plan.intent not in ("support.exchange", "support.refund", "support.complaint"):
        return None
    return {
        "tool": "agent_handoff_to",
        "nativeName": "agent_handoff_to",
        "params": {"reason": relevance_plan.reason or "Support handoff requested"},
    }


def get_model_classified_read_tool_execution(
    relevance_plan: ToolPlan,
    native_tools: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if not relevance_plan.requiresTool or not relevance_plan.primaryTool:
        return None
    return {
        "tool": relevance_plan.primaryTool,
        "nativeName": relevance_plan.primaryTool,
        "params": {},
    }


def get_model_classified_handoff_execution(
    relevance_plan: ToolPlan,
    message: str,
    native_tools: list[dict[str, Any]],
    options: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    if relevance_plan.intent not in ("support.exchange", "support.refund", "support.complaint"):
        return None
    return {
        "tool": "agent_handoff_to",
        "nativeName": "agent_handoff_to",
        "params": {"reason": relevance_plan.reason or "Customer support request"},
    }


def get_model_classified_write_tool_execution(
    relevance_plan: ToolPlan,
    native_tools: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if not relevance_plan.requiresTool or not relevance_plan.primaryTool:
        return None
    return {
        "tool": relevance_plan.primaryTool,
        "nativeName": relevance_plan.primaryTool,
        "params": {},
    }
