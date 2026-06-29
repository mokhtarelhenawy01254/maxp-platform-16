from __future__ import annotations

import json

import pytest
import respx
from httpx import Response

INTENT_CLASSIFICATION_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "test_schema",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "intent": {"type": "string"},
                "confidence": {"type": "number"},
            },
            "required": ["intent", "confidence"],
            "additionalProperties": False,
        },
    },
}
from src.llm.providers.google_provider import GoogleProvider


def _contains_key(value, target_key: str) -> bool:
    if isinstance(value, dict):
        return target_key in value or any(_contains_key(item, target_key) for item in value.values())
    if isinstance(value, list):
        return any(_contains_key(item, target_key) for item in value)
    return False


def test_google_provider_maps_data_url_image_parts_to_inline_data() -> None:
    provider = GoogleProvider("test-key", "gemini-2.5-flash")

    _system, contents = provider._build_contents([
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "what is in this image?"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "data:image/png;base64,iVBORw0KGgo=",
                        "detail": "low",
                    },
                },
            ],
        }
    ])

    parts = contents[0]["parts"]
    assert parts[0] == {"text": "what is in this image?"}
    assert parts[1]["inlineData"]["mimeType"] == "image/png"
    assert parts[1]["inlineData"]["data"] == "iVBORw0KGgo="


@pytest.mark.asyncio
@respx.mock
async def test_google_provider_sends_native_response_schema_generation_config() -> None:
    schema = {
        "type": "object",
        "properties": {"status": {"type": "string"}},
        "required": ["status"],
    }
    route = respx.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    ).mock(
        return_value=Response(
            200,
            json={"candidates": [{"content": {"parts": [{"text": '{"status":"ok"}'}]}}]},
        )
    )
    provider = GoogleProvider("test-key", "gemini-2.5-flash")

    await provider.generate_response(
        [{"role": "user", "content": "return status"}],
        output_schema=schema,
    )

    body = json.loads(route.calls.last.request.content)
    assert body["generationConfig"]["responseMimeType"] == "application/json"
    assert body["generationConfig"]["responseSchema"] == schema


def test_google_provider_converts_json_schema_to_gemini_response_schema() -> None:
    provider = GoogleProvider("test-key", "gemini-2.5-flash")

    config = provider._generation_config({"output_schema": INTENT_CLASSIFICATION_SCHEMA})

    response_schema = config["responseSchema"]
    assert response_schema["type"] == "object"
    assert not _contains_key(response_schema, "additionalProperties")
    assert not _contains_key(response_schema, "const")
    assert not _contains_key(response_schema, "minimum")
    assert not _contains_key(response_schema, "maximum")
    assert response_schema["properties"]["intent"] == {"type": "string"}
    assert response_schema["properties"]["confidence"] == {"type": "number"}
