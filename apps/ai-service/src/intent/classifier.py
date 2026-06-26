from __future__ import annotations

import json
import re
from typing import Any

import structlog

from src.context.multimodal import build_user_content
from src.intent.dynamic_registry import dynamic_intent_registry
from src.intent.schema import INTENT_CLASSIFICATION_SCHEMA, ClassifierResult
from src.llm.model_capabilities import (
    DEFAULT_VISION_MODEL,
    DEFAULT_VISION_PROVIDER,
    ModelRoute,
    default_model_for_provider,
    route_for_modalities,
)
from src.observability.llm_fallback import LLMFallbackProvider
from src.pipeline.llm_messages import to_client_messages

logger = structlog.get_logger(__name__)


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
            "output_schema": INTENT_CLASSIFICATION_SCHEMA,
        },
    )
    raw_text = response.text if hasattr(response, "text") else str(response)
    parsed = _parse_json_object(raw_text)
    if parsed is None:
        logger.warning("classifier returned unparseable JSON", raw=raw_text[:800])
        return None
    result = _normalize_classifier_result(parsed)
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
    system_prompt = (
        "/no_think\n"
        "You are a schema-only intent classifier for customer and merchant operations.\n"
        "Return exactly one JSON object and no markdown, comments, or customer-facing answer.\n"
        f"Allowed intents: {', '.join(intent_enum)}\n"
        "JSON shape: {\"intent\": string, \"confidence\": number, \"confidenceLevel\": \"low|medium|high\", "
        "\"ambiguity\": boolean, \"clarificationQuestion\": string|null, \"slots\": object, "
        "\"missingSlots\": array, \"toolEligibility\": {\"status\": \"allowed|blocked|needs_clarification\"}, "
        "\"reasonCodes\": array}.\n"
        f"Available tools: {', '.join(available_tools) if available_tools else 'none'}.\n"
        "For customer read-only catalog questions about products, price, availability, stock, images, size, color, SKU, or variants:\n"
        "  - Choose products when the customer asks broad questions like 'what do you have', 'what products', 'what's available', "
        "or Arabic messages like 'عايز اشوف المنتجات', 'عندك ايه', 'المنتجات المتاحة', 'عايز اعرف المنتجات', 'عندك كوتشي', 'الاقسام المتاحة'.\n"
        "  - Choose inventory when the customer asks about a specific product's price, size, color, or stock availability, "
        "like 'Swan Step بكام', 'كوتشي Swan Step مقاس 40', 'لون أبيض متوفر؟', 'سعر كوتشي Swan Step', "
        "'عايز سعر', 'المقاس 41 موجود', 'اللون الأسود', 'هل متوفر', 'عندك مقاس', 'كوتشي لون أبيض'. "
        "inventory uses inventory_check tool which searches by product name + size/color. "
        "Do NOT use inventory for low stock alerts or restock reports — that is a merchant admin function.\n"
        "When an image attachment is provided without an explicit product name in text, use products intent (not inventory), toolEligibility.status=allowed, no productName in missingSlots (image is the product reference).\n"
        "Set slots.requestedProductImage to true when the latest message semantically asks to SEE, VIEW, or VISUALLY INSPECT a product — any phrasing that indicates the customer wants to look at the product visually (e.g. asking for images, photos, pictures, wanting to \"see\" or \"view\" the product or \"how it looks\", \"its appearance\", \"شكله\", \"صورته\", \"صور\", \"اشوف\", \"صور ليهم\", \"عايز اشوف الصور\", \"Picture\", \"Photo\", \"Image\", \"ارلي صوره\", \"صورة المنتج\"). Set it to false only when the request is purely about price, stock count, size, or availability without any visual component.\n"
        "Set slots.listAll to true ONLY for READ-ONLY catalog browsing when the customer asks to see ALL products (intent must be products, not products.manage). products.manage is only for creating or editing products.\n"
        "Use catalog.categories ONLY when the customer explicitly asks about product categories, sections, types, or what the store carries (e.g. \"what categories do you have\", \"what are your sections\", \"اقسامكم ايه\", \"عندك اقسام ايه\", \"أنواع المنتجات\"). "
        "catalog.categories lists available store categories with product counts.\n"
        "If the customer says they are not ordering yet, that is still a read-only catalog/inventory question, "
        "not an order draft and not a support handoff.\n"
        "Use orders.cancel when the customer explicitly asks to cancel an order they already placed. "
        "Set slots.cancelReason to the reason if mentioned. "
        "Set slots.orderNumber to the order number if provided.\n"
        "Use orders.refund when the customer explicitly asks for a refund or money back for an existing order. "
        "Set slots.refundReason to the reason if mentioned. "
        "Set slots.orderNumber to the order number if provided.\n"
        "Use support refund only for non-order-specific after-sale financial disputes or policy exceptions, "
        "not for a straightforward refund on an existing order.\n"
        "Use support exchange/complaint only when the latest message asks for after-sale service "
        "such as replacement, damage, complaint, or policy exception.\n"
        "Extract only values present in the latest message. Do not invent customer name, phone, address, price, or order number.\n"
        "Use the conversation context only to resolve references and follow-up questions to previously shown products. "
        "When the latest customer message asks about a size, color, price, image, or availability for the previous product, "
        "choose inventory and set slots.referencesPreviousProduct to true instead of requiring a repeated product name.\n"
        "Do not classify by lexical shortcuts. Interpret the latest message semantically, including negation and corrections.\n"
        "For shipping-rate questions, set slots.governorate when the latest message contains a governorate or city destination.\n"
        "Use 'sales' intent for Arabic queries about order counts, daily stats, company performance, "
        "like 'عندي كام طلب', 'كام طلب النهاردة', 'مبيعات النهاردة', 'إجمالي الطلبات', 'performance'. "
        "sales maps to company_snapshot (dashboard overview). "
        "Only use 'products.manage' when the customer explicitly wants to add or edit a product.\n"
        "Use 'general.knowledge' for questions about company policies, return policy, shipping policy, "
        "FAQs, working hours, store hours, or any merchant-specific knowledge the agent should look up. "
        "Examples: 'ما هي سياسة الإرجاع', 'مواعيد العمل', 'هل يوجد شحن لكل المحافظات', 'عايز اعرف سياسة الاستبدال'. "
        "Do NOT use general.chat for these — general.knowledge will search the knowledge base for the answer.\n"
    )

    # Fallback chain: build list of (provider, model) combos to try
    classifier_attempts: list[tuple[str | None, str]] = []
    if client is not None:
        classifier_attempts.append((None, None))  # Use the passed client
    else:
        fallback = LLMFallbackProvider()
        fallback_provider = model_route.provider or ctx.get("preferredProvider")
        fallback_model = model_route.model or preferred_model
        classifier_attempts.append((fallback_provider, fallback_model))
        # Fallback 2: Google Gemini (always available, supports vision)
        classifier_attempts.append(("GOOGLE", "gemini-2.5-flash"))
        # Fallback 3: GROQ
        classifier_attempts.append(("GROQ", "llama-3.3-70b-versatile"))

    result: ClassifierResult | None = None
    for attempt_idx, (attempt_provider, attempt_model) in enumerate(classifier_attempts):
        if client is None:
            client = await fallback.get_client(
                company_id=company_id,
                model=attempt_model,
                provider=attempt_provider,
            )
        if not client:
            logger.warning("classifier fallback client unavailable", provider=attempt_provider, model=attempt_model)
            continue
        try:
            result = await _classify_with_client(
                client,
                system_prompt=system_prompt,
                message=message,
                attachments=attachments,
                context_snapshot=context_snapshot,
            )
        except Exception as exc:
            logger.warning("classifier attempt failed", attempt=attempt_idx, provider=attempt_provider, model=attempt_model, error=str(exc))
            client = None  # Force rebuild for next attempt
            continue
        if result is not None:
            logger.info("classifier result", intent=result.intent, confidence=result.confidence, slots=result.slots, provider=attempt_provider, model=attempt_model)
            return result
        logger.warning("classifier attempt returned None", attempt=attempt_idx, provider=attempt_provider, model=attempt_model)
        client = None

    logger.error("all classifier attempts exhausted", message=message[:100])
    return None
