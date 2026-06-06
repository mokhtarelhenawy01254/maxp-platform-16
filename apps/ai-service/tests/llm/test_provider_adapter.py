from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel

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
