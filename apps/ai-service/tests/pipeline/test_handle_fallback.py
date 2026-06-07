from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from src.intent.schema import ToolPlan
from src.pipeline.context import PipelineContext
from src.pipeline.stages.handle_fallback import handle_fallback


@pytest.mark.asyncio
async def test_handle_fallback_blocks_factual_invention_when_tool_evidence_missing():
    client = MagicMock()
    client.get_response = AsyncMock(return_value=MagicMock(text="safe model reply"))
    agent = MagicMock(client=client)

    ctx = PipelineContext(
        message="do you have black shoes in size 42?",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        agent=agent,
    )
    ctx.relevance_plan = ToolPlan(
        intent="catalog.search",
        requiresTool=True,
        primaryTool="product_search",
        allowedTools=["product_search"],
        reason="classified by model",
    )
    ctx.messages = [
        {"role": "system", "content": "base\n[AVAILABLE_TOOLS]\n- product_search\n[/AVAILABLE_TOOLS]"},
        {"role": "user", "content": ctx.message},
    ]
    ctx.system_prompt = ctx.messages[0]["content"]

    result = await handle_fallback(ctx)

    assert result.llm_response == "safe model reply"
    request_messages = client.get_response.await_args.args[0]
    assert "Tool Evidence Missing" in request_messages[-1].text
    assert "does not invent product, order, shipping" in request_messages[-1].text
    assert "product_search" not in request_messages[0].text
    assert "plain text only" in request_messages[0].text


@pytest.mark.asyncio
async def test_handle_fallback_retries_empty_no_evidence_reply():
    client = MagicMock()
    client.get_response = AsyncMock(
        side_effect=[
            MagicMock(text=""),
            MagicMock(text="I need to check that first."),
        ]
    )
    agent = MagicMock(client=client, persona={})

    ctx = PipelineContext(
        message="do you have this item?",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        agent=agent,
    )
    ctx.relevance_plan = ToolPlan(
        intent="catalog.search",
        requiresTool=True,
        primaryTool="product_search",
        allowedTools=["product_search"],
        reason="classified by model",
    )

    result = await handle_fallback(ctx)

    assert result.llm_response == "I need to check that first."
    assert client.get_response.await_count == 2


@pytest.mark.asyncio
async def test_handle_fallback_retries_provider_tool_use_error():
    client = MagicMock()
    request = httpx.Request("POST", "https://provider.test/chat")
    response = httpx.Response(400, request=request)
    client.get_response = AsyncMock(
        side_effect=[
            httpx.HTTPStatusError("tool_use_failed", request=request, response=response),
            MagicMock(text="I need to check that first."),
        ]
    )
    agent = MagicMock(client=client, persona={})

    ctx = PipelineContext(
        message="do you have this item?",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        agent=agent,
    )
    ctx.relevance_plan = ToolPlan(
        intent="catalog.search",
        requiresTool=True,
        primaryTool="product_search",
        allowedTools=["product_search"],
        reason="classified by model",
    )

    result = await handle_fallback(ctx)

    assert result.llm_response == "I need to check that first."
    assert client.get_response.await_count == 2


@pytest.mark.asyncio
async def test_handle_fallback_returns_provider_error_when_retry_fails():
    client = MagicMock()
    request = httpx.Request("POST", "https://provider.test/chat")
    response = httpx.Response(400, request=request)
    client.get_response = AsyncMock(
        side_effect=[
            httpx.HTTPStatusError("tool_use_failed", request=request, response=response),
            httpx.ConnectError("dns failed", request=request),
        ]
    )
    agent = MagicMock(client=client, persona={})

    ctx = PipelineContext(
        message="do you have this item?",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        agent=agent,
    )
    ctx.relevance_plan = ToolPlan(
        intent="catalog.search",
        requiresTool=True,
        primaryTool="product_search",
        allowedTools=["product_search"],
        reason="classified by model",
    )

    result = await handle_fallback(ctx)

    assert result.early_return["status"] == "PROVIDER_ERROR"
    assert "dns failed" in result.early_return["result"]["error"]
    assert result.early_return["result"]["error_code"] == "llm_provider_error"


@pytest.mark.asyncio
async def test_handle_fallback_marks_rate_limited_provider_errors():
    client = MagicMock()
    request = httpx.Request("POST", "https://provider.test/chat")
    response = httpx.Response(
        429,
        request=request,
        headers={"retry-after": "60"},
    )
    client.get_response = AsyncMock(
        side_effect=[
            httpx.HTTPStatusError("rate limit reached", request=request, response=response),
            httpx.HTTPStatusError("rate limit reached", request=request, response=response),
        ]
    )
    agent = MagicMock(client=client, persona={})

    ctx = PipelineContext(
        message="do you have this item?",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        agent=agent,
    )
    ctx.relevance_plan = ToolPlan(
        intent="catalog.search",
        requiresTool=True,
        primaryTool="product_search",
        allowedTools=["product_search"],
    )

    result = await handle_fallback(ctx)

    assert result.early_return["status"] == "PROVIDER_ERROR"
    assert result.early_return["result"]["error_code"] == "llm_rate_limited"
    assert result.early_return["result"]["provider_status_code"] == 429
    assert result.early_return["result"]["retry_after"] == "60"


@pytest.mark.asyncio
async def test_handle_fallback_uses_llm_when_classifier_is_unavailable():
    client = MagicMock()
    client.get_response = AsyncMock(return_value=MagicMock(text="model-written reply"))
    agent = MagicMock(client=client, persona={})

    ctx = PipelineContext(
        message="do you have this item?",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        agent=agent,
    )
    ctx.relevance_plan = ToolPlan(
        intent="general.chat",
        requiresTool=False,
        reason="CLASSIFIER_UNAVAILABLE",
        blockedReason="CLASSIFIER_UNAVAILABLE",
        classification={"classifierUnavailable": True, "slots": {}},
    )

    result = await handle_fallback(ctx)

    assert result.llm_response == "model-written reply"
    request_messages = client.get_response.await_args.args[0]
    assert "structured LLM intent classifier was unavailable" in request_messages[-1].text
    assert "No JSON. No function calls." not in request_messages[-1].text
