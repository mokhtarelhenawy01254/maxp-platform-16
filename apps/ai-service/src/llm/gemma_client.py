"""GemmaClient: native Gemini API client with Gemma 4 chat template injection.

This client is the Python counterpart to ``OpenAIChatCompletionClient`` but
talks directly to the native ``/v1beta/models/{model}:generateContent``
endpoint instead of the OpenAI-compat shim. The shim does not reliably apply
Gemma 4's custom chat template (six special tokens) for hosted Gemma 4
deployments, so we build the conversation in the form Gemma 4 expects.

The client is a drop-in replacement for ``OpenAIChatCompletionClient``
wherever the agent framework calls ``await client.get_response(messages)``
and reads ``response.text``. It also accepts an optional ``tools`` argument
(used by future multi-turn tool-call loops) and pre-renders them via
:mod:`src.llm.gemma_chat_template`.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

import httpx
import structlog

from src.llm.gemma_chat_template import (
    parse_tool_calls,
    render_tool_definitions,
    strip_tool_blocks,
)

logger = structlog.get_logger(__name__)

DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
DEFAULT_TIMEOUT_SECONDS = 60.0


@dataclass
class GemmaResponse:
    """Lightweight response wrapper compatible with the pipeline contract.

    The pipeline reads ``response.text`` and optionally ``response.tool_calls``.
    A subset of the raw Gemini response is also exposed for observability.
    """

    text: str
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)
    usage: dict[str, int] = field(default_factory=dict)
    model: str = ""

    def __bool__(self) -> bool:
        return bool(self.text) or bool(self.tool_calls)


def _extract_text(contents: Any) -> str:
    """Coerce ``agent_framework.Message.contents`` into a single string.

    ``contents`` is a sequence of either strings or ``TextContent`` objects.
    The agent framework usually passes a list of strings for the messages we
    send from the Python pipeline.
    """
    if contents is None:
        return ""
    if isinstance(contents, str):
        return contents
    parts: list[str] = []
    for item in contents:
        if isinstance(item, str):
            parts.append(item)
        elif hasattr(item, "text") and isinstance(item.text, str):
            parts.append(item.text)
        else:
            parts.append(str(item))
    return "\n".join(parts).strip()


def _build_contents(messages: list[Any]) -> tuple[str | None, list[dict[str, Any]]]:
    """Split ``messages`` into ``(system_instruction, contents)`` for Gemini.

    System messages become the dedicated ``systemInstruction`` field; user
    and assistant messages become alternating ``contents`` entries. Unknown
    roles (e.g. ``tool``) are folded into a user-role message so the model
    still sees the tool output text.
    """
    system_parts: list[str] = []
    contents: list[dict[str, Any]] = []
    for msg in messages:
        role = getattr(msg, "role", None) or (msg.get("role") if isinstance(msg, dict) else None)
        text = _extract_text(getattr(msg, "contents", None) or (msg.get("contents") if isinstance(msg, dict) else None))
        if role == "system":
            if text:
                system_parts.append(text)
            continue
        if role in (None, "user", "tool", "function"):
            contents.append({"role": "user", "parts": [{"text": text}]})
        elif role in ("assistant", "model"):
            contents.append({"role": "model", "parts": [{"text": text}]})
        else:
            contents.append({"role": "user", "parts": [{"text": text}]})
    system_instruction = "\n\n".join(system_parts) if system_parts else None
    return system_instruction, contents


def _merge_tools_into_system(system: str | None, tools: list[Any] | None) -> str | None:
    if not tools:
        return system
    rendered = render_tool_definitions(tools)
    if not rendered:
        return system
    if system:
        return system + "\n\n" + rendered
    return rendered


def _generation_config(options: dict[str, Any] | None) -> dict[str, Any]:
    if not options:
        return {}
    config: dict[str, Any] = {}
    if "temperature" in options:
        config["temperature"] = options["temperature"]
    if "max_tokens" in options:
        config["maxOutputTokens"] = options["max_tokens"]
    if "top_p" in options:
        config["topP"] = options["top_p"]
    if "top_k" in options:
        config["topK"] = options["top_k"]
    if "stop" in options:
        config["stopSequences"] = list(options["stop"])
    return config


class GemmaClient:
    """Async client that calls the native Gemini API for Gemma 4 models."""

    def __init__(
        self,
        api_key: str,
        model: str,
        *,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT_SECONDS,
        tools: list[Any] | None = None,
        system_prompt: str | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        if not api_key:
            msg = "GemmaClient requires a non-empty api_key"
            raise ValueError(msg)
        if not model:
            msg = "GemmaClient requires a non-empty model"
            raise ValueError(msg)
        self._api_key = api_key
        self.model = model
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._tools = list(tools or [])
        self._system_prompt = system_prompt
        self._owns_client = http_client is None
        self._http = http_client

    def with_tools(self, tools: list[Any] | None) -> GemmaClient:
        new_tools = list(tools or [])
        return GemmaClient(
            api_key=self._api_key,
            model=self.model,
            base_url=self._base_url,
            timeout=self._timeout,
            tools=new_tools,
            system_prompt=self._system_prompt,
            http_client=self._http,
        )

    def _endpoint(self) -> str:
        return f"{self._base_url}/models/{self.model}:generateContent"

    async def _ensure_client(self) -> httpx.AsyncClient:
        if self._http is None:
            self._http = httpx.AsyncClient(timeout=self._timeout, trust_env=False)
        return self._http

    async def aclose(self) -> None:
        if self._owns_client and self._http is not None:
            await self._http.aclose()
            self._http = None

    async def __aenter__(self) -> GemmaClient:
        await self._ensure_client()
        return self

    async def __aexit__(self, *_exc: object) -> None:
        await self.aclose()

    def _build_request(
        self,
        messages: list[Any],
        options: dict[str, Any] | None,
        tools_override: list[Any] | None,
    ) -> dict[str, Any]:
        system_instruction, contents = _build_contents(messages)
        tools_to_use = tools_override if tools_override is not None else self._tools
        merged_system = _merge_tools_into_system(system_instruction, tools_to_use)
        if self._system_prompt and not merged_system:
            merged_system = self._system_prompt
        elif self._system_prompt and merged_system:
            merged_system = self._system_prompt + "\n\n" + merged_system

        body: dict[str, Any] = {"contents": contents}
        if merged_system:
            body["systemInstruction"] = {"role": "system", "parts": [{"text": merged_system}]}
        gen_config = _generation_config(options)
        if gen_config:
            body["generationConfig"] = gen_config
        return body

    async def get_response(
        self,
        messages: list[Any],
        options: dict[str, Any] | None = None,
        tools: list[Any] | None = None,
    ) -> GemmaResponse:
        """Call Gemini ``generateContent`` and return a GemmaResponse."""
        body = self._build_request(messages, options, tools)
        client = await self._ensure_client()
        url = f"{self._endpoint()}?key={self._api_key}"

        logger.info(
            "gemma_client.request",
            model=self.model,
            n_messages=len(messages),
            has_tools=bool(tools if tools is not None else self._tools),
        )

        try:
            response = await client.post(url, json=body)
        except httpx.HTTPError as exc:
            logger.error("gemma_client.http_error", model=self.model, error=str(exc))
            raise

        if response.status_code >= 400:
            detail = response.text[:500] if response.text else ""
            logger.error(
                "gemma_client.api_error",
                model=self.model,
                status=response.status_code,
                detail=detail,
            )
            response.raise_for_status()

        raw = response.json()
        return self._parse_response(raw)

    def _parse_response(self, raw: dict[str, Any]) -> GemmaResponse:
        candidates = raw.get("candidates", []) or []
        text_chunks: list[str] = []
        for cand in candidates:
            for part in cand.get("content", {}).get("parts", []) or []:
                if "text" in part and isinstance(part["text"], str):
                    text_chunks.append(part["text"])
        full_text = "".join(text_chunks)
        tool_calls = parse_tool_calls(full_text)
        visible_text = strip_tool_blocks(full_text) if tool_calls else full_text
        usage_meta = raw.get("usageMetadata", {}) or {}
        usage = {
            "promptTokenCount": int(usage_meta.get("promptTokenCount", 0) or 0),
            "candidatesTokenCount": int(usage_meta.get("candidatesTokenCount", 0) or 0),
            "totalTokenCount": int(usage_meta.get("totalTokenCount", 0) or 0),
        }
        return GemmaResponse(
            text=visible_text,
            tool_calls=tool_calls,
            raw=raw,
            usage=usage,
            model=self.model,
        )


def _looks_like_function_tool(obj: Any) -> bool:
    return all(hasattr(obj, attr) for attr in ("name", "description", "input_model"))


def build_gemma_client(
    api_key: str | None,
    model: str | None,
    *,
    tools: list[Any] | None = None,
    system_prompt: str | None = None,
    base_url: str = DEFAULT_BASE_URL,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
) -> GemmaClient | None:
    """Factory: build a GemmaClient only when ``model`` is a Gemma 4 family id.

    Returns ``None`` for non-Gemma models so callers can fall back to other
    clients (e.g. ``OpenAIChatCompletionClient``) without special-casing.
    """
    from src.llm.gemma_chat_template import is_gemma_model

    if not is_gemma_model(model):
        return None
    if not api_key:
        msg = "GemmaClient requires google_api_key; none configured"
        raise ValueError(msg)
    return GemmaClient(
        api_key=api_key,
        model=model or "",
        base_url=base_url,
        timeout=timeout,
        tools=tools or [],
        system_prompt=system_prompt,
    )


__all__ = [
    "DEFAULT_BASE_URL",
    "DEFAULT_TIMEOUT_SECONDS",
    "GemmaClient",
    "GemmaResponse",
    "_looks_like_function_tool",
    "build_gemma_client",
]


def _export_payload_for_debug(body: dict[str, Any]) -> str:
    """Return a compact JSON string for the request body, useful in tests."""
    return json.dumps(body, ensure_ascii=False, default=str)
