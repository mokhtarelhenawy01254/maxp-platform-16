from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

import httpx
import structlog

from src.llm.model_manager import model_manager
from src.llm.providers.base import BaseProvider
from src.llm.providers.factory import get_provider_factory

_SAFE_TOOL_NAME_RE = re.compile(r"[^a-zA-Z0-9_-]")
logger = structlog.get_logger(__name__)


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
        company_id: str | None = None,
        provider_type: str | None = None,
        key_id: str | None = None,
        max_failover_attempts: int = 4,
        allow_provider_failover: bool = True,
    ) -> None:
        self._provider = provider
        self._tools = tools
        self._system_prompt = system_prompt
        self._company_id = company_id or _provider_config(provider, "company_id")
        self._provider_type = provider_type or _provider_config(provider, "provider_type")
        self._key_id = key_id or _provider_config(provider, "key_id")
        self._max_failover_attempts = max(1, max_failover_attempts)
        self._allow_provider_failover = allow_provider_failover
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
            company_id=self._company_id,
            provider_type=self._provider_type,
            key_id=self._key_id,
            max_failover_attempts=self._max_failover_attempts,
            allow_provider_failover=self._allow_provider_failover,
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
        output_schema = opts.get("output_schema")
        tool_dicts = None
        if self._tools and opts.get("tools_enabled") is not False:
            self._provider_tool_names = {}
            self._native_tool_names = {}
            tool_dicts = []
            for t in self._tools:
                provider_tool = self._to_provider_tool(t)
                if provider_tool is not None:
                    tool_dicts.append(provider_tool)

        provider_response = await self._generate_response_with_failover(
            messages=messages,
            tools=tool_dicts,
            temperature=opts.get("temperature"),
            max_tokens=opts.get("max_tokens"),
            top_p=opts.get("top_p"),
            output_schema=output_schema,
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

    async def _generate_response_with_failover(
        self,
        *,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None,
        temperature: Any,
        max_tokens: Any,
        top_p: Any,
        output_schema: Any = None,
    ) -> Any:
        provider = self._provider
        attempted_key_ids: set[str] = set()
        last_exc: Exception | None = None

        for attempt in range(self._max_failover_attempts):
            key_id = _provider_config(provider, "key_id") or self._key_id
            provider_type = _provider_config(provider, "provider_type") or self._provider_type
            company_id = _provider_config(provider, "company_id") or self._company_id
            if key_id:
                attempted_key_ids.add(key_id)

            try:
                response = await provider.generate_response(
                    messages=messages,
                    tools=tools,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    top_p=top_p,
                    output_schema=output_schema,
                )
                await self._record_success(provider, response.usage)
                self._provider = provider
                self._company_id = company_id
                self._provider_type = provider_type
                self._key_id = key_id
                return response
            except Exception as exc:
                last_exc = exc
                await self._record_failure(provider, exc)
                if not self._allow_provider_failover:
                    raise
                if not _is_failover_error(exc) or attempt >= self._max_failover_attempts - 1:
                    raise

                skip_provider_types = {provider_type} if _is_provider_quota_error(exc) and provider_type else set()
                replacement = await get_provider_factory().get_failover_provider(
                    current_provider_type=provider_type,
                    model=provider.model,
                    company_id=company_id,
                    attempted_key_ids=attempted_key_ids,
                    skip_provider_types=skip_provider_types,
                )
                if replacement is None:
                    raise
                replacement_key_id = _provider_config(replacement, "key_id")
                if replacement_key_id and replacement_key_id in attempted_key_ids:
                    raise
                logger.warning(
                    "llm_provider_failover",
                    from_provider=provider_type,
                    from_key_id=key_id,
                    to_provider=_provider_config(replacement, "provider_type"),
                    to_key_id=replacement_key_id,
                    skipped_providers=sorted(skip_provider_types),
                )
                provider = replacement

        if last_exc is not None:
            raise last_exc
        raise RuntimeError("LLM provider unavailable")

    async def _record_success(self, provider: BaseProvider, usage: dict[str, Any] | None) -> None:
        key_id = _provider_config(provider, "key_id")
        if not key_id:
            return
        await model_manager.record_success(key_id, usage or {})

    async def _record_failure(self, provider: BaseProvider, exc: Exception) -> None:
        key_id = _provider_config(provider, "key_id")
        if not key_id:
            return
        await model_manager.record_failure(
            key_id,
            _failure_type(exc),
            retry_after_ms=_retry_after_ms(exc),
        )

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


def _provider_config(provider: BaseProvider, key: str) -> Any:
    config = getattr(provider, "config", None)
    if isinstance(config, dict):
        value = config.get(key)
        if value is not None:
            return value
    return getattr(provider, key, None)


def _is_failover_error(exc: Exception) -> bool:
    if not isinstance(exc, httpx.HTTPStatusError):
        return False
    status_code = exc.response.status_code
    return status_code in {408, 409, 429, 500, 502, 503, 504}


def _failure_type(exc: Exception) -> str:
    if isinstance(exc, httpx.HTTPStatusError):
        status_code = exc.response.status_code
        text = exc.response.text.upper()
        if _is_provider_quota_error(exc):
            return "QUOTA"
        if status_code == 429:
            return "429"
        if status_code in {401, 403}:
            return "403_INVALID"
        if "QUOTA" in text or "RATE_LIMIT" in text:
            return "QUOTA"
        return str(status_code)
    return "GENERAL"


def _is_provider_quota_error(exc: Exception) -> bool:
    if not isinstance(exc, httpx.HTTPStatusError):
        return False
    if exc.response.status_code != 429:
        return False

    text = exc.response.text.lower()
    if not text:
        return False

    provider_quota_markers = (
        "tokens per day",
        " tpd",
        "(tpd",
        "daily token",
        "daily quota",
        "insufficient_quota",
        "service tier",
        "organization limit",
    )
    if any(marker in text for marker in provider_quota_markers):
        return True
    return "rate limit reached" in text and "organization" in text and ("token" in text or "request" in text)


def _retry_after_ms(exc: Exception) -> int | None:
    if not isinstance(exc, httpx.HTTPStatusError):
        return None
    retry_after = exc.response.headers.get("retry-after")
    if not retry_after:
        return None
    try:
        return int(float(retry_after) * 1000)
    except (TypeError, ValueError):
        return None
