from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any, Iterable

from src.intent.classifier import classify_intent
from src.intent.schema import ClassifierResult


GOLDEN_CASES_PATH = Path(__file__).resolve().parents[2] / "tests" / "evals" / "intent_golden_cases.json"


def load_intent_golden_cases(path: str | Path | None = None) -> list[dict[str, Any]]:
    cases_path = Path(path) if path else GOLDEN_CASES_PATH
    return json.loads(cases_path.read_text(encoding="utf-8"))


def _normalize_text(value: Any) -> str:
    return str(value or "").strip().lower()


def _slot_matches(expected: Any, actual: Any) -> bool:
    if expected is None:
        return True
    if isinstance(expected, bool):
        return bool(actual) is expected
    if isinstance(expected, (int, float)):
        try:
            return float(actual) == float(expected)
        except (TypeError, ValueError):
            return False

    expected_text = _normalize_text(expected)
    actual_text = _normalize_text(actual)
    if not expected_text:
        return True
    return expected_text == actual_text or expected_text in actual_text or actual_text in expected_text


def _expected_slot_values(case: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in (case.get("classifier", {}).get("slots") or {}).items()
        if value is not None
    }


def _expected_tool_eligibility(case: dict[str, Any]) -> str | None:
    value = case.get("classifier", {}).get("toolEligibility")
    return str(value) if value else None


def _select_cases(
    cases: list[dict[str, Any]],
    *,
    case_ids: Iterable[str] | None = None,
    max_cases: int | None = None,
) -> list[dict[str, Any]]:
    selected = cases
    if case_ids:
        allowed_ids = {str(case_id) for case_id in case_ids}
        selected = [case for case in selected if str(case.get("id")) in allowed_ids]

    if max_cases is not None and max_cases >= 0:
        selected = selected[:max_cases]

    return selected


def evaluate_classifier_result(case: dict[str, Any], result: ClassifierResult | None) -> dict[str, Any]:
    if result is None:
        return {
            "id": case.get("id"),
            "passed": False,
            "error": "CLASSIFIER_UNAVAILABLE",
            "checks": {},
        }

    expected_intent = case.get("expected_intent")
    expected_slots = _expected_slot_values(case)
    slot_results = {
        key: {
            "expected": expected,
            "actual": result.slots.get(key),
            "passed": _slot_matches(expected, result.slots.get(key)),
        }
        for key, expected in expected_slots.items()
    }
    slots_passed = all(item["passed"] for item in slot_results.values())

    expected_tool_eligibility = _expected_tool_eligibility(case)
    eligibility_passed = (
        expected_tool_eligibility is None
        or result.toolEligibility == expected_tool_eligibility
        or (
            case.get("expected_execution") == "read"
            and result.toolEligibility in {"allowed", "needs_clarification"}
        )
    )

    checks = {
        "intent": {
            "expected": expected_intent,
            "actual": result.intent,
            "passed": result.intent == expected_intent,
        },
        "toolEligibility": {
            "expected": expected_tool_eligibility,
            "actual": result.toolEligibility,
            "passed": eligibility_passed,
        },
        "slots": {
            "expected": expected_slots,
            "actual": result.slots,
            "details": slot_results,
            "passed": slots_passed,
        },
    }

    return {
        "id": case.get("id"),
        "message": case.get("message"),
        "passed": all(check["passed"] for check in checks.values()),
        "intent": result.intent,
        "confidence": result.confidence,
        "confidenceLevel": result.confidenceLevel,
        "toolEligibility": result.toolEligibility,
        "missingSlots": result.missingSlots,
        "checks": checks,
    }


async def run_live_intent_eval_cases(
    cases: list[dict[str, Any]],
    *,
    company_id: str,
    provider: str | None = None,
    model: str | None = None,
    case_ids: Iterable[str] | None = None,
    max_cases: int | None = None,
    delay_seconds: float = 0.0,
) -> dict[str, Any]:
    scored_cases: list[dict[str, Any]] = []
    case_id_list = [str(case_id) for case_id in case_ids] if case_ids else None
    selected_cases = _select_cases(cases, case_ids=case_id_list, max_cases=max_cases)
    for index, case in enumerate(selected_cases):
        if index and delay_seconds > 0:
            await asyncio.sleep(delay_seconds)

        result = await classify_intent(
            message=str(case.get("message") or ""),
            company_id=company_id,
            context={
                "availableTools": list(case.get("available_tools") or []),
                "channel": case.get("channel", "facebook"),
                "preferredProvider": provider,
                "preferredModel": model,
            },
        )
        scored_cases.append(evaluate_classifier_result(case, result))

    passed = sum(1 for item in scored_cases if item.get("passed"))
    total = len(scored_cases)
    return {
        "metadata": {
            "companyId": company_id,
            "provider": provider,
            "model": model,
            "caseIds": case_id_list,
            "maxCases": max_cases,
            "delaySeconds": delay_seconds,
        },
        "summary": {
            "total": total,
            "passed": passed,
            "failed": total - passed,
            "score": passed / total if total else 0.0,
        },
        "cases": scored_cases,
    }


def write_live_intent_eval_report(report: dict[str, Any], output_path: str | Path) -> None:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
