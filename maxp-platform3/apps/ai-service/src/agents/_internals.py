"""Helper classes extracted from base.py — StreamEmitter, TemplateAdapter."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Callable

import structlog

logger = structlog.get_logger(__name__)


@dataclass
class _OfflineTemplateProxy:
    """Lightweight proxy used when the DB is unreachable in ``from_template``."""

    slug: str

    def __getattr__(self, item: str) -> Any:  # pragma: no cover - fallback
        return None


@dataclass
class _TemplateAdapter:
    """Normalize either a DB AgentTemplate or an offline proxy into a uniform
    shape that ``from_template`` can consume."""

    slug: str
    role: str
    name: str
    version: str
    model_policy: dict[str, Any]
    allowed_tools: list[str]
    allowed_skills: list[str]
    guardrails: dict[str, Any]
    persona_meta: dict[str, Any]
    instructions_agents: str
    instructions_soul: str
    instructions_tools: str
    instructions_persona: str
    handoffs: list[dict[str, Any]]
    budget: dict[str, Any]
    output_schema: Any
    tool_choice: str | None = None

    @classmethod
    def from_db_or_proxy(
        cls,
        template: Any,
        slug: str,
        company_id: str,
    ) -> _TemplateAdapter:
        if template is None:
            return cls(
                slug=slug,
                role=slug.upper(),
                name=slug,
                version="0.0.0",
                model_policy={},
                allowed_tools=[],
                allowed_skills=[],
                guardrails={},
                persona_meta={"language": "arabic"},
                instructions_agents="",
                instructions_soul="",
                instructions_tools="",
                instructions_persona="",
                handoffs=[],
                budget={},
                output_schema=None,
                tool_choice=None,
            )
        return cls(
            slug=getattr(template, "slug", slug),
            role=getattr(template, "role", slug.upper()),
            name=getattr(template, "name", slug),
            version=getattr(template, "version", "1.0.0"),
            model_policy=getattr(template, "model_policy", {}) or {},
            allowed_tools=list(getattr(template, "allowed_tools", []) or []),
            allowed_skills=list(getattr(template, "allowed_skills", []) or []),
            guardrails=getattr(template, "guardrails", {}) or {},
            persona_meta=getattr(template, "persona_meta", {}) or {},
            instructions_agents=getattr(template, "instructions_agents", "") or "",
            instructions_soul=getattr(template, "instructions_soul", "") or "",
            instructions_tools=getattr(template, "instructions_tools", "") or "",
            instructions_persona=getattr(template, "instructions_persona", "") or "",
            handoffs=list(getattr(template, "handoffs", []) or []),
            budget=getattr(template, "budget", {}) or {},
            output_schema=getattr(template, "output_schema", None),
            tool_choice=getattr(template, "tool_choice", None),
        )


@dataclass
class _StreamEmitter:
    """In-memory event collector. Replays events on iteration."""

    run_id: str
    sink: Callable[[str, dict[str, Any]], None] | None
    _events: list[tuple[str, dict[str, Any]]] = field(default_factory=list)

    def emit(self, event: str, payload: dict[str, Any]) -> None:
        self._events.append((event, payload))
        if self.sink is not None:
            try:
                self.sink(event, payload)
            except Exception:
                logger.warning("stream_sink_failed", event_name=event)

    def events(self) -> list[tuple[str, dict[str, Any]]]:
        return list(self._events)
