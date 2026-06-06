from __future__ import annotations

from typing import Any

import httpx
import structlog

from src.llm.providers.base import BaseProvider, ProviderResponse

logger = structlog.get_logger(__name__)

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


def _message_value(message: Any, key: str, default: Any = None) -> Any:
    if isinstance(message, dict):
        return message.get(key, default)
    return getattr(message, key, default)


def _message_content(message: Any) -> str:
    content = _message_value(message, "content")
    if content is not None:
        return str(content)

    contents = _message_value(message, "contents")
    if isinstance(contents, list):
        return "\n".join(str(item) for item in contents if item is not None)
    if contents is not None:
        return str(contents)
    return ""


class GoogleProvider(BaseProvider):
    def __init__(self, api_key: str, model: str, **kwargs: Any) -> None:
        super().__init__(api_key, model, **kwargs)
        self.base_url = kwargs.get("base_url", GEMINI_BASE_URL)

    async def generate_response(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        **options: Any,
    ) -> ProviderResponse:
        system_instruction, contents = self._build_contents(messages)
        gen_config = self._generation_config(options)

        body: dict[str, Any] = {
            "contents": contents,
            "generationConfig": gen_config,
        }
        if system_instruction:
            body["systemInstruction"] = {"parts": [{"text": system_instruction}]}
        if tools:
            body["tools"] = [{"functionDeclarations": self._normalize_tools(tools)}]

        url = f"{self.base_url}/models/{self.model}:generateContent"

        async with httpx.AsyncClient(timeout=self.timeout_ms / 1000, trust_env=False) as client:
            response = await client.post(
                url,
                headers={"x-goog-api-key": self.api_key},
                json=body,
            )
            response.raise_for_status()
            data = response.json()

        return self._parse_response(data)

    def _build_contents(
        self, messages: list[dict[str, Any]]
    ) -> tuple[str | None, list[dict[str, Any]]]:
        system_parts = []
        contents = []
        for msg in messages:
            role = str(_message_value(msg, "role", "") or "")
            content = _message_content(msg)
            if role == "system":
                system_parts.append(content)
            elif role == "user":
                contents.append({"role": "user", "parts": [{"text": content}]})
            elif role in ("assistant", "model"):
                parts: list[dict[str, Any]] = []
                if content:
                    parts.append({"text": content})
                tool_calls = _message_value(msg, "tool_calls", []) or []
                for tc in tool_calls:
                    func = _message_value(tc, "function", {}) or {}
                    parts.append({
                        "functionCall": {
                            "name": _message_value(func, "name", "") or "",
                            "args": _message_value(func, "arguments", {}) or {},
                        }
                    })
                contents.append({"role": "model", "parts": parts})
            elif role == "tool":
                contents.append({
                    "role": "function",
                    "parts": [{"functionResponse": {"name": content, "response": {"result": content}}}],
                })
        system_text = "\n".join(system_parts) if system_parts else None
        return system_text, contents

    def _generation_config(self, options: dict[str, Any]) -> dict[str, Any]:
        config: dict[str, Any] = {}
        if options.get("temperature") is not None:
            config["temperature"] = options["temperature"]
        if options.get("max_tokens") is not None:
            config["maxOutputTokens"] = options["max_tokens"]
        if options.get("top_p") is not None:
            config["topP"] = options["top_p"]
        if options.get("top_k") is not None:
            config["topK"] = options["top_k"]
        return config

    def _normalize_tools(self, tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
        defs = []
        for tool in tools:
            func = tool.get("function", tool)
            defs.append({
                "name": func.get("name", ""),
                "description": func.get("description", ""),
                "parameters": func.get("parameters", func.get("input_schema", {})),
            })
        return defs

    def _parse_response(self, data: dict[str, Any]) -> ProviderResponse:
        text = ""
        tool_calls = []
        candidates = data.get("candidates", [])
        if candidates:
            content = candidates[0].get("content", {})
            parts = content.get("parts", [])
            for part in parts:
                if "text" in part:
                    text += part["text"]
                if "functionCall" in part:
                    fc = part["functionCall"]
                    tool_calls.append({
                        "id": fc.get("name", ""),
                        "type": "function",
                        "function": {
                            "name": fc.get("name", ""),
                            "arguments": fc.get("args", {}),
                        },
                    })
        usage = data.get("usageMetadata")
        return ProviderResponse(
            text=text,
            tool_calls=tool_calls,
            usage=usage,
            model=data.get("model", self.model),
            provider="GOOGLE",
            raw=data,
        )
