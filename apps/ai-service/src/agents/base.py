"""
BaseAgent
=========

Unified agent abstraction for the MaxP AI service.

Wraps Microsoft Agent Framework ``Agent`` with MaxP-specific concerns:

* Persona, policies, scoped tool/skill permissions
* System-prompt assembly from modular templates (SOUL / PERSONA / TOOLS / AGENTS)
* Handoffs to other agents (via ``as_tool``)
* Input / output guardrails
* Pipeline execution: ``resolve_intent`` -> ``route_to_tools`` -> ``execute_tools`` -> ``handle_fallback`` -> ``validate_reply``
* Streaming / event-driven execution
* Observability hooks (task log, ``get_info``)

Specialist agents (``CEO``, ``ORDER``, ``SUPPORT``) extend ``BaseAgent`` and
override :py:meth:`BaseAgent._get_system_prompt` for role-specific prompts.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

import structlog
from agent_framework import Agent, FunctionTool

from src.config import get_settings
from src.guardrails.base import BaseGuardrail
from src.llm.agent_client_factory import build_agent_client
from src.pipeline.context import PipelineContext
from src.pipeline.runner import execute_pipeline
from src.pipeline.stages.execute_tools import execute_tools
from src.pipeline.stages.handle_fallback import handle_fallback
from src.pipeline.stages.resolve_intent import resolve_intent
from src.pipeline.stages.retrieve_episodic import retrieve_episodic_memory
from src.pipeline.stages.retrieve_knowledge import retrieve_knowledge
from src.pipeline.stages.route_to_tools import route_to_tools
from src.pipeline.stages.validate_reply import validate_reply
from src.prompts.template_registry import HydratedPrompt, get_prompt_registry
from src.tools.registry import get_all_tools

logger = structlog.get_logger(__name__)

MAX_TASK_LOG_ENTRIES = 500
DEFAULT_AGENT_LLM_TIMEOUT_MS = 90_000
SYSTEM_PROMPT_CACHE_TTL_SECONDS = 300


# ---------------------------------------------------------------------------
# Configuration object
# ---------------------------------------------------------------------------


@dataclass
class BaseAgentConfig:
    """Declarative agent configuration. Mirrors OpenAI Agents SDK pattern:
    the agent IS its config, not a runtime instance."""

    id: str
    name: str
    role: str
    company_id: str

    allowed_tools: list[str] = field(default_factory=list)
    allowed_skills: list[str] = field(default_factory=list)

    template_slug: str | None = None
    version: str | None = None
    parent_id: str | None = None

    model: str = "gemini-2.5-flash"
    model_source: str = "runtime-default"

    persona: dict[str, Any] = field(default_factory=dict)
    policies: dict[str, Any] = field(default_factory=dict)
    instructions: dict[str, Any] = field(default_factory=dict)
    output_schema: Any = None

    handoffs: list[dict[str, Any]] = field(default_factory=list)
    input_guardrails: list[BaseGuardrail] = field(default_factory=list)
    output_guardrails: list[BaseGuardrail] = field(default_factory=list)
    status: str = "ACTIVE"

    config: dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# BaseAgent
# ---------------------------------------------------------------------------


class BaseAgent:
    """Unified agent abstraction. Specialist agents extend this and override
    :py:meth:`_get_system_prompt` for role-specific behaviour."""

    # ---- Subclass-overridable hooks ----
    _SYSTEM_PROMPT_SECTIONS: tuple[str, ...] = (
        "soul",
        "persona",
        "agents",
        "tools",
    )

    # ------------------------------------------------------------------
    # Construction
    # ------------------------------------------------------------------

    def __init__(self, config: BaseAgentConfig | dict[str, Any]):
        if isinstance(config, dict):
            config = BaseAgentConfig(**config)
        self.config = config

        self.id = config.id
        self.name = config.name
        self.role = config.role
        self.company_id = config.company_id

        self.allowed_tools: set[str] = set(config.allowed_tools or [])
        self.allowed_skills: set[str] = set(config.allowed_skills or [])

        self.template_slug = config.template_slug
        self.version = config.version
        self.parent_id = config.parent_id
        self.model = config.model
        self.model_source = config.model_source

        self.persona = config.persona or {}
        self.policies = config.policies or {}
        self._instructions = config.instructions or {}
        self.output_schema = config.output_schema

        self.handoffs: list[dict[str, Any]] = list(config.handoffs or [])
        self.input_guardrails: list[BaseGuardrail] = list(config.input_guardrails or [])
        self.output_guardrails: list[BaseGuardrail] = list(config.output_guardrails or [])

        self.status = config.status
        self.created_at = _utcnow()
        self._children: list[BaseAgent] = []
        self._framework_agent: Agent | None = None
        self._last_model_selection: dict[str, Any] | None = None

        # Pipeline / prompt cache state
        self._task_log: list[dict[str, Any]] = []
        self._system_prompt_cache: str | None = None
        self._system_prompt_cache_at: float = 0.0

    # ------------------------------------------------------------------
    # Factory: from_template
    # ------------------------------------------------------------------

    @classmethod
    async def from_template(
        cls,
        template_slug: str,
        company_id: str,
        overrides: dict[str, Any] | None = None,
        session: Any | None = None,
    ) -> BaseAgent:
        """Build an agent from a template slug + runtime overrides.

        Mirrors the OpenAI Agents SDK factory: an Agent is config, not a class.
        Pass an active ``AsyncSession`` to load templates from the DB.
        Without a session, an offline fallback template is used.
        """
        from src.agents.loader import get_template

        overrides = overrides or {}
        template = None

        if session is not None:
            template = await get_template(template_slug, session)

        profile = _TemplateAdapter.from_db_or_proxy(template, template_slug, company_id)

        resolved_model = (
            overrides.get("model")
            or profile.model_policy.get("default")
            or profile.model_policy.get("model")
            or "gemini-2.5-flash"
        )

        config = BaseAgentConfig(
            id=overrides.get("id")
            or f"{profile.role}_{company_id[-6:]}_{int(_utcnow().timestamp() * 1000)}",
            name=overrides.get("name") or profile.name,
            role=profile.role,
            company_id=company_id,
            allowed_tools=overrides.get("allowed_tools") or profile.allowed_tools,
            allowed_skills=overrides.get("allowed_skills") or profile.allowed_skills,
            template_slug=template_slug,
            version=profile.version,
            model=resolved_model,
            model_source="policy-default" if resolved_model == profile.model_policy.get("default") else "explicit",
            persona={
                "language": profile.persona_meta.get("language", "arabic"),
                "dialect": profile.persona_meta.get("dialect"),
                "tone": profile.persona_meta.get("tone", "professional"),
                "formality": profile.persona_meta.get("formality", "formal"),
                **(overrides.get("persona") or {}),
            },
            policies={
                "max_tool_calls_per_run": profile.budget.get("maxToolCallsPerRun", 10),
                "model_policy": profile.model_policy,
                "guardrails": profile.guardrails,
                **(overrides.get("policies") or {}),
            },
            instructions={
                "agents": profile.instructions_agents,
                "soul": profile.instructions_soul,
                "tools": profile.instructions_tools,
                "persona": profile.instructions_persona,
                **(overrides.get("instructions") or {}),
            },
            output_schema=overrides.get("output_schema") or profile.output_schema,
            status=overrides.get("status", "ACTIVE"),
            handoffs=overrides.get("handoffs") or profile.handoffs,
        )
        return cls(config)

    # ------------------------------------------------------------------
    # Build the underlying Microsoft Agent Framework Agent
    # ------------------------------------------------------------------

    def build(self) -> Agent:
        """Construct (or reuse) the underlying ``agent_framework.Agent``."""
        if self._framework_agent is not None:
            return self._framework_agent

        settings = get_settings()
        instructions = self._get_system_prompt()
        tools = self._resolve_tools()

        client = build_agent_client(
            settings,
            model=self.model,
            tools=tools,
            system_prompt=instructions,
        )

        self._framework_agent = Agent(
            client=client,
            name=self._agent_name(),
            instructions=instructions,
            tools=tools,
            default_options={"model": self.model},
        )
        return self._framework_agent

    def _resolve_tools(self) -> list[FunctionTool]:
        """Resolve the list of tools this agent is allowed to use.

        Tool resolution is delegated to the tools registry. The agent's
        ``allowed_tools`` config scopes the registry to a subset.
        """
        all_tools = get_all_tools()
        if not self.allowed_tools:
            return all_tools
        allowed = {name.lower() for name in self.allowed_tools}
        return [t for t in all_tools if _tool_name(t).lower() in allowed]

    def _agent_name(self) -> str:
        return f"maxp_{self.role.lower()}_{self.id[-8:]}"

    # ------------------------------------------------------------------
    # System prompt assembly (cached)
    # ------------------------------------------------------------------

    @property
    def instructions(self) -> str:
        """Expose the system prompt instructions."""
        return self._get_system_prompt()

    @property
    def default_options(self) -> dict[str, Any]:
        """Expose the default options (model choice) for compatibility."""
        return {"model": self.model}

    def _get_system_prompt(self, context: dict[str, Any] | None = None) -> str:
        """Build the system prompt for this agent. Cached for 5 minutes.

        Subclasses may override this to provide role-specific prompts.
        """
        now = _utcnow().timestamp()
        if (
            self._system_prompt_cache is not None
            and (now - self._system_prompt_cache_at) < SYSTEM_PROMPT_CACHE_TTL_SECONDS
        ):
            return self._system_prompt_cache

        variables = {
            "company_name": self.company_id,
            "agent_id": self.id,
            "agent_name": self.name,
            "agent_role": self.role,
            "tools_list": sorted(self.allowed_tools),
            "handoffs_block": self.get_handoff_descriptions(),
            **(context or {}),
        }

        registry = get_prompt_registry()
        slug = self.template_slug or None
        channel = self.persona.get("channel") or None

        soul_override = self._instructions.get("soul")
        if callable(soul_override):
            soul_override = soul_override(variables)

        persona_override = self._instructions.get("persona")
        if callable(persona_override):
            persona_override = persona_override(variables)

        tools_override = self._instructions.get("tools")
        if callable(tools_override):
            tools_override = tools_override(variables)

        agents_override = self._instructions.get("agents")
        if callable(agents_override):
            agents_override = agents_override(variables)

        try:
            hydrated: HydratedPrompt = registry.build_prompt(
                role=self.role,
                slug=slug,
                variables=variables,
                channel=channel,
                soul_override=soul_override,
                persona_override=persona_override,
                tools_override=tools_override,
                agents_override=agents_override,
            )
            text = hydrated.text
        except Exception as exc:  # pragma: no cover - fallback path
            logger.warning(
                "prompt_registry_failed",
                agent=self.id,
                error=str(exc),
            )
            text = self._assemble_inline_prompt(variables)

        self._system_prompt_cache = text
        self._system_prompt_cache_at = now
        return text

    def _assemble_inline_prompt(self, variables: dict[str, Any]) -> str:
        """Fallback inline assembler (no registry)."""
        sections: list[str] = []
        for key in self._SYSTEM_PROMPT_SECTIONS:
            block = self._instructions.get(key) or ""
            if callable(block):
                block = block(variables)
            if block:
                tag = key.upper()
                sections.append(f"[{tag}]\n{block}\n[/{tag}]")

        sections.append(
            "[AGENT_IDENTITY]\n"
            f"ID: {self.id}\nName: {self.name}\n"
            f"Role: {self.role}\nCompany: {self.company_id}\n"
            "[/AGENT_IDENTITY]"
        )

        handoffs_block = variables.get("handoffs_block")
        if handoffs_block:
            sections.append(
                "[HANDOFFS]\nYou can delegate via transfer_to_<role> tools:\n"
                f"{handoffs_block}\n[/HANDOFFS]"
            )

        tools_list = variables.get("tools_list") or []
        if tools_list:
            sections.append(
                "[AVAILABLE_TOOLS]\n"
                + "\n".join(f"- {t}" for t in tools_list)
                + "\n[/AVAILABLE_TOOLS]"
            )

        return "\n\n".join(s for s in sections if s)

    def clear_prompt_cache(self) -> None:
        """Invalidate the cached system prompt (call after persona/policy edits)."""
        self._system_prompt_cache = None
        self._system_prompt_cache_at = 0.0

    # ------------------------------------------------------------------
    # Tool / skill permissions
    # ------------------------------------------------------------------

    def can_use_tool(self, tool_name: str) -> bool:
        return tool_name in self.allowed_tools

    def can_use_skill(self, skill_id: str) -> bool:
        return skill_id in self.allowed_skills

    def get_tools(self) -> list[str]:
        return sorted(self.allowed_tools)

    def get_skills(self) -> list[str]:
        return sorted(self.allowed_skills)

    # ------------------------------------------------------------------
    # Handoffs
    # ------------------------------------------------------------------

    def add_handoff(self, target: dict[str, Any] | BaseAgent) -> None:
        if isinstance(target, BaseAgent):
            entry: dict[str, str] = {
                "agent_id": target.id,
                "role": target.role,
                "name": target.name,
                "description": f"Delegate to {target.role}",
            }
        else:
            _id = str(target.get("id") or target.get("agent_id") or "")
            entry = {
                "agent_id": _id,
                "role": str(target["role"]),
                "name": str(target.get("name") or target["role"]),
                "description": str(target.get("description") or f"Delegate to {target['role']}"),
            }
        self.handoffs.append(entry)

    def get_handoff_descriptions(self) -> str:
        if not self.handoffs:
            return ""
        return "\n".join(
            f"- transfer_to_{h['role'].lower()}: {h.get('description', '')}"
            for h in self.handoffs
        )

    def as_tool(self, name: str | None = None, description: str | None = None) -> dict[str, Any]:
        """Convert this agent into a tool callable by another agent.

        Mirrors the OpenAI SDK's ``agent.as_tool()`` pattern.
        """
        return {
            "name": name or f"agent_{self.role.lower()}_{self.id[-8:]}",
            "description": description or (
                f"Delegate tasks to {self.name} ({self.role}). "
                f"Best for: {self.get_capabilities_description()}"
            ),
            "handler": self._as_tool_handler,
            "params": {
                "task": "The task to delegate to this agent",
                "handoff_context": "JSON context from the parent agent (optional)",
            },
        }


    async def _as_tool_handler(
        self,
        company_id: str,
        params: dict[str, Any],
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        sub_task = {
            "description": params.get("task"),
            "current_message": params.get("task"),
            "intent_message": params.get("task"),
            "parent_run_id": (context or {}).get("run_id"),
            "context": params.get("handoff_context"),
        }
        result = await self.process_task(sub_task)
        return {
            "status": result.get("status"),
            "reply": result.get("result", {}).get("reply")
            or result.get("result", {}).get("summary", ""),
            "agent_name": self.name,
            "agent_role": self.role,
        }

    def get_capabilities_description(self) -> str:
        tools = self.get_tools()
        if "product.search" in tools:
            return "product searches, catalog queries, inventory checks"
        if "order.lookup" in tools:
            return "order tracking, refunds, shipping updates, customer support"
        if "agent.spawn" in tools:
            return "orchestration, multi-agent workflows, strategic planning"
        return "general assistance"

    # ------------------------------------------------------------------
    # Guardrails
    # ------------------------------------------------------------------

    def add_input_guardrail(self, guardrail: BaseGuardrail) -> None:
        self.input_guardrails.append(guardrail)

    def add_output_guardrail(self, guardrail: BaseGuardrail) -> None:
        self.output_guardrails.append(guardrail)

    async def run_input_guardrails(
        self,
        context: dict[str, Any],
        text: str,
    ) -> dict[str, Any]:
        results = [await g.validate(context, text) for g in self.input_guardrails]
        violations = [r for r in results if not r.allowed]
        return {
            "allowed": not violations,
            "violations": [
                {"reason": v.reason, "violations": v.violations} for v in violations
            ],
        }

    async def run_output_guardrails(
        self,
        context: dict[str, Any],
        text: str,
    ) -> dict[str, Any]:
        results = [await g.validate(context, text) for g in self.output_guardrails]
        violations = [r for r in results if not r.allowed]
        return {
            "allowed": not violations,
            "violations": [
                {"reason": v.reason, "violations": v.violations} for v in violations
            ],
        }

    # ------------------------------------------------------------------
    # Pipeline execution
    # ------------------------------------------------------------------

    async def process_task(self, task: dict[str, Any]) -> dict[str, Any]:
        """Process a single task through the agent pipeline.

        Runs the five-stage pipeline and returns a structured result.
        """
        run_id = f"run_{uuid.uuid4()}"
        message = task.get("current_message") or task.get("description") or ""
        thread_id = task.get("session_id") or task.get("conversation_id") or run_id
        customer_id = task.get("user_id") or "anonymous"

        ctx = PipelineContext(
            message=message,
            thread_id=thread_id,
            company_id=self.company_id,
            customer_id=customer_id,
            agent=self,
        )

        ctx = await execute_pipeline(
            ctx,
            [
                resolve_intent,
                retrieve_knowledge,
                retrieve_episodic_memory,
                route_to_tools,
                execute_tools,
                handle_fallback,
                validate_reply,
            ],
        )

        return self._to_process_task_result(ctx, task, run_id)

    async def process_task_streamed(
        self,
        task: dict[str, Any],
        emit: Callable[[str, dict[str, Any]], None] | None = None,
    ) -> AsyncIterator[tuple[str, dict[str, Any]]]:
        """Event-driven execution. Mirrors OpenAI Agents SDK's ``Runner.run_streamed``.

        Yields structured events as the pipeline runs.
        """
        run_id = f"run_{uuid.uuid4()}"
        emitter = _StreamEmitter(run_id, emit)
        emitter.emit("agent_start", {"agent_id": self.id, "agent_name": self.name})

        message = task.get("current_message") or task.get("description") or ""
        thread_id = task.get("session_id") or task.get("conversation_id") or run_id
        customer_id = task.get("user_id") or "anonymous"

        ctx = PipelineContext(
            message=message,
            thread_id=thread_id,
            company_id=self.company_id,
            customer_id=customer_id,
            agent=self,
        )

        try:
            emitter.emit("agent_thinking", {"stage": "resolve_intent"})

            for stage in (
                resolve_intent,
                retrieve_knowledge,
                retrieve_episodic_memory,
                route_to_tools,
                execute_tools,
                handle_fallback,
                validate_reply,
            ):
                ctx = await stage(ctx)
                emitter.emit(
                    "stage_complete",
                    {"stage": stage.__name__, "early_return": bool(ctx.early_return)},
                )
                if ctx.early_return:
                    break

            final_reply = ctx.final_reply or ""
            executed = ctx.executed_tools or []
            emitter.emit(
                "agent_reply",
                {
                    "reply": final_reply,
                    "is_incremental": False,
                    "model_used": self.model,
                },
            )
            emitter.emit(
                "run_complete",
                {
                    "run_id": run_id,
                    "reply": final_reply,
                    "tool_calls": [
                        {"name": t.get("tool"), "success": t.get("success", True)}
                        for t in executed
                    ],
                },
            )
        except Exception as exc:
            emitter.emit("run_error", {"error": str(exc)})
            raise

        for ev in emitter.events():
            yield ev

    # ------------------------------------------------------------------
    # Children / lifecycle
    # ------------------------------------------------------------------

    def add_child(self, agent: BaseAgent) -> None:
        self._children.append(agent)

    def get_children(self) -> list[BaseAgent]:
        return list(self._children)

    def activate(self) -> None:
        self.status = "ACTIVE"

    def deactivate(self) -> None:
        self.status = "INACTIVE"

    # ------------------------------------------------------------------
    # Observability
    # ------------------------------------------------------------------

    def get_info(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "company_id": self.company_id,
            "model": self.model,
            "template_slug": self.template_slug,
            "version": self.version,
            "parent_id": self.parent_id,
            "tool_count": len(self.allowed_tools),
            "skill_count": len(self.allowed_skills),
            "status": self.status,
            "child_count": len(self._children),
            "created_at": self.created_at.isoformat(),
            "selected_model": (self._last_model_selection or {}).get("model"),
            "selected_provider": (self._last_model_selection or {}).get("provider"),
            "last_model_selection": self._last_model_selection,
        }

    def get_task_log(self) -> list[dict[str, Any]]:
        return list(self._task_log)

    def append_to_task_log(self, entries: dict[str, Any] | list[dict[str, Any]]) -> None:
        if not isinstance(entries, list):
            entries = [entries]
        self._task_log.extend(entries)
        if len(self._task_log) > MAX_TASK_LOG_ENTRIES:
            self._task_log = self._task_log[-MAX_TASK_LOG_ENTRIES:]

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _to_process_task_result(
        self,
        ctx: PipelineContext,
        task: dict[str, Any],
        run_id: str,
    ) -> dict[str, Any]:
        status = "SUCCESS"
        if ctx.early_return:
            er_status = ctx.early_return.get("status", "ERROR")
            status = {
                "AWAITING_APPROVAL": "PAUSED",
                "GUARDRAIL_BLOCKED": "BLOCKED",
            }.get(er_status, "ERROR")

        reply = (
            ctx.final_reply
            or (ctx.early_return or {}).get("result", {}).get("reply", "")
        )

        executed = ctx.executed_tools or []
        return {
            "agent_id": self.id,
            "role": self.role,
            "status": status,
            "result": {
                "reply": reply,
                "summary": reply,
                "tools_used": bool(executed),
                "tool_rounds": ctx.rounds,
                "tools": executed,
                "repaired": ctx.repaired,
                "status": (ctx.early_return or {}).get("status", "ok"),
                "thread_id": ctx.thread_id,
                "draft_id": (ctx.early_return or {}).get("draft_id"),
            },
            "model_selection": self._last_model_selection,
            "task": task,
            "run_id": run_id,
        }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _tool_name(tool: Any) -> str:
    if isinstance(tool, FunctionTool):
        return tool.name
    return getattr(tool, "name", str(tool))


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
            except Exception:  # pragma: no cover - never break the stream
                logger.warning("stream_sink_failed", event_name=event)

    def events(self) -> list[tuple[str, dict[str, Any]]]:
        return list(self._events)
