from __future__ import annotations

import pytest
from agent_framework import AgentContext, FunctionInvocationContext, FunctionTool, Message

from src.agents.middleware import MaxPAgentRuntimeMiddleware, MaxPFunctionAuditMiddleware


async def _tool_func() -> dict[str, str]:
    return {"status": "ok"}


@pytest.mark.asyncio
async def test_function_audit_middleware_adds_maxp_metadata():
    tool = FunctionTool(name="product_search", func=_tool_func)
    context = FunctionInvocationContext(tool, arguments={})
    middleware = MaxPFunctionAuditMiddleware(company_id="comp1", agent_role="SUPPORT")

    async def call_next() -> None:
        context.result = {"status": "ok"}

    await middleware.process(context, call_next)

    assert context.metadata["company_id"] == "comp1"
    assert context.metadata["agent_role"] == "SUPPORT"
    assert context.metadata["tool_name"] == "product_search"
    assert context.result == {"status": "ok"}


@pytest.mark.asyncio
async def test_function_audit_middleware_captures_exceptions(monkeypatch):
    captured = []
    monkeypatch.setattr("src.agents.middleware.sentry_sdk.capture_exception", captured.append)
    tool = FunctionTool(name="product_search", func=_tool_func)
    context = FunctionInvocationContext(tool, arguments={})
    middleware = MaxPFunctionAuditMiddleware(company_id="comp1", agent_role="SUPPORT")
    error = RuntimeError("boom")

    async def call_next() -> None:
        raise error

    with pytest.raises(RuntimeError, match="boom"):
        await middleware.process(context, call_next)

    assert captured == [error]


@pytest.mark.asyncio
async def test_agent_runtime_middleware_sanitizes_non_system_messages():
    context = AgentContext(
        agent=object(),
        messages=[
            Message(role="system", contents=["<policy>keep tags</policy>"]),
            Message(role="user", contents=["hello <script>& data</script>"]),
        ],
    )
    middleware = MaxPAgentRuntimeMiddleware(company_id="comp1", agent_role="SUPPORT")

    async def call_next() -> None:
        context.result = "ok"

    await middleware.process(context, call_next)

    assert context.messages[0].text == "<policy>keep tags</policy>"
    assert context.messages[1].text == "hello &lt;script&gt;&amp; data&lt;/script&gt;"
    assert context.metadata["company_id"] == "comp1"
    assert context.metadata["agent_role"] == "SUPPORT"
    assert context.metadata["sanitized_messages"] == 1


@pytest.mark.asyncio
async def test_agent_runtime_middleware_trims_oldest_history_to_budget():
    context = AgentContext(
        agent=object(),
        messages=[
            Message(role="system", contents=["system"]),
            Message(role="user", contents=["old message " * 80]),
            Message(role="assistant", contents=["old answer " * 80]),
            Message(role="user", contents=["current"]),
        ],
        options={"maxp_token_budget": 20},
    )
    middleware = MaxPAgentRuntimeMiddleware(company_id="comp1", agent_role="SUPPORT")

    async def call_next() -> None:
        context.result = "ok"

    await middleware.process(context, call_next)

    assert [message.role for message in context.messages] == ["system", "user"]
    assert context.messages[-1].text == "current"
    assert context.metadata["dropped_history_messages"] == 2
