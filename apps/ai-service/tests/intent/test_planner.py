from __future__ import annotations

import pytest

from src.intent.planner import build_intent_contract_async, to_tool_plan
from src.intent.schema import ClassifierResult


@pytest.mark.asyncio
async def test_classifier_unavailable_is_explicit_and_disables_tools(monkeypatch):
    async def unavailable_classifier(**_kwargs):
        return None

    monkeypatch.setattr("src.intent.classifier.classify_intent", unavailable_classifier)

    contract = await build_intent_contract_async(
        message="do you have black shoes in size 42?",
        available_tools=["product_search", "inventory_check"],
        context={"availableTools": ["product_search", "inventory_check"]},
        company_id="comp1",
    )
    plan = to_tool_plan(contract, ["product_search", "inventory_check"])

    assert contract.requiresTool is False
    assert contract.source == "classifier-unavailable"
    assert contract.reason == "CLASSIFIER_UNAVAILABLE"
    assert contract.confidence == 0.0
    assert plan.blockedReason == "CLASSIFIER_UNAVAILABLE"
    assert plan.classification["classifierUnavailable"] is True


@pytest.mark.asyncio
async def test_classifier_intent_uses_available_primary_tool(monkeypatch):
    async def inventory_classifier(**_kwargs):
        return ClassifierResult(
            intent="inventory",
            confidence=0.91,
            slots={"productName": "black shoes", "size": "42"},
        )

    monkeypatch.setattr("src.intent.classifier.classify_intent", inventory_classifier)

    contract = await build_intent_contract_async(
        message="do you have black shoes in size 42?",
        available_tools=["product_search", "inventory_check"],
        context={"availableTools": ["product_search", "inventory_check"]},
        company_id="comp1",
    )
    plan = to_tool_plan(contract, ["product_search", "inventory_check"])

    assert contract.requiresTool is True
    assert contract.route["primaryTool"] == "inventory_check"
    assert plan.primaryTool == "inventory_check"
    assert plan.allowedTools == ["inventory_check", "product_search"]
