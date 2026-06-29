from __future__ import annotations

import json
import re
import time
import uuid
from typing import Any

import structlog

from src.llm.model_capabilities import supports_vision
from src.llm.providers.base import ProviderResponse

logger = structlog.get_logger(__name__)

_SAFE_TOOL_NAME_RE = re.compile(r"[^a-zA-Z0-9_-]")

OPENAI_COMPAT_PROVIDERS: dict[str, str] = {
    "GROQ": "https://api.groq.com/openai/v1",
    "OPENROUTER": "https://openrouter.ai/api/v1",
    "DEEPSEEK": "https://api.deepseek.com",
    "NVIDIA": "https://integrate.api.nvidia.com/v1",
    "OPENAI": "https://api.openai.com/v1",
    "ANTHROPIC": "https://api.anthropic.com/v1",
    "HUGGINGFACE": "https://api-inference.huggingface.co/v1",
    "CEREBRAS": "https://api.cerebras.ai/v1",
    "GITHUB": "https://models.github.ai/inference",
    "SAMBANOVA": "https://api.sambanova.ai/v1",
    "MISTRAL": "https://api.mistral.ai/v1",
}


def _safe_provider_tool_name(native_name: str, seen: dict[str, str]) -> str:
    existing = seen.get(native_name)
    if existing:
        return existing
    safe = _SAFE_TOOL_NAME_RE.sub("_", native_name).strip("_") or "tool"
    safe = safe[:64]
    if safe not in seen:
        seen[native_name] = safe
        return safe
    suffix = 2
    while True:
        candidate = f"{safe[:59]}_{suffix}"
        if candidate not in seen:
            seen[native_name] = candidate
            return candidate
        suffix += 1


def _openai_schema_name(name: str | None) -> str:
    raw = str(name or "structured_response")
    safe = "".join(ch if ch.isalnum() or ch in {"_", "-"} else "_" for ch in raw).strip("_")
    return (safe or "structured_response")[:64]


def _strip_image_content(
    content: str | list[dict[str, Any]] | None,
) -> str | list[dict[str, Any]] | None:
    if not isinstance(content, list):
        return content
    has_images = any(p.get("type") == "image_url" for p in content)
    text_parts = [p for p in content if p.get("type") != "image_url"]
    if has_images:
        text_parts.append({"type": "text", "text": "[المستخدم أرسل صورة — تم استخدامها في البحث عن المنتجات المشابهة]"})
    if not text_parts:
        return None
    if len(text_parts) == 1 and text_parts[0].get("type") == "text":
        return text_parts[0]["text"]
    return text_parts


def _message_value(message: Any, key: str, default: Any = None) -> Any:
    if isinstance(message, dict):
        return message.get(key, default)
    return getattr(message, key, default)


def _message_content(message: Any) -> str | list[dict[str, Any]] | None:
    content = _message_value(message, "content")
    if isinstance(content, list):
        return content
    if content is not None:
        return str(content)
    contents = _message_value(message, "contents")
    if isinstance(contents, list):
        return contents
    if contents is not None:
        return str(contents)
    return None


class LLMClient:
    def __init__(
        self,
        provider: str,
        model: str,
        api_key: str,
        base_url: str | None = None,
        **kwargs: Any,
    ) -> None:
        self.provider = provider.upper()
        self.model = model
        self.api_key = api_key
        self.base_url = base_url
        self.kwargs = kwargs

        self._company_id: str | None = kwargs.get("company_id")
        self._key_id: str | None = kwargs.get("key_id")

        if self.provider == "OLLAMA":
            self.base_url = base_url or "http://localhost:11434"
        elif self.provider in OPENAI_COMPAT_PROVIDERS:
            self.base_url = base_url or OPENAI_COMPAT_PROVIDERS[self.provider]

    # ------------------------------------------------------------------
    # Fallback logging (same INSERT SQL as ProviderAdapter)
    # ------------------------------------------------------------------
    async def _write_provider_log(
        self,
        *,
        action: str,
        status: str,
        latency_ms: int | None,
        metadata: dict | None,
    ) -> None:
        try:
            from src.db.session import async_session
            from sqlalchemy import text

            provider_name = self.provider
            if not provider_name:
                return

            log_id = "apl_" + uuid.uuid4().hex[:22]

            async with async_session() as db:
                await db.execute(
                    text("""
                        INSERT INTO public.ai_provider_logs
                            (id, provider, "keyId", "companyId", action, status, "latencyMs", model, metadata, "createdAt")
                        VALUES
                            (:id, :provider, :key_id, :company_id, :action, :status, :latency_ms, :model, CAST(:metadata AS jsonb), NOW())
                    """),
                    {
                        "id": log_id,
                        "provider": provider_name,
                        "key_id": self._key_id,
                        "company_id": self._company_id,
                        "action": action,
                        "status": status,
                        "latency_ms": latency_ms,
                        "model": self.model,
                        "metadata": json.dumps(metadata) if metadata else "{}",
                    },
                )
                await db.commit()
        except Exception as _log_exc:
            logger.warning("provider_log_write_failed", error=str(_log_exc))

    # ------------------------------------------------------------------
    # Main generation method
    # ------------------------------------------------------------------
    async def generate(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        **options: Any,
    ) -> ProviderResponse:
        _t0 = time.monotonic()
        try:
            if self.provider == "GOOGLE":
                response = await self._generate_google(messages, tools, options)
            else:
                response = await self._generate_openai_compat(messages, tools, options)
            _latency_ms = int((time.monotonic() - _t0) * 1000)
            await self._write_provider_log(
                action="generation_success",
                status="success",
                latency_ms=_latency_ms,
                metadata={"tokens": response.usage} if response.usage else None,
            )
            return response
        except Exception as exc:
            _latency_ms = int((time.monotonic() - _t0) * 1000)
            await self._write_provider_log(
                action="generation_failed",
                status="failed",
                latency_ms=_latency_ms,
                metadata={"error": str(exc)[:300]},
            )
            raise

    # ------------------------------------------------------------------
    # OpenAI-compatible providers
    # ------------------------------------------------------------------
    def _normalize_openai_messages(
        self,
        messages: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        vision_ok = supports_vision(self.model, self.provider)
        normalized = []
        for msg in messages:
            m: dict[str, Any] = {"role": _message_value(msg, "role", "user") or "user"}
            content = _message_content(msg)
            if not vision_ok:
                content = _strip_image_content(content)
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

    def _sanitize_tools(self, tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
        seen: dict[str, str] = {}
        sanitized = []
        for tool in tools:
            func = tool.get("function", tool)
            native_name = str(func.get("name") or "").strip()
            if not native_name:
                continue
            provider_name = _safe_provider_tool_name(native_name, seen)
            params = func.get("parameters", {})
            if hasattr(params, "model_json_schema"):
                params = params.model_json_schema()
            if not isinstance(params, dict):
                params = {"type": "object"}
            params.setdefault("type", "object")
            sanitized.append({
                "type": "function",
                "function": {
                    "name": provider_name,
                    "description": str(func.get("description") or ""),
                    "parameters": params,
                },
            })
        return sanitized

    async def _generate_openai_compat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None,
        options: dict[str, Any],
    ) -> ProviderResponse:
        import openai

        client = openai.AsyncOpenAI(
            base_url=self.base_url,
            api_key=self.api_key,
        )

        body_messages = self._normalize_openai_messages(messages)
        openai_tools = self._sanitize_tools(tools) if tools else None

        extra_params: dict[str, Any] = {}

        output_schema = options.get("output_schema")
        if output_schema is not None:
            extra_params["response_format"] = self._build_response_format(output_schema)

        tool_choice = options.get("tool_choice")
        if openai_tools:
            extra_params["tools"] = openai_tools
            extra_params["tool_choice"] = tool_choice if tool_choice is not None else "auto"
            if self.provider == "DEEPSEEK":
                extra_params["parallel_tool_calls"] = False

        response = await client.chat.completions.create(
            model=self.model,
            messages=body_messages,
            temperature=options.get("temperature"),
            max_tokens=options.get("max_tokens"),
            top_p=options.get("top_p"),
            **extra_params,
        )

        choice = response.choices[0]
        message = choice.message
        text = message.content or ""

        raw_tool_calls = message.tool_calls or []
        tool_calls = []
        for tc in raw_tool_calls:
            tool_calls.append({
                "id": tc.id,
                "type": tc.type,
                "function": {
                    "name": tc.function.name,
                    "arguments": tc.function.arguments,
                },
            })

        usage = response.usage.model_dump() if response.usage else None
        finish_reason = choice.finish_reason

        return ProviderResponse(
            text=text,
            tool_calls=tool_calls,
            usage=usage,
            model=response.model or self.model,
            provider=self.provider,
            raw=response.model_dump(),
            finish_reason=finish_reason,
        )

    def _build_response_format(self, output_schema: Any) -> dict[str, Any]:
        schema = output_schema
        if hasattr(schema, "model_json_schema"):
            schema = schema.model_json_schema()
        if isinstance(schema, dict) and schema.get("type") == "json_schema" and isinstance(schema.get("json_schema"), dict):
            return schema
        if isinstance(schema, dict) and isinstance(schema.get("json_schema"), dict):
            return {"type": "json_schema", "json_schema": schema["json_schema"]}
        return {
            "type": "json_schema",
            "json_schema": {
                "name": _openai_schema_name(schema.get("title") if isinstance(schema, dict) else None),
                "strict": True,
                "schema": schema,
            },
        }

    # ------------------------------------------------------------------
    # Google provider
    # ------------------------------------------------------------------
    def _gemini_contents(
        self,
        messages: list[dict[str, Any]],
    ) -> tuple[str | None, list[dict[str, Any]]]:
        from src.context.multimodal import data_url_to_inline_data

        system_parts: list[str] = []
        contents: list[dict[str, Any]] = []
        for msg in messages:
            role = str(_message_value(msg, "role", "") or "")
            content = _message_content(msg)
            if role == "system":
                if content:
                    system_parts.append(str(content))
                continue
            if role == "user":
                parts = self._gemini_user_parts(content, data_url_to_inline_data)
                contents.append({"role": "user", "parts": parts})
            elif role in ("assistant", "model"):
                parts: list[dict[str, Any]] = []
                if content:
                    parts.append({"text": str(content)})
                tool_calls = _message_value(msg, "tool_calls", []) or []
                for tc in tool_calls:
                    func = _message_value(tc, "function", {}) or {}
                    parts.append({
                        "functionCall": {
                            "name": _message_value(func, "name", "") or "",
                            "args": _message_value(func, "arguments", {}) or {},
                        },
                    })
                contents.append({"role": "model", "parts": parts})
            elif role == "tool":
                tc_content = str(content) if content else ""
                contents.append({
                    "role": "function",
                    "parts": [{"functionResponse": {"name": tc_content, "response": {"result": tc_content}}}],
                })
        system_text = "\n".join(system_parts) if system_parts else None
        return system_text, contents

    def _gemini_user_parts(
        self,
        content: str | list[dict[str, Any]] | None,
        data_url_fn: Any,
    ) -> list[dict[str, Any]]:
        if not isinstance(content, list):
            text = str(content) if content else ""
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
            url = str(image.get("url") or "") if isinstance(image, dict) else str(image) if isinstance(image, str) else ""
            if not url:
                continue
            inline = data_url_fn(url) if callable(data_url_fn) else None
            if inline:
                mime_type, data = inline
                parts.append({"inlineData": {"mimeType": mime_type, "data": data}})
            elif url.startswith(("http://", "https://")):
                mime = "image/jpeg"
                lower = url.lower().split("?", 1)[0]
                if lower.endswith(".png"):
                    mime = "image/png"
                elif lower.endswith(".webp"):
                    mime = "image/webp"
                elif lower.endswith(".gif"):
                    mime = "image/gif"
                parts.append({"fileData": {"mimeType": mime, "fileUri": url}})
        return parts

    def _gemini_tools(self, tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
        seen: dict[str, str] = {}
        defs = []
        for tool in tools:
            func = tool.get("function", tool)
            native_name = str(func.get("name") or "").strip()
            if not native_name:
                continue
            provider_name = _safe_provider_tool_name(native_name, seen)
            params = func.get("parameters", func.get("input_schema", {}))
            if hasattr(params, "model_json_schema"):
                params = params.model_json_schema()
            if not isinstance(params, dict):
                params = {"type": "object"}
            params.setdefault("type", "object")
            defs.append({
                "name": provider_name,
                "description": str(func.get("description") or ""),
                "parameters": params,
            })
        return [{"functionDeclarations": defs}]

    def _parse_gemini_response(self, data: dict[str, Any]) -> ProviderResponse:
        text = ""
        tool_calls: list[dict[str, Any]] = []
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

    async def _generate_google(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None,
        options: dict[str, Any],
    ) -> ProviderResponse:
        import google.genai as genai
        from google.genai import types

        client = genai.Client(api_key=self.api_key)

        system_instruction, contents = self._gemini_contents(messages)
        gemini_tools = self._gemini_tools(tools) if tools else None

        config_kwargs: dict[str, Any] = {}
        if options.get("temperature") is not None:
            config_kwargs["temperature"] = options["temperature"]
        if options.get("max_tokens") is not None:
            config_kwargs["max_output_tokens"] = options["max_tokens"]
        if options.get("top_p") is not None:
            config_kwargs["top_p"] = options["top_p"]
        if options.get("top_k") is not None:
            config_kwargs["top_k"] = options["top_k"]
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction
        if gemini_tools:
            config_kwargs["tools"] = genai_tools_from_dicts(gemini_tools)

        output_schema = options.get("output_schema")
        if output_schema is not None:
            config_kwargs["response_mime_type"] = "application/json"
            schema_dict = output_schema
            if hasattr(schema_dict, "model_json_schema"):
                schema_dict = schema_dict.model_json_schema()
            if isinstance(schema_dict, dict):
                inner = schema_dict.get("json_schema", {}).get("schema") if schema_dict.get("type") == "json_schema" else schema_dict
                config_kwargs["response_schema"] = _gemini_clean_schema(inner or schema_dict)

        config = types.GenerateContentConfig(**config_kwargs)

        response = client.models.generate_content(
            model=self.model,
            contents=contents,
            config=config,
        )

        raw = response.model_dump() if hasattr(response, "model_dump") else {}
        return self._parse_gemini_response(raw)


def genai_tools_from_dicts(tool_list: list[dict[str, Any]]) -> list[Any]:
    from google.genai import types

    result = []
    for td in tool_list:
        fds = td.get("functionDeclarations", [])
        gemini_fds = []
        for fd in fds:
            gemini_fds.append(
                types.FunctionDeclaration(
                    name=fd["name"],
                    description=fd.get("description", ""),
                    parameters=_dict_to_schema(fd.get("parameters", {"type": "object"})),
                )
            )
        result.append(types.Tool(function_declarations=gemini_fds))
    return result


def _dict_to_schema(schema_dict: dict[str, Any]) -> Any:
    from google.genai import types

    return types.Schema(**schema_dict) if schema_dict.get("type") else types.Schema(type="OBJECT", **schema_dict)


def _gemini_clean_schema(schema: dict[str, Any]) -> dict[str, Any]:
    import copy

    converted = copy.deepcopy(schema)

    def convert_node(node: Any) -> Any:
        if isinstance(node, list):
            return [convert_node(item) for item in node]
        if not isinstance(node, dict):
            return node
        result: dict[str, Any] = {}
        for key, value in node.items():
            if key in {"additionalProperties", "const", "minimum", "maximum"}:
                continue
            if key == "type" and isinstance(value, list):
                non_null = [item for item in value if item != "null"]
                if non_null:
                    result["type"] = non_null[0]
                if "null" in value:
                    result["nullable"] = True
                continue
            result[key] = convert_node(value)
        return result

    return convert_node(converted)


if __name__ == "__main__":
    """Self-test: verify init works for all providers.

    Run via the installed package (requires .env / database):
        python -c "from src.llm.client import LLMClient; ..."
    or within the app container.
    """
    import asyncio

    async def _test_init() -> None:
        for provider in ["GOOGLE", "GROQ", "OPENROUTER", "DEEPSEEK", "NVIDIA", "OPENAI", "ANTHROPIC", "HUGGINGFACE", "CEREBRAS", "GITHUB", "SAMBANOVA", "MISTRAL", "OLLAMA"]:
            client = LLMClient(
                provider=provider,
                model="test-model",
                api_key="sk-test",
            )
            print(f"  OK  {provider} -> base_url={client.base_url}")
        print("All providers initialized successfully.")

    asyncio.run(_test_init())
