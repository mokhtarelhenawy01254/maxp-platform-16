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
from inspect import isawaitable
from pathlib import Path
from typing import Any

import structlog
from agent_framework import (
    Agent,
    AggregatingSkillsSource,
    FunctionTool,
    SkillsProvider,
    SkillsSource,
)

try:
    from agent_framework import MCPSkillsSource  # type: ignore[attr-defined]
except ImportError:
    # agent_framework >= X removed MCPSkillsSource; provide a minimal adapter
    class MCPSkillsSource(SkillsSource):  # type: ignore[no-redef]
        """Thin adapter wrapping an MCP client as a SkillsSource."""
        def __init__(self, *, client: Any) -> None:
            self._client = client

        async def get_skills(self) -> list:
            return []  # placeholder – actual MCP tools resolved via registry

from src.agents.middleware import build_maxp_function_middleware
from src.config import get_settings
from src.context.sdk_provider import MaxPContextProvider
from src.guardrails.base import BaseGuardrail
from src.llm.agent_client_factory import (
    build_agent_client,
    build_agent_client_async,
    build_provider_client_async,
)
from src.llm.model_capabilities import route_for_modalities, supports_vision
from src.mcp_integration.registry import get_mcp_registry
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
from src.tools.names import canonical_tool_name, canonical_tool_set
from src.tools.sdk_gateway import wrap_tools_for_gateway

_SKILLS_ROOT = Path(__file__).resolve().parent.parent.parent / "skills"

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
    provider: str | None = None
    key_id: str | None = None

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
        self.client: Any | None = None
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
            role=overrides.get("role") or profile.role,
            company_id=company_id,
            allowed_tools=overrides.get("allowed_tools") or profile.allowed_tools,
            allowed_skills=overrides.get("allowed_skills") or profile.allowed_skills,
            template_slug=template_slug,
            version=profile.version,
            model=resolved_model,
            model_source="policy-default" if resolved_model == profile.model_policy.get("default") else "explicit",
            provider=overrides.get("provider"),
            key_id=overrides.get("key_id") or overrides.get("keyId"),
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

        try:
            mcp_clients = get_mcp_registry().get_skill_clients()
        except Exception:
            mcp_clients = []
        mcp_sources = [
            MCPSkillsSource(client=mcp_client)
            for mcp_client in mcp_clients
        ]
        skills_provider = None
        if mcp_sources:
            skills_provider = SkillsProvider(
                source=AggregatingSkillsSource(mcp_sources)
            )

        context_providers = [
            MaxPContextProvider(
                company_id=self.company_id,
                agent=self,
            )
        ]
        if skills_provider:
            context_providers.append(skills_provider)

        default_options: dict[str, Any] = {"model": self.model}
        if self.output_schema:
            default_options["output_schema"] = self.output_schema

        self._framework_agent = Agent(
            client=client,
            name=self._agent_name(),
            instructions=instructions,
            tools=tools,
            context_providers=context_providers,
            middleware=build_maxp_function_middleware(self.company_id, self.role),
            default_options=default_options,
        )
        self.client = client
        return self._framework_agent

    async def ensure_client(self) -> Any:
        """Create the SDK-compatible client through the framework Agent lifecycle."""
        if self.client is not None:
            return self.client
        settings = get_settings()
        instructions = self._get_system_prompt()
        tools = self._resolve_tools()
        if self.config.provider:
            self.client = await build_provider_client_async(
                self.config.provider,
                model=self.model,
                tools=tools,
                system_prompt=instructions,
                company_id=self.company_id,
            )
        else:
            self.client = await build_agent_client_async(
                settings,
                model=self.model,
                tools=tools,
                system_prompt=instructions,
                company_id=self.company_id,
            )
        return self.client

    def _resolve_tools(self) -> list[FunctionTool]:
        """Resolve the list of tools this agent is allowed to use.
        
        By default, agents start with only CORE_TOOLS to implement Progressive Tool Exposure.
        Advanced tools are unlocked dynamically via the unlock_advanced_tools tool.
        """
        from src.tools.registry import CORE_TOOLS

        # Base set is CORE_TOOLS for progressive exposure
        base_set = CORE_TOOLS

        if not self.allowed_tools:
            return wrap_tools_for_gateway(
                base_set,
                company_id=self.company_id,
                agent_role=self.role,
                allowed_tools=[_tool_name(tool) for tool in base_set],
            )

        allowed = {name.lower() for name in self.allowed_tools}
        # Filter core tools by allowed list, but always ensure unlock_advanced_tools is present
        scoped = [
            t for t in base_set
            if _tool_name(t).lower() in allowed or _tool_name(t).replace("_", ".").lower() in allowed
        ]

        # Ensure unlock_advanced_tools is always available for agents that can unlock them
        from src.tools.registry import unlock_advanced_tools_tool
        if unlock_advanced_tools_tool not in scoped:
            scoped.append(unlock_advanced_tools_tool)

        return wrap_tools_for_gateway(
            scoped,
            company_id=self.company_id,
            agent_role=self.role,
            allowed_tools=[_tool_name(tool) for tool in scoped],
        )


    def _agent_name(self) -> str:
        return f"maxp_{self.role.lower()}_{self.id[-8:]}"

    def create_session(self, *, session_id: str | None = None) -> Any:
        """Create an SDK AgentSession for this agent."""
        return self.build().create_session(session_id=session_id)

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

    def _load_skills_block(self) -> str:
        """Read SKILL.md from disk for each allowed skill and return a <skills> block."""
        if not self.allowed_skills:
            return ""
        lines: list[str] = []
        for skill_id in sorted(self.allowed_skills):
            md = _SKILLS_ROOT / skill_id / "SKILL.md"
            if not md.exists():
                continue
            try:
                content = md.read_text(encoding="utf-8")
                lines.append(f"<skill id=\"{skill_id}\">")
                lines.append(content)
                lines.append("</skill>")
            except OSError:
                continue
        if not lines:
            return ""
        return "\n".join(["<skills>", *lines, "</skills>"])

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

        skills_block = self._load_skills_block()
        if skills_block:
            text = text + "\n\n" + skills_block

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

        skills_block = self._load_skills_block()
        if skills_block:
            sections.append(skills_block)

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

    def as_tool(self, name: str | None = None, description: str | None = None) -> FunctionTool:
        """Convert this agent into an SDK FunctionTool callable by another agent."""
        return self.build().as_tool(
            name=name or f"agent_{self.role.lower()}_{self.id[-8:]}",
            description=description or (
                f"Delegate tasks to {self.name} ({self.role}). "
                f"Best for: {self.get_capabilities_description()}"
            ),
            arg_name="task",
            arg_description="The task to delegate to this agent",
            propagate_session=True,
        )


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
        thread_id = task.get("session_id") or task.get("conversation_id") or task.get("job_id") or run_id
        customer_id = task.get("user_id") or "anonymous"
        attachments = list(task.get("attachments") or [])
        task_llm_client = await self._build_task_scoped_llm_client(task)
        selected_supports_vision = supports_vision(self.model, self.config.provider)
        vision_client_required = bool(attachments) and not selected_supports_vision

        if self._should_use_sdk_runtime(task):
            try:
                return await self._run_with_sdk_agent(message, thread_id, task, run_id)
            except Exception as exc:
                logger.warning(
                    "sdk_agent_runtime_failed_falling_back",
                    agent_id=self.id,
                    thread_id=thread_id,
                    error=str(exc),
                )

        ctx = PipelineContext(
            message=message,
            thread_id=thread_id,
            company_id=self.company_id,
            customer_id=customer_id,
            agent=self,
            session=task.get("_db_session"),
            llm_client=task_llm_client,
            channel=str(task.get("channel") or task.get("source_channel") or "chat"),
            conversation_id=str(task.get("conversation_id") or thread_id),
            attachments=attachments,
            external_memory_context=dict(task.get("memory_context") or {}),
        )
        if vision_client_required and task_llm_client is None:
            ctx.early_return = {
                "status": "PROVIDER_ERROR",
                "result": {
                    "error": "Vision-capable LLM provider unavailable",
                    "error_code": "vision_model_unavailable",
                },
            }
            return self._to_process_task_result(ctx, task, run_id)

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

    async def _build_task_scoped_llm_client(self, task: dict[str, Any]) -> Any | None:
        attachments = list(task.get("attachments") or [])
        if not attachments:
            return None
        route = route_for_modalities(
            model=self.model,
            provider=self.config.provider,
            has_image_input=True,
        )
        if route.reason == "selected_model_supports_vision":
            return None
        try:
            tools = self._resolve_tools()
            system_prompt = self._get_system_prompt()
            if route.provider:
                return await build_provider_client_async(
                    route.provider,
                    model=route.model,
                    tools=tools,
                    system_prompt=system_prompt,
                    company_id=self.company_id,
                )
            return await build_agent_client_async(
                get_settings(),
                model=route.model,
                tools=tools,
                system_prompt=system_prompt,
                company_id=self.company_id,
            )
        except Exception as exc:
            logger.warning(
                "vision_llm_client_unavailable",
                agent_id=self.id,
                selected_model=self.model,
                selected_provider=self.config.provider,
                error=str(exc),
            )
            return None

    def _should_use_sdk_runtime(self, task: dict[str, Any]) -> bool:
        """Use SDK Agent.run for internal work without bypassing customer chat gates."""
        if task.get("attachments"):
            return False
        if task.get("force_pipeline") or task.get("use_sdk_runtime") is False:
            return False

        channel = str(task.get("channel") or task.get("source_channel") or "").lower()
        customer_channels = {
            "chat",
            "facebook",
            "facebook_messenger",
            "messenger",
            "whatsapp",
            "telegram",
        }
        if channel in customer_channels:
            return False

        customer_id = task.get("user_id") or task.get("customer_id")
        if customer_id and str(customer_id) not in {"anonymous", "merchant_admin"}:
            return False

        if task.get("use_sdk_runtime") is True:
            return True

        return bool(task.get("job_id") or task.get("parent_run_id"))

    async def _run_with_sdk_agent(
        self,
        message: str,
        thread_id: str,
        task: dict[str, Any],
        run_id: str,
    ) -> dict[str, Any]:
        framework_agent = self.build()
        session = framework_agent.create_session(session_id=thread_id)
        session_state = getattr(session, "state", None)
        if isinstance(session_state, dict):
            session_state["maxp_context"] = {
                **(session_state.get("maxp_context") or {}),
                "company_id": self.company_id,
                "customer_id": str(task.get("user_id") or task.get("customer_id") or "anonymous"),
                "thread_id": thread_id,
                "rag_evidence": task.get("rag_evidence") or "",
                "episodic_memories": task.get("episodic_memories") or [],
                "system_prompt": task.get("system_prompt") or "",
            }
        response = framework_agent.run(
            message,
            session=session,
            options={"maxp_token_budget": int(task.get("token_budget") or 120_000)},
        )
        if isawaitable(response):
            response = await response

        user_input_requests = list(getattr(response, "user_input_requests", None) or [])
        if user_input_requests:
            first_request = user_input_requests[0]
            request_id = _request_attr(first_request, "id") or _request_attr(first_request, "request_id")
            return {
                "agent_id": self.id,
                "role": self.role,
                "status": "PAUSED",
                "result": {
                    "reply": _sdk_response_text(response),
                    "summary": _sdk_response_text(response),
                    "tools_used": True,
                    "tool_rounds": 1,
                    "tools": [
                        {
                            "status": "awaiting_approval",
                            "sdk_approval_id": request_id,
                            "tool": _request_attr(first_request, "name")
                            or _request_attr(first_request, "function_name"),
                            "arguments": _request_attr(first_request, "arguments") or {},
                        }
                    ],
                    "repaired": False,
                    "status": "AWAITING_APPROVAL",
                    "thread_id": thread_id,
                    "draft_id": request_id,
                    "runtime": "sdk_agent",
                },
                "model_selection": self._last_model_selection,
                "task": task,
                "run_id": run_id,
            }

        reply = _sdk_response_text(response)
        return {
            "agent_id": self.id,
            "role": self.role,
            "status": "SUCCESS",
            "result": {
                "reply": reply,
                "summary": reply,
                "tools_used": False,
                "tool_rounds": 0,
                "tools": [],
                "repaired": False,
                "status": "ok",
                "thread_id": thread_id,
                "draft_id": None,
                "runtime": "sdk_agent",
            },
            "model_selection": self._last_model_selection,
            "task": task,
            "run_id": run_id,
        }

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
        attachments = list(task.get("attachments") or [])
        task_llm_client = await self._build_task_scoped_llm_client(task)

        ctx = PipelineContext(
            message=message,
            thread_id=thread_id,
            company_id=self.company_id,
            customer_id=customer_id,
            agent=self,
            session=task.get("_db_session"),
            llm_client=task_llm_client,
            channel=str(task.get("channel") or task.get("source_channel") or "chat"),
            conversation_id=str(task.get("conversation_id") or thread_id),
            attachments=attachments,
            external_memory_context=dict(task.get("memory_context") or {}),
        )
        if attachments and not supports_vision(self.model, self.config.provider) and task_llm_client is None:
            emitter.emit("run_error", {"error": "vision_model_unavailable"})
            for ev in emitter.events():
                yield ev
            return

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

        early_result = (ctx.early_return or {}).get("result", {})
        reply = ctx.final_reply or early_result.get("reply", "")

        executed = ctx.executed_tools or []
        pipeline_trace = _build_pipeline_trace(ctx, self._last_model_selection)
        return {
            "agent_id": self.id,
            "role": self.role,
            "status": status,
            "error": early_result.get("error"),
            "errorCode": early_result.get("error_code"),
            "result": {
                "reply": reply,
                "summary": reply,
                "error": early_result.get("error"),
                "errorCode": early_result.get("error_code"),
                "providerStatusCode": early_result.get("provider_status_code"),
                "retryAfter": early_result.get("retry_after"),
                "tools_used": bool(executed),
                "tool_rounds": ctx.rounds,
                "tools": executed,
                "pipeline_trace": pipeline_trace,
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


def _trace_value(value: Any, default: Any = None) -> Any:
    return default if _is_mock_value(value) else value


def _trace_attr(obj: Any, name: str, default: Any = None) -> Any:
    if obj is None:
        return default
    if isinstance(obj, dict):
        return _trace_value(obj.get(name, default), default)
    return _trace_value(getattr(obj, name, default), default)


def _planned_tool_entries(execution_plan: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not isinstance(execution_plan, dict):
        return []
    entries: list[dict[str, Any]] = []
    for key in ("deterministicReadExecution", "deterministicActionExecution"):
        planned = execution_plan.get(key)
        if isinstance(planned, dict):
            entries.append(planned)
    for planned in execution_plan.get("plannedExecutions") or []:
        if isinstance(planned, dict):
            entries.append(planned)
    return entries


def _build_pipeline_trace(ctx: PipelineContext, model_selection: dict[str, Any] | None = None) -> dict[str, Any]:
    plan = _trace_attr(ctx, "relevance_plan")
    planned_entries = _planned_tool_entries(_trace_attr(ctx, "execution_plan"))
    params_by_tool: dict[str, dict[str, Any]] = {}
    for planned in planned_entries:
        native_name = canonical_tool_name(planned.get("nativeName") or planned.get("tool") or "")
        if native_name and isinstance(planned.get("params"), dict):
            params_by_tool[native_name] = planned["params"]

    tool_executions: list[dict[str, Any]] = []
    for item in _trace_attr(ctx, "executed_tools", []) or []:
        if not isinstance(item, dict):
            continue
        tool_name = str(item.get("tool") or item.get("name") or item.get("action_type") or "unknown")
        canonical = canonical_tool_name(tool_name)
        result = item.get("result")
        tool_executions.append({
            "name": tool_name,
            "status": item.get("status"),
            "success": bool(item.get("success")) if "success" in item else item.get("status") == "success",
            "params": item.get("params") if isinstance(item.get("params"), dict) else params_by_tool.get(canonical, {}),
            "output": result if isinstance(result, dict) else {},
            "resultSummary": item.get("error") or item.get("status"),
            "latencyMs": item.get("latencyMs") or item.get("latency_ms"),
            "error": item.get("error"),
        })

    selection = model_selection if isinstance(model_selection, dict) else {}
    return {
        "intentClassification": {
            "intent": _trace_attr(plan, "intent"),
            "confidence": _trace_attr(plan, "confidence", 0),
            "confidenceLevel": _trace_attr(plan, "confidenceLevel", ""),
            "ambiguous": bool(_trace_attr(plan, "ambiguous", False)),
            "blockedReason": _trace_attr(plan, "blockedReason"),
            "clarificationQuestion": _trace_attr(plan, "clarificationQuestion"),
            "slots": _trace_attr(plan, "slots", {}) or {},
            "missingSlots": _trace_attr(plan, "missingSlots", []) or [],
        } if plan else None,
        "toolPlan": {
            "intent": _trace_attr(plan, "intent"),
            "primaryTool": _trace_attr(plan, "primaryTool"),
            "allowedTools": _trace_attr(plan, "allowedTools", []) or [],
            "reason": _trace_attr(plan, "reason", ""),
            "blockedReason": _trace_attr(plan, "blockedReason"),
            "selectionScore": _trace_attr(plan, "selectionScore"),
            "ambiguous": bool(_trace_attr(plan, "ambiguous", False)),
        } if plan else None,
        "toolExecutions": tool_executions,
        "modelSelection": {
            "provider": selection.get("provider"),
            "model": selection.get("model"),
            "keyId": selection.get("keyId") or selection.get("key_id"),
            "keyName": selection.get("keyName") or selection.get("key_name"),
        } if selection else None,
    }


def _sdk_response_text(response: Any) -> str:
    text = getattr(response, "text", None)
    if isinstance(text, str):
        return text
    value = getattr(response, "value", None)
    if isinstance(value, str):
        return value
    if value is not None and not _is_mock_value(value):
        return str(value)
    return ""


def _request_attr(request: Any, name: str) -> Any:
    if isinstance(request, dict):
        return request.get(name)
    value = getattr(request, name, None)
    return None if _is_mock_value(value) else value


def _is_mock_value(value: Any) -> bool:
    return type(value).__module__.startswith("unittest.mock")


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
