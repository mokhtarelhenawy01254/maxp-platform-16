from __future__ import annotations

from src.context.assembler import ContextAssembler
from src.context.multimodal import DEFAULT_IMAGE_MIME, data_url_to_inline_data
from src.intent.planner import (
    get_model_classified_handoff_execution,
    get_model_classified_read_tool_execution,
    get_model_classified_write_tool_execution,
)
from src.pipeline.context import DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL, PipelineContext
from src.tools.names import canonical_tool_name, canonical_tool_set


def _first_slot(slots: dict, *keys: str) -> str | None:
    for key in keys:
        value = slots.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return None


def _first_slot_value(slots: dict, *keys: str):
    for key in keys:
        value = slots.get(key)
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        return value
    return None


def _coerce_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    text = str(value or "").strip().lower()
    return text in {"1", "true", "yes", "y", "confirmed", "confirm"}


def _first_image_attachment_payload(ctx: PipelineContext) -> dict[str, str] | None:
    for attachment in getattr(ctx, "attachments", []) or []:
        if not isinstance(attachment, dict):
            continue
        attachment_type = str(attachment.get("type") or "").strip().lower()
        if attachment_type and "image" not in attachment_type:
            continue
        mime = str(
            attachment.get("mime_type")
            or attachment.get("mimeType")
            or attachment.get("content_type")
            or attachment.get("contentType")
            or DEFAULT_IMAGE_MIME
        ).strip() or DEFAULT_IMAGE_MIME
        data_url = str(attachment.get("data_url") or attachment.get("dataUrl") or "").strip()
        if data_url:
            parsed = data_url_to_inline_data(data_url)
            if parsed:
                parsed_mime, parsed_data = parsed
                return {"image_bytes": parsed_data, "mime_type": parsed_mime}
        base64_data = str(
            attachment.get("base64_data")
            or attachment.get("base64Data")
            or attachment.get("image_bytes")
            or attachment.get("imageBytes")
            or ""
        ).strip()
        if base64_data:
            return {"image_bytes": base64_data, "mime_type": mime}
        image_url = str(attachment.get("url") or attachment.get("image_url") or attachment.get("imageUrl") or "").strip()
        if image_url:
            return {"image_url": image_url, "mime_type": mime}
    return None


def _native_tool_available(ctx: PipelineContext, tool_name: str) -> bool:
    canonical = canonical_tool_name(tool_name)
    for tool in getattr(ctx, "native_tools", []) or []:
        name = tool.get("name") if isinstance(tool, dict) else getattr(tool, "name", "")
        if canonical_tool_name(name) == canonical:
            return True
    return False


def _prefer_product_search_for_image_query(ctx: PipelineContext, read_exec: dict | None) -> dict | None:
    # No image — nothing to change
    if not _first_image_attachment_payload(ctx):
        return read_exec

    if not _native_tool_available(ctx, "product_search"):
        return read_exec

    # No read_exec yet (intent was general.chat or unclassified) → force product_search
    # so the agent can identify the product from the image via embedding search.
    if not read_exec:
        return {
            "tool": "product.search",
            "nativeName": "product.search",
            "params": {"query": ctx.message},
        }

    # Existing read_exec is not inventory_check → leave it as-is
    if canonical_tool_name(read_exec.get("nativeName") or read_exec.get("tool") or "") != "inventory_check":
        return read_exec

    # Prefer product_search over inventory_check for image queries
    allowed = canonical_tool_set(getattr(ctx.relevance_plan, "allowedTools", []) or [])
    if allowed and "product_search" not in allowed:
        return read_exec

    return {
        "tool": "product.search",
        "nativeName": "product.search",
        "params": {"query": ctx.message},
    }


def _as_dict(value) -> dict:
    return value if isinstance(value, dict) else {}


def _nested_value(value, *paths: tuple[str, ...]):
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


def _memory_context(ctx: PipelineContext) -> dict:
    return dict(getattr(ctx, "external_memory_context", {}) or {})


def _order_memory_sources(ctx: PipelineContext) -> list[dict]:
    memory = _memory_context(ctx)
    return [
        _as_dict(memory.get("lastOrderCandidate")),
        _as_dict(memory.get("lastInventoryParams")),
        _as_dict(memory.get("lastInventoryResult")),
        _as_dict(memory.get("lastProductResult")),
        _as_dict(memory.get("selectedProduct")),
    ]


def _first_memory_value(ctx: PipelineContext, *paths: tuple[str, ...]):
    for source in _order_memory_sources(ctx):
        value = _nested_value(source, *paths)
        if value is not None:
            return value
    return None


def _setdefault_non_empty(params: dict, key: str, value) -> None:
    if key in params:
        current = params.get(key)
        if current is not None and (not isinstance(current, str) or current.strip()):
            return
    if value is None:
        return
    if isinstance(value, str) and not value.strip():
        return
    params[key] = value


def _shipping_memory_value(ctx: PipelineContext, *paths: tuple[str, ...]):
    memory = _memory_context(ctx)
    shipping = _as_dict(memory.get("lastShippingResult"))
    return _nested_value(shipping, *paths)


def _has_previous_product_context(ctx: PipelineContext) -> bool:
    memory_context = dict(getattr(ctx, "external_memory_context", {}) or {})
    return bool(
        memory_context.get("lastShownProductIds")
        or memory_context.get("queriedProducts")
        or memory_context.get("activeSearchFilters")
    )


def _populate_tool_params(ctx: PipelineContext, execution: dict | None) -> None:
    if not execution:
        return
    tool_name = canonical_tool_name(execution.get("nativeName") or execution.get("tool") or "")
    params = dict(execution.get("params") or {})
    slots = dict(getattr(ctx.relevance_plan, "slots", {}) or {})
    if getattr(ctx.relevance_plan, "classification", None):
        slots = {**dict(ctx.relevance_plan.classification.get("slots") or {}), **slots}

    if tool_name == "product_search":
        image_payload = _first_image_attachment_payload(ctx)
        if not image_payload and (ctx.external_memory_context or {}).get(DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL):
            params["use_vector"] = False
        if image_payload and params.get("use_vector") is not False:
            if image_payload.get("image_bytes"):
                params.setdefault("image_bytes", image_payload["image_bytes"])
            if image_payload.get("image_url"):
                params.setdefault("image_url", image_payload["image_url"])
            params.setdefault("mime_type", image_payload["mime_type"])
        list_all = slots.get("listAll") or slots.get("list_all")
        if list_all:
            params["list_all"] = True
            params.setdefault("limit", 20)
        elif not str(params.get("query") or "").strip():
            params["query"] = (
                _first_slot(slots, "query", "productName", "requestedProduct", "product_name", "product", "sku")
                or ctx.message
            )
    elif tool_name == "inventory_check":
        if (ctx.external_memory_context or {}).get(DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL):
            params["use_vector"] = False
        product_name = _first_slot(slots, "productName", "product_name", "product", "sku", "query")
        has_previous_product_context = _has_previous_product_context(ctx)
        params.setdefault("product_name_or_sku", product_name or ("" if has_previous_product_context else ctx.message))
        size = _first_slot(slots, "size", "productSize", "product_size")
        color = _first_slot(slots, "color", "productColor", "product_color")
        if size:
            params.setdefault("product_size", size)
        if color:
            params.setdefault("product_color", color)
        params.setdefault("conversation_id", ctx.conversation_id or ctx.thread_id)
        if has_previous_product_context and not product_name:
            params.setdefault("references_previous_product", True)
    elif tool_name == "shipping_rates":
        params.setdefault(
            "governorate",
            _first_slot(slots, "governorate", "city", "area", "location") or ctx.message,
        )
    elif tool_name == "knowledge_search":
        if not str(params.get("query") or "").strip():
            params["query"] = _first_slot(slots, "query", "productName", "product") or ctx.message
    elif tool_name == "order_lookup":
        order_number = _first_slot(slots, "orderNumber", "order_number")
        if order_number:
            params.setdefault("order_number", order_number)
    elif tool_name == "customer_info":
        params.setdefault(
            "query",
            _first_slot(slots, "customerName", "customer_name", "phone", "email", "query")
            or ctx.message,
        )
    elif tool_name == "order_cancel":
        order_number = _first_slot(slots, "orderNumber", "order_number")
        if order_number:
            params.setdefault("order_number", order_number)
        reason = _first_slot(slots, "cancelReason", "reason")
        if reason:
            params.setdefault("reason", reason)
    elif tool_name == "order_refund":
        order_number = _first_slot(slots, "orderNumber", "order_number")
        if order_number:
            params.setdefault("order_number", order_number)
        reason = _first_slot(slots, "refundReason", "reason")
        if reason:
            params.setdefault("reason", reason)
    elif tool_name in {"order_create_draft", "order_create_confirmed"}:
        mapping = {
            "customer_name": ("customerName", "customer_name", "name"),
            "customer_phone": ("customerPhone", "customer_phone", "phone"),
            "product_name": ("productName", "product_name", "product"),
            "product_price": ("productPrice", "product_price", "price"),
            "product_size": ("productSize", "product_size", "size"),
            "product_color": ("productColor", "product_color", "color"),
            "quantity": ("quantity",),
            "total": ("total", "orderTotal", "totalAmount", "order_total", "total_amount", "productPrice", "product_price", "price"),
            "shipping_amount": ("shippingAmount", "shipping_amount", "shippingCost", "shipping_cost"),
            "address": ("address",),
            "city": ("city", "governorate"),
        }
        for param_name, slot_names in mapping.items():
            value = _first_slot(slots, *slot_names)
            if value:
                params.setdefault(param_name, value)
        _setdefault_non_empty(
            params,
            "product_name",
            _first_memory_value(
                ctx,
                ("productName",),
                ("product_name",),
                ("product_name_or_sku",),
                ("productNameOrSku",),
                ("name",),
                ("product", "name"),
                ("sku",),
                ("product", "sku"),
                ("productId",),
                ("id",),
            ),
        )
        _setdefault_non_empty(
            params,
            "product_price",
            _first_memory_value(
                ctx,
                ("productPrice",),
                ("product_price",),
                ("price", "amount"),
                ("price",),
                ("product", "price", "amount"),
                ("product", "price"),
            ),
        )
        _setdefault_non_empty(
            params,
            "product_size",
            _first_memory_value(
                ctx,
                ("productSize",),
                ("product_size",),
                ("requestedSize",),
                ("size",),
            ),
        )
        _setdefault_non_empty(
            params,
            "product_color",
            _first_memory_value(
                ctx,
                ("productColor",),
                ("product_color",),
                ("requestedColor",),
                ("color",),
            ),
        )
        _setdefault_non_empty(
            params,
            "city",
            _shipping_memory_value(ctx, ("city",), ("governorate",), ("destination",), ("area",)),
        )
        _setdefault_non_empty(
            params,
            "shipping_amount",
            _shipping_memory_value(
                ctx,
                ("shippingAmount",),
                ("shipping_amount",),
                ("shippingCost",),
                ("shipping_cost",),
                ("shipping", "amount"),
                ("shipping",),
                ("price", "amount"),
                ("rate", "amount"),
                ("data", "price"),
                ("data", "basePrice"),
                ("data", "shippingAmount"),
                ("data", "shippingCost"),
                ("amount",),
            ),
        )
        confirmed_by_customer = _first_slot_value(
            slots,
            "confirmedByCustomer",
            "confirmed_by_customer",
        )
        if confirmed_by_customer is not None:
            params.setdefault("confirmed_by_customer", _coerce_bool(confirmed_by_customer))

    elif tool_name == "booking_reserve":
        params.setdefault("request", ctx.message)

    execution["params"] = params


def _scope_tools(ctx: PipelineContext) -> None:
    """JIT tool scoping: filter ``ctx.native_tools`` to the allowed list
    and remove any blocked tools based on the relevance plan.

    If ``ctx.relevance_plan`` is None, all tools pass through.
    """
    plan = ctx.relevance_plan
    if plan is None:
        return

    allowed = canonical_tool_set(getattr(plan, "allowedTools", []) or [])
    blocked = canonical_tool_set(getattr(plan, "blockedTools", []) or [])

    if not allowed and not blocked:
        return

    def _name(tool: dict) -> str:
        return tool.get("name") if isinstance(tool, dict) else getattr(tool, "name", "")

    scoped: list = []
    for tool in ctx.native_tools:
        n = _name(tool)
        canonical = canonical_tool_name(n)
        if canonical in blocked:
            continue
        if allowed and canonical not in allowed:
            continue
        scoped.append(tool)
    ctx.native_tools = scoped


async def route_to_tools(ctx: PipelineContext) -> PipelineContext:
    relevance_plan = ctx.relevance_plan
    if not relevance_plan:
        return ctx

    # JIT scope native tools based on allowedTools / blockedTools
    _scope_tools(ctx)

    # Build execution plan only from the model-classified contract. Customer,
    # merchant, and admin chat channels share the same routing rule to avoid
    # keyword/regex fallbacks for intent selection.
    action_exec = (
        get_model_classified_write_tool_execution(relevance_plan, ctx.native_tools)
        or get_model_classified_handoff_execution(relevance_plan, ctx.message, ctx.native_tools)
    )
    read_exec = None if action_exec else get_model_classified_read_tool_execution(
        relevance_plan,
        ctx.native_tools,
    )
    read_exec = _prefer_product_search_for_image_query(ctx, read_exec)

    ctx.execution_plan = {
        "deterministicReadExecution": read_exec,
        "deterministicActionExecution": action_exec,
        "plannedExecutions": [],  # Complex goals not yet implemented in Python
    }
    _populate_tool_params(ctx, ctx.execution_plan["deterministicReadExecution"])
    _populate_tool_params(ctx, ctx.execution_plan["deterministicActionExecution"])

    # Build LLM messages with profile, working memory, DB history, RAG, and
    # episodic memories. This keeps customer chat on the Python runtime context
    # assembler instead of the Node sandbox prompt path.
    ctx.messages = await ContextAssembler().assemble_messages(ctx)

    return ctx
