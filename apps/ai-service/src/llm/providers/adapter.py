from __future__ import annotations

from dataclasses import dataclass, field
import re
from typing import Any

from src.llm.providers.base import BaseProvider

_SAFE_TOOL_NAME_RE = re.compile(r"[^a-zA-Z0-9_-]")


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
        self._provider_tool_names: dict[str, str] = {}
        self._native_tool_names: dict[str, str] = {}

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

        opts = options or {}
        tool_dicts = None
        if self._tools and opts.get("tools_enabled") is not False:
            self._provider_tool_names = {}
            self._native_tool_names = {}
            tool_dicts = []
            for t in self._tools:
                provider_tool = self._to_provider_tool(t)
                if provider_tool is not None:
                    tool_dicts.append(provider_tool)

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
                    "name": self._provider_tool_names.get(func.get("name", ""), func.get("name", "")),
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

    def _to_provider_tool(self, tool: Any) -> dict[str, Any] | None:
        """Convert SDK FunctionTool/dict descriptors to provider-safe schema.

        OpenAI-compatible APIs reject dots in function names (for example
        ``product.search``). MaxP keeps native dotted names internally and maps
        them to safe aliases only at the provider boundary.
        """
        if isinstance(tool, dict):
            raw = dict(tool)
        elif hasattr(tool, "to_json_schema_spec"):
            raw = tool.to_json_schema_spec()
        elif hasattr(tool, "to_dict"):
            raw = tool.to_dict()
        else:
            raw = {
                "name": str(getattr(tool, "name", tool)),
                "description": str(getattr(tool, "description", "") or ""),
                "parameters": getattr(tool, "input_model", None) or {"type": "object"},
            }

        if raw.get("type") == "function" and isinstance(raw.get("function"), dict):
            function = dict(raw["function"])
        else:
            function = {
                "name": raw.get("name"),
                "description": raw.get("description", ""),
                "parameters": raw.get("parameters") or raw.get("input_model") or raw.get("input_schema") or {},
            }

        native_name = str(function.get("name") or "").strip()
        if not native_name:
            return None

        provider_name = self._safe_provider_tool_name(native_name)
        self._provider_tool_names[provider_name] = native_name

        parameters = function.get("parameters")
        if hasattr(parameters, "model_json_schema"):
            parameters = parameters.model_json_schema()
        if not isinstance(parameters, dict):
            parameters = {"type": "object"}
        parameters.setdefault("type", "object")

        return {
            "type": "function",
            "function": {
                "name": provider_name,
                "description": str(function.get("description") or ""),
                "parameters": parameters,
            },
        }

    def _safe_provider_tool_name(self, native_name: str) -> str:
        existing = self._native_tool_names.get(native_name)
        if existing:
            return existing

        safe = _SAFE_TOOL_NAME_RE.sub("_", native_name).strip("_") or "tool"
        safe = safe[:64]
        if safe not in self._provider_tool_names:
            self._native_tool_names[native_name] = safe
            return safe
        suffix = 2
        while True:
            candidate = f"{safe[:59]}_{suffix}"
            if candidate not in self._provider_tool_names:
                self._native_tool_names[native_name] = candidate
                return candidate
            suffix += 1
