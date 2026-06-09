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
