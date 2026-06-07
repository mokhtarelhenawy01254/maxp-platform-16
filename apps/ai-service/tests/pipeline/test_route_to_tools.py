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
