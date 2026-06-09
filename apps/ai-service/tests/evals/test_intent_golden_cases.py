from __future__ import annotations

import json
from pathlib import Path

import pytest

from src.intent.schema import ClassifierResult
from src.intent.schema import INTENT_CONFIGURED_TOOLS, INTENT_ENUM, get_policy
from src.pipeline.context import PipelineContext
from src.pipeline.stages.resolve_intent import resolve_intent
from src.pipeline.stages.route_to_tools import route_to_tools
from src.tools.registry import get_tool


def _cases() -> list[dict]:
    return json.loads((Path(__file__).with_name("intent_golden_cases.json")).read_text())


def _native_tools(names: list[str]) -> list:
    tools = []
    for name in names:
        tools.append(get_tool(name) or {"name": name})
    return tools


def test_intent_eval_suite_targets_valid_policies_and_tools():
    cases = _cases()

    assert cases
    for case in cases:
        expected_intent = case["expected_intent"]
        expected_tool = case["expected_primary_tool"]
        config = INTENT_CONFIGURED_TOOLS.get(expected_intent)

        assert expected_intent in INTENT_ENUM
        assert get_policy(expected_intent)["actionType"]
        if expected_tool is None:
            assert config is None
            continue
        assert config is not None
        assert expected_tool in config["allowedTools"] or config["primaryTool"] == expected_tool


@pytest.mark.asyncio
@pytest.mark.parametrize("case", _cases(), ids=[case["id"] for case in _cases()])
async def test_intent_golden_case_routes_to_expected_tool(monkeypatch, case):
    classifier_payload = dict(case["classifier"])

    async def fake_classifier(**_kwargs):
        return ClassifierResult(
            intent=classifier_payload["intent"],
            confidence=classifier_payload.get("confidence", 0.8),
            confidenceLevel=classifier_payload.get("confidenceLevel", "medium"),
            ambiguous=classifier_payload.get("ambiguous", False),
            clarificationQuestion=classifier_payload.get("clarificationQuestion"),
            slots=dict(classifier_payload.get("slots") or {}),
            missingSlots=list(classifier_payload.get("missingSlots") or []),
            toolEligibility=classifier_payload.get("toolEligibility", "allowed"),
            reasonCodes=list(classifier_payload.get("reasonCodes") or []),
            alternativeIntents=list(classifier_payload.get("alternativeIntents") or []),
        )

    monkeypatch.setattr("src.intent.classifier.classify_intent", fake_classifier)

    ctx = PipelineContext(
        message=case["message"],
        thread_id=f"golden-{case['id']}",
        company_id="comp1",
        customer_id="cust1",
        channel=case.get("channel", "facebook"),
    )
    ctx.native_tools = _native_tools(case.get("available_tools") or [])

    ctx = await resolve_intent(ctx)
    ctx = await route_to_tools(ctx)

    plan = ctx.relevance_plan
    assert plan.intent == case["expected_intent"]
    assert plan.primaryTool == case["expected_primary_tool"]

    expected_execution = case["expected_execution"]
    if expected_execution == "none":
        assert ctx.execution_plan["deterministicReadExecution"] is None
        assert ctx.execution_plan["deterministicActionExecution"] is None
        if case.get("expected_blocked_reason"):
            assert plan.blockedReason == case["expected_blocked_reason"]
        return

    if expected_execution == "read":
        execution = ctx.execution_plan["deterministicReadExecution"]
        assert ctx.execution_plan["deterministicActionExecution"] is None
    else:
        execution = ctx.execution_plan["deterministicActionExecution"]
        assert ctx.execution_plan["deterministicReadExecution"] is None

    assert execution is not None
    assert execution["nativeName"] == case["expected_primary_tool"]
    for key, value in (case.get("expected_params") or {}).items():
        assert execution["params"].get(key) == value
