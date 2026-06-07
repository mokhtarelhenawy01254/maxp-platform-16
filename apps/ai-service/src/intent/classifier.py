from __future__ import annotations

import json
import re
from typing import Any

import structlog

from src.context.multimodal import build_user_content
from src.intent.dynamic_registry import dynamic_intent_registry
from src.intent.schema import ClassifierResult
from src.llm.model_capabilities import route_for_modalities
from src.observability.llm_fallback import LLMFallbackProvider
from src.pipeline.llm_messages import to_client_messages

logger = structlog.get_logger(__name__)


def _parse_json_object(text: str) -> dict[str, Any] | None:
    trimmed = text.strip()
    if not trimmed:
        return None
    try:
        return json.loads(trimmed)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", trimmed, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                return None
    return None


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
    return ClassifierResult(
        intent=intent,
        confidence=float(args.get("confidence", 0.8)),
        confidenceLevel=args.get("confidenceLevel", "medium"),
        ambiguous=bool(args.get("ambiguous", False)),
        clarificationQuestion=args.get("clarificationQuestion"),
        slots=slots,
        missingSlots=missing_slots,
        toolEligibility=args.get("toolEligibility", {}).get("status", "allowed"),
        reasonCodes=args.get("reasonCodes", []),
        alternativeIntents=args.get("alternativeIntents", []),
    )


async def classify_intent(
    message: str,
    company_id: str,
    context: dict[str, Any] | None = None,
) -> ClassifierResult | None:
    ctx = context or {}
    available_tools = ctx.get("availableTools", [])
    attachments = list(ctx.get("attachments") or [])
    preferred_model = ctx.get("preferredModel") or ctx.get("model")
    preferred_provider = ctx.get("preferredProvider") or ctx.get("provider")
    model_route = route_for_modalities(
        model=str(preferred_model) if preferred_model else None,
        provider=str(preferred_provider) if preferred_provider else None,
        has_image_input=bool(attachments),
    )

    # Use dynamic intent registry (with static fallback if not loaded)
    intent_enum = dynamic_intent_registry.get_intent_enum()
    system_prompt = (
        "You are a schema-only intent classifier for customer and merchant operations.\n"
        "Return exactly one JSON object and no markdown, comments, or customer-facing answer.\n"
        f"Allowed intents: {', '.join(intent_enum)}\n"
        "JSON shape: {\"intent\": string, \"confidence\": number, \"ambiguous\": boolean, "
        "\"clarificationQuestion\": string|null, \"slots\": object, \"missingSlots\": array, \"reasonCodes\": array}.\n"
        f"Available tools: {', '.join(available_tools) if available_tools else 'none'}.\n"
        "For customer read-only catalog questions about price, availability, stock, images, size, color, SKU, or variants, "
        "choose inventory when a current stock/variant fact is requested; choose products only for broad catalog browsing.\n"
        "Set slots.requestedProductImage to true when the latest message asks for product photos, an image, or an image link.\n"
        "If the customer says they are not ordering yet, that is still a read-only catalog/inventory question, "
        "not an order draft and not a support handoff.\n"
        "Use support exchange/refund/complaint only when the latest message asks for after-sale service "
        "such as replacement, return, refund, damage, complaint, or policy exception.\n"
        "Extract only values present in the latest message. Do not invent customer name, phone, address, price, or order number.\n"
        "Do not classify by lexical shortcuts. Interpret the latest message semantically, including negation and corrections.\n"
    )

    fallback = LLMFallbackProvider()
    client = await fallback.get_client(
        company_id=company_id,
        model=model_route.model,
        provider=model_route.provider,
    )
    if not client:
        logger.error("no LLM client available for intent classification")
        return None

    try:
        response = await client.get_response(
            messages=to_client_messages([
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": build_user_content(
                        f"[USER_INPUT_START]\n{message}\n[USER_INPUT_END]",
                        attachments,
                    ),
                },
            ]),
            options={"temperature": 0, "max_tokens": 500},
        )
        raw_text = response.text if hasattr(response, "text") else str(response)
        parsed = _parse_json_object(raw_text)
        if parsed is None:
            logger.warning("classifier returned unparseable JSON", raw=raw_text[:200])
            return None
        result = _normalize_classifier_result(parsed)
        if result is None:
            logger.warning("classifier returned invalid result", parsed=parsed)
            return None
        return result
    except Exception as exc:
        logger.error("classifier LLM call failed", error=str(exc), message=message[:100])
        return None
