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


@pytest.mark.asyncio
async def test_classifier_missing_slots_disables_tool_execution(monkeypatch):
    async def draft_order_classifier(**_kwargs):
        return ClassifierResult(
            intent="orders.create_draft",
            confidence=0.92,
            slots={"productName": "black shoes", "customerName": "Ahmed"},
            missingSlots=["customerPhone"],
            toolEligibility="needs_clarification",
        )

    monkeypatch.setattr("src.intent.classifier.classify_intent", draft_order_classifier)

    contract = await build_intent_contract_async(
        message="create a draft order for Ahmed",
        available_tools=["order_create_draft", "product_search", "customer_info"],
        context={"availableTools": ["order_create_draft", "product_search", "customer_info"]},
        company_id="comp1",
    )
    plan = to_tool_plan(contract, ["order_create_draft", "product_search", "customer_info"])

    assert contract.decision == "ask_followup"
    assert contract.requiresTool is False
    assert set(contract.missingSlots) == {"customerPhone", "productPrice"}
    assert contract.reason == "NEEDS_CLARIFICATION"
    assert plan.requiresTool is False
    assert plan.blockedReason == "NEEDS_CLARIFICATION"
    assert plan.classification["slots"] == {"productName": "black shoes", "customerName": "Ahmed"}


@pytest.mark.asyncio
async def test_classifier_optional_read_slots_do_not_disable_inventory_tool(monkeypatch):
    async def inventory_classifier(**_kwargs):
        return ClassifierResult(
            intent="inventory",
            confidence=0.88,
            slots={"productName": "shoes", "productColor": "black"},
            missingSlots=["productSize", "quantity"],
            toolEligibility="needs_clarification",
        )

    monkeypatch.setattr("src.intent.classifier.classify_intent", inventory_classifier)

    contract = await build_intent_contract_async(
        message="Do you have black shoes in stock?",
        available_tools=["inventory_check", "product_search"],
        context={"availableTools": ["inventory_check", "product_search"]},
        company_id="comp1",
    )
    plan = to_tool_plan(contract, ["inventory_check", "product_search"])

    assert contract.decision == "execute_tool"
    assert contract.requiresTool is True
    assert contract.missingSlots == []
    assert contract.route["primaryTool"] == "inventory_check"
    assert plan.requiresTool is True
    assert plan.blockedReason is None
    assert plan.confidence == 0.88
    assert plan.classification["classifierMissingSlots"] == ["productSize", "quantity"]


@pytest.mark.asyncio
async def test_classifier_low_confidence_disables_tool_execution(monkeypatch):
    async def low_confidence_classifier(**_kwargs):
        return ClassifierResult(
            intent="inventory",
            confidence=0.41,
            confidenceLevel="low",
            slots={"productName": "black shoes"},
        )

    monkeypatch.setattr("src.intent.classifier.classify_intent", low_confidence_classifier)

    contract = await build_intent_contract_async(
        message="maybe black shoes or something similar",
        available_tools=["inventory_check", "product_search"],
        context={"availableTools": ["inventory_check", "product_search"]},
        company_id="comp1",
    )
    plan = to_tool_plan(contract, ["inventory_check", "product_search"])

    assert contract.decision == "ask_followup"
    assert contract.requiresTool is False
    assert contract.confidence == 0.41
    assert contract.reason == "LOW_CONFIDENCE"
    assert plan.requiresTool is False
    assert plan.blockedReason == "LOW_CONFIDENCE"


@pytest.mark.asyncio
async def test_classifier_tool_not_available_disables_tool_execution(monkeypatch):
    async def shipping_classifier(**_kwargs):
        return ClassifierResult(
            intent="shipping.rates",
            confidence=0.93,
            slots={"governorate": "Cairo"},
        )

    monkeypatch.setattr("src.intent.classifier.classify_intent", shipping_classifier)

    contract = await build_intent_contract_async(
        message="shipping to Cairo?",
        available_tools=["product_search"],
        context={"availableTools": ["product_search"]},
        company_id="comp1",
    )
    plan = to_tool_plan(contract, ["product_search"])

    assert contract.requiresTool is False
    assert contract.decision == "ask_followup"
    assert contract.reason == "TOOL_NOT_AVAILABLE"
    assert contract.route["primaryTool"] is None
    assert plan.requiresTool is False
    assert plan.blockedReason == "TOOL_NOT_AVAILABLE"
