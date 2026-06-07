from __future__ import annotations

import json

import pytest
import respx
from httpx import Response

from src.llm.providers.openai_compat import OpenAICompatProvider


@pytest.mark.asyncio
@respx.mock
async def test_openai_compat_provider_sends_native_json_schema_response_format():
    schema = {
        "type": "object",
        "properties": {"status": {"type": "string"}},
        "required": ["status"],
        "additionalProperties": False,
    }
    route = respx.post("https://openai.example.test/v1/chat/completions").mock(
        return_value=Response(
            200,
            json={
                "model": "gpt-test",
                "choices": [{"message": {"content": '{"status":"ok"}'}, "finish_reason": "stop"}],
            },
        )
    )

    provider = OpenAICompatProvider(
        "test-key",
        "gpt-test",
        base_url="https://openai.example.test/v1",
    )

    await provider.generate_response(
        [{"role": "user", "content": "return status"}],
        output_schema=schema,
    )

    body = json.loads(route.calls.last.request.content)
    assert body["response_format"] == {
        "type": "json_schema",
        "json_schema": {
            "name": "structured_response",
            "strict": True,
            "schema": schema,
        },
    }
