from __future__ import annotations

import asyncio
import inspect
import json
from typing import Any

from agent_framework import Message

from src.pipeline.context import DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL, PipelineContext
from src.pipeline.llm_messages import to_client_messages
from src.pipeline.provider_errors import provider_error_result
from src.skills.integration import resolve_skill_context
from src.tools.gateway import ToolGateway
from src.tools.names import canonical_tool_name


def _agent_role(ctx: PipelineContext) -> str | None:
    return str(getattr(ctx.agent, "role", "") or getattr(ctx.agent, "name", "") or "") or None


def _allowed_tools(ctx: PipelineContext) -> list[str] | None:
    if ctx.relevance_plan and getattr(ctx.relevance_plan, "allowedTools", None):
        return list(ctx.relevance_plan.allowedTools)
    if ctx.agent and hasattr(ctx.agent, "get_tools"):
        return list(ctx.agent.get_tools() or [])
    return None


async def _tool_reply_client(ctx: PipelineContext):
    """Prefer the selected agent client for replies after tool execution.

    Image turns may use a temporary vision client for classification. Once tools
    have returned structured evidence, reply synthesis should go back to the
    explicitly selected model/key instead of continuing on the vision fallback.
    """
    agent = ctx.agent
    agent_client = getattr(agent, "client", None) if agent else None
    if agent_client is not None:
        return agent_client

    ensure_client = getattr(agent, "ensure_client", None) if agent else None
    if callable(ensure_client) and inspect.iscoroutinefunction(ensure_client):
        return await ensure_client()

    return getattr(ctx, "llm_client", None) or agent_client


def _append_tool_result(ctx: PipelineContext, planned: dict, result: dict) -> None:
    tool_name = planned["tool"]
    ctx.tool_context += (
        f"Tool result for {tool_name}:\n"
        f"{json.dumps(result, ensure_ascii=False, default=str)}\n\n"
    )
    evidence = {
        "tool": tool_name,
        "params": dict(planned.get("params") or {}),
        "status": result.get("status"),
        "success": result.get("status") == "success",
        "result": result.get("result", result),
        **{k: v for k, v in result.items() if k not in {"result"}},
    }
    ctx.executed_tools.append(evidence)
    ctx.tool_evidence.append(evidence)


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return value != 0
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


def _classification_slots(ctx: PipelineContext) -> dict[str, Any]:
    slots: dict[str, Any] = {}
    plan = getattr(ctx, "relevance_plan", None)
    if not plan:
        return slots
    classification = getattr(plan, "classification", None)
    if isinstance(classification, dict) and isinstance(classification.get("slots"), dict):
        slots.update(classification["slots"])
    elif hasattr(classification, "slots") and isinstance(getattr(classification, "slots", None), dict):
        slots.update(getattr(classification, "slots"))
    plan_slots = getattr(plan, "slots", None)
    if isinstance(plan_slots, dict):
        slots.update(plan_slots)
    return slots


def _customer_requested_product_image(ctx: PipelineContext) -> bool:
    slots = _classification_slots(ctx)
    return _truthy(slots.get("requestedProductImage")) or _truthy(slots.get("requested_product_image"))


def _image_urls_from_value(value: Any) -> list[str]:
    urls: list[str] = []
    if isinstance(value, str):
        text = value.strip()
        if text.lower().startswith(("http://", "https://")):
            urls.append(text)
    elif isinstance(value, dict):
        for key in ("mainImage", "main_image", "imageUrl", "image_url", "mediaUrl", "media_url", "url"):
            item = value.get(key)
            if isinstance(item, str) and item.strip().lower().startswith(("http://", "https://")):
                urls.append(item.strip())
        images = value.get("images")
        if isinstance(images, list):
            for image in images:
                urls.extend(_image_urls_from_value(image))
        products = value.get("products")
        if isinstance(products, list):
            for product in products:
                urls.extend(_image_urls_from_value(product))
        result = value.get("result")
        if isinstance(result, (dict, list)):
            urls.extend(_image_urls_from_value(result))
    elif isinstance(value, list):
        for item in value:
            if isinstance(item, str) and item.strip().lower().startswith(("http://", "https://")):
                urls.append(item.strip())
            elif isinstance(item, (dict, list)):
                urls.extend(_image_urls_from_value(item))
    seen: set[str] = set()
    unique: list[str] = []
    for url in urls:
        if url in seen:
            continue
        seen.add(url)
        unique.append(url)
    return unique


def _collect_response_attachments(ctx: PipelineContext) -> None:
    if not _customer_requested_product_image(ctx):
        return
    existing_urls = {
        item.get("url")
        for item in getattr(ctx, "response_attachments", [])
        if isinstance(item, dict) and item.get("url")
    }
    for evidence in ctx.tool_evidence:
        tool_name = str(evidence.get("tool") or "")
        for url in _image_urls_from_value(evidence):
            if url in existing_urls:
                continue
            ctx.response_attachments.append({
                "type": "image",
                "url": url,
                "source": "tool_result",
                "tool": tool_name,
            })
            existing_urls.add(url)
            if len(ctx.response_attachments) >= 3:
                return


def _first_number(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        text = value.strip().replace(",", "")
        if not text:
            return None
        try:
            return float(text)
        except ValueError:
            return None
    return None


def _json_object_from_text(text: str) -> dict[str, Any] | None:
    if not text:
        return None
    stripped = text.strip()
    try:
        parsed = json.loads(stripped)
        return parsed if isinstance(parsed, dict) else None
    except (json.JSONDecodeError, TypeError, ValueError):
        pass
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start >= 0 and end > start:
        try:
            parsed = json.loads(stripped[start : end + 1])
            return parsed if isinstance(parsed, dict) else None
        except (json.JSONDecodeError, TypeError, ValueError):
            return None
    return None


def _json_like_response(text: str) -> bool:
    if not text:
        return False
    candidates = [text.strip()]
    index = 0
    while index < len(candidates):
        candidate = candidates[index]
        index += 1
        if not candidate:
            continue
        try:
            parsed = json.loads(candidate)
        except (json.JSONDecodeError, TypeError, ValueError):
            parsed = None
        if isinstance(parsed, (dict, list)):
            return True
        if isinstance(parsed, str) and parsed.strip() and parsed.strip() not in candidates:
            candidates.append(parsed.strip())

        start = candidate.find("{")
        end = candidate.rfind("}")
        if start >= 0 and end > start:
            object_candidate = candidate[start : end + 1].replace('\\"', '"')
            try:
                parsed = json.loads(object_candidate)
            except (json.JSONDecodeError, TypeError, ValueError):
                parsed = None
            if isinstance(parsed, dict):
                return True

        list_start = candidate.find("[")
        list_end = candidate.rfind("]")
        if list_start >= 0 and list_end > list_start:
            list_candidate = candidate[list_start : list_end + 1].replace('\\"', '"')
            try:
                parsed = json.loads(list_candidate)
            except (json.JSONDecodeError, TypeError, ValueError):
                parsed = None
            if isinstance(parsed, list):
                return True

    return False


def _looks_like_tool_syntax(text: str) -> bool:
    if not text or not text.strip():
        return False
    if _json_like_response(text):
        return True
    lowered = text.strip().lower()
    if lowered.startswith(("we need to ", "need to ", "i need to ")):
        return True
    parsed = _json_object_from_text(text)
    if not parsed:
        return False
    toolish_keys = {
        "query",
        "filters",
        "tool",
        "toolName",
        "tool_name",
        "arguments",
        "parameters",
        "productName",
        "product_name",
    }
    return bool(toolish_keys.intersection(parsed.keys()))


def _extract_price(value: Any) -> float | None:
    price_keys = (
        "productPrice",
        "product_price",
        "price",
        "amount",
        "basePrice",
        "salePrice",
        "unitPrice",
        "merchantPrice",
    )
    if isinstance(value, dict):
        for key in price_keys:
            price = _first_number(value.get(key))
            if price is not None:
                return price
        for nested in value.values():
            price = _extract_price(nested)
            if price is not None:
                return price
    elif isinstance(value, list):
        for item in value:
            price = _extract_price(item)
            if price is not None:
                return price
    return None


async def _enrich_order_action_params(
    gateway: ToolGateway,
    ctx: PipelineContext,
    planned: dict,
    *,
    agent_role: str | None,
    allowed_tools: list[str] | None,
) -> None:
    tool_name = canonical_tool_name(planned.get("nativeName") or planned.get("tool") or "")
    if tool_name not in {"order_create_draft", "order_create_confirmed"}:
        return

    params = planned.setdefault("params", {})
    if _first_number(params.get("product_price")) is not None:
        return

    product_name = str(params.get("product_name") or "").strip()
    if not product_name:
        return

    lookup_params = {
        "product_name_or_sku": product_name,
        "conversation_id": ctx.conversation_id or ctx.thread_id,
    }
    if (ctx.external_memory_context or {}).get(DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL):
        lookup_params["use_vector"] = False
    if params.get("product_size"):
        lookup_params["product_size"] = params["product_size"]
    if params.get("product_color"):
        lookup_params["product_color"] = params["product_color"]

    lookup_plan = {
        "tool": "inventory.check",
        "nativeName": "inventory.check",
        "params": lookup_params,
    }
    lookup_result = await gateway.execute(
        tool_name="inventory.check",
        company_id=ctx.company_id,
        agent_role=agent_role,
        allowed_tools=allowed_tools,
        input_data=lookup_params,
    )
    _append_tool_result(ctx, lookup_plan, lookup_result)

    price = _extract_price(lookup_result)
    if price is not None:
        params["product_price"] = price


def _approval_action_args(function_call) -> dict:
    arguments = getattr(function_call, "arguments", None)
    if isinstance(arguments, dict):
        return dict(arguments)
    if isinstance(arguments, str) and arguments:
        try:
            parsed = json.loads(arguments)
            return parsed if isinstance(parsed, dict) else {}
        except (json.JSONDecodeError, TypeError, ValueError):
            return {}
    return {}


def _append_sdk_approval_requests(ctx: PipelineContext) -> None:
    requests = getattr(ctx.llm_result, "user_input_requests", None) or []
    existing_call_ids = {
        item.get("sdk_approval_id")
        for item in ctx.executed_tools
        if isinstance(item, dict) and item.get("sdk_approval_id")
    }
    for request in requests:
        if getattr(request, "type", None) != "function_approval_request":
            continue
        function_call = getattr(request, "function_call", None)
        if function_call is None:
            continue
        approval_id = getattr(request, "id", None) or getattr(function_call, "call_id", None)
        if approval_id in existing_call_ids:
            continue
        action_type = getattr(function_call, "name", None)
        if not action_type:
            continue
        evidence = {
            "tool": action_type,
            "status": "awaiting_approval",
            "success": False,
            "action_type": action_type,
            "action_args": _approval_action_args(function_call),
            "company_id": ctx.company_id,
            "sdk_approval_id": approval_id,
        }
        ctx.executed_tools.append(evidence)
        ctx.tool_evidence.append(evidence)
        existing_call_ids.add(approval_id)


async def _execute_planned_tool(
    gateway: ToolGateway,
    ctx: PipelineContext,
    planned: dict,
    *,
    agent_role: str | None,
    allowed_tools: list[str] | None,
) -> tuple[dict, dict]:
    # Build skill_context with current tool_call_index for max_tool_count enforcement
    skill_ctx = None
    if ctx.active_skill_context:
        skill_ctx = dict(ctx.active_skill_context)
        skill_ctx["tool_call_index"] = ctx.tool_call_index

    result = await gateway.execute(
        tool_name=planned["nativeName"],
        company_id=ctx.company_id,
        agent_role=agent_role,
        allowed_tools=allowed_tools,
        input_data=planned.get("params") or {},
        skill_context=skill_ctx,
    )
    return planned, result


async def execute_tools(ctx: PipelineContext) -> PipelineContext:
    _append_sdk_approval_requests(ctx)
    if not ctx.execution_plan:
        return ctx

    gateway = ToolGateway()
    agent_role = _agent_role(ctx)
    allowed_tools = _allowed_tools(ctx)

    planned_tools = [
        planned
        for planned in (
            ctx.execution_plan.get("deterministicReadExecution"),
            ctx.execution_plan.get("deterministicActionExecution"),
            *(ctx.execution_plan.get("plannedExecutions") or []),
        )
        if planned
    ]

    # Resolve skill context for max_tool_count and requires_human_approval enforcement
    ctx.tool_call_index = 0
    if planned_tools and ctx.agent and hasattr(ctx.agent, "allowed_skills") and ctx.agent.allowed_skills:
        planned_names = {
            planned.get("nativeName") or planned.get("tool") or ""
            for planned in planned_tools
        }
        planned_names = {n for n in planned_names if n}
        ctx.active_skill_context = resolve_skill_context(
            planned_names,
            set(ctx.agent.allowed_skills),
        )

    for planned in planned_tools:
        await _enrich_order_action_params(
            gateway,
            ctx,
            planned,
            agent_role=agent_role,
            allowed_tools=allowed_tools,
        )
    if planned_tools:
        results = await asyncio.gather(*[
            _execute_planned_tool(
                gateway,
                ctx,
                planned,
                agent_role=agent_role,
                allowed_tools=allowed_tools,
            )
            for planned in planned_tools
        ])
        for planned, result in results:
            ctx.tool_call_index += 1
            _append_tool_result(ctx, planned, result)
        _collect_response_attachments(ctx)

    # Call LLM to generate a response only when tool evidence exists. If the
    # model-classified plan required a tool but none executed, handle_fallback
    # will generate a safe clarification without letting the model invent facts
    # or emit provider-level tool-call syntax.
    if not ctx.tool_context:
        return ctx

    # Call the selected agent client to generate the response from tool results.
    # If an image turn used a temporary vision client, do not keep using it for
    # final reply synthesis after tools have supplied structured evidence.
    try:
        client = await _tool_reply_client(ctx)
    except Exception as exc:
        ctx.early_return = {
            "status": "PROVIDER_ERROR",
            "result": provider_error_result(exc),
        }
        return ctx
    if client:
        messages = to_client_messages(ctx.messages)
        if ctx.tool_context:
            tool_result_message = Message(
                role="user",
                contents=[
                    "[Tool Results]\n"
                    f"{ctx.tool_context}"
                    "[/Tool Results]\n\n"
                    "Generate the customer-facing reply from these structured results. "
                    "Do not invent data that is not present. "
                    "If the customer asked for a product photo and the tool results include image URL fields such as images or mainImage, "
                    "include the best image URL in the reply, preferably as a Markdown image like ![product image](url) when the channel can render it; "
                    "do not say images cannot be sent when an image URL is present. "
                    "If the latest customer message did not ask for a product photo, do not include image URLs or Markdown images even if tool results contain image fields. "
                    "If any tool result status is awaiting_approval, explain naturally that the requested action is pending review or approval, "
                    "summarize only the structured action arguments, and do not ask for extra optional details unless the result explicitly contains missingFields or NEEDS_MORE_INFO. "
                    "Never expose raw JSON, tool names, internal status codes, or field keys to the customer."
                ]
            )
            messages.append(tool_result_message)

        try:
            response = await client.get_response(
                messages,
                options={"tools_enabled": False, "max_tokens": 700, "temperature": 0.3},
            )
            raw_text = response.text if hasattr(response, "text") else str(response)
            if _looks_like_tool_syntax(raw_text):
                retry_messages = [
                    Message(
                        role="system",
                        contents=[
                            "You write final customer-facing chat replies. Return plain text only. "
                            "No JSON, no tool calls, no function calls, no internal reasoning. "
                            "Use the customer's language and summarize only the provided tool results. "
                            "If product image URL fields are present and the customer asked for a photo, include the image URL or a Markdown image."
                        ],
                    ),
                    Message(role="user", contents=[ctx.message]),
                    tool_result_message,
                ]
                retry = await client.get_response(
                    retry_messages,
                    options={"tools_enabled": False, "max_tokens": 700, "temperature": 0.2},
                )
                raw_text = retry.text if hasattr(retry, "text") else str(retry)
            ctx.llm_response = raw_text
            ctx.llm_result = response
            _append_sdk_approval_requests(ctx)
        except Exception as exc:
            ctx.early_return = {
                "status": "PROVIDER_ERROR",
                "result": provider_error_result(exc),
            }

    return ctx
