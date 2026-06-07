from __future__ import annotations

from typing import Any

import httpx
import structlog

from src.context.multimodal import data_url_to_inline_data
from src.llm.providers.base import BaseProvider, ProviderResponse

logger = structlog.get_logger(__name__)

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


def _schema_dict(output_schema: Any) -> dict[str, Any] | None:
    if output_schema is None:
        return None
    if hasattr(output_schema, "model_json_schema"):
        return output_schema.model_json_schema()
    if not isinstance(output_schema, dict):
        return None
    if output_schema.get("type") == "json_schema" and isinstance(output_schema.get("json_schema"), dict):
        return output_schema["json_schema"].get("schema")
    if isinstance(output_schema.get("json_schema"), dict):
        return output_schema["json_schema"].get("schema")
    if output_schema.get("responseSchema"):
        return output_schema.get("responseSchema")
    return output_schema


def _message_value(message: Any, key: str, default: Any = None) -> Any:
    if isinstance(message, dict):
        return message.get(key, default)
    return getattr(message, key, default)


def _message_content(message: Any) -> str:
    content = _message_value(message, "content")
    if isinstance(content, list):
        return "\n".join(
            str(part.get("text") or "")
            for part in content
            if isinstance(part, dict) and part.get("type") == "text"
        ).strip()
    if content is not None:
        return str(content)

    contents = _message_value(message, "contents")
    if isinstance(contents, list):
        return "\n".join(str(item) for item in contents if item is not None)
    if contents is not None:
        return str(contents)
    return ""


def _image_mime_from_url(url: str) -> str:
    lower = url.lower().split("?", 1)[0]
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".webp"):
        return "image/webp"
    if lower.endswith(".gif"):
        return "image/gif"
    return "image/jpeg"


def _message_parts(message: Any) -> list[dict[str, Any]]:
    content = _message_value(message, "content")
    if not isinstance(content, list):
        text = _message_content(message)
        return [{"text": text}] if text else []

    parts: list[dict[str, Any]] = []
    for item in content:
        if not isinstance(item, dict):
            parts.append({"text": str(item)})
            continue
        item_type = item.get("type")
        if item_type == "text":
            text = str(item.get("text") or "")
            if text:
                parts.append({"text": text})
            continue
        if item_type != "image_url":
            continue
        image = item.get("image_url") or {}
        if isinstance(image, str):
            url = image
        elif isinstance(image, dict):
            url = str(image.get("url") or "")
        else:
            url = ""
        if not url:
            continue
        inline = data_url_to_inline_data(url)
        if inline:
            mime_type, data = inline
            parts.append({"inlineData": {"mimeType": mime_type, "data": data}})
        elif url.startswith(("http://", "https://")):
            parts.append({
                "fileData": {
                    "mimeType": _image_mime_from_url(url),
                    "fileUri": url,
                }
            })
    return parts


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
                contents.append({"role": "user", "parts": _message_parts(msg)})
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
        schema = _schema_dict(options.get("output_schema"))
        if schema:
            config["responseMimeType"] = "application/json"
            config["responseSchema"] = schema
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
