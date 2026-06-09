from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

from src.evals.intent_live_eval import (
    evaluate_classifier_result,
    load_intent_golden_cases,
    run_live_intent_eval_cases,
    write_live_intent_eval_report,
)
from src.intent.schema import ClassifierResult


def test_live_eval_scores_intent_eligibility_and_slots():
    case = {
        "id": "inventory_color_read_executes",
        "expected_intent": "inventory",
        "expected_execution": "read",
        "classifier": {
            "slots": {"productName": "shoes", "productColor": "black"},
            "toolEligibility": "needs_clarification",
        },
    }
    result = ClassifierResult(
        intent="inventory",
        confidence=0.88,
        confidenceLevel="high",
        slots={"productName": "black shoes", "productColor": "black"},
        missingSlots=["productSize"],
        toolEligibility="needs_clarification",
    )

    scored = evaluate_classifier_result(case, result)

    assert scored["passed"] is True
    assert scored["checks"]["intent"]["passed"] is True
    assert scored["checks"]["toolEligibility"]["passed"] is True
    assert scored["checks"]["slots"]["passed"] is True


def test_live_eval_report_writer_outputs_json(tmp_path):
    report = {
        "summary": {"total": 1, "passed": 1, "score": 1.0},
        "cases": [{"id": "case-1", "passed": True}],
    }
    output_path = tmp_path / "live-intent-report.json"

    write_live_intent_eval_report(report, output_path)

    assert json.loads(output_path.read_text()) == report


def test_load_intent_golden_cases_returns_cases():
    cases = load_intent_golden_cases()

    assert cases
    assert all(case["id"] for case in cases)


@pytest.mark.asyncio
async def test_live_eval_runner_passes_provider_and_model(monkeypatch):
    captured = {}

    async def fake_classifier(**kwargs):
        captured.update(kwargs)
        return ClassifierResult(intent="general.chat", confidence=0.8, slots={})

    monkeypatch.setattr("src.evals.intent_live_eval.classify_intent", fake_classifier)

    await run_live_intent_eval_cases(
        [{
            "id": "general_chat_no_tool",
            "message": "Thanks",
            "channel": "facebook",
            "available_tools": ["product_search"],
            "expected_intent": "general.chat",
            "expected_execution": "none",
            "classifier": {"slots": {}, "toolEligibility": "allowed"},
        }],
        company_id="comp1",
        provider="GROQ",
        model="openai/gpt-oss-120b",
    )

    assert captured["context"]["preferredProvider"] == "GROQ"
    assert captured["context"]["preferredModel"] == "openai/gpt-oss-120b"


@pytest.mark.asyncio
async def test_live_eval_runner_filters_cases_and_limits_count(monkeypatch):
    seen_messages = []

    async def fake_classifier(**kwargs):
        seen_messages.append(kwargs["message"])
        return ClassifierResult(intent="general.chat", confidence=0.8, slots={})

    monkeypatch.setattr("src.evals.intent_live_eval.classify_intent", fake_classifier)

    report = await run_live_intent_eval_cases(
        [
            {
                "id": "case-a",
                "message": "A",
                "expected_intent": "general.chat",
                "classifier": {"slots": {}, "toolEligibility": "allowed"},
            },
            {
                "id": "case-b",
                "message": "B",
                "expected_intent": "general.chat",
                "classifier": {"slots": {}, "toolEligibility": "allowed"},
            },
            {
                "id": "case-c",
                "message": "C",
                "expected_intent": "general.chat",
                "classifier": {"slots": {}, "toolEligibility": "allowed"},
            },
        ],
        company_id="comp1",
        case_ids=["case-b", "case-c"],
        max_cases=1,
    )

    assert seen_messages == ["B"]
    assert report["summary"]["total"] == 1
    assert [case["id"] for case in report["cases"]] == ["case-b"]


@pytest.mark.asyncio
async def test_live_eval_runner_includes_execution_metadata(monkeypatch):
    async def fake_classifier(**kwargs):
        return ClassifierResult(intent="general.chat", confidence=0.8, slots={})

    monkeypatch.setattr("src.evals.intent_live_eval.classify_intent", fake_classifier)

    report = await run_live_intent_eval_cases(
        [{
            "id": "general_chat_no_tool",
            "message": "Thanks",
            "expected_intent": "general.chat",
            "classifier": {"slots": {}, "toolEligibility": "allowed"},
        }],
        company_id="comp1",
        provider="GROQ",
        model="openai/gpt-oss-120b",
        case_ids=["general_chat_no_tool"],
        max_cases=1,
        delay_seconds=1.5,
    )

    assert report["metadata"] == {
        "companyId": "comp1",
        "provider": "GROQ",
        "model": "openai/gpt-oss-120b",
        "caseIds": ["general_chat_no_tool"],
        "maxCases": 1,
        "delaySeconds": 1.5,
    }


@pytest.mark.skipif(
    os.getenv("RUN_LIVE_INTENT_EVALS") != "1",
    reason="Set RUN_LIVE_INTENT_EVALS=1 to call the live LLM classifier.",
)
@pytest.mark.asyncio
async def test_live_intent_classifier_matches_golden_cases(tmp_path):
    cases = load_intent_golden_cases()
    case_ids = [
        case_id.strip()
        for case_id in os.getenv("LIVE_INTENT_EVAL_CASE_IDS", "").split(",")
        if case_id.strip()
    ] or None
    max_cases = (
        int(os.getenv("LIVE_INTENT_EVAL_MAX_CASES"))
        if os.getenv("LIVE_INTENT_EVAL_MAX_CASES")
        else None
    )
    report = await run_live_intent_eval_cases(
        cases,
        company_id=os.getenv("LIVE_INTENT_EVAL_COMPANY_ID", "live-intent-eval"),
        provider=os.getenv("LIVE_INTENT_EVAL_PROVIDER"),
        model=os.getenv("LIVE_INTENT_EVAL_MODEL"),
        case_ids=case_ids,
        max_cases=max_cases,
        delay_seconds=float(os.getenv("LIVE_INTENT_EVAL_DELAY_SECONDS", "0")),
    )
    output_path = Path(os.getenv("LIVE_INTENT_EVAL_REPORT", tmp_path / "live-intent-report.json"))
    write_live_intent_eval_report(report, output_path)

    minimum_score = float(os.getenv("LIVE_INTENT_EVAL_MIN_SCORE", "0.70"))
    assert report["summary"]["score"] >= minimum_score
