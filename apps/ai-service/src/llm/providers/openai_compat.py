from __future__ import annotations

from typing import Any

import httpx
import structlog

from src.llm.providers.base import BaseProvider, ProviderResponse

logger = structlog.get_logger(__name__)


class OpenAICompatProvider(BaseProvider):
    def __init__(self, api_key: str, model: str, **kwargs: Any) -> None:
        super().__init__(api_key, model, **kwargs)
        self.base_url = kwargs.get("base_url", "https://api.openai.com/v1")
        self.provider_name = kwargs.get("provider_name", "OPENAI_COMPAT")
        self.extra_headers: dict[str, str] = kwargs.get("extra_headers") or {}

    async def generate_response(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        **options: Any,
    ) -> ProviderResponse:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        headers.update(self.extra_headers)

        body: dict[str, Any] = {
            "model": self.model,
            "messages": self._normalize_messages(messages),
        }
        if tools:
            body["tools"] = tools
        if options.get("temperature") is not None:
            body["temperature"] = options["temperature"]
        if options.get("max_tokens") is not None:
            body["max_tokens"] = options["max_tokens"]
        if options.get("top_p") is not None:
            body["top_p"] = options["top_p"]

        async with httpx.AsyncClient(timeout=self.timeout_ms / 1000) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=body,
            )
            response.raise_for_status()
            data = response.json()

        choice = data["choices"][0]
        message = choice.get("message", {})
        text = message.get("content") or ""
        raw_tool_calls = message.get("tool_calls") or []

        tool_calls = []
        for tc in raw_tool_calls:
            tool_calls.append({
                "id": tc.get("id", ""),
                "type": tc.get("type", "function"),
                "function": tc.get("function", {}),
            })

        usage = data.get("usage")
        finish_reason = choice.get("finish_reason")

        return ProviderResponse(
            text=text,
            tool_calls=tool_calls,
            usage=usage,
            model=data.get("model", self.model),
            provider=self.provider_name,
            raw=data,
            finish_reason=finish_reason,
        )

    def _normalize_messages(self, messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
        normalized = []
        for msg in messages:
            m: dict[str, Any] = {"role": msg.get("role", "user")}
            content = msg.get("content")
            if content is not None:
                m["content"] = content
            if msg.get("tool_calls"):
                m["tool_calls"] = msg["tool_calls"]
            if msg.get("tool_call_id"):
                m["tool_call_id"] = msg["tool_call_id"]
            normalized.append(m)
        return normalized

    def get_available_models(self) -> list[str]:
        return [self.model]
