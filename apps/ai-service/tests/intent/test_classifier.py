from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from src.intent.classifier import classify_intent


@pytest.mark.asyncio
async def test_classifier_receives_image_attachments_as_multimodal_content(monkeypatch):
    captured: dict[str, Any] = {}

    class FakeClient:
        async def get_response(self, messages, options=None):
            captured["messages"] = messages
            captured["options"] = options
            return SimpleNamespace(
                text='{"intent":"general.chat","confidence":0.9,"ambiguous":false,'
                '"slots":{},"missingSlots":[],"reasonCodes":[]}'
            )

    class FakeFallback:
        async def get_client(self, **_kwargs):
            captured["client_kwargs"] = _kwargs
            return FakeClient()

    monkeypatch.setattr("src.intent.classifier.LLMFallbackProvider", lambda: FakeFallback())

    result = await classify_intent(
        message="what is this?",
        company_id="comp1",
        context={
            "availableTools": ["product_search"],
            "preferredModel": "openai/gpt-oss-120b",
            "preferredProvider": "GROQ",
            "attachments": [
                {
                    "type": "image",
                    "mime_type": "image/png",
                    "base64_data": "iVBORw0KGgo=",
                    "detail": "low",
                }
            ],
        },
    )

    assert result is not None
    user_message = captured["messages"][1]
    assert isinstance(user_message, dict)
    assert user_message["content"][0]["type"] == "text"
    assert user_message["content"][1]["type"] == "image_url"
    assert captured["options"]["tools_enabled"] is False
    assert captured["options"]["output_schema"]["type"] == "object"
    assert set(captured["options"]["output_schema"]["required"]) == set(
        captured["options"]["output_schema"]["properties"]
    )
    assert captured["client_kwargs"]["provider"] == "GOOGLE"
    assert captured["client_kwargs"]["model"] == "gemini-2.5-flash"


@pytest.mark.asyncio
async def test_classifier_uses_structured_google_route_for_text_turns(monkeypatch):
    captured: dict[str, Any] = {}

    class FakeClient:
        async def get_response(self, messages, options=None):
            captured["messages"] = messages
            captured["options"] = options
            return SimpleNamespace(
                text=(
                    '{"intent":"products","confidence":0.91,"confidenceLevel":"high",'
                    '"ambiguity":false,"clarificationQuestion":null,'
                    '"slots":{"productName":"black sneakers"},'
                    '"missingSlots":[],"toolEligibility":{"status":"allowed"},'
                    '"reasonCodes":[],"alternativeIntents":[]}'
                )
            )

    class FakeFallback:
        async def get_client(self, **_kwargs):
            captured["client_kwargs"] = _kwargs
            return FakeClient()

    monkeypatch.setattr("src.intent.classifier.LLMFallbackProvider", lambda: FakeFallback())

    result = await classify_intent(
        message="Do you have black sneakers?",
        company_id="comp1",
        context={"availableTools": ["product_search"]},
    )

    assert result is not None
    assert result.intent == "products"
    assert captured["client_kwargs"]["provider"] == "GOOGLE"
    assert captured["client_kwargs"]["model"] == "gemini-2.5-flash"
    assert captured["options"]["tools_enabled"] is False


@pytest.mark.asyncio
async def test_classifier_uses_preferred_route_for_text_turns(monkeypatch):
    captured: dict[str, Any] = {}

    class FakeClient:
        async def get_response(self, messages, options=None):
            return SimpleNamespace(
                text=(
                    '{"intent":"products","confidence":0.91,"confidenceLevel":"high",'
                    '"ambiguity":false,"clarificationQuestion":null,'
                    '"slots":{"productName":"black sneakers"},'
                    '"missingSlots":[],"toolEligibility":{"status":"allowed"},'
                    '"reasonCodes":[],"alternativeIntents":[]}'
                )
            )

    class FakeFallback:
        async def get_client(self, **kwargs):
            captured["client_kwargs"] = kwargs
            return FakeClient()

    monkeypatch.setattr("src.intent.classifier.LLMFallbackProvider", lambda: FakeFallback())

    result = await classify_intent(
        message="Do you have black sneakers?",
        company_id="comp1",
        context={
            "availableTools": ["product_search"],
            "preferredProvider": "NVIDIA",
            "preferredModel": "openai/gpt-oss-120b",
        },
    )

    assert result is not None
    assert result.intent == "products"
    assert captured["client_kwargs"]["provider"] == "NVIDIA"
    assert captured["client_kwargs"]["model"] == "openai/gpt-oss-120b"


@pytest.mark.asyncio
async def test_classifier_includes_previous_product_context_for_followups(monkeypatch):
    captured: dict[str, Any] = {}

    class FakeClient:
        async def get_response(self, messages, options=None):
            captured["messages"] = messages
            return SimpleNamespace(
                text=(
                    '{"intent":"inventory","confidence":0.93,"confidenceLevel":"high",'
                    '"ambiguity":false,"clarificationQuestion":null,'
                    '"slots":{"productSize":"42","referencesPreviousProduct":true},'
                    '"missingSlots":[],"toolEligibility":{"status":"allowed"},'
                    '"reasonCodes":[],"alternativeIntents":[]}'
                )
            )

    result = await classify_intent(
        message="Is size 42 available?",
        company_id="comp1",
        context={
            "availableTools": ["inventory_check", "product_search"],
            "externalMemoryContext": {
                "lastShownProductIds": ["prod_1"],
                "queriedProducts": [{"id": "prod_1", "name": "Black Shoes"}],
                "activeSearchFilters": {"color": "black"},
            },
        },
        client=FakeClient(),
    )

    assert result is not None
    assert result.intent == "inventory"
    assert result.slots["referencesPreviousProduct"] is True
    user_message = captured["messages"][1]
    content = user_message.get("content") if isinstance(user_message, dict) else user_message.contents
    if isinstance(content, list):
        content = "\n".join(str(item) for item in content)
    assert "[CONVERSATION_CONTEXT_START]" in content
    assert "prod_1" in content


@pytest.mark.asyncio
async def test_classifier_exhausts_fallback_chain_when_all_routes_unavailable(monkeypatch):
    captured: dict[str, Any] = {"client_requests": []}

    class FakeFallback:
        async def get_client(self, **kwargs):
            captured["client_requests"].append(kwargs)
            return None

    monkeypatch.setattr("src.intent.classifier.LLMFallbackProvider", lambda: FakeFallback())

    result = await classify_intent(
        message="Do you have black sneakers?",
        company_id="comp1",
        context={
            "availableTools": ["inventory_check", "product_search"],
            "preferredProvider": "GROQ",
            "preferredModel": "openai/gpt-oss-120b",
        },
    )

    assert result is None
    # Fallback chain: preferred (GROQ) → NVIDIA → GROQ
    assert len(captured["client_requests"]) == 3
    assert captured["client_requests"][0]["provider"] == "GROQ"
    assert captured["client_requests"][0]["model"] == "openai/gpt-oss-120b"
    assert captured["client_requests"][1]["provider"] == "NVIDIA"
    assert captured["client_requests"][2]["provider"] == "GROQ"


@pytest.mark.asyncio
async def test_classifier_exhausts_fallback_chain_after_route_exceptions(monkeypatch):
    captured: dict[str, Any] = {"client_requests": []}

    class FailingClient:
        async def get_response(self, messages, options=None):
            raise RuntimeError("primary provider failed")

    class FakeFallback:
        async def get_client(self, **kwargs):
            captured["client_requests"].append(kwargs)
            return FailingClient()

    monkeypatch.setattr("src.intent.classifier.LLMFallbackProvider", lambda: FakeFallback())

    result = await classify_intent(
        message="Do you have black sneakers?",
        company_id="comp1",
        context={
            "availableTools": ["inventory_check", "product_search"],
            "preferredProvider": "GROQ",
            "preferredModel": "openai/gpt-oss-120b",
        },
    )

    assert result is None
    # Fallback chain: preferred (GROQ) → NVIDIA → GROQ
    assert len(captured["client_requests"]) == 3
    assert captured["client_requests"][0]["provider"] == "GROQ"
    assert captured["client_requests"][1]["provider"] == "NVIDIA"
    assert captured["client_requests"][2]["provider"] == "GROQ"


@pytest.mark.asyncio
async def test_classifier_keeps_only_policy_required_missing_slots(monkeypatch):
    class FakeClient:
        async def get_response(self, messages, options=None):
            return SimpleNamespace(
                text=(
                    '{"intent":"products","confidence":0.9,"confidenceLevel":"high",'
                    '"ambiguity":false,"clarificationQuestion":null,'
                    '"slots":{"productName":"sneakers"},'
                    '"missingSlots":["productPrice","productSize","listAll"],'
                    '"toolEligibility":{"status":"allowed","blockedReason":null,"requiredTool":null},'
                    '"reasonCodes":[],"alternativeIntents":[]}'
                )
            )

    result = await classify_intent(
        message="Show me your sneakers.",
        company_id="comp1",
        context={"availableTools": ["product_search"]},
        client=FakeClient(),
    )

    assert result is not None
    assert result.intent == "products"
    assert result.missingSlots == []


@pytest.mark.asyncio
async def test_classifier_preserves_policy_required_missing_slots(monkeypatch):
    class FakeClient:
        async def get_response(self, messages, options=None):
            return SimpleNamespace(
                text=(
                    '{"intent":"shipping.rates","confidence":0.9,"confidenceLevel":"high",'
                    '"ambiguity":false,"clarificationQuestion":null,'
                    '"slots":{},'
                    '"missingSlots":["governorate","productSize"],'
                    '"toolEligibility":{"status":"needs_clarification","blockedReason":null,"requiredTool":null},'
                    '"reasonCodes":[],"alternativeIntents":[]}'
                )
            )

    result = await classify_intent(
        message="How much is shipping?",
        company_id="comp1",
        context={"availableTools": ["shipping_rates"]},
        client=FakeClient(),
    )

    assert result is not None
    assert result.intent == "shipping.rates"
    assert result.missingSlots == ["governorate"]
