from __future__ import annotations

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock

import pytest
from agent_framework import AgentResponse, Content, Message

from src.pipeline.context import DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL
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
async def test_execute_tools_enriches_direct_order_execution_with_inventory_price(monkeypatch):
    calls: list[tuple[str, dict]] = []

    class _Gateway:
        async def execute(self, *, tool_name, input_data=None, **_kwargs):
            calls.append((tool_name, dict(input_data or {})))
            if tool_name == "inventory.check":
                return {
                    "status": "success",
                    "result": {
                        "status": "AVAILABLE",
                        "product": {"name": "Sprint X"},
                        "price": {"amount": 1499, "currency": "EGP"},
                    },
                }
            return {
                "status": "success",
                "result": {
                    "status": "EXECUTED",
                    "action": "ORDER_CREATED",
                    "result": {"orderNumber": "ORD-1001"},
                },
            }

    monkeypatch.setattr("src.pipeline.stages.execute_tools.ToolGateway", _Gateway)

    agent = MagicMock(client=None)
    agent.get_tools.return_value = ["inventory_check", "order_create_confirmed"]
    ctx = PipelineContext(
        message="confirm order",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        agent=agent,
        external_memory_context={DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL: True},
    )
    ctx.execution_plan = {
        "deterministicReadExecution": None,
        "deterministicActionExecution": {
            "tool": "order.create_confirmed",
            "nativeName": "order.create_confirmed",
            "params": {
                "customer_name": "Ahmed",
                "customer_phone": "01001111111",
                "product_name": "Sprint X",
                "product_size": "42",
                "product_color": "black",
                "quantity": "1",
                "city": "Cairo",
                "confirmed_by_customer": True,
            },
        },
        "plannedExecutions": [],
    }

    result = await execute_tools(ctx)

    assert calls[0][0] == "inventory.check"
    assert calls[0][1]["use_vector"] is False
    assert calls[1][0] == "order.create_confirmed"
    order_args = result.executed_tools[-1]["params"]
    assert order_args["product_price"] == 1499
    assert result.executed_tools[-1]["result"]["action"] == "ORDER_CREATED"
    assert result.executed_tools[0]["tool"] == "inventory.check"


@pytest.mark.asyncio
async def test_execute_tools_retries_when_final_reply_is_tool_syntax(monkeypatch):
    class _Gateway:
        async def execute(self, **_kwargs):
            return {
                "status": "success",
                "result": {
                    "status": "EXECUTED",
                    "action": "ORDER_CREATED",
                    "result": {"orderNumber": "ORD-1001"},
                },
            }

    monkeypatch.setattr("src.pipeline.stages.execute_tools.ToolGateway", _Gateway)

    client = MagicMock()
    client.get_response = AsyncMock(side_effect=[
        MagicMock(text='We need to search.\n{"query":"Sprint X","filters":{}}'),
        MagicMock(text="Your order has been created."),
    ])
    agent = MagicMock(client=client)
    agent.get_tools.return_value = ["order_create_confirmed"]

    ctx = PipelineContext(
        message="confirm order",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        agent=agent,
    )
    ctx.execution_plan = {
        "deterministicReadExecution": None,
        "deterministicActionExecution": {
            "tool": "order.create_confirmed",
            "nativeName": "order.create_confirmed",
            "params": {"product_name": "Sprint X", "product_price": 1499},
        },
        "plannedExecutions": [],
    }
    ctx.messages = [{"role": "user", "content": ctx.message}]

    result = await execute_tools(ctx)

    assert result.llm_response == "Your order has been created."
    assert client.get_response.await_count == 2


@pytest.mark.asyncio
async def test_execute_tools_retries_when_final_reply_is_raw_json(monkeypatch):
    class _Gateway:
        async def execute(self, **_kwargs):
            return {
                "status": "success",
                "result": {
                    "status": "EXECUTED",
                    "action": "ORDER_CREATED",
                    "result": {"orderNumber": "ORD-1002"},
                },
            }

    monkeypatch.setattr("src.pipeline.stages.execute_tools.ToolGateway", _Gateway)

    client = MagicMock()
    client.get_response = AsyncMock(side_effect=[
        MagicMock(text='{"customer_name":"Test Customer","items":[{"name":"Nova Street Sneakers"}]}'),
        MagicMock(text="Your order ORD-1002 has been created."),
    ])
    agent = MagicMock(client=client)
    agent.get_tools.return_value = ["order_create_confirmed"]

    ctx = PipelineContext(
        message="confirm order",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        agent=agent,
    )
    ctx.execution_plan = {
        "deterministicReadExecution": None,
        "deterministicActionExecution": {
            "tool": "order.create_confirmed",
            "nativeName": "order.create_confirmed",
            "params": {"product_name": "Sprint X", "product_price": 1499},
        },
        "plannedExecutions": [],
    }
    ctx.messages = [{"role": "user", "content": ctx.message}]

    result = await execute_tools(ctx)

    assert result.llm_response == "Your order ORD-1002 has been created."
    assert client.get_response.await_count == 2


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
    assert result.early_return["result"]["error_code"] == "llm_provider_error"


@pytest.mark.asyncio
async def test_execute_tools_caps_final_reply_tokens_for_tool_synthesis(monkeypatch):
    class _Gateway:
        async def execute(self, **_kwargs):
            return {"status": "success", "result": {"results": [{"name": "Tough Boot", "price": 1200}]}}

    monkeypatch.setattr("src.pipeline.stages.execute_tools.ToolGateway", _Gateway)

    client = MagicMock()
    client.get_response = AsyncMock(return_value=MagicMock(text="موجود يا فندم."))
    agent = MagicMock(client=client)
    agent.get_tools.return_value = ["product_search"]

    ctx = PipelineContext(
        message="عندكم Tough Boot؟",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        agent=agent,
    )
    ctx.execution_plan = {
        "deterministicReadExecution": {
            "tool": "product_search",
            "nativeName": "product_search",
            "params": {"query": "Tough Boot"},
        },
        "deterministicActionExecution": None,
        "plannedExecutions": [],
    }
    ctx.messages = [{"role": "user", "content": ctx.message}]

    await execute_tools(ctx)

    options = client.get_response.await_args.kwargs["options"]
    assert options["tools_enabled"] is False
    assert options["max_tokens"] == 700


@pytest.mark.asyncio
async def test_execute_tools_instructs_final_reply_to_use_product_image_urls(monkeypatch):
    class _Gateway:
        async def execute(self, **_kwargs):
            return {
                "status": "success",
                "result": {
                    "found": True,
                    "productName": "Nova Street Sneakers",
                    "images": ["https://img.example.test/nova.jpg"],
                },
            }

    monkeypatch.setattr("src.pipeline.stages.execute_tools.ToolGateway", _Gateway)

    client = MagicMock()
    client.get_response = AsyncMock(return_value=MagicMock(text="Here is the product image: https://img.example.test/nova.jpg"))
    agent = MagicMock(client=client)
    agent.get_tools.return_value = ["inventory_check"]

    ctx = PipelineContext(
        message="send me a product photo",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        agent=agent,
    )
    ctx.execution_plan = {
        "deterministicReadExecution": {
            "tool": "inventory.check",
            "nativeName": "inventory.check",
            "params": {"product_name_or_sku": "", "references_previous_product": True},
        },
        "deterministicActionExecution": None,
        "plannedExecutions": [],
    }
    ctx.messages = [{"role": "user", "content": ctx.message}]

    await execute_tools(ctx)

    messages = client.get_response.await_args.args[0]
    tool_result_prompt = "\n".join(str(item) for item in messages[-1].contents)
    assert "image URL" in tool_result_prompt
    assert "Markdown image" in tool_result_prompt


@pytest.mark.asyncio
async def test_execute_tools_collects_image_response_attachment_when_model_omits_url(monkeypatch):
    class _Gateway:
        async def execute(self, **_kwargs):
            return {
                "status": "success",
                "result": {
                    "found": True,
                    "productName": "Nova Street Sneakers",
                    "images": ["https://img.example.test/nova.jpg"],
                },
            }

    monkeypatch.setattr("src.pipeline.stages.execute_tools.ToolGateway", _Gateway)

    client = MagicMock()
    client.get_response = AsyncMock(return_value=MagicMock(text="Here is the product image."))
    agent = MagicMock(client=client)
    agent.get_tools.return_value = ["product_search"]

    ctx = PipelineContext(
        message="send me a product photo",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        agent=agent,
    )
    ctx.relevance_plan = MagicMock(
        slots={"requestedProductImage": True},
        classification={"slots": {"requestedProductImage": True}},
        allowedTools=["product.search"],
    )
    ctx.execution_plan = {
        "deterministicReadExecution": {
            "tool": "product.search",
            "nativeName": "product.search",
            "params": {"query": "Nova Street Sneakers"},
        },
        "deterministicActionExecution": None,
        "plannedExecutions": [],
    }
    ctx.messages = [{"role": "user", "content": ctx.message}]

    await execute_tools(ctx)

    assert ctx.llm_response == "Here is the product image."
    assert ctx.response_attachments == [
        {
            "type": "image",
            "url": "https://img.example.test/nova.jpg",
            "source": "tool_result",
            "tool": "product.search",
        }
    ]
