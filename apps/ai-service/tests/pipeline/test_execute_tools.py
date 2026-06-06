from __future__ import annotations

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock

import pytest
from agent_framework import AgentResponse, Content, Message

from src.pipeline.context import PipelineContext
from src.pipeline.stages.execute_tools import execute_tools


@pytest.mark.asyncio
async def test_execute_tools_maps_sdk_approval_requests_to_tool_evidence():
    function_call = Content.from_function_call(
        call_id="call-1",
        name="discount_create",
        arguments={
            "product_id": "prod_1",
            "discount_percent": 10,
        },
    )
    approval_request = Content.from_function_approval_request(
        id="call-1",
        function_call=function_call,
    )
    llm_result = AgentResponse(messages=[Message(role="assistant", contents=[approval_request])])

    ctx = PipelineContext(
        message="make discount",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="customer-1",
    )
    ctx.llm_result = llm_result

    result = await execute_tools(ctx)

    assert result.executed_tools[-1]["status"] == "awaiting_approval"
    assert result.executed_tools[-1]["action_type"] == "discount_create"
    assert result.executed_tools[-1]["action_args"]["product_id"] == "prod_1"
    assert result.executed_tools[-1]["company_id"] == "comp1"


@pytest.mark.asyncio
async def test_execute_tools_runs_planned_tools_concurrently(monkeypatch):
    calls: list[str] = []

    class _Gateway:
        async def execute(self, *, tool_name, **kwargs):
            calls.append(tool_name)
            await asyncio.sleep(0.05)
            return {"status": "success", "result": {"tool": tool_name}}

    monkeypatch.setattr("src.pipeline.stages.execute_tools.ToolGateway", _Gateway)

    ctx = PipelineContext(
        message="check and act",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="customer-1",
    )
    ctx.agent = MagicMock()
    ctx.agent.client = None
    ctx.agent.get_tools.return_value = ["inventory_check", "order_create_draft"]
    ctx.execution_plan = {
        "deterministicReadExecution": {
            "tool": "inventory_check",
            "nativeName": "inventory_check",
            "params": {"sku": "sku-1"},
        },
        "deterministicActionExecution": {
            "tool": "order_create_draft",
            "nativeName": "order_create_draft",
            "params": {"sku": "sku-1"},
        },
    }

    start = time.perf_counter()
    result = await execute_tools(ctx)
    elapsed = time.perf_counter() - start

    assert set(calls) == {"inventory_check", "order_create_draft"}
    assert elapsed < 0.09
    assert [item["tool"] for item in result.executed_tools] == [
        "inventory_check",
        "order_create_draft",
    ]


@pytest.mark.asyncio
async def test_execute_tools_skips_final_llm_when_no_tool_evidence():
    client = MagicMock()
    client.get_response = AsyncMock()

    ctx = PipelineContext(
        message="needs product data",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="customer-1",
    )
    ctx.agent = MagicMock(client=client)
    ctx.execution_plan = {
        "deterministicReadExecution": None,
        "deterministicActionExecution": None,
        "plannedExecutions": [],
    }

    result = await execute_tools(ctx)

    assert result.llm_response == ""
    client.get_response.assert_not_called()


@pytest.mark.asyncio
async def test_execute_tools_returns_provider_error_without_static_reply(monkeypatch):
    class _Gateway:
        async def execute(self, **_kwargs):
            return {"status": "success", "result": {"items": []}}

    monkeypatch.setattr("src.pipeline.stages.execute_tools.ToolGateway", _Gateway)

    client = MagicMock()
    client.get_response = AsyncMock(side_effect=RuntimeError("provider unavailable"))
    agent = MagicMock(client=client)
    agent.get_tools.return_value = ["product_search"]

    ctx = PipelineContext(
        message="do you have black shoes?",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        agent=agent,
    )
    ctx.execution_plan = {
        "deterministicReadExecution": {
            "tool": "product_search",
            "nativeName": "product_search",
            "params": {"query": "black shoes"},
        },
        "deterministicActionExecution": None,
        "plannedExecutions": [],
    }
    ctx.messages = [{"role": "user", "content": ctx.message}]

    result = await execute_tools(ctx)

    assert result.llm_response == ""
    assert result.early_return["status"] == "PROVIDER_ERROR"
    assert result.early_return["result"]["reply"] == ""
