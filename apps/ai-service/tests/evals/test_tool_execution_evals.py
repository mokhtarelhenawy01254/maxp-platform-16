from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from src.intent.schema import ClassifierResult
from src.evals.tool_execution_eval import (
    evaluate_tool_execution_result,
    summarize_tool_execution_eval,
)
from src.pipeline.context import PipelineContext
from src.pipeline.stages.execute_tools import execute_tools
from src.pipeline.stages.resolve_intent import resolve_intent
from src.pipeline.stages.route_to_tools import route_to_tools
from src.pipeline.stages.validate_reply import validate_reply
from src.tools.registry import get_tool


def _cases() -> list[dict[str, Any]]:
    return json.loads((Path(__file__).with_name("intent_golden_cases.json")).read_text())


def _executable_cases() -> list[dict[str, Any]]:
    return [case for case in _cases() if case["expected_execution"] != "none"]


def _native_tools(names: list[str]) -> list:
    return [get_tool(name) or {"name": name} for name in names]


def _message_text(message: Any) -> str:
    contents = getattr(message, "contents", None)
    if isinstance(contents, list):
        return "\n".join(str(item) for item in contents)
    if isinstance(message, dict):
        return str(message.get("content") or "")
    return str(message)


async def _run_tool_execution_case(monkeypatch, case: dict[str, Any]) -> dict[str, Any]:
    classifier_payload = dict(case["classifier"])
    gateway_calls: list[dict[str, Any]] = []
    client_calls: list[dict[str, Any]] = []

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

    class FakeContextAssembler:
        async def assemble_messages(self, ctx):
            return [{"role": "user", "content": ctx.message}]

    class FakeGateway:
        async def execute(self, *, tool_name, input_data, company_id, **_kwargs):
            gateway_calls.append({
                "tool_name": tool_name,
                "input_data": dict(input_data or {}),
                "company_id": company_id,
            })
            return {
                "status": "success",
                "result": {
                    "toolName": tool_name,
                    "params": dict(input_data or {}),
                    "status": "STRUCTURED_TOOL_RESULT",
                },
            }

    class FakeClient:
        async def get_response(self, messages, options=None):
            client_calls.append({"messages": messages, "options": options or {}})
            return SimpleNamespace(text="model-written reply from structured tool result")

    monkeypatch.setattr("src.intent.classifier.classify_intent", fake_classifier)
    monkeypatch.setattr("src.pipeline.stages.route_to_tools.ContextAssembler", FakeContextAssembler)
    monkeypatch.setattr("src.pipeline.stages.execute_tools.ToolGateway", FakeGateway)

    ctx = PipelineContext(
        message=case["message"],
        thread_id=f"tool-eval-{case['id']}",
        company_id="comp1",
        customer_id="cust1",
        channel=case.get("channel", "facebook"),
    )
    ctx.agent = SimpleNamespace(
        client=FakeClient(),
        get_tools=lambda: case.get("available_tools") or [],
    )
    ctx.native_tools = _native_tools(case.get("available_tools") or [])

    ctx = await resolve_intent(ctx)
    ctx = await route_to_tools(ctx)
    ctx = await execute_tools(ctx)
    ctx = await validate_reply(ctx)

    assert gateway_calls == [{
        "tool_name": case["expected_primary_tool"],
        "input_data": {
            **(case.get("expected_params") or {}),
            **{
                key: gateway_calls[0]["input_data"][key]
                for key in gateway_calls[0]["input_data"]
                if key not in (case.get("expected_params") or {})
            },
        },
        "company_id": "comp1",
    }]
    for key, value in (case.get("expected_params") or {}).items():
        assert gateway_calls[0]["input_data"].get(key) == value

    assert ctx.executed_tools[-1]["status"] == "success"
    assert ctx.executed_tools[-1]["success"] is True
    assert ctx.executed_tools[-1]["result"]["status"] == "STRUCTURED_TOOL_RESULT"
    assert ctx.final_reply == "model-written reply from structured tool result"

    assert client_calls
    assert client_calls[-1]["options"]["tools_enabled"] is False
    final_prompt = _message_text(client_calls[-1]["messages"][-1])
    assert "[Tool Results]" in final_prompt
    assert "[/Tool Results]" in final_prompt
    assert '"status": "STRUCTURED_TOOL_RESULT"' in final_prompt
    assert "Generate the customer-facing reply from these structured results" in final_prompt

    return evaluate_tool_execution_result(
        case,
        {
            "tool": gateway_calls[0]["tool_name"],
            "params": gateway_calls[0]["input_data"],
            "toolResult": ctx.executed_tools[-1],
            "llmPrompt": final_prompt,
            "finalReply": ctx.final_reply,
        },
    )


@pytest.mark.asyncio
@pytest.mark.parametrize("case", _executable_cases(), ids=[case["id"] for case in _executable_cases()])
async def test_tool_execution_eval_passes_structured_tool_result_to_llm(monkeypatch, case):
    scored = await _run_tool_execution_case(monkeypatch, case)

    assert scored["passed"] is True


@pytest.mark.asyncio
async def test_tool_execution_eval_report_scores_all_executable_golden_cases(monkeypatch):
    scored_cases = [
        await _run_tool_execution_case(monkeypatch, case)
        for case in _executable_cases()
    ]

    report = summarize_tool_execution_eval(scored_cases)

    assert report["summary"] == {
        "total": len(_executable_cases()),
        "passed": len(_executable_cases()),
        "failed": 0,
        "score": 1.0,
    }
