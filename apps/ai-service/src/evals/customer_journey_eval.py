from __future__ import annotations

import json
from typing import Any

from src.tools.names import canonical_tool_name


EXPECTED_ORDER_JOURNEY_TOOLS = (
    "product_search",
    "inventory_check",
    "shipping_rates",
    "order_create_confirmed",
)

VECTOR_POLICY_TOOLS = {"product_search", "inventory_check"}


def _nested_dict(value: Any, *keys: str) -> dict[str, Any]:
    current = value
    for key in keys:
        if not isinstance(current, dict):
            return {}
        current = current.get(key)
    return current if isinstance(current, dict) else {}


def _candidate_tool_lists(turn: dict[str, Any]) -> list[tuple[str, Any]]:
    result = _nested_dict(turn, "result")
    trace = _nested_dict(turn, "pipeline_trace")
    result_trace = _nested_dict(result, "pipeline_trace")
    return [
        ("turn.tool_calls", turn.get("tool_calls")),
        ("turn.tools", turn.get("tools")),
        ("turn.executed_tools", turn.get("executed_tools")),
        ("result.tool_calls", result.get("tool_calls")),
        ("result.tools", result.get("tools")),
        ("result.executed_tools", result.get("executed_tools")),
        ("pipeline_trace.toolExecutions", trace.get("toolExecutions")),
        ("result.pipeline_trace.toolExecutions", result_trace.get("toolExecutions")),
    ]


def _tool_name(item: dict[str, Any]) -> str:
    return canonical_tool_name(
        item.get("tool")
        or item.get("name")
        or item.get("tool_name")
        or item.get("toolName")
        or item.get("action_type")
        or ""
    )


def _tool_params(item: dict[str, Any]) -> dict[str, Any]:
    for key in ("params", "input_data", "inputData", "arguments", "action_args", "actionArgs"):
        value = item.get(key)
        if isinstance(value, dict):
            return dict(value)

    output = item.get("output")
    if isinstance(output, dict):
        for key in ("params", "arguments", "action_args", "actionArgs"):
            value = output.get(key)
            if isinstance(value, dict):
                return dict(value)

    return {}


def _collect_tool_entries(turns: list[dict[str, Any]]) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()

    for turn_index, turn in enumerate(turns):
        if not isinstance(turn, dict):
            continue
        for source, candidate in _candidate_tool_lists(turn):
            if not isinstance(candidate, list):
                continue
            for item_index, item in enumerate(candidate):
                if not isinstance(item, dict):
                    continue
                name = _tool_name(item)
                if not name:
                    continue
                params = _tool_params(item)
                dedupe_key = (
                    str(turn_index),
                    name,
                    json.dumps(
                        {
                            "status": item.get("status"),
                            "params": params,
                            "source": source,
                            "index": item_index,
                        },
                        sort_keys=True,
                        default=str,
                    ),
                )
                if dedupe_key in seen:
                    continue
                seen.add(dedupe_key)
                entries.append({
                    "turnIndex": turn_index,
                    "source": source,
                    "name": name,
                    "rawName": item.get("tool") or item.get("name") or item.get("action_type"),
                    "status": item.get("status"),
                    "success": item.get("success"),
                    "params": params,
                    "output": item.get("output") if isinstance(item.get("output"), dict) else {},
                    "raw": item,
                })

    return entries


def _contains_subsequence(actual: list[str], expected: tuple[str, ...]) -> bool:
    cursor = 0
    for name in actual:
        if cursor < len(expected) and name == expected[cursor]:
            cursor += 1
    return cursor == len(expected)


def _explicit_false(params: dict[str, Any], *keys: str) -> bool:
    for key in keys:
        if key not in params:
            continue
        value = params.get(key)
        if value is False:
            return True
        if isinstance(value, str) and value.strip().lower() in {"false", "0", "no"}:
            return True
        return False
    return False


def _non_empty(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    return True


def _field_value(params: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in params and _non_empty(params[key]):
            return params[key]
    return None


def _tool_args(entry: dict[str, Any]) -> dict[str, Any]:
    raw = entry.get("raw") if isinstance(entry.get("raw"), dict) else {}
    for candidate in (
        raw.get("action_args"),
        raw.get("actionArgs"),
        raw.get("arguments"),
        raw.get("params"),
        entry.get("params"),
        _nested_dict(raw, "output", "action_args"),
        _nested_dict(raw, "output", "actionArgs"),
        _nested_dict(raw, "output", "arguments"),
    ):
        if isinstance(candidate, dict) and candidate:
            return dict(candidate)
    return {}


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value or "").strip().lower() in {"1", "true", "yes", "confirmed", "confirm"}


def _looks_like_raw_tool_syntax(text: str) -> bool:
    stripped = str(text or "").strip()
    if not stripped:
        return False
    lowered = stripped.lower()
    if lowered.startswith(("we need to ", "need to ", "i need to ")):
        return True
    json_candidates = [stripped]
    index = 0
    while index < len(json_candidates):
        candidate = json_candidates[index]
        index += 1
        try:
            parsed_candidate = json.loads(candidate)
        except (json.JSONDecodeError, TypeError, ValueError):
            parsed_candidate = None
        if isinstance(parsed_candidate, (dict, list)):
            return True
        if isinstance(parsed_candidate, str) and parsed_candidate.strip() and parsed_candidate.strip() not in json_candidates:
            json_candidates.append(parsed_candidate.strip())
    try:
        parsed = json.loads(stripped)
    except (json.JSONDecodeError, TypeError, ValueError):
        return False
    if not isinstance(parsed, dict):
        return False
    return bool({"tool", "toolName", "tool_name", "arguments", "params", "query"} & set(parsed))


def _final_replies(turns: list[dict[str, Any]]) -> list[str]:
    replies: list[str] = []
    for turn in turns:
        if not isinstance(turn, dict):
            continue
        for value in (
            turn.get("reply"),
            turn.get("finalReply"),
            _nested_dict(turn, "result").get("reply"),
            _nested_dict(turn, "result").get("summary"),
        ):
            if isinstance(value, str) and value.strip():
                replies.append(value)
    return replies


def _model_selections(turns: list[dict[str, Any]]) -> list[dict[str, Any]]:
    selections: list[dict[str, Any]] = []
    for turn in turns:
        if not isinstance(turn, dict):
            continue
        for candidate in (
            turn.get("model_selection"),
            _nested_dict(turn, "modelSelection"),
            _nested_dict(turn, "pipeline_trace", "modelSelection"),
            _nested_dict(turn, "result", "pipeline_trace", "modelSelection"),
        ):
            if isinstance(candidate, dict) and candidate:
                selections.append(candidate)
    return selections


def _vector_policy_check(entries: list[dict[str, Any]]) -> dict[str, Any]:
    details: dict[str, Any] = {}
    for tool_name in sorted(VECTOR_POLICY_TOOLS):
        tool_entries = [entry for entry in entries if entry["name"] == tool_name]
        param_entries = [entry for entry in tool_entries if entry.get("params")]
        missing = [
            {
                "turnIndex": entry["turnIndex"],
                "source": entry["source"],
                "params": entry.get("params") or {},
            }
            for entry in param_entries
            if not _explicit_false(entry.get("params") or {}, "use_vector", "useVector")
        ]
        details[tool_name] = {
            "executed": bool(tool_entries),
            "paramEntries": len(param_entries),
            "passed": bool(param_entries) and not missing,
            "missingExplicitFalse": missing,
        }

    return {
        "passed": all(item["passed"] for item in details.values()),
        "details": details,
    }


def _order_execution_check(entries: list[dict[str, Any]]) -> dict[str, Any]:
    order_entries = [entry for entry in entries if entry["name"] == "order_create_confirmed"]
    executed_entries: list[dict[str, Any]] = []
    for entry in order_entries:
        status = str(entry.get("status") or "").lower()
        output_status = str((entry.get("output") or {}).get("status") or "").lower()
        raw = entry.get("raw") or {}
        result = raw.get("result") if isinstance(raw, dict) else None
        result_status = str((result or {}).get("status") or "").lower() if isinstance(result, dict) else ""
        result_action = str((result or {}).get("action") or "").upper() if isinstance(result, dict) else ""
        raw_action = str(raw.get("action") or "").upper() if isinstance(raw, dict) else ""
        if (
            status == "success"
            or output_status in {"executed", "order_created"}
            or result_status == "executed"
            or result_action == "ORDER_CREATED"
            or raw_action == "ORDER_CREATED"
        ):
            executed_entries.append(entry)

    required_fields = {
        "customer_name": ("customer_name", "customerName"),
        "customer_phone": ("customer_phone", "customerPhone"),
        "product_name": ("product_name", "productName"),
        "product_price": ("product_price", "productPrice"),
        "product_size": ("product_size", "productSize"),
        "product_color": ("product_color", "productColor"),
        "quantity": ("quantity",),
        "address": ("address",),
        "city": ("city", "governorate"),
    }
    best_args: dict[str, Any] = {}
    missing: list[str] = list(required_fields)
    confirmed = False

    for entry in order_entries:
        args = _tool_args(entry)
        if not args:
            continue
        current_missing = [
            field for field, aliases in required_fields.items()
            if _field_value(args, *aliases) is None
        ]
        current_confirmed = _truthy(_field_value(args, "confirmed_by_customer", "confirmedByCustomer"))
        if not best_args or len(current_missing) < len(missing):
            best_args = args
            missing = current_missing
            confirmed = current_confirmed
        if not current_missing and current_confirmed:
            best_args = args
            missing = []
            confirmed = True
            break

    return {
        "passed": bool(executed_entries) and not missing and confirmed,
        "executed": bool(executed_entries),
        "missingFields": missing,
        "confirmedByCustomer": confirmed,
        "args": best_args,
    }


def _provider_policy_check(
    turns: list[dict[str, Any]],
    *,
    expected_provider: str | None,
    expected_key_id: str | None,
) -> dict[str, Any]:
    selections = _model_selections(turns)
    providers = [
        str(item.get("provider") or "").upper()
        for item in selections
        if item.get("provider")
    ]
    key_ids = [
        str(item.get("keyId") or item.get("key_id") or "")
        for item in selections
        if item.get("keyId") or item.get("key_id")
    ]

    provider_passed = True
    if expected_provider:
        expected = expected_provider.upper()
        provider_passed = bool(providers) and all(provider == expected for provider in providers)

    key_passed = True
    if expected_key_id:
        key_passed = bool(key_ids) and all(key_id == expected_key_id for key_id in key_ids)

    return {
        "passed": provider_passed and key_passed,
        "providers": providers,
        "keyIds": key_ids,
        "expectedProvider": expected_provider,
        "expectedKeyId": expected_key_id,
    }


def evaluate_customer_order_journey(
    turns: list[dict[str, Any]],
    *,
    expected_provider: str | None = None,
    expected_key_id: str | None = None,
    expected_tools: tuple[str, ...] = EXPECTED_ORDER_JOURNEY_TOOLS,
) -> dict[str, Any]:
    entries = _collect_tool_entries(turns)
    sequence = [entry["name"] for entry in entries]
    unique_sequence = list(dict.fromkeys(sequence))
    replies = _final_replies(turns)

    order_execution = _order_execution_check(entries)
    checks = {
        "toolSequence": {
            "expected": list(expected_tools),
            "actual": sequence,
            "uniqueActual": unique_sequence,
            "passed": _contains_subsequence(sequence, expected_tools),
        },
        "vectorPolicy": _vector_policy_check(entries),
        "orderExecution": order_execution,
        "orderApproval": order_execution,
        "providerPolicy": _provider_policy_check(
            turns,
            expected_provider=expected_provider,
            expected_key_id=expected_key_id,
        ),
        "finalReplies": {
            "count": len(replies),
            "rawToolSyntaxReplies": [
                reply for reply in replies
                if _looks_like_raw_tool_syntax(reply)
            ],
            "passed": bool(replies) and not any(_looks_like_raw_tool_syntax(reply) for reply in replies),
        },
    }
    failures = [
        name for name, check in checks.items()
        if name != "orderApproval"
        if isinstance(check, dict) and not check.get("passed")
    ]

    return {
        "passed": not failures,
        "failures": failures,
        "checks": checks,
        "toolEntries": entries,
    }


def summarize_customer_journey_eval(scored_cases: list[dict[str, Any]]) -> dict[str, Any]:
    passed = sum(1 for item in scored_cases if item.get("passed"))
    total = len(scored_cases)
    return {
        "summary": {
            "total": total,
            "passed": passed,
            "failed": total - passed,
            "score": passed / total if total else 0.0,
        },
        "cases": scored_cases,
    }
