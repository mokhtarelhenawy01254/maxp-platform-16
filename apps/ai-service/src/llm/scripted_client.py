from __future__ import annotations

import json
import os
from typing import Any

import structlog

from src.llm.agent_client_factory import AdapterResponse

logger = structlog.get_logger(__name__)


class ScriptedAgentClient:
    """Deterministic, offline scripted agent client for testing tool-calling loops.
    
    Returns ordered steps from an in-memory scenario list or the AGENT_SCRIPT
    JSON environment variable. Zero network calls, zero API keys.
    """

    def __init__(
        self,
        scenario: list[dict[str, Any]] | None = None,
        *,
        tools: list[Any] | None = None,
        system_prompt: str | None = None,
        model: str = "scripted",
    ) -> None:
        self._tools = tools or []
        self._system_prompt = system_prompt
        self._model = model
        self._index = 0

        if scenario is not None:
            self._scenario = list(scenario)
        else:
            raw = os.getenv("AGENT_SCRIPT", "")
            if raw.strip():
                try:
                    parsed = json.loads(raw)
                    self._scenario = parsed if isinstance(parsed, list) else [parsed]
                except Exception as exc:
                    logger.warning("scripted_client.parse_error", error=str(exc))
                    self._scenario = []
            else:
                self._scenario = []

    @property
    def model(self) -> str:
        return self._model

    @property
    def provider(self) -> str:
        return "scripted"

    def set_scenario(self, scenario: list[dict[str, Any]]) -> None:
        self._scenario = list(scenario)
        self._index = 0

    def reset(self) -> None:
        self._index = 0

    async def get_response(
        self,
        messages: list[dict[str, Any]],
        options: dict[str, Any] | None = None,
    ) -> AdapterResponse:
        opts = options or {}
        if self._index < len(self._scenario):
            item = self._scenario[self._index]
            self._index += 1
            text = str(item.get("text") or "")
            tool_calls = list(item.get("tool_calls") or [])
            usage = item.get("usage") or {"prompt_tokens": 10, "completion_tokens": 10, "total_tokens": 20}
            model_name = item.get("model") or self._model
            return AdapterResponse(
                text=text,
                tool_calls=tool_calls,
                usage=usage,
                model=model_name,
            )

        # Fallback when scenario is exhausted or empty
        return AdapterResponse(
            text="[Scripted fallback response]",
            tool_calls=[],
            model=self._model,
        )

    def with_tools(self, tools: list[Any]) -> ScriptedAgentClient:
        new_client = ScriptedAgentClient(
            scenario=self._scenario,
            tools=tools,
            system_prompt=self._system_prompt,
            model=self._model,
        )
        new_client._index = self._index
        return new_client

    async def aclose(self) -> None:
        pass
