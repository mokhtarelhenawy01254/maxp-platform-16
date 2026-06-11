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

    assert contract.requiresTool is True
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
async def test_classifier_confirmed_order_routes_to_confirmed_order_tool(monkeypatch):
    async def confirmed_order_classifier(**_kwargs):
        return ClassifierResult(
            intent="orders.create_confirmed",
            confidence=0.98,
            confidenceLevel="high",
            slots={
                "productName": "Sprint X Running Shoes",
                "productPrice": 1499,
                "quantity": 1,
                "customerName": "Test Customer",
                "customerPhone": "01000000000",
                "city": "Cairo",
                "address": "10 Test Street",
                "confirmedByCustomer": True,
            },
        )

    monkeypatch.setattr("src.intent.classifier.classify_intent", confirmed_order_classifier)

    contract = await build_intent_contract_async(
        message="confirm one Sprint X order for Test Customer",
        available_tools=["order_create_confirmed", "order_create_draft", "product_search"],
        context={
            "availableTools": ["order_create_confirmed", "order_create_draft", "product_search"],
            "externalMemoryContext": {"lastShownProductIds": ["prod_1"]},
        },
        company_id="comp1",
    )
    plan = to_tool_plan(contract, ["order_create_confirmed", "order_create_draft", "product_search"])

    assert contract.decision == "execute_tool"
    assert contract.requiresTool is True
    assert contract.route["primaryTool"] == "order_create_confirmed"
    assert plan.primaryTool == "order_create_confirmed"
    assert plan.allowedTools == ["order_create_confirmed", "order_create_draft", "product_search"]


@pytest.mark.asyncio
async def test_confirmed_order_missing_price_can_be_resolved_by_tool(monkeypatch):
    async def confirmed_order_classifier(**_kwargs):
        return ClassifierResult(
            intent="orders.create_confirmed",
            confidence=0.97,
            confidenceLevel="high",
            slots={
                "productName": "Sprint X Running Shoes",
                "productPrice": None,
                "quantity": 1,
                "customerName": "Test Customer",
                "customerPhone": "01000000000",
                "city": "Cairo",
                "address": "10 Test Street",
                "confirmedByCustomer": True,
            },
            missingSlots=["productPrice"],
            toolEligibility="needs_clarification",
        )

    monkeypatch.setattr("src.intent.classifier.classify_intent", confirmed_order_classifier)

    available = [
        "order_create_confirmed",
        "order_create_draft",
        "inventory_check",
        "product_search",
    ]
    contract = await build_intent_contract_async(
        message="confirm one Sprint X order for Test Customer",
        available_tools=available,
        context={"availableTools": available},
        company_id="comp1",
    )
    plan = to_tool_plan(contract, available)

    assert contract.decision == "execute_tool"
    assert contract.requiresTool is True
    assert contract.missingSlots == []
    assert contract.route["primaryTool"] == "order_create_confirmed"
    assert plan.blockedReason is None
    assert plan.requiresTool is True


@pytest.mark.asyncio
async def test_confirmed_order_uses_structured_memory_for_previous_product_and_shipping(monkeypatch):
    async def confirmed_order_classifier(**_kwargs):
        return ClassifierResult(
            intent="orders.create_confirmed",
            confidence=0.96,
            confidenceLevel="high",
            slots={
                "productName": None,
                "productPrice": None,
                "productSize": None,
                "productColor": None,
                "quantity": 1,
                "customerName": "Test Customer",
                "customerPhone": "01000000000",
                "city": None,
                "address": "10 Test Street Nasr City Cairo",
                "confirmedByCustomer": True,
            },
        )

    monkeypatch.setattr("src.intent.classifier.classify_intent", confirmed_order_classifier)

    available = [
        "order_create_confirmed",
        "order_create_draft",
        "inventory_check",
        "product_search",
        "shipping_rates",
    ]
    contract = await build_intent_contract_async(
        message="confirm the order with my name, phone, address and quantity one",
        available_tools=available,
        context={
            "availableTools": available,
            "externalMemoryContext": {
                "lastInventoryResult": {
                    "productName": "Sprint X Running Shoes",
                    "price": {"amount": 1499, "currency": "EGP"},
                    "requestedSize": "42",
                    "requestedColor": "black",
                },
                "lastShippingResult": {
                    "governorate": "Cairo",
                    "city": "Nasr City",
                },
            },
        },
        company_id="comp1",
    )
    plan = to_tool_plan(contract, available)

    assert contract.decision == "execute_tool"
    assert contract.requiresTool is True
    assert contract.missingSlots == []
    assert contract.route["primaryTool"] == "order_create_confirmed"
    assert plan.blockedReason is None
    assert plan.requiresTool is True


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
async def test_inventory_followup_can_use_previous_product_context(monkeypatch):
    async def inventory_classifier(**_kwargs):
        return ClassifierResult(
            intent="inventory",
            confidence=0.91,
            slots={"productSize": "42"},
            missingSlots=["productName"],
            toolEligibility="eligible",
        )

    monkeypatch.setattr("src.intent.classifier.classify_intent", inventory_classifier)

    contract = await build_intent_contract_async(
        message="is size 42 available?",
        available_tools=["inventory_check", "product_search"],
        context={
            "availableTools": ["inventory_check", "product_search"],
            "externalMemoryContext": {"lastShownProductIds": ["prod_1"]},
        },
        company_id="comp1",
    )
    plan = to_tool_plan(contract, ["inventory_check", "product_search"])

    assert contract.decision == "execute_tool"
    assert contract.requiresTool is True
    assert contract.missingSlots == []
    assert plan.requiresTool is True
    assert plan.blockedReason is None


@pytest.mark.asyncio
async def test_inventory_image_followup_can_use_previous_product_context(monkeypatch):
    async def image_classifier(**_kwargs):
        return ClassifierResult(
            intent="inventory",
            confidence=0.91,
            slots={"requestedProductImage": True, "referencesPreviousProduct": True},
            missingSlots=["productName"],
            toolEligibility="allowed",
        )

    monkeypatch.setattr("src.intent.classifier.classify_intent", image_classifier)

    contract = await build_intent_contract_async(
        message="send me a photo of it",
        available_tools=["inventory_check", "product_search"],
        context={
            "availableTools": ["inventory_check", "product_search"],
            "externalMemoryContext": {"lastShownProductIds": ["prod_1"]},
        },
        company_id="comp1",
    )
    plan = to_tool_plan(contract, ["inventory_check", "product_search"])

    assert contract.decision == "execute_tool"
    assert contract.requiresTool is True
    assert contract.missingSlots == []
    assert plan.requiresTool is True
    assert plan.blockedReason is None


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
