from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from src.intent.schema import IntentContract
from src.pipeline.context import PipelineContext
from src.pipeline.stages.resolve_intent import resolve_intent


@pytest.mark.asyncio
async def test_merchant_intent_uses_llm_classifier_not_policy_parser(monkeypatch):
    captured = {}

    async def fake_contract(**kwargs):
        captured.update(kwargs)
        return IntentContract(
            intent="products",
            requiresTool=False,
            decision="answer",
        )

    monkeypatch.setattr(
        "src.pipeline.stages.resolve_intent.build_intent_contract_async",
        fake_contract,
    )
    ctx = PipelineContext(
        message="show me products",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="merchant_admin",
        channel="merchant",
        attachments=[{"type": "image", "url": "https://example.com/product.png"}],
    )
    ctx.agent = AsyncMock()
    ctx.native_tools = [{"name": "product_search"}]

    result = await resolve_intent(ctx)

    assert result.relevance_plan.intent == "products"
    assert captured["context"]["attachments"] == [{"type": "image", "url": "https://example.com/product.png"}]


@pytest.mark.asyncio
async def test_resolve_intent_does_not_pass_agent_reply_client_to_classifier(monkeypatch):
    captured = {}
    reply_client = object()

    async def fake_contract(**kwargs):
        captured.update(kwargs)
        return IntentContract(
            intent="inventory",
            requiresTool=True,
            route={"primaryTool": "inventory.check", "allowedTools": ["inventory.check"]},
            decision="execute_tool",
        )

    monkeypatch.setattr(
        "src.pipeline.stages.resolve_intent.build_intent_contract_async",
        fake_contract,
    )
    ctx = PipelineContext(
        message="do you have black shoes size 42?",
        thread_id="thread-1",
        company_id="comp1",
        customer_id="cust1",
        channel="facebook",
    )
    ctx.agent = SimpleNamespace(client=reply_client, model="openai/gpt-oss-120b", config=SimpleNamespace(provider="GROQ"))
    ctx.native_tools = [{"name": "inventory.check"}]

    await resolve_intent(ctx)

    assert captured["client"] is None
    assert captured["context"]["preferredModel"] == "openai/gpt-oss-120b"
    assert captured["context"]["preferredProvider"] == "GROQ"
