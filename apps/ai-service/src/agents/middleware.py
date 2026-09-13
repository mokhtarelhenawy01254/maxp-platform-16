from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

import sentry_sdk
import structlog
from agent_framework import (
    AgentContext,
    AgentMiddleware,
    FunctionInvocationContext,
    FunctionMiddleware,
)

from src.context.compressor import count_tokens

logger = structlog.get_logger(__name__)



class MaxPAgentRuntimeMiddleware(AgentMiddleware):
    """SDK agent middleware for prompt hygiene and lightweight budget enforcement."""

    def __init__(self, *, company_id: str, agent_role: str) -> None:
        self.company_id = company_id
        self.agent_role = agent_role

    async def process(
        self,
        context: AgentContext,
        call_next: Callable[[], Awaitable[None]],
    ) -> None:
        context.metadata["company_id"] = self.company_id
        context.metadata["agent_role"] = self.agent_role
        # Store agent instance for tool-based modifications (e.g. progressive exposure)
        context.metadata["agent"] = getattr(context, "agent", None)

        sanitized = self._sanitize_messages(context)
        dropped = self._enforce_message_budget(context)


        context.metadata["sanitized_messages"] = sanitized
        context.metadata["dropped_history_messages"] = dropped

        logger.debug(
            "sdk agent middleware prepared run",
            company_id=self.company_id,
            agent_role=self.agent_role,
            sanitized_messages=sanitized,
            dropped_history_messages=dropped,
        )
        try:
            await call_next()
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            raise

    def _sanitize_messages(self, context: AgentContext) -> int:
        sanitized = 0
        for message in context.messages:
            if str(message.role).lower() == "system":
                continue
            for content in message.contents:
                text = getattr(content, "text", None)
                if not isinstance(text, str) or not text:
                    continue
                clean = _sanitize_content(text)
                if clean != text:
                    content.text = clean
                    sanitized += 1
        return sanitized

    def _enforce_message_budget(self, context: AgentContext) -> int:
        options = context.options or {}
        budget = options.get("maxp_token_budget") or options.get("token_budget")
        if not budget:
            return 0

        try:
            budget = int(budget)
        except (TypeError, ValueError):
            return 0

        dropped = 0
        while _message_tokens(context.messages) > budget and len(context.messages) > 2:
            drop_index = 1 if str(context.messages[0].role).lower() == "system" else 0
            context.messages.pop(drop_index)
            dropped += 1
        return dropped


class MaxPFunctionAuditMiddleware(FunctionMiddleware):
    """SDK function middleware for MaxP tool-call observability metadata."""

    def __init__(self, *, company_id: str, agent_role: str, agent_name: str | None = None) -> None:
        self.company_id = company_id
        self.agent_role = agent_role
        self.agent_name = agent_name

    async def process(
        self,
        context: FunctionInvocationContext,
        call_next: Callable[[], Awaitable[None]],
    ) -> None:
        tool_name = getattr(context.function, "name", "unknown")
        context.metadata["company_id"] = self.company_id
        context.metadata["agent_role"] = self.agent_role
        context.metadata["tool_name"] = tool_name
        if self.agent_name:
            context.metadata["agent_name"] = self.agent_name

        logger.debug(
            "sdk function middleware before tool",
            company_id=self.company_id,
            agent_role=self.agent_role,
            tool=tool_name,
        )
        try:
            await call_next()
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            raise
        if context.result is not None:
            try:
                from src.agents.compactor import ToolResultCompactor
                context.result = ToolResultCompactor.compact(context.result, tool_name=tool_name)
            except Exception as comp_err:
                logger.debug("micro_compaction_skipped", tool=tool_name, error=str(comp_err))

        logger.debug(
            "sdk function middleware after tool",
            company_id=self.company_id,
            agent_role=self.agent_role,
            tool=tool_name,
            result_type=type(context.result).__name__ if context.result is not None else None,
        )



def build_maxp_function_middleware(company_id: str, agent_role: str, agent_name: str | None = None) -> list[Any]:
    return [
        MaxPAgentRuntimeMiddleware(company_id=company_id, agent_role=agent_role),
        MaxPFunctionAuditMiddleware(company_id=company_id, agent_role=agent_role, agent_name=agent_name),
    ]



def _sanitize_content(content: str) -> str:
    return content.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _message_tokens(messages: list[Any]) -> int:
    return sum(count_tokens(getattr(message, "text", "") or "") for message in messages)
