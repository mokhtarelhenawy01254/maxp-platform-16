from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import structlog

from src.config import get_settings
from src.llm.client import LLMClient
from src.llm.gemma_chat_template import is_gemma_model
from src.llm.gemma_client import build_gemma_client

logger = structlog.get_logger(__name__)


@dataclass
class AdapterResponse:
    text: str = ""
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    raw: Any = None
    usage: dict[str, Any] | None = None
    model: str = ""
    provider_events: list[dict[str, Any]] = field(default_factory=list)


class AgentClientAdapter:
    def __init__(
        self,
        llm_client: LLMClient,
        *,
        tools: list[Any] | None = None,
        system_prompt: str | None = None,
    ) -> None:
        self._llm_client = llm_client
        self._tools = tools
        self._system_prompt = system_prompt

    @property
    def model(self) -> str:
        return self._llm_client.model

    @property
    def provider(self) -> str:
        return self._llm_client.provider

    async def get_response(
        self,
        messages: list[dict[str, Any]],
        options: dict[str, Any] | None = None,
    ) -> AdapterResponse:
        opts = options or {}
        resolved_tools = opts.get("tools") or self._tools if opts.get("tools_enabled") is not False else None
        response = await self._llm_client.generate(
            messages=messages,
            tools=resolved_tools,
            temperature=opts.get("temperature"),
            max_tokens=opts.get("max_tokens"),
            top_p=opts.get("top_p"),
            output_schema=opts.get("output_schema"),
            tool_choice=opts.get("tool_choice"),
        )
        return AdapterResponse(
            text=response.text,
            tool_calls=response.tool_calls,
            raw=response.raw,
            usage=response.usage,
            model=response.model,
        )

    async def aclose(self) -> None:
        pass

    def with_tools(self, tools: list[Any]) -> AgentClientAdapter:
        return AgentClientAdapter(self._llm_client, tools=tools, system_prompt=self._system_prompt)


async def _resolve_and_build(
    model: str,
    company_id: str | None = None,
    preferred_provider: str | None = None,
    key_id: str | None = None,
) -> LLMClient | None:
    from src.llm.model_manager import ModelManagerError, model_manager

    try:
        key_info = await model_manager.get_next_key(
            model,
            company_id or "default",
            preferred_provider=preferred_provider,
            key_id=key_id,
        )
    except (ModelManagerError, Exception) as exc:
        logger.warning("key_resolution_failed", model=model, error=str(exc)[:120])
        return None

    if hasattr(key_info, "provider"):
        provider = key_info.provider
        api_key = key_info.api_key
        resolved_key_id = str(getattr(key_info, "key_id", ""))
        base_url = str(getattr(key_info, "base_url", "")) or None
        resolved_model = str(getattr(key_info, "model", model)) or model
    else:
        provider = key_info.get("provider", "")
        api_key = key_info.get("api_key", "")
        resolved_key_id = str(key_info.get("key_id", ""))
        base_url = str(key_info.get("base_url", "")) or None
        resolved_model = str(key_info.get("model", model)) or model

    if not provider or not api_key:
        logger.warning("incomplete_key_info", model=model, provider=provider)
        return None

    return LLMClient(
        provider=provider,
        model=resolved_model,
        api_key=api_key,
        base_url=base_url,
        company_id=company_id,
        key_id=resolved_key_id,
    )


def build_agent_client(
    settings: Any,
    *,
    model: str | None = None,
    tools: list[Any] | None = None,
    system_prompt: str | None = None,
) -> Any:
    if not model:
        raise ValueError("model is required for LLM client creation")
    if is_gemma_model(model):
        gemma = build_gemma_client(
            api_key=getattr(settings, "google_api_key", ""),
            model=model,
            tools=tools,
            system_prompt=system_prompt,
        )
        if gemma is not None:
            logger.info("agent_client.routed", provider="gemma", model=model)
            return gemma
    # ponytail: sync env fallback for tests; replace with proper async when all callers migrate
    api_key = getattr(settings, "google_api_key", None) or os.getenv("GOOGLE_API_KEY")
    if api_key:
        logger.info("agent_client.sync_env_fallback", model=model)
        client = LLMClient(provider="GOOGLE", model=model, api_key=api_key)
        return AgentClientAdapter(client, tools=tools, system_prompt=system_prompt)
    if os.getenv("PYTEST_CURRENT_TEST"):
        logger.warning("agent_client.test_dummy", model=model)
        client = LLMClient(provider="GOOGLE", model=model, api_key="test-dummy-key")
        return AgentClientAdapter(client, tools=tools, system_prompt=system_prompt)
    raise ValueError(f"cannot resolve model '{model}' synchronously; use async build_agent_client_async instead")


def build_provider_client(
    provider_type: str = "GOOGLE",
    *,
    model: str | None = None,
    tools: list[Any] | None = None,
    system_prompt: str | None = None,
) -> Any:
    if not model:
        raise ValueError("model is required for LLM client creation")
    if is_gemma_model(model):
        settings = get_settings()
        gemma = build_gemma_client(
            api_key=settings.google_api_key,
            model=model,
            tools=tools,
            system_prompt=system_prompt,
        )
        if gemma is not None:
            logger.info("agent_client.provider_client", provider="gemma", model=model)
            return gemma
    raise RuntimeError("build_provider_client requires async provider resolution; use build_provider_client_async")


async def build_agent_client_async(
    settings: Any,
    *,
    model: str | None = None,
    tools: list[Any] | None = None,
    system_prompt: str | None = None,
    company_id: str | None = None,
) -> Any:
    if not model:
        raise ValueError("model is required for LLM client creation")
    if is_gemma_model(model):
        gemma = build_gemma_client(
            api_key=getattr(settings, "google_api_key", ""),
            model=model,
            tools=tools,
            system_prompt=system_prompt,
        )
        if gemma is not None:
            logger.info("agent_client.routed", provider="gemma", model=model)
            return gemma
    client = await _resolve_and_build(model, company_id)
    if client is None:
        logger.error("no_active_provider", model=model, company_id=company_id)
        return None
    logger.info("agent_client.routed", provider=client.provider, model=model)
    return AgentClientAdapter(client, tools=tools, system_prompt=system_prompt)


async def build_provider_client_async(
    provider_type: str = "GOOGLE",
    *,
    model: str | None = None,
    tools: list[Any] | None = None,
    system_prompt: str | None = None,
    company_id: str | None = None,
    key_id: str | None = None,
) -> Any:
    if not model:
        raise ValueError("model is required for LLM client creation")
    if is_gemma_model(model):
        settings = get_settings()
        gemma = build_gemma_client(
            api_key=settings.google_api_key,
            model=model,
            tools=tools,
            system_prompt=system_prompt,
        )
        if gemma is not None:
            logger.info("agent_client.provider_client", provider="gemma", model=model)
            return gemma
    client = await _resolve_and_build(model, company_id, preferred_provider=provider_type, key_id=key_id)
    if client is None:
        raise ValueError(f"Provider '{provider_type}' is not configured for model '{model}'")
    logger.info("agent_client.provider_client", provider=provider_type, model=model)
    return AgentClientAdapter(client, tools=tools, system_prompt=system_prompt)


__all__ = [
    "AdapterResponse",
    "AgentClientAdapter",
    "build_agent_client",
    "build_agent_client_async",
    "build_provider_client",
    "build_provider_client_async",
]
