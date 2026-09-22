"""Approval gate regression tests for the chat pipeline tool executor.

2026-09-22 production incident (Swan): skills_pipeline._execute_one_tool called
registry tool funcs directly, bypassing ToolGateway — write tools marked
approval_mode='always_require' executed WITHOUT merchant approval, and the
model then claimed success. The gate below blocks execution and returns the
structured awaiting_approval payload the chat endpoint turns into a draft.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from src.pipeline.context import PipelineContext
from src.pipeline.stages.skills_pipeline import _execute_one_tool


def _ctx() -> PipelineContext:
    return PipelineContext(
        message="فعّل شريط الشحن المجاني",
        thread_id="t1",
        company_id="comp1",
        customer_id="merchant",
    )


def _tool_call(name: str, arguments: dict | None = None) -> dict:
    import json

    return {
        "function": {
            "name": name,
            "arguments": json.dumps(arguments or {}),
        }
    }


@pytest.mark.asyncio
async def test_write_tool_is_blocked_and_not_executed():
    func = AsyncMock(side_effect=AssertionError("write tool must not execute in pipeline"))
    registry = SimpleNamespace(
        resolve=lambda name: SimpleNamespace(
            name=name,
            func=func,
            input_model=lambda **kw: SimpleNamespace(**kw),
            approval_mode="always_require",
        )
    )

    result = await _execute_one_tool(_ctx(), registry, _tool_call("conversion_tool_toggle", {"tool_key": "freeShippingBar", "enable": True}))

    func.assert_not_awaited()
    assert result["status"] == "awaiting_approval"
    assert result["action_type"] == "conversion_tool_toggle"
    # pipeline injects company_id into the args before the gate — kept in the draft
    assert result["action_args"] == {"tool_key": "freeShippingBar", "enable": True, "company_id": "comp1"}
    assert result["company_id"] == "comp1"
    # The LLM-visible payload must give a literal reply template framing the
    # block as a pending approval — never as a failure or an execution.
    assert "مستني موافقتك" in result["result"]["message"]
    assert "ممنوع" in result["result"]["message"]


@pytest.mark.asyncio
async def test_read_tool_still_executes_directly():
    func = AsyncMock(return_value={"success": True, "payments": {}})
    registry = SimpleNamespace(
        resolve=lambda name: SimpleNamespace(
            name=name,
            func=func,
            input_model=lambda **kw: SimpleNamespace(**kw),
            approval_mode="never_require",
        )
    )

    result = await _execute_one_tool(_ctx(), registry, _tool_call("payment_settings_read"))

    func.assert_awaited_once()
    assert result["status"] == "success"
    assert result["result"]["success"] is True


@pytest.mark.asyncio
async def test_registry_write_tools_all_gated():
    """Every tool registered with always_require must be one the gate blocks —
    sanity-check the attribute survives registry import."""
    from src.tools.registry import WRITE_TOOLS

    gated = [t.name for t in WRITE_TOOLS if getattr(t, "approval_mode", "") == "always_require"]
    assert "conversion_tool_toggle" in gated
    assert "payment_methods_configure" in gated
    assert "order_cancel" in gated


@pytest.mark.asyncio
async def test_followup_surfaces_approval_message_not_generic_error():
    """The LLM must see the Arabic approval template — not 'Execution failed'."""
    import json as _json
    from unittest.mock import MagicMock

    from src.llm.client import ProviderResponse
    from src.pipeline.context import PipelineContext
    from src.pipeline.stages.skills_pipeline import _build_followup_messages

    ctx = PipelineContext(
        message="فعّل شريط الشحن المجاني",
        thread_id="t9",
        company_id="comp1",
        customer_id="merchant",
    )
    ctx.attachments = []
    first_response = MagicMock()
    first_response.tool_calls = [
        {"id": "call_1", "function": {"name": "conversion_tool_toggle", "arguments": "{}"}}
    ]
    first_response.text = ""
    first_response.reasoning_content = None

    awaiting_result = {
        "status": "awaiting_approval",
        "action_type": "conversion_tool_toggle",
        "message": "قالب الرد: التعديل جاهز ومستني موافقتك",
    }
    executed = [{"tool": "conversion_tool_toggle", "status": "awaiting_approval", "result": awaiting_result}]

    messages = await _build_followup_messages(ctx, first_response, executed)

    tool_msgs = [m for m in messages if m.get("role") == "tool"]
    assert len(tool_msgs) == 1
    content = tool_msgs[0]["content"]
    assert "مستني موافقتك" in content
    assert "Execution failed" not in content
    parsed = _json.loads(content.split("\n\n[Directive]")[0])
    assert parsed["status"] == "awaiting_approval"
