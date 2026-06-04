"""Unit tests for src.llm.gemma_client.

Covers request body construction (system extraction, contents mapping, tool
rendering), and the response parser (text + tool_calls extraction). Network
calls are intercepted with respx so no real HTTP is made.
"""

from __future__ import annotations

from dataclasses import dataclass

import httpx
import pytest
import respx
from agent_framework import Message
from pydantic import BaseModel, Field

from src.llm.gemma_chat_template import QUOTE_TOKEN, TOOL_BEGIN, TOOL_END
from src.llm.gemma_client import (
    DEFAULT_BASE_URL,
    GemmaClient,
    GemmaResponse,
    _build_contents,
    _extract_text,
    _merge_tools_into_system,
    build_gemma_client,
)


@dataclass
class FakeTool:
    name: str
    description: str = ""
    input_model: type[BaseModel] | None = None


class SearchInput(BaseModel):
    query: str = Field(description="Search text")
    limit: int = Field(default=10, description="Max results")


def _endpoint(model: str) -> str:
    return f"{DEFAULT_BASE_URL}/models/{model}:generateContent"


def test_extract_text_handles_string() -> None:
    assert _extract_text("hello") == "hello"


def test_extract_text_handles_list_of_strings() -> None:
    assert _extract_text(["a", "b"]) == "a\nb"


def test_extract_text_handles_list_of_objects_with_text_attr() -> None:
    class T:
        text = "hi"

    assert _extract_text([T(), T()]) == "hi\nhi"


def test_build_contents_promotes_system_to_system_instruction() -> None:
    messages = [
        Message(role="system", contents=["You are helpful."]),
        Message(role="user", contents=["Hello"]),
    ]
    system, contents = _build_contents(messages)
    assert system == "You are helpful."
    assert contents == [{"role": "user", "parts": [{"text": "Hello"}]}]


def test_build_contents_maps_assistant_role_to_model() -> None:
    messages = [
        Message(role="user", contents=["hi"]),
        Message(role="assistant", contents=["hello back"]),
    ]
    _, contents = _build_contents(messages)
    assert contents[1]["role"] == "model"


def test_build_contents_merges_multiple_system_messages() -> None:
    messages = [
        Message(role="system", contents=["Rule 1"]),
        Message(role="system", contents=["Rule 2"]),
        Message(role="user", contents=["hi"]),
    ]
    system, _ = _build_contents(messages)
    assert system == "Rule 1\n\nRule 2"


def test_build_contents_folds_tool_role_into_user() -> None:
    messages = [
        Message(role="tool", contents=["result: 42"]),
    ]
    _, contents = _build_contents(messages)
    assert contents[0]["role"] == "user"
    assert contents[0]["parts"][0]["text"] == "result: 42"


def test_merge_tools_into_system_appends_definition_block() -> None:
    tools = [FakeTool(name="ping", description="pong", input_model=SearchInput)]
    merged = _merge_tools_into_system("Be helpful.", tools)
    assert merged is not None
    assert merged.startswith("Be helpful.")
    assert TOOL_BEGIN + "declaration:ping" in merged
    assert merged.rstrip().endswith(TOOL_END)


def test_merge_tools_into_system_returns_existing_when_no_tools() -> None:
    assert _merge_tools_into_system("sys", None) == "sys"
    assert _merge_tools_into_system(None, None) is None


def test_build_request_includes_tools_when_provided() -> None:
    client = GemmaClient(api_key="k", model="gemma-4-31b-it")
    tool = FakeTool(name="search", description="Search the catalog", input_model=SearchInput)
    body = client._build_request(
        messages=[Message(role="system", contents=["sys"]), Message(role="user", contents=["hi"])],
        options={"temperature": 0.2, "max_tokens": 256},
        tools_override=[tool],
    )
    assert "systemInstruction" in body
    sys_text = body["systemInstruction"]["parts"][0]["text"]
    assert "sys" in sys_text
    assert "declaration:search" in sys_text
    assert body["generationConfig"]["temperature"] == 0.2
    assert body["generationConfig"]["maxOutputTokens"] == 256


def test_build_request_drops_optional_generation_keys_when_absent() -> None:
    client = GemmaClient(api_key="k", model="gemma-4-31b-it")
    body = client._build_request(
        messages=[Message(role="user", contents=["hi"])],
        options=None,
        tools_override=None,
    )
    assert "generationConfig" not in body


def test_build_gemma_client_returns_none_for_non_gemma_model() -> None:
    assert build_gemma_client(api_key="k", model="claude-sonnet-4-6") is None
    assert build_gemma_client(api_key="k", model="gemini-2.0-flash") is None


def test_build_gemma_client_returns_client_for_gemma_model() -> None:
    client = build_gemma_client(api_key="k", model="gemma-4-31b-it")
    assert isinstance(client, GemmaClient)
    assert client.model == "gemma-4-31b-it"


def test_build_gemma_client_raises_when_api_key_missing() -> None:
    with pytest.raises(ValueError, match="google_api_key"):
        build_gemma_client(api_key=None, model="gemma-4-31b-it")


def test_gemma_client_requires_api_key_and_model() -> None:
    with pytest.raises(ValueError, match="api_key"):
        GemmaClient(api_key="", model="gemma-4-31b-it")
    with pytest.raises(ValueError, match="model"):
        GemmaClient(api_key="k", model="")


def test_parse_response_extracts_text_and_tool_calls() -> None:
    client = GemmaClient(api_key="k", model="gemma-4-31b-it")
    tool_call_block = (
        "<|tool_call>call:order_lookup{orderNumber:"
        + QUOTE_TOKEN
        + "ORD-1"
        + QUOTE_TOKEN
        + "}<tool_call|>"
    )
    raw = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": "Looking that up now.\n" + tool_call_block},
                    ]
                }
            }
        ],
        "usageMetadata": {
            "promptTokenCount": 12,
            "candidatesTokenCount": 7,
            "totalTokenCount": 19,
        },
    }
    response = client._parse_response(raw)
    assert isinstance(response, GemmaResponse)
    assert response.text == "Looking that up now."
    assert len(response.tool_calls) == 1
    assert response.tool_calls[0]["name"] == "order_lookup"
    assert response.tool_calls[0]["arguments"]["orderNumber"] == "ORD-1"
    assert response.usage["totalTokenCount"] == 19
    assert response.model == "gemma-4-31b-it"


def test_parse_response_handles_no_tool_calls() -> None:
    client = GemmaClient(api_key="k", model="gemma-4-31b-it")
    raw = {
        "candidates": [
            {"content": {"parts": [{"text": "Just text, no tools."}]}}
        ],
    }
    response = client._parse_response(raw)
    assert response.text == "Just text, no tools."
    assert response.tool_calls == []


async def test_get_response_sends_post_to_native_endpoint() -> None:
    client = GemmaClient(api_key="secret-key", model="gemma-4-31b-it")
    with respx.mock(base_url=DEFAULT_BASE_URL) as router:
        route = router.post(_endpoint("gemma-4-31b-it")).mock(
            return_value=httpx.Response(
                200,
                json={
                    "candidates": [
                        {"content": {"parts": [{"text": "ok"}]}}
                    ]
                },
            )
        )
        response = await client.get_response(
            messages=[Message(role="user", contents=["hi"])],
        )
        assert response.text == "ok"
        assert route.called
        request = route.calls[0].request
        assert "key=secret-key" in str(request.url)
        body = request.content.decode("utf-8")
        assert '"contents"' in body
        assert "hi" in body


async def test_get_response_raises_on_4xx() -> None:
    client = GemmaClient(api_key="bad", model="gemma-4-31b-it")
    with respx.mock(base_url=DEFAULT_BASE_URL) as router:
        router.post(_endpoint("gemma-4-31b-it")).mock(
            return_value=httpx.Response(403, text="permission denied"),
        )
        with pytest.raises(httpx.HTTPStatusError):
            await client.get_response(messages=[Message(role="user", contents=["hi"])])


async def test_get_response_includes_generation_config_from_options() -> None:
    client = GemmaClient(api_key="k", model="gemma-4-31b-it")
    with respx.mock(base_url=DEFAULT_BASE_URL) as router:
        route = router.post(_endpoint("gemma-4-31b-it")).mock(
            return_value=httpx.Response(
                200,
                json={"candidates": [{"content": {"parts": [{"text": "x"}]}}]},
            )
        )
        await client.get_response(
            messages=[Message(role="user", contents=["hi"])],
            options={"temperature": 0.7, "top_p": 0.9, "top_k": 40, "stop": ["END"]},
        )
        body = route.calls[0].request.content.decode("utf-8")
        assert '"temperature":0.7' in body
        assert '"topP":0.9' in body
        assert '"topK":40' in body
        assert '"stopSequences":["END"]' in body


def test_with_tools_returns_new_client_with_tools() -> None:
    base = GemmaClient(api_key="k", model="gemma-4-31b-it")
    assert base._tools == []
    tool = FakeTool(name="x", description="y", input_model=SearchInput)
    new_client = base.with_tools([tool])
    assert new_client is not base
    assert len(new_client._tools) == 1
    assert base._tools == []


async def test_aclose_is_idempotent() -> None:
    client = GemmaClient(api_key="k", model="gemma-4-31b-it")
    await client._ensure_client()
    await client.aclose()
    await client.aclose()
