from __future__ import annotations

from typing import Any


def _params_match(expected: dict[str, Any], actual: dict[str, Any]) -> dict[str, Any]:
    details = {
        key: {
            "expected": expected_value,
            "actual": actual.get(key),
            "passed": str(actual.get(key)) == str(expected_value),
        }
        for key, expected_value in expected.items()
    }
    return {
        "expected": expected,
        "actual": actual,
        "details": details,
        "passed": all(item["passed"] for item in details.values()),
    }


def evaluate_tool_execution_result(
    case: dict[str, Any],
    execution: dict[str, Any],
) -> dict[str, Any]:
    expected_tool = case.get("expected_primary_tool")
    expected_params = dict(case.get("expected_params") or {})
    actual_tool = execution.get("tool")
    actual_params = dict(execution.get("params") or {})
    tool_result = execution.get("toolResult")
    llm_prompt = str(execution.get("llmPrompt") or "")
    final_reply = str(execution.get("finalReply") or "")

    checks = {
        "tool": {
            "expected": expected_tool,
            "actual": actual_tool,
            "passed": actual_tool == expected_tool,
        },
        "params": _params_match(expected_params, actual_params),
        "structuredToolResult": {
            "passed": isinstance(tool_result, dict)
            and bool(tool_result)
            and tool_result.get("status") in {"success", "awaiting_approval"},
        },
        "llmPrompt": {
            "passed": "[Tool Results]" in llm_prompt
            and "[/Tool Results]" in llm_prompt
            and "Generate the customer-facing reply from these structured results" in llm_prompt,
        },
        "finalReply": {
            "passed": bool(final_reply.strip()),
        },
    }

    return {
        "id": case.get("id"),
        "passed": all(check["passed"] for check in checks.values()),
        "tool": actual_tool,
        "params": actual_params,
        "checks": checks,
    }


def summarize_tool_execution_eval(scored_cases: list[dict[str, Any]]) -> dict[str, Any]:
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
