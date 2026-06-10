from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock

import httpx

from agent_framework import FunctionTool
from pydantic import BaseModel

from src.llm.agent_client_factory import build_provider_client_async
from src.llm.providers.adapter import ProviderAdapter
from src.llm.providers.base import BaseProvider, ProviderResponse


class SearchInput(BaseModel):
    query: str


async def search_tool(input_data: SearchInput) -> dict[str, Any]:
    return {"status": "ok", "query": input_data.query}


class RecordingProvider(BaseProvider):
    def __init__(self) -> None:
        super().__init__("test-key", "test-model")
        self.calls: list[dict[str, Any]] = []

    async def generate_response(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        **options: Any,
    ) -> ProviderResponse:
        self.calls.append({"messages": messages, "tools": tools, "options": options})
        return ProviderResponse(
            text="done",
            tool_calls=[
                {
                    "id": "call_1",
                    "type": "function",
                    "function": {"name": "product_search", "arguments": {"query": "x"}},
                }
            ],
        )


class RateLimitedProvider(BaseProvider):
    def __init__(self) -> None:
        super().__init__(
            "rate-limited-key",
            "llama-3.3-70b-versatile",
            key_id="groq-key",
            provider_type="GROQ",
            company_id="comp1",
        )

    async def generate_response(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        **options: Any,
    ) -> ProviderResponse:
        request = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
        response = httpx.Response(
            429,
            request=request,
            headers={"retry-after": "2"},
            json={"error": {"code": "rate_limit_exceeded"}},
        )
        raise httpx.HTTPStatusError("rate limited", request=request, response=response)


class ProviderQuotaLimitedProvider(BaseProvider):
    def __init__(self) -> None:
        super().__init__(
            "quota-limited-key",
            "llama-3.3-70b-versatile",
            key_id="groq-key",
            provider_type="GROQ",
            company_id="comp1",
        )

    async def generate_response(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        **options: Any,
    ) -> ProviderResponse:
        request = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
        response = httpx.Response(
            429,
            request=request,
            json={
                "error": {
                    "message": (
                        "Rate limit reached for model llama-3.3-70b-versatile "
                        "in organization org_123 on tokens per day (TPD)."
                    )
                }
            },
        )
        raise httpx.HTTPStatusError("provider quota exhausted", request=request, response=response)


class ToolUseFailedProvider(BaseProvider):
    def __init__(self) -> None:
        super().__init__(
            "tool-use-failed-key",
            "openai/gpt-oss-120b",
            key_id="groq-tool-key",
            provider_type="GROQ",
            company_id="comp1",
        )

    async def generate_response(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        **options: Any,
    ) -> ProviderResponse:
        request = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
        response = httpx.Response(
            400,
            request=request,
            json={
                "error": {
                    "message": "Tool choice is none, but model called a tool",
                    "code": "tool_use_failed",
                }
            },
        )
        raise httpx.HTTPStatusError("tool_use_failed", request=request, response=response)


class BackupProvider(BaseProvider):
    def __init__(self) -> None:
        super().__init__(
            "backup-key",
            "gemini-2.5-flash",
            key_id="google-key",
            provider_type="GOOGLE",
            company_id="comp1",
        )
        self.calls: list[dict[str, Any]] = []

    async def generate_response(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        **options: Any,
    ) -> ProviderResponse:
        self.calls.append({"messages": messages, "tools": tools, "options": options})
        return ProviderResponse(
            text="model generated memory reply",
            usage={"total_tokens": 7},
            model=self.model,
            provider="GOOGLE",
        )


class FakeProviderFactory:
    def __init__(self) -> None:
        self.failover_calls: list[dict[str, Any]] = []

    async def get_provider(
        self,
        provider_type: str,
        model: str | None = None,
        company_id: str | None = None,
        *,
        key_id: str | None = None,
    ) -> BaseProvider | None:
        return None


async def test_adapter_aliases_dotted_tool_names_and_maps_calls_back() -> None:
    provider = RecordingProvider()
    tool = FunctionTool(
        name="product.search",
        description="Search products",
        func=search_tool,
        input_model=SearchInput,
    )

    response = await ProviderAdapter(provider, tools=[tool]).get_response([
        {"role": "user", "content": "find product"},
    ])

    sent_tool = provider.calls[0]["tools"][0]
    assert sent_tool["function"]["name"] == "product_search"
    assert sent_tool["function"]["parameters"]["type"] == "object"
    assert response.tool_calls[0]["function"]["name"] == "product.search"


async def test_adapter_can_disable_tools_for_final_reply_generation() -> None:
    provider = RecordingProvider()
    tool = FunctionTool(
        name="customer.info",
        description="Read customer info",
        func=search_tool,
        input_model=SearchInput,
    )

    await ProviderAdapter(provider, tools=[tool]).get_response(
        [{"role": "user", "content": "اسمك ايه؟"}],
        options={"tools_enabled": False},
    )

    assert provider.calls[0]["tools"] is None


async def test_adapter_preserves_multimodal_user_content() -> None:
    provider = RecordingProvider()

    await ProviderAdapter(provider).get_response([
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

    sent_content = provider.calls[0]["messages"][0]["content"]
    assert isinstance(sent_content, list)
    assert sent_content[0]["type"] == "text"
    assert sent_content[1]["type"] == "image_url"
    assert sent_content[1]["image_url"]["detail"] == "low"


async def test_adapter_forwards_output_schema_to_provider() -> None:
    provider = RecordingProvider()
    schema = {
        "type": "object",
        "properties": {"status": {"type": "string"}},
        "required": ["status"],
    }

    await ProviderAdapter(provider).get_response(
        [{"role": "user", "content": "return status"}],
        options={"output_schema": schema},
    )

    assert provider.calls[0]["options"]["output_schema"] == schema


async def test_adapter_records_rate_limit_and_raises(monkeypatch) -> None:
    record_failure = AsyncMock()
    monkeypatch.setattr("src.llm.providers.adapter.model_manager.record_failure", record_failure)

    try:
        await ProviderAdapter(
            RateLimitedProvider(),
            company_id="comp1",
            provider_type="GROQ",
            key_id="groq-key",
        ).get_response([{"role": "user", "content": "فاكر سألتك عن ايه؟"}])
    except httpx.HTTPStatusError:
        pass
    else:
        raise AssertionError("Expected HTTPStatusError to propagate")

    record_failure.assert_awaited_once_with("groq-key", "429", retry_after_ms=2000)


async def test_adapter_records_provider_quota_and_raises(monkeypatch) -> None:
    record_failure = AsyncMock()
    monkeypatch.setattr("src.llm.providers.adapter.model_manager.record_failure", record_failure)

    try:
        await ProviderAdapter(
            ProviderQuotaLimitedProvider(),
            company_id="comp1",
            provider_type="GROQ",
            key_id="groq-key",
        ).get_response([{"role": "user", "content": "فاكر سألتك عن ايه؟"}])
    except httpx.HTTPStatusError:
        pass
    else:
        raise AssertionError("Expected HTTPStatusError to propagate")

    record_failure.assert_awaited_once_with("groq-key", "QUOTA", retry_after_ms=None)


async def test_adapter_records_tool_use_failure_and_raises(monkeypatch) -> None:
    record_failure = AsyncMock()
    monkeypatch.setattr("src.llm.providers.adapter.model_manager.record_failure", record_failure)

    try:
        await ProviderAdapter(
            ToolUseFailedProvider(),
            company_id="comp1",
            provider_type="GROQ",
            key_id="groq-tool-key",
        ).get_response(
            [{"role": "user", "content": "Generate a reply from tool results."}],
            options={"tools_enabled": False},
        )
    except httpx.HTTPStatusError:
        pass
    else:
        raise AssertionError("Expected HTTPStatusError to propagate")

    record_failure.assert_awaited_once_with("groq-tool-key", "TOOL_USE_FAILED", retry_after_ms=None)


async def test_adapter_propagates_provider_quota_error_directly(monkeypatch) -> None:
    record_failure = AsyncMock()
    monkeypatch.setattr("src.llm.providers.adapter.model_manager.record_failure", record_failure)

    try:
        await ProviderAdapter(
            ProviderQuotaLimitedProvider(),
            company_id="comp1",
            provider_type="GROQ",
            key_id="groq-key",
        ).get_response([{"role": "user", "content": "عندك جزمة سودا متاحة؟"}])
    except httpx.HTTPStatusError as exc:
        assert exc.response.status_code == 429
    else:
        raise AssertionError("Expected HTTPStatusError to propagate directly")

    record_failure.assert_awaited_once_with("groq-key", "QUOTA", retry_after_ms=None)


async def test_explicit_provider_client_uses_selected_key(monkeypatch) -> None:
    provider = RecordingProvider()
    provider.config = {
        "provider_type": "GROQ",
        "key_id": "selected-groq-key",
        "company_id": "comp1",
    }
    factory = FakeProviderFactory()
    factory.get_provider = AsyncMock(return_value=provider)

    monkeypatch.setattr("src.llm.agent_client_factory.get_provider_factory", lambda: factory)

    client = await build_provider_client_async(
        "GROQ",
        model="test-model",
        company_id="comp1",
        key_id="selected-groq-key",
    )

    assert isinstance(client, ProviderAdapter)
    assert client._key_id == "selected-groq-key"
    factory.get_provider.assert_awaited_once_with(
        "GROQ",
        "test-model",
        "comp1",
        key_id="selected-groq-key",
    )
