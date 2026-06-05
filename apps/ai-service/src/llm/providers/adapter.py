from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from src.llm.providers.base import BaseProvider


@dataclass
class AdapterResponse:
    text: str = ""
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    raw: Any = None
    usage: dict[str, Any] | None = None
    model: str = ""


class ProviderAdapter:
    """Wraps a BaseProvider to expose an agent_framework-compatible interface.

    agent_framework expects a client with:
        async def get_response(messages, options) -> AdapterResponse
    where messages is a list of dicts with role/content and options may
    contain temperature, max_tokens, etc.
    """

    def __init__(
        self,
        provider: BaseProvider,
        *,
        tools: list[Any] | None = None,
        system_prompt: str | None = None,
    ) -> None:
        self._provider = provider
        self._tools = tools
        self._system_prompt = system_prompt

    @property
    def model(self) -> str:
        return self._provider.model

    def with_tools(self, tools: list[Any]) -> ProviderAdapter:
        return ProviderAdapter(
            self._provider,
            tools=tools,
            system_prompt=self._system_prompt,
        )

    async def get_response(
        self,
        messages: list[dict[str, Any]],
        options: dict[str, Any] | None = None,
    ) -> AdapterResponse:
        messages = list(messages)
        if self._system_prompt:
            messages.insert(0, {"role": "system", "content": self._system_prompt})

        tool_dicts = None
        if self._tools:
            tool_dicts = []
            for t in self._tools:
                if hasattr(t, "_to_dict"):
                    tool_dicts.append(t._to_dict())
                elif isinstance(t, dict):
                    tool_dicts.append(t)
                else:
                    tool_dicts.append({"name": str(getattr(t, "name", t))})

        opts = options or {}
        provider_response = await self._provider.generate_response(
            messages=messages,
            tools=tool_dicts,
            temperature=opts.get("temperature"),
            max_tokens=opts.get("max_tokens"),
            top_p=opts.get("top_p"),
        )

        raw_tool_calls = []
        for tc in provider_response.tool_calls:
            func = tc.get("function", {})
            arguments = func.get("arguments", {})
            if isinstance(arguments, str):
                import json
                try:
                    arguments = json.loads(arguments)
                except json.JSONDecodeError:
                    arguments = {}
            raw_tool_calls.append({
                "id": tc.get("id", ""),
                "type": tc.get("type", "function"),
                "function": {
                    "name": func.get("name", ""),
                    "arguments": arguments,
                },
            })

        return AdapterResponse(
            text=provider_response.text,
            tool_calls=raw_tool_calls,
            raw=provider_response.raw,
            usage=provider_response.usage,
            model=provider_response.model,
        )

    async def aclose(self) -> None:
        pass
