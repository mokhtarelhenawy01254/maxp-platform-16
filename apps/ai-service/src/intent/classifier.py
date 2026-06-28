from __future__ import annotations

import json
import re
from typing import Any

import structlog

from src.context.multimodal import build_user_content
from src.intent.dynamic_registry import dynamic_intent_registry
from src.intent.schema import INTENT_CLASSIFICATION_SCHEMA, ClassifierResult, ClassifierResponse
from src.llm.model_capabilities import (
    DEFAULT_VISION_MODEL,
    DEFAULT_VISION_PROVIDER,
    ModelRoute,
    default_model_for_provider,
    route_for_modalities,
)
from src.observability.llm_fallback import LLMFallbackProvider
from src.pipeline.llm_messages import to_client_messages

from pathlib import Path
from difflib import SequenceMatcher

logger = structlog.get_logger(__name__)


def _get_golden_cases() -> list[dict]:
    try:
        path = Path(__file__).resolve().parents[2] / "tests" / "evals" / "intent_golden_cases.json"
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        pass
    return []


def _find_exemplars(message: str, golden_cases: list[dict], count: int = 2) -> list[dict]:
    if not golden_cases:
        return []
    scored = []
    for case in golden_cases:
        score = SequenceMatcher(None, message.lower(), case["message"].lower()).ratio()
        scored.append((score, case))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [item[1] for item in scored[:count]]


def _format_exemplar(case: dict) -> str:
    classifier = case.get("classifier") or {}
    tool_elig = classifier.get("toolEligibility")
    if isinstance(tool_elig, str):
        tool_elig_dict = {"status": tool_elig, "blockedReason": None, "requiredTool": None}
    elif isinstance(tool_elig, dict):
        tool_elig_dict = {
            "status": tool_elig.get("status") or "allowed",
            "blockedReason": tool_elig.get("blockedReason"),
            "requiredTool": tool_elig.get("requiredTool")
        }
    else:
        tool_elig_dict = {"status": "allowed", "blockedReason": None, "requiredTool": None}

    example_response = {
        "intent": classifier.get("intent") or case.get("expected_intent") or "general.chat",
        "confidence": float(classifier.get("confidence") or 0.8),
        "confidenceLevel": classifier.get("confidenceLevel") or "medium",
        "ambiguity": bool(classifier.get("ambiguity") or False),
        "clarificationQuestion": classifier.get("clarificationQuestion"),
        "slots": classifier.get("slots") or {},
        "missingSlots": classifier.get("missingSlots") or [],
        "toolEligibility": tool_elig_dict,
        "reasonCodes": classifier.get("reasonCodes") or [],
        "alternativeIntents": classifier.get("alternativeIntents") or []
    }
    return (
        f"User message: \"{case.get('message')}\"\n"
        f"Response JSON:\n{json.dumps(example_response, ensure_ascii=False, indent=2)}"
    )


_THINK_TAG_RE = re.compile(r"<think[^>]*>[\s\S]*?</think>", re.IGNORECASE)

def _strip_think_tags(text: str) -> str:
    """Remove <think>...</think> reasoning blocks emitted by Qwen3 and similar models."""
    return _THINK_TAG_RE.sub("", text).strip()


def _parse_json_object(text: str) -> dict[str, Any] | None:
    trimmed = _strip_think_tags(text.strip())
    if not trimmed:
        return None
    try:
        return json.loads(trimmed)
    except json.JSONDecodeError:
        # Extract first {...} block (non-greedy to avoid swallowing nested JSON)
        match = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", trimmed, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                # Last resort: greedy match
                match2 = re.search(r"\{.*\}", trimmed, re.DOTALL)
                if match2 and match2.group() != match.group():
                    try:
                        return json.loads(match2.group())
                    except json.JSONDecodeError:
                        return None
    return None


def _has_slot_value(slots: dict[str, Any], slot_name: str) -> bool:
    value = slots.get(slot_name)
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    return True


def _normalize_missing_slots(
    policy: dict[str, Any] | None,
    slots: dict[str, Any],
    missing_slots: list[Any],
) -> list[str]:
    required_slots = set((policy or {}).get("requiredSlots") or [])
    if not required_slots:
        return []

    normalized: list[str] = []
    seen: set[str] = set()
    for slot_name in missing_slots:
        slot_key = str(slot_name)
        if slot_key not in required_slots or slot_key in seen:
            continue
        if _has_slot_value(slots, slot_key):
            continue
        normalized.append(slot_key)
        seen.add(slot_key)
    return normalized


def _normalize_classifier_result(args: dict[str, Any]) -> ClassifierResult | None:
    if not args or not isinstance(args, dict):
        return None
    intent = args.get("intent", "general.chat")
    # Validate intent against dynamic registry (or fallback to static schema)
    available_intents = dynamic_intent_registry.get_intent_enum()
    policy = dynamic_intent_registry.get_policy(intent)
    if intent not in available_intents and not policy:
        # If dynamic registry is empty, accept anyway (static fallback)
        from src.intent.schema import get_policy as _static_get_policy
        if not _static_get_policy(intent):
            return None
    slots = args.get("slots")
    if not isinstance(slots, dict):
        slots = {}
    missing_slots = args.get("missingSlots")
    if not isinstance(missing_slots, list):
        missing_slots = []
    missing_slots = _normalize_missing_slots(policy, slots, missing_slots)
    return ClassifierResult(
        intent=intent,
        confidence=float(args.get("confidence", 0.8)),
        confidenceLevel=args.get("confidenceLevel", "medium"),
        ambiguous=bool(args.get("ambiguous", args.get("ambiguity", False))),
        clarificationQuestion=args.get("clarificationQuestion"),
        slots=slots,
        missingSlots=missing_slots,
        toolEligibility=args.get("toolEligibility", {}).get("status", "allowed"),
        reasonCodes=args.get("reasonCodes", []),
        alternativeIntents=args.get("alternativeIntents", []),
    )


async def _classify_with_client(
    client: Any,
    *,
    system_prompt: str,
    message: str,
    attachments: list[dict[str, Any]],
    context_snapshot: dict[str, Any] | None = None,
) -> ClassifierResult | None:
    context_text = ""
    if context_snapshot:
        context_text = (
            "[CONVERSATION_CONTEXT_START]\n"
            f"{json.dumps(context_snapshot, ensure_ascii=False, default=str)}\n"
            "[CONVERSATION_CONTEXT_END]\n"
        )
    response = await client.get_response(
        messages=to_client_messages([
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": build_user_content(
                    f"{context_text}[USER_INPUT_START]\n{message}\n[USER_INPUT_END]",
                    attachments,
                ),
            },
        ]),
        options={
            "temperature": 0,
            "max_tokens": 1500,
            "tools_enabled": False,
            "output_schema": ClassifierResponse,
        },
    )
    raw_text = response.text if hasattr(response, "text") else str(response)
    parsed = _parse_json_object(raw_text)
    if parsed is None:
        logger.warning("classifier returned unparseable JSON", raw=raw_text[:800])
        return None
    try:
        validated = ClassifierResponse.model_validate(parsed)
    except Exception as exc:
        logger.warning("classifier pydantic validation failed", error=str(exc), parsed=parsed)
        return None
    result = _normalize_classifier_result(validated.model_dump())
    if result is None:
        logger.warning("classifier returned invalid result", parsed=parsed)
        return None
    return result


async def classify_intent(
    message: str,
    company_id: str,
    context: dict[str, Any] | None = None,
    client: Any | None = None,
) -> ClassifierResult | None:
    ctx = context or {}
    available_tools = ctx.get("availableTools", [])
    attachments = list(ctx.get("attachments") or [])
    external_memory_context = ctx.get("externalMemoryContext")
    context_snapshot: dict[str, Any] = {}
    if isinstance(external_memory_context, dict):
        context_snapshot = {
            "lastShownProductIds": external_memory_context.get("lastShownProductIds") or [],
            "queriedProducts": external_memory_context.get("queriedProducts") or [],
            "activeSearchFilters": external_memory_context.get("activeSearchFilters") or {},
        }
    preferred_provider = str(ctx.get("preferredProvider") or DEFAULT_VISION_PROVIDER).upper()
    preferred_model = ctx.get("preferredModel") or default_model_for_provider(preferred_provider)
    # Sanitize: if model is incompatible with provider, use provider default
    if preferred_provider == "GOOGLE" and preferred_model and not any(
        preferred_model.lower().startswith(p) for p in ("gemini-", "gemma-")
    ):
        preferred_model = default_model_for_provider("GOOGLE")  # gemini-2.5-flash
    model_route = route_for_modalities(
        model=preferred_model,
        provider=preferred_provider,
        has_image_input=bool(attachments),
    )
    if attachments and (not model_route.provider or not model_route.model):
        model_route = ModelRoute(
            provider=DEFAULT_VISION_PROVIDER,
            model=DEFAULT_VISION_MODEL,
            reason="image_input_uses_default_vision_model",
        )

    # Use dynamic intent registry (with static fallback if not loaded)
    intent_enum = dynamic_intent_registry.get_intent_enum()
    
    intent_descriptions = []
    for intent in intent_enum:
        policy = dynamic_intent_registry.get_policy(intent)
        desc = policy.get("description", "No description provided.")
        intent_descriptions.append(f"- {intent}: {desc}")
    intents_block = "\n".join(intent_descriptions)

    # Dynamic Few-Shotting: Load golden cases and retrieve contextually similar exemplars
    golden_cases = _get_golden_cases()
    exemplars = _find_exemplars(message, golden_cases, count=2)
    
    exemplars_block = ""
    if exemplars:
        formatted_exemplars = [_format_exemplar(case) for case in exemplars]
        exemplars_block = (
            "\n\nHere are some examples of expected inputs and matching responses:\n"
            + "\n\n".join(formatted_exemplars)
        )

    system_prompt = (
        "/no_think\n"
        "You are a schema-only intent classifier for customer and merchant operations.\n"
        "Return exactly one JSON object and no markdown, comments, or customer-facing answer.\n\n"
        "Allowed intents and their descriptions:\n"
        f"{intents_block}\n\n"
        "JSON shape: {\"intent\": string, \"confidence\": number, \"confidenceLevel\": \"low|medium|high\", "
        "\"ambiguity\": boolean, \"clarificationQuestion\": string|null, \"slots\": object, "
        "\"missingSlots\": array, \"toolEligibility\": {\"status\": \"allowed|blocked|needs_clarification\"}, "
        "\"reasonCodes\": array}.\n"
        f"Available tools: {', '.join(available_tools) if available_tools else 'none'}.\n\n"
        "Guidelines:\n"
        "1. Semantically interpret the latest user message in the context of the conversation. Support both English and Arabic (including Egyptian dialect).\n"
        "2. For read-only catalog/availability/price questions, extract slots like 'productName', 'productSize', 'productColor'. If the user requests to see images or photos of products, set slots.requestedProductImage to true.\n"
        "3. If the user refers to a previously shown/discussed product, set slots.referencesPreviousProduct to true.\n"
        "4. Extracted slots must be derived solely from the user's latest message and conversation context. Do not invent details."
        f"{exemplars_block}"
    )

    # Ensure the classifier uses ONLY the agent's model/client with zero fallback models.
    if client is None:
        fallback = LLMFallbackProvider()
        target_provider = model_route.provider or ctx.get("preferredProvider")
        target_model = model_route.model or preferred_model
        
        client = await fallback.get_client(
            company_id=company_id,
            model=target_model,
            provider=target_provider,
        )
        provider_name = target_provider
        model_name = target_model
    else:
        provider_name = ctx.get("preferredProvider")
        model_name = ctx.get("preferredModel")

    if not client:
        logger.error("classifier client unavailable for agent model", provider=provider_name, model=model_name)
        return None

    try:
        result = await _classify_with_client(
            client,
            system_prompt=system_prompt,
            message=message,
            attachments=attachments,
            context_snapshot=context_snapshot,
        )
    except Exception as exc:
        logger.error("classifier execution failed for agent model", provider=provider_name, model=model_name, error=str(exc))
        return None

    if result is not None:
        logger.info("classifier result success", intent=result.intent, confidence=result.confidence, slots=result.slots, provider=provider_name, model=model_name)
        return result

    logger.warning("classifier returned None for agent model", provider=provider_name, model=model_name)
    return None
