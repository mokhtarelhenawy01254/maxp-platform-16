from __future__ import annotations

import json
import os
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.llm.client import ProviderResponse
from src.pipeline.context import PipelineContext
from src.pipeline.stages.skills_pipeline import process_with_skills
from src.skills.register_all import register_all_skills
from src.skills.registry import get_skill_registry

CASES_PATH = Path(__file__).parent / "skills_golden_cases.json"


def _load_cases():
    with open(CASES_PATH) as f:
        return json.load(f)


@pytest.fixture(autouse=True)
def _register_skills():
    reg = get_skill_registry()
    old_skills = dict(reg._skills)
    old_tools = dict(reg._tools)
    old_groups = {k: set(v) for k, v in reg._groups.items()}
    register_all_skills()
    yield
    reg._skills = old_skills
    reg._tools = old_tools
    reg._groups = old_groups


def _make_ctx(message: str) -> PipelineContext:
    ctx = PipelineContext(
        message=message,
        thread_id="test-thread",
        company_id="test-company",
        customer_id="test-customer",
        channel="facebook",
    )
    ctx.system_prompt = "أنت مساعد ذكي لمنصة MaxP."
    return ctx


def _mock_llm_response(text: str = "", tool_calls: list | None = None) -> ProviderResponse:
    return ProviderResponse(
        text=text,
        tool_calls=tool_calls or [],
        usage={"prompt_tokens": 10, "completion_tokens": 5},
        model="test-model",
        provider="TEST",
    )


@pytest.mark.parametrize("case", _load_cases(), ids=lambda c: c["id"])
@pytest.mark.asyncio
async def test_skills_golden_cases(case):
    """Mock LLM returns the expected tool call; verify process_with_skills routes correctly."""
    expected_skill = case.get("expected_skill")
    expected_params = case.get("expected_params_contain", {})

    if expected_skill:
        mock_tool_calls = [{
            "id": "call_1",
            "type": "function",
            "function": {
                "name": expected_skill,
                "arguments": json.dumps(expected_params),
            },
        }]
        mock_response = _mock_llm_response(tool_calls=mock_tool_calls)
    else:
        mock_response = _mock_llm_response(text="Thank you for your message!")

    ctx = _make_ctx(case["message"])
    ctx.llm_client = MagicMock()

    with patch.object(ctx.llm_client, "generate", AsyncMock(return_value=mock_response)):
        ctx = await process_with_skills(ctx)

    if expected_skill:
        assert ctx.executed_tools, f"Expected skill '{expected_skill}' to be called for: {case['message']}"
        called_skills = [t.get("tool") for t in ctx.executed_tools]
        assert expected_skill in called_skills, f"Expected '{expected_skill}' in {called_skills} for: {case['message']}"
    else:
        assert not ctx.executed_tools, f"Expected no tool call for: {case['message']}"
        assert ctx.final_reply, f"Expected a reply for: {case['message']}"


@pytest.mark.asyncio
@pytest.mark.skipif(not os.getenv("RUN_LIVE_SKILLS_EVALS"), reason="Set RUN_LIVE_SKILLS_EVALS=1 to run live eval")
async def test_skills_live_eval():
    """Run golden cases against a real LLM and report accuracy."""
    cases = _load_cases()
    registry = get_skill_registry()
    tools = [s.to_openai_tool() for s in registry.get_all()]

    from src.llm.model_manager import model_manager

    routing = await model_manager.get_next_key("gemini-2.5-flash", "test-company")
    from src.llm.client import LLMClient

    client = LLMClient(
        provider=routing.provider,
        model=routing.model,
        api_key=routing.api_key,
        base_url=routing.base_url,
    )

    passed = 0
    results = []
    for case in cases:
        messages = [
            {
                "role": "system",
                "content": "أنت مساعد ذكي. استخدم الأدوات المتاحة عند الحاجة. إذا كان السؤال عاماً فقط رد بدون أدوات.",
            },
            {"role": "user", "content": case["message"]},
        ]
        response = await client.generate(messages=messages, tools=tools, temperature=0.1)
        expected_skill = case.get("expected_skill")
        actual_skills = [tc.get("function", {}).get("name", "") for tc in (response.tool_calls or [])]

        if expected_skill:
            ok = expected_skill in actual_skills
        else:
            ok = len(actual_skills) == 0

        results.append({"id": case["id"], "ok": ok, "actual": actual_skills, "expected": expected_skill})
        if ok:
            passed += 1

    total = len(cases)
    accuracy = passed / total * 100
    print(f"\nSkills Live Eval: {passed}/{total} passed ({accuracy:.1f}%)")
    for r in results:
        status = "PASS" if r["ok"] else "FAIL"
        print(f"  [{status}] {r['id']}: expected={r['expected']}, actual={r['actual']}")

    assert accuracy >= 70, f"Accuracy {accuracy:.1f}% below 70% threshold"
