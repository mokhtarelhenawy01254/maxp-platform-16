from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from src.intent.schema import IntentContract
from src.pipeline.context import PipelineContext
from src.pipeline.stages.resolve_intent import resolve_intent


@pytest.mark.asyncio
async def test_merchant_intent_uses_llm_classifier_not_policy_parser(monkeypatch):
    async def fake_contract(**kwargs):
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
    )
    ctx.agent = AsyncMock()
    ctx.native_tools = [{"name": "product_search"}]

    result = await resolve_intent(ctx)

    assert result.relevance_plan.intent == "products"
