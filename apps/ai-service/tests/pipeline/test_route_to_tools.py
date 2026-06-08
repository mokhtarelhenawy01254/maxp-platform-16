from __future__ import annotations

import pytest

from src.intent.schema import ToolPlan
from src.pipeline.context import PipelineContext
from src.pipeline.stages import route_to_tools as route_module
from src.pipeline.stages.route_to_tools import route_to_tools


@pytest.mark.asyncio
async def test_merchant_route_to_tools_uses_model_classified_plan():
    assert not hasattr(route_module, "get_deterministic_read_tool_execution")
    assert not hasattr(route_module, "get_deterministic_action_tool_execution")

    ctx = PipelineContext(
        message="refund request",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="merchant_admin",
        channel="merchant",
    )
    ctx.relevance_plan = ToolPlan(
        intent="support.refund",
        requiresTool=True,
        primaryTool="agent_handoff_to",
        allowedTools=["agent_handoff_to"],
        reason="classified by model",
    )
    ctx.native_tools = [{"name": "agent_handoff_to"}]

    result = await route_to_tools(ctx)

    assert result.execution_plan["deterministicActionExecution"]["nativeName"] == "agent_handoff_to"


@pytest.mark.asyncio
async def test_route_to_tools_accepts_dotted_allowed_tool_alias():
    ctx = PipelineContext(
        message="do you have black shoes?",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
    )
    ctx.system_prompt = "base"
    ctx.relevance_plan = ToolPlan(
        intent="products",
        requiresTool=True,
        primaryTool="product_search",
        allowedTools=["product.search"],
        reason="classified by model",
    )
    ctx.native_tools = [{"name": "product_search"}]

    result = await route_to_tools(ctx)

    assert result.native_tools == [{"name": "product_search"}]
    assert result.execution_plan["deterministicReadExecution"]["nativeName"] == "product_search"
    assert result.execution_plan["deterministicReadExecution"]["params"]["query"] == "do you have black shoes?"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("primary_tool", "slots", "expected_params"),
    [
        (
            "inventory.check",
            {"productName": "black shoes", "size": "42", "color": "black"},
            {
                "product_name_or_sku": "black shoes",
                "product_size": "42",
                "product_color": "black",
            },
        ),
        (
            "shipping.rates",
            {"governorate": "Cairo"},
            {"governorate": "Cairo"},
        ),
        (
            "order.lookup",
            {"orderNumber": "ORD-123"},
            {"order_number": "ORD-123"},
        ),
        (
            "customer.info",
            {"phone": "01001111111"},
            {"query": "01001111111"},
        ),
    ],
)
async def test_route_to_tools_populates_read_tool_params_from_model_slots(primary_tool, slots, expected_params):
    ctx = PipelineContext(
        message="customer message",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
    )
    ctx.relevance_plan = ToolPlan(
        intent=primary_tool,
        requiresTool=True,
        primaryTool=primary_tool,
        allowedTools=[primary_tool],
        slots=slots,
        reason="classified by model",
    )
    ctx.native_tools = [{"name": primary_tool.replace(".", "_")}]

    result = await route_to_tools(ctx)

    execution = result.execution_plan["deterministicReadExecution"]
    assert execution["nativeName"] == primary_tool
    assert execution["params"] == expected_params


@pytest.mark.asyncio
async def test_route_to_tools_populates_write_tool_params_from_model_slots():
    from src.tools.registry import get_tool

    ctx = PipelineContext(
        message="create draft order",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
    )
    ctx.relevance_plan = ToolPlan(
        intent="orders.create_draft",
        requiresTool=True,
        primaryTool="order.create_draft",
        allowedTools=["order.create_draft"],
        slots={
            "customerName": "Ahmed",
            "customerPhone": "01001111111",
            "productName": "black shoes",
            "quantity": 2,
            "address": "Nasr City",
            "city": "Cairo",
        },
        reason="classified by model",
    )
    ctx.native_tools = [get_tool("order_create_draft")]

    result = await route_to_tools(ctx)

    execution = result.execution_plan["deterministicActionExecution"]
    assert execution["nativeName"] == "order.create_draft"
    assert execution["params"] == {
        "customer_name": "Ahmed",
        "customer_phone": "01001111111",
        "product_name": "black shoes",
        "quantity": "2",
        "address": "Nasr City",
        "city": "Cairo",
    }


@pytest.mark.asyncio
async def test_route_to_tools_does_not_execute_clarification_plan():
    ctx = PipelineContext(
        message="create a draft order",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
    )
    ctx.relevance_plan = ToolPlan(
        intent="orders.create_draft",
        requiresTool=False,
        primaryTool="order.create_draft",
        allowedTools=["order.create_draft"],
        slots={"productName": "black shoes"},
        missingSlots=["customerPhone"],
        reason="NEEDS_CLARIFICATION",
        blockedReason="NEEDS_CLARIFICATION",
    )
    ctx.native_tools = [{"name": "order_create_draft"}]

    result = await route_to_tools(ctx)

    assert result.execution_plan["deterministicReadExecution"] is None
    assert result.execution_plan["deterministicActionExecution"] is None
