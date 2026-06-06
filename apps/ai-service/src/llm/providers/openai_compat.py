from __future__ import annotations

from typing import Any

import httpx
import structlog

from src.llm.providers.base import BaseProvider, ProviderResponse

logger = structlog.get_logger(__name__)


def _message_value(message: Any, key: str, default: Any = None) -> Any:
    if isinstance(message, dict):
        return message.get(key, default)
    return getattr(message, key, default)


def _message_content(message: Any) -> str | None:
    content = _message_value(message, "content")
    if content is not None:
        return str(content)

    contents = _message_value(message, "contents")
    if isinstance(contents, list):
        return "\n".join(str(item) for item in contents if item is not None)
    if contents is not None:
        return str(contents)
    return None


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

        async with httpx.AsyncClient(timeout=self.timeout_ms / 1000, trust_env=False) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=body,
            )
            if response.status_code >= 400:
                body_preview = response.text[:1000]
                logger.error(
                    "openai_compat_request_failed",
                    provider=self.provider_name,
                    model=self.model,
                    status_code=response.status_code,
                    response=body_preview,
                )
                raise httpx.HTTPStatusError(
                    f"{self.provider_name} chat completion failed "
                    f"{response.status_code}: {body_preview}",
                    request=response.request,
                    response=response,
                )
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
            m: dict[str, Any] = {"role": _message_value(msg, "role", "user") or "user"}
            content = _message_content(msg)
            if content is not None:
                m["content"] = content
            tool_calls = _message_value(msg, "tool_calls")
            if tool_calls:
                m["tool_calls"] = tool_calls
            tool_call_id = _message_value(msg, "tool_call_id")
            if tool_call_id:
                m["tool_call_id"] = tool_call_id
            normalized.append(m)
        return normalized

    def get_available_models(self) -> list[str]:
        return [self.model]
