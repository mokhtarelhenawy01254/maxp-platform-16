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
from src.tools.names import canonical_tool_name

logger = structlog.get_logger(__name__)

CONTRACT_SCHEMA_VERSION = "2026-05-model-intent-v2"
MIN_TOOL_CONFIDENCE = 0.55


def _unique(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            result.append(item)
    return result


def _filter_available(tools: list[str], available_tools: list[str]) -> list[str]:
    available_by_canonical = {canonical_tool_name(t): t for t in (available_tools or [])}
    resolved: list[str] = []
    for tool in tools:
        canonical = canonical_tool_name(tool)
        if canonical in available_by_canonical:
            resolved.append(available_by_canonical[canonical])
    return _unique(resolved)


def _infer_source(policy_plan: ToolPlan, context: dict[str, Any] | None = None) -> str:
    if policy_plan.goalRunId:
        return "state-machine"
    if policy_plan.requiresTool and policy_plan.primaryTool:
        return "tool-policy-gate"
    if policy_plan.intent in ("general.chat", "implementation.advice"):
        return "semantic-chat"
    return "typed-policy"


def _infer_decision(policy_plan: ToolPlan, policy: dict[str, Any], source: str, missing_slots: list[str]) -> str:
    if policy_plan.blockedReason in {"NEEDS_CLARIFICATION", "LOW_CONFIDENCE", "TOOL_NOT_AVAILABLE", "TOOL_BLOCKED"}:
        return "ask_followup"
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


def _missing_required_slots(policy: dict[str, Any], slots: dict[str, Any]) -> list[str]:
    missing: list[str] = []
    for slot_name in policy.get("requiredSlots", []) or []:
        value = slots.get(slot_name)
        if value is None:
            missing.append(slot_name)
        elif isinstance(value, str) and not value.strip():
            missing.append(slot_name)
    return _unique(missing)


def _tool_available(tool: str | None, available_tools: list[str]) -> bool:
    if not tool:
        return False
    return bool(_filter_available([tool], available_tools))


def _block_tool_execution(policy_plan: ToolPlan, reason: str) -> None:
    policy_plan.requiresTool = False
    policy_plan.blockedReason = reason
    policy_plan.reason = reason
    policy_plan.classification = {
        **(policy_plan.classification or {}),
        "toolExecutionDisabled": True,
        "blockedReason": reason,
    }


def _has_any_slot(slots: dict[str, Any], names: tuple[str, ...]) -> bool:
    for name in names:
        value = slots.get(name)
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        return True
    return False


def _missing_core_tool_slots(tool_name: str | None, slots: dict[str, Any]) -> list[str]:
    canonical = canonical_tool_name(tool_name or "")
    if canonical == "inventory_check" and not _has_any_slot(
        slots,
        ("productName", "product_name", "product", "sku", "query", "productColor", "product_color"),
    ):
        return ["productName"]
    if canonical == "shipping_rates" and not _has_any_slot(slots, ("governorate", "city", "location")):
        return ["governorate"]
    if canonical == "order_lookup" and not _has_any_slot(slots, ("orderNumber", "order_number")):
        return ["orderNumber"]
    return []


def _has_previous_product_context(context: dict[str, Any] | None) -> bool:
    if not isinstance(context, dict):
        return False
    memory_context = context.get("externalMemoryContext")
    if not isinstance(memory_context, dict):
        memory_context = context
    return bool(
        memory_context.get("lastShownProductIds")
        or memory_context.get("queriedProducts")
        or memory_context.get("activeSearchFilters")
    )


def _memory_context(context: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(context, dict):
        return {}
    memory_context = context.get("externalMemoryContext")
    return memory_context if isinstance(memory_context, dict) else context


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _nested_value(value: Any, *paths: tuple[str, ...]) -> Any:
    for path in paths:
        current = value
        for key in path:
            if not isinstance(current, dict):
                current = None
                break
            current = current.get(key)
        if current is None:
            continue
        if isinstance(current, str) and not current.strip():
            continue
        return current
    return None


def _order_memory_has_product(context: dict[str, Any] | None) -> bool:
    memory = _memory_context(context)
    candidates = [
        _as_dict(memory.get("lastInventoryParams")),
        _as_dict(memory.get("lastInventoryResult")),
        _as_dict(memory.get("lastProductResult")),
        _as_dict(memory.get("selectedProduct")),
        _as_dict(memory.get("lastOrderCandidate")),
    ]
    if memory.get("lastShownProductIds") or memory.get("queriedProducts"):
        return True
    return any(
        _nested_value(
            candidate,
            ("productName",),
            ("product_name",),
            ("product_name_or_sku",),
            ("productNameOrSku",),
            ("name",),
            ("sku",),
            ("product", "name"),
            ("product", "sku"),
            ("id",),
            ("productId",),
        )
        is not None
        for candidate in candidates
    )


def _order_memory_has_price(context: dict[str, Any] | None) -> bool:
    memory = _memory_context(context)
    candidates = [
        _as_dict(memory.get("lastInventoryResult")),
        _as_dict(memory.get("lastProductResult")),
        _as_dict(memory.get("selectedProduct")),
        _as_dict(memory.get("lastOrderCandidate")),
    ]
    return any(
        _nested_value(
            candidate,
            ("productPrice",),
            ("product_price",),
            ("price", "amount"),
            ("price",),
            ("product", "price", "amount"),
            ("product", "price"),
        )
        is not None
        for candidate in candidates
    )


def _order_memory_has_shipping_destination(context: dict[str, Any] | None) -> bool:
    memory = _memory_context(context)
    shipping = _as_dict(memory.get("lastShippingResult"))
    candidate = _as_dict(memory.get("lastOrderCandidate"))
    return (
        _nested_value(shipping, ("city",), ("governorate",), ("destination",), ("area",)) is not None
        or _nested_value(candidate, ("city",), ("governorate",)) is not None
    )


def _has_variant_followup_slots(tool_name: str | None, slots: dict[str, Any]) -> bool:
    canonical = canonical_tool_name(tool_name or "")
    if canonical != "inventory_check":
        return False
    return _has_any_slot(
        slots,
        (
            "productSize",
            "product_size",
            "size",
            "productColor",
            "product_color",
            "color",
            "requestedProductImage",
            "requested_product_image",
            "referencesPreviousProduct",
            "references_previous_product",
        ),
    )


def _resolve_blocking_missing_slots(
    *,
    policy: dict[str, Any],
    tool_name: str | None,
    slots: dict[str, Any],
    context: dict[str, Any] | None,
) -> list[str]:
    missing = _unique([
        *_missing_required_slots(policy, slots),
        *_missing_core_tool_slots(tool_name, slots),
    ])
    if (
        "productPrice" in missing
        and policy.get("nextState") == "create_confirmed_order"
        and _has_any_slot(slots, ("productName", "product_name", "product", "sku", "query"))
    ):
        missing = [slot for slot in missing if slot != "productPrice"]
    if (
        "productName" in missing
        and _has_variant_followup_slots(tool_name, slots)
        and _has_previous_product_context(context)
    ):
        return [slot for slot in missing if slot != "productName"]
    if policy.get("nextState") == "create_confirmed_order":
        resolved_missing = list(missing)
        if "productName" in resolved_missing and _order_memory_has_product(context):
            resolved_missing = [slot for slot in resolved_missing if slot != "productName"]
        if "productPrice" in resolved_missing and (
            _order_memory_has_price(context)
            or _has_any_slot(slots, ("productName", "product_name", "product", "sku", "query"))
            or _order_memory_has_product(context)
        ):
            resolved_missing = [slot for slot in resolved_missing if slot != "productPrice"]
        if "city" in resolved_missing and (
            _has_any_slot(slots, ("address",))
            or _order_memory_has_shipping_destination(context)
        ):
            resolved_missing = [slot for slot in resolved_missing if slot != "city"]
        return resolved_missing
    # When image attachments present, image IS the product reference
    if "productName" in missing:
        _att = (context or {}).get("attachments", [])
        _has_img = any(
            isinstance(a, dict) and (
                a.get("type") == "image" or str(a.get("mime_type", "")).startswith("image/")
            ) for a in _att
        )
        if _has_img:
            missing = [s for s in missing if s != "productName"]
    return missing


def build_intent_contract(
    policy_plan: ToolPlan,
    available_tools: list[str],
    context: dict[str, Any] | None = None,
) -> IntentContract:
    policy = get_policy(policy_plan.intent)
    source = _infer_source(policy_plan, context)
    missing_slots = _unique(policy_plan.missingSlots or [])
    slots = dict(policy_plan.slots or {})
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
        slots=slots,
        classification=dict(policy_plan.classification or {}),
        guardrails=policy.get("guardrails", []),
        reason=policy_plan.reason or "",
    )


async def build_intent_contract_async(
    message: str,
    available_tools: list[str],
    context: dict[str, Any] | None = None,
    policy_plan: ToolPlan | None = None,
    company_id: str | None = None,
    client: Any | None = None,
) -> IntentContract:
    from src.intent.classifier import classify_intent

    if policy_plan is None:
        policy_plan = ToolPlan()

    policy = get_policy(policy_plan.intent)
    source = _infer_source(policy_plan, context)
    missing_slots = _unique(policy_plan.missingSlots or [])
    slots = dict(policy_plan.slots or {})

    # Run LLM classifier
    classifier_result: ClassifierResult | None = None
    try:
        classifier_result = await classify_intent(
            message=message,
            company_id=company_id or "",
            context=context or {},
            client=client,
        )
    except Exception as exc:
        logger.error("intent classification failed", error=str(exc), message=message[:100])

    if classifier_result and classifier_result.intent != policy_plan.intent:
        policy = get_policy(classifier_result.intent)
        policy_plan.intent = classifier_result.intent
        source = "llm-classifier"
        config = INTENT_CONFIGURED_TOOLS.get(classifier_result.intent)

        if config:
            filtered_allowed = _filter_available(config["allowedTools"], available_tools)
            configured_primary = config["primaryTool"]
            primary_available = _filter_available([configured_primary], available_tools)
            # Fall back to static config when CEO uses sub-agent architecture
            # (available_tools has support_specialist/order_specialist, not product_search)
            if not filtered_allowed and not primary_available and available_tools:
                # ponytail: intent tools don't match agent role (e.g. MEDICAL_CENTER gets classified as orders.create_confirmed)
                # Use all native tools so agent can still respond. Upgrade: classifier retraining for per-role intents.
                policy_plan.primaryTool = None
                policy_plan.allowedTools = list(available_tools)
            else:
                policy_plan.primaryTool = (primary_available or filtered_allowed or [None])[0]
                policy_plan.allowedTools = filtered_allowed
        else:
            # ponytail: intent not in INTENT_CONFIGURED_TOOLS (e.g. booking_reserve for MEDICAL_CENTER)
            # Use all native tools so agent can still respond.
            policy_plan.primaryTool = None
            policy_plan.allowedTools = list(available_tools) if available_tools else []

        policy_plan.requiresTool = bool(policy_plan.primaryTool)
        # When image attachment present and tool is inventory_check, switch to product_search
        _ctx_attachments = (context or {}).get('attachments', [])
        _has_image_att = any(
            isinstance(a, dict) and (
                a.get('type') == 'image' or str(a.get('mime_type', '')).startswith('image/')
            ) for a in _ctx_attachments
        )
        if _has_image_att and canonical_tool_name(policy_plan.primaryTool or '') == 'inventory_check':
            _ps_avail = _filter_available(['product_search'], available_tools)
            if _ps_avail:
                policy_plan.primaryTool = _ps_avail[0]
                policy_plan.allowedTools = _ps_avail
                policy_plan.intent = 'products'
                logger.info('image_search_override', original='inventory_check', new='product_search')

        logger.info("intent_routed", intent=policy_plan.intent, requiresTool=policy_plan.requiresTool, primaryTool=policy_plan.primaryTool, allowedTools=policy_plan.allowedTools)
        classifier_missing_slots = _unique(classifier_result.missingSlots or [])
        slots = dict(classifier_result.slots or {})
        slot_aliases = {"patientPhone": "phoneNumber", "patientGender": "gender", "patientName": "patientName"}
        for alias, canonical in slot_aliases.items():
            if alias in slots and canonical not in slots:
                slots[canonical] = slots.pop(alias)
        blocking_missing_slots = _resolve_blocking_missing_slots(
            policy=policy,
            tool_name=policy_plan.primaryTool,
            slots=slots,
            context=context,
        )
        missing_slots = blocking_missing_slots
        policy_plan.slots = slots
        policy_plan.missingSlots = missing_slots
        policy_plan.ambiguous = bool(classifier_result.ambiguous)
        policy_plan.classification = {
            **(policy_plan.classification or {}),
            "slots": slots,
            "confidence": classifier_result.confidence,
            "confidenceLevel": classifier_result.confidenceLevel,
            "toolEligibility": classifier_result.toolEligibility,
            "ambiguous": classifier_result.ambiguous,
            "clarificationQuestion": classifier_result.clarificationQuestion,
            "classifierMissingSlots": classifier_missing_slots,
            "reasonCodes": list(classifier_result.reasonCodes or []),
            "alternativeIntents": list(classifier_result.alternativeIntents or []),
        }

        tool_status = str(classifier_result.toolEligibility or "").strip().lower()
        if policy_plan.requiresTool and (
            classifier_result.ambiguous
            or blocking_missing_slots
            or (
                tool_status == "needs_clarification"
                and policy.get("actionType") in {"write", "workflow", "handoff"}
                and blocking_missing_slots
            )
        ):
            _block_tool_execution(policy_plan, "NEEDS_CLARIFICATION")
        elif policy_plan.requiresTool and (
            classifier_result.confidence < MIN_TOOL_CONFIDENCE
            or str(classifier_result.confidenceLevel or "").strip().lower() == "low"
        ):
            _block_tool_execution(policy_plan, "LOW_CONFIDENCE")
        elif policy_plan.requiresTool and tool_status == "blocked":
            _block_tool_execution(policy_plan, "TOOL_BLOCKED")
        elif config and not _tool_available(policy_plan.primaryTool, available_tools):
            policy_plan.primaryTool = None
            policy_plan.allowedTools = []
            _block_tool_execution(policy_plan, "TOOL_NOT_AVAILABLE")

    if not classifier_result and not missing_slots:
        # Don't block tools when classifier is unavailable — allow all available
        # tools so the LLM can still respond based on conversation context.
        policy_plan.requiresTool = True
        policy_plan.primaryTool = None
        policy_plan.allowedTools = list(available_tools or [])
        policy_plan.blockedReason = "CLASSIFIER_UNAVAILABLE"
        policy_plan.reason = "CLASSIFIER_UNAVAILABLE"
        policy_plan.classification = {
            **(policy_plan.classification or {}),
            "classifierUnavailable": True,
        }
        source = "classifier-unavailable"

    decision = _infer_decision(policy_plan, policy, source, missing_slots)
    confidence = (
        classifier_result.confidence
        if classifier_result
        else 0.0 if policy_plan.blockedReason == "CLASSIFIER_UNAVAILABLE"
        else _estimate_confidence(policy_plan, source, missing_slots)
    )
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
        slots=slots,
        classification=dict(policy_plan.classification or {}),
        guardrails=policy.get("guardrails", []),
        reason=policy_plan.reason or "",
    )


def to_tool_plan(contract: IntentContract, available_tools: list[str]) -> ToolPlan:
    blocked_reason = contract.reason if contract.reason in {
        "CLASSIFIER_UNAVAILABLE",
        "NEEDS_CLARIFICATION",
        "LOW_CONFIDENCE",
        "TOOL_NOT_AVAILABLE",
        "TOOL_BLOCKED",
    } else None
    return ToolPlan(
        intent=contract.intent,
        requiresTool=contract.requiresTool,
        primaryTool=contract.route.get("primaryTool"),
        allowedTools=(
            _filter_available(contract.route.get("allowedTools", []), available_tools)
            or (
                contract.route.get("allowedTools", [])
                if any(canonical_tool_name(t) in {"agent_spawn", "agent_assign_task"} for t in (available_tools or []))
                else []
            )
        ),
        blockedTools=_filter_available(contract.route.get("blockedTools", []), available_tools),
        reason=contract.reason,
        missingSlots=contract.missingSlots,
        slots=dict(contract.slots or {}),
        confidence=contract.confidence,
        confidenceLevel=str((contract.classification or {}).get("confidenceLevel") or ""),
        clarificationQuestion=(contract.classification or {}).get("clarificationQuestion"),
        classification={
            **dict(contract.classification or {}),
            "slots": dict(contract.slots or {}),
            "classifierUnavailable": contract.reason == "CLASSIFIER_UNAVAILABLE",
            "toolExecutionDisabled": blocked_reason is not None and blocked_reason != "CLASSIFIER_UNAVAILABLE",
            "blockedReason": blocked_reason,
        },
        goalRunId=None,
        blockedReason=blocked_reason,
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
    policy = get_policy(relevance_plan.intent)
    if policy.get("actionType") not in {"write", "workflow"}:
        return None
    primary = canonical_tool_name(relevance_plan.primaryTool)
    tool_obj = None
    for tool in native_tools:
        tool_name = tool.get("name") if isinstance(tool, dict) else getattr(tool, "name", "")
        if canonical_tool_name(tool_name) == primary:
            tool_obj = tool
            break
    if tool_obj is None:
        try:
            from src.tools.registry import get_tool
            tool_obj = get_tool(primary)
        except Exception:
            tool_obj = None
    if tool_obj is None:
        return None
    return {
        "tool": relevance_plan.primaryTool,
        "nativeName": relevance_plan.primaryTool,
        "params": {},
    }
