"""
BaseAgent
=========

Unified agent abstraction for the MaxP AI service.

Wraps Microsoft Agent Framework ``Agent`` with MaxP-specific concerns:

* Persona, policies, scoped tool/skill permissions
* System-prompt assembly from modular templates (SOUL / PERSONA / TOOLS / AGENTS)
* Handoffs to other agents (via ``as_tool``)
* Input / output guardrails
 * Pipeline execution: ``process_with_skills`` -> ``validate_reply``
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
from pathlib import Path
from typing import Any

import structlog
from agent_framework import (
    Agent,
    AggregatingSkillsSource,
    FunctionTool,
    SkillsProvider,
    SkillsSource,
    UserInputRequiredException,
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
from src.llm.model_capabilities import (
    DEFAULT_VISION_MODEL,
    DEFAULT_VISION_PROVIDER,
    route_for_modalities,
    supports_vision,
)
from src.mcp_integration.registry import get_mcp_registry
from src.pipeline.context import DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL, PipelineContext
from src.pipeline.runner import execute_pipeline
from src.pipeline.stages.skills_pipeline import process_with_skills
from src.pipeline.stages.validate_reply import validate_reply
from src.pipeline.stages.visual_match import match_product_by_image
from src.prompts.template_registry import HydratedPrompt, get_prompt_registry
from src.tools.names import canonical_tool_name, canonical_tool_set
from src.tools.sdk_gateway import wrap_tools_for_gateway
from src.agents._internals import (
    _OfflineTemplateProxy,
    _StreamEmitter,
    _TemplateAdapter,
)
from src.pipeline.hooks import AgentHook

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
    allowed_channels: list[str] = field(default_factory=list)

    template_slug: str | None = None
    version: str | None = None
    parent_id: str | None = None

    model: str = ""
    model_source: str = "runtime-default"
    provider: str | None = None
    key_id: str | None = None

    persona: dict[str, Any] = field(default_factory=dict)
    policies: dict[str, Any] = field(default_factory=dict)
    instructions: dict[str, Any] = field(default_factory=dict)
    output_schema: Any = None
    tool_choice: str | None = None

    handoffs: list[dict[str, Any]] = field(default_factory=list)
    input_guardrails: list[BaseGuardrail] = field(default_factory=list)
    output_guardrails: list[BaseGuardrail] = field(default_factory=list)
    status: str = "ACTIVE"

    config: dict[str, Any] = field(default_factory=dict)

    hooks: list[AgentHook] = field(default_factory=list)


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

        self.hooks: list[AgentHook] = list(config.hooks or [])
        if not self.hooks:
            self.hooks = _load_hooks_for_template(self.template_slug)
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

        default_model = profile.model_policy.get("default") if isinstance(profile.model_policy, dict) else ""
        fallback_model = profile.model_policy.get("model") if isinstance(profile.model_policy, dict) else ""

        resolved_model = (
            overrides.get("model")
            or default_model
            or fallback_model
            or ""
        )

        config = BaseAgentConfig(
            id=overrides.get("id")
            or f"{profile.role}_{company_id[-6:]}_{int(_utcnow().timestamp() * 1000)}",
            name=overrides.get("name") or profile.name,
            role=overrides.get("role") or profile.role,
            company_id=company_id,
            allowed_tools=overrides.get("allowed_tools") or profile.allowed_tools,
            tool_choice=overrides.get("tool_choice") or profile.tool_choice,
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
            config=overrides.get("config") or {},
        )
        # Load agent-specific hooks based on template slug
        config.hooks = _load_hooks_for_template(template_slug)

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

        # File-based skills provider for the SDK Agent Runtime path
        if self.allowed_skills:
            from src.skills.integration import create_skills_provider
            file_skills_provider = create_skills_provider(self.allowed_skills)
            if file_skills_provider:
                context_providers.append(file_skills_provider)

        default_options: dict[str, Any] = {"model": self.model}
        if self.output_schema:
            default_options["output_schema"] = self.output_schema
        if self.config.tool_choice:
            default_options["tool_choice"] = self.config.tool_choice

        self._framework_agent = Agent(
            client=client,
            name=self._agent_name(),
            instructions=instructions,
            tools=tools,
            context_providers=context_providers,
            middleware=build_maxp_function_middleware(self.company_id, self.role, agent_name=self.name),
            default_options=default_options,
        )
        self.client = client
        return self._framework_agent

    async def _try_build_client(
        self,
        *,
        provider: str | None = None,
        model: str = "",
        key_id: str | None = None,
        tools: list[Any] = None,
        instructions: str = "",
    ) -> Any | None:
        try:
            if provider:
                return await build_provider_client_async(
                    provider,
                    model=model,
                    tools=tools,
                    system_prompt=instructions,
                    company_id=self.company_id,
                    key_id=key_id,
                )
            else:
                return await build_agent_client_async(
                    get_settings(),
                    model=model,
                    tools=tools,
                    system_prompt=instructions,
                    company_id=self.company_id,
                )
        except Exception as exc:
            logger.warning(
                "client_build_failed",
                model=model,
                provider=provider,
                agent_id=self.id,
                error=str(exc),
            )
            return None

    async def ensure_client(self) -> Any:
        """Create the SDK-compatible client through the framework Agent lifecycle."""
        if self.client is not None:
            return self.client
        settings = get_settings()
        instructions = self._get_system_prompt()
        tools = self._resolve_tools()

        # DB-first model resolution: an agent without an explicit model falls back
        # to the company model, then the platform default — never env.
        if not self.model:
            try:
                from src.services.model_resolver import resolve_db_default_model

                db_model = await resolve_db_default_model(self.company_id)
                if db_model:
                    self.model = db_model
                    self._last_model_selection = {"model": db_model, "source": "db_default"}
            except Exception as exc:
                logger.warning("db_default_model_resolution_failed", agent_id=self.id, error=str(exc)[:160])

        # Step 1: Try primary model
        client = await self._try_build_client(
            provider=self.config.provider,
            model=self.model,
            key_id=self.config.key_id,
            tools=tools,
            instructions=instructions,
        )
        if client:
            self._last_model_selection = {"model": self.model, "source": "primary"}
            self.client = client
            return client

        # Step 2: Fallback logic using model_policy
        model_policy = self.policies.get("model_policy", {}) or {}
        if isinstance(model_policy, str):
            try:
                import json
                model_policy = json.loads(model_policy)
            except Exception:
                model_policy = {}
        if not isinstance(model_policy, dict):
            model_policy = {}

        raw_fallbacks = model_policy.get("fallback", [])
        if isinstance(raw_fallbacks, (str, dict)):
            raw_fallbacks = [raw_fallbacks]
        elif not isinstance(raw_fallbacks, list):
            raw_fallbacks = []

        fallbacks: list[dict[str, Any]] = []
        for fb in raw_fallbacks:
            if isinstance(fb, str):
                fb_str = fb.strip()
                if not fb_str:
                    continue
                if "/" in fb_str:
                    p, m = fb_str.split("/", 1)
                    fallbacks.append({"provider": p, "model": m})
                else:
                    fallbacks.append({"model": fb_str})
            elif isinstance(fb, dict):
                fallbacks.append(fb)

        logger.warning(
            "primary_model_failed_trying_fallbacks",
            agent_id=self.id,
            primary_model=self.model,
            fallback_count=len(fallbacks),
        )

        for i, fb in enumerate(fallbacks):
            fb_model = fb.get("model", "") if isinstance(fb, dict) else str(fb)
            fb_provider = fb.get("provider") if isinstance(fb, dict) else None
            if not fb_model:
                continue

            logger.info(
                "trying_model_fallback",
                index=i,
                model=fb_model,
                provider=fb_provider,
            )
            client = await self._try_build_client(
                provider=fb_provider,
                model=fb_model,
                tools=tools,
                instructions=instructions,
            )
            if client:
                self._last_model_selection = {
                    "model": fb_model,
                    "provider": fb_provider,
                    "source": f"fallback-{i}",
                    "original_model": self.model,
                }
                logger.warning(
                    "model_fallback_activated",
                    agent_id=self.id,
                    fallback_index=i,
                    fallback_model=fb_model,
                    fallback_provider=fb_provider,
                )
                self.client = client
                self.model = fb_model
                return client

        # Step 3: Platform DB-default fallback if primary & configured fallbacks failed
        try:
            from src.services.model_resolver import resolve_db_default_model

            db_model = await resolve_db_default_model(self.company_id)
            if db_model and db_model != self.model:
                logger.warning(
                    "trying_db_default_as_last_resort",
                    agent_id=self.id,
                    db_model=db_model,
                )
                client = await self._try_build_client(
                    model=db_model,
                    tools=tools,
                    instructions=instructions,
                )
                if client:
                    self._last_model_selection = {
                        "model": db_model,
                        "source": "db_default_last_resort",
                        "original_model": self.model,
                    }
                    self.client = client
                    self.model = db_model
                    return client
        except Exception as exc:
            logger.warning("db_default_last_resort_failed", agent_id=self.id, error=str(exc)[:160])

        # Step 4: If everything failed, raise RuntimeError
        raise RuntimeError(
            f"No LLM client available for model '{self.model}' (tried primary model + {len(fallbacks)} fallbacks). "
            f"Check active API keys in ai_keys table for agent {self.id}."
        )

    def _resolve_tools(self) -> list[FunctionTool]:
        """Resolve the list of tools this agent is allowed to use.
        
        By default, agents start with only CORE_TOOLS to implement Progressive Tool Exposure.
        Advanced tools are unlocked dynamically via the unlock_advanced_tools tool.
        Agents with allowed_skills also get skill tools (load_skill, read_skill_resource)
        for progressive-disclosure skill loading.
        """
        from src.tools.registry import CORE_TOOLS, SKILL_TOOLS

        # Base set is CORE_TOOLS for progressive exposure
        base_set = list(CORE_TOOLS)

        # Append skill tools for agents with skills
        if self.allowed_skills:
            for st in SKILL_TOOLS:
                if st not in base_set:
                    base_set.append(st)

        from src.tools.registry import get_all_tools, unlock_advanced_tools_tool

        if not self.allowed_tools:
            # Fallback: populate from role_tools.yaml when agent has no explicit tools
            if not self.allowed_skills and self.role:
                try:
                    from src.tools.role_config import get_tool_names_for_role
                    role_tools = get_tool_names_for_role(str(self.role).upper())
                    if role_tools:
                        self.allowed_tools = list(role_tools)
                        logger.info("resolved_tools_from_role", role=self.role, count=len(self.allowed_tools))
                except Exception as exc:
                    logger.warning("role_tools_resolve_failed", role=self.role, error=str(exc))

            # When skills are configured without explicit tools, derive tools from skill manifests.
            # This enables the "skills-first" pattern: the agent discovers tools via load_skill()
            # while the gateway still authorizes only what the skills declare.
            if self.allowed_skills:
                from src.skills.integration import get_skill_allowed_tools, get_skill_tool_names
                allowed: set[str] = set()
                for _skill_id in self.allowed_skills:
                    for _t in get_skill_allowed_tools(_skill_id):
                        allowed.add(str(_t).lower().replace(".", "_"))
                        allowed.add(str(_t).lower())
                for _st in get_skill_tool_names():
                    allowed.add(_st.lower())
                for _bt in base_set:
                    allowed.add(_tool_name(_bt).lower())
                scoped = [
                    t for t in get_all_tools()
                    if _tool_name(t).lower() in allowed
                    or _tool_name(t).replace("_", ".").lower() in allowed
                ]
                if unlock_advanced_tools_tool not in scoped:
                    scoped.append(unlock_advanced_tools_tool)
                return wrap_tools_for_gateway(
                    scoped,
                    company_id=self.company_id,
                    agent_role=self.role,
                    allowed_tools=[_tool_name(t) for t in scoped],
                )
            return wrap_tools_for_gateway(
                base_set,
                company_id=self.company_id,
                agent_role=self.role,
                allowed_tools=[_tool_name(tool) for tool in base_set],
            )

        allowed = {name.lower() for name in self.allowed_tools}

        # Derive tools from skill manifests for each allowed skill
        if self.allowed_skills:
            from src.skills.integration import get_skill_allowed_tools
            for _skill_id in self.allowed_skills:
                for _t in get_skill_allowed_tools(_skill_id):
                    allowed.add(str(_t).lower().replace(".", "_"))
                    allowed.add(str(_t).lower())

        # Include skill meta-tools (load_skill, read_skill_resource)
        if self.allowed_skills:
            from src.skills.integration import get_skill_tool_names
            for st_name in get_skill_tool_names():
                allowed.add(st_name.lower())

        # Hermes Universal Self-Learning & Asset Visibility: always permit self-learning and vital tools
        allowed.add("record_learned_rule")
        allowed.add("manage_agent_skill")
        if str(self.role).upper() == "MEDIA_BUYER":
            allowed.add("facebook_ad_record_learned_rule")
            allowed.add("facebook_ad.record_learned_rule")
            allowed.add("facebook_ad_account_info")
            allowed.add("facebook_ad.account_info")
            allowed.add("orders_campaign_attribution_report")
            allowed.add("orders.campaign_attribution_report")

        scoped = [
            t for t in get_all_tools()
            if _tool_name(t).lower() in allowed or _tool_name(t).replace("_", ".").lower() in allowed
        ]

        # Ensure unlock_advanced_tools is always available for agents that can unlock them
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

    @property
    def middleware(self) -> list[Any]:
        """Expose the function and agent middleware."""
        return build_maxp_function_middleware(self.company_id, self.role, agent_name=self.name)

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
            "company_name": self.persona.get("company_name") or self.company_id,
            "business_specialty": self.persona.get("business_specialty") or "",
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

        # Skills are injected by ContextAssembler (pipeline) or SkillsProvider
        # (SDK Agent Runtime). Do not inline them here to avoid duplication.
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

        # Skills are injected by ContextAssembler or SkillsProvider.
        # Do not inline here to avoid duplication.
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
        if self.allowed_tools:
            return sorted(self.allowed_tools)
        if self.allowed_skills:
            from src.skills.integration import get_skill_allowed_tools
            derived: set[str] = set()
            for _skill_id in self.allowed_skills:
                for _t in get_skill_allowed_tools(_skill_id):
                    derived.add(str(_t).lower().replace(".", "_"))
            if derived:
                return sorted(derived)
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
            external_memory_context=self._build_external_memory_context(task),
        )
        ctx.model_selection = getattr(task_llm_client, "model_selection", None) or ({"model": self.model, "source": "primary"} if self.model else None)
        # Pre-populate native_tools from _resolve_tools so the pipeline
        # always sees the effective tool set (resolves CORE_TOOLS fallback).
        try:
            resolved = self._resolve_tools()
            ctx.native_tools = [{"name": t.name} for t in resolved]
        except Exception:
            pass
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
                match_product_by_image,
                process_with_skills,
                validate_reply,
            ],
        )

        # Hermes Autonomous Learning Hook: background review of interaction trajectory
        try:
            self._trigger_background_learning_review(ctx, task)
        except Exception as bg_err:
            logger.debug("background_learning_review_dispatch_failed", error=str(bg_err))

        return self._to_process_task_result(ctx, task, run_id)

    def _trigger_background_learning_review(self, ctx: PipelineContext, task: dict[str, Any]) -> None:
        """Hermes Autonomous Learning Hook: post-turn review in background task.
        
        Evaluates the interaction trajectory. If merchant-facing or operational task with clear
        positive outcome, distills playbooks into PENDING_APPROVAL status.
        If customer-facing, strictly scans and rejects any prompt injection attempt.
        """
        import asyncio
        from src.skills.background_review import hermes_background_review_worker

        company_id = self.company_id
        if not company_id or not ctx.reply:
            return

        channel = str(task.get("channel") or task.get("source_channel") or "").lower()
        user_msg = str(task.get("message") or task.get("user_message") or "")
        agent_reply = str(ctx.reply or "")

        if not user_msg:
            return

        trajectory = [
            {"role": "user", "content": user_msg},
            {"role": "assistant", "content": agent_reply},
        ]

        ground_truth = "SUCCESS" if not getattr(ctx, "errors", None) else "FAILED"

        async def _run_review() -> None:
            try:
                await hermes_background_review_worker.review_post_turn(
                    company_id=company_id,
                    agent_role=self.role,
                    trajectory=trajectory,
                    ground_truth_outcome=ground_truth,
                    metadata={
                        "channel": channel,
                        "agent_id": self.id,
                        "run_id": getattr(ctx, "run_id", None),
                    },
                    require_approval=True,
                )
            except Exception as e:
                logger.debug("background_review_task_error", error=str(e))

        asyncio.create_task(_run_review())

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
            return await build_provider_client_async(
                route.provider or DEFAULT_VISION_PROVIDER,
                model=route.model or DEFAULT_VISION_MODEL,
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
        try:
            response = await framework_agent.run(
                message,
                session=session,
                options={"maxp_token_budget": int(task.get("token_budget") or 120_000)},
            )
        except UserInputRequiredException as e:
            request_id = getattr(e, "request_id", None) or getattr(e, "id", str(uuid.uuid4()))
            tool_name = getattr(e, "function_name", "") or getattr(e, "name", "")
            tool_args = getattr(e, "arguments", None) or {}
            return {
                "agent_id": self.id,
                "role": self.role,
                "status": "PAUSED",
                "result": {
                    "reply": "",
                    "summary": "",
                    "tools_used": True,
                    "tool_rounds": 1,
                    "tools": [
                        {
                            "status": "awaiting_approval",
                            "sdk_approval_id": request_id,
                            "tool": tool_name,
                            "arguments": tool_args,
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
            external_memory_context=self._build_external_memory_context(task),
        )
        if attachments and not supports_vision(self.model, self.config.provider) and task_llm_client is None:
            emitter.emit("run_error", {"error": "vision_model_unavailable"})
            for ev in emitter.events():
                yield ev
            return

        try:
            emitter.emit("agent_thinking", {"stage": "resolve_intent"})

            for stage in (
                match_product_by_image,
                process_with_skills,
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
            response_attachments = list(getattr(ctx, "response_attachments", None) or [])
            emitter.emit(
                "agent_reply",
                {
                    "reply": final_reply,
                    "response_attachments": response_attachments,
                    "is_incremental": False,
                    "model_used": self.model,
                },
            )
            emitter.emit(
                "run_complete",
                {
                    "run_id": run_id,
                    "reply": final_reply,
                    "response_attachments": response_attachments,
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

    def _build_external_memory_context(self, task: dict[str, Any]) -> dict[str, Any]:
        memory_context = dict(task.get("memory_context") or {})
        provider = str(self.config.provider or "").strip().upper()
        if provider and provider != "GOOGLE":
            memory_context.setdefault(DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL, True)
        return memory_context

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
        # ponytail: model returned no reply text but tools ran — pass tool data for validation upstream
        if not reply and executed:
            pass  # let upstream handle empty reply instead of fabricating one
        effective_model_selection = getattr(ctx, "model_selection", None) or self._last_model_selection
        pipeline_trace = _build_pipeline_trace(ctx, effective_model_selection)
        return {
            "agent_id": self.id,
            "role": self.role,
            "status": status,
            "error": early_result.get("error"),
            "errorCode": early_result.get("error_code"),
            "result": {
                "reply": reply,
                "summary": reply,
                "response_attachments": list(getattr(ctx, "response_attachments", None) or []),
                "error": early_result.get("error"),
                "errorCode": early_result.get("error_code"),
                "providerStatusCode": early_result.get("provider_status_code"),
                "retryAfter": early_result.get("retry_after"),
                "tools_used": bool(executed),
                "tool_rounds": ctx.rounds,
                "tools": executed,
                "pipeline_trace": pipeline_trace,
                "compiled_system_prompt": ctx.system_prompt or "",
                "repaired": ctx.repaired,
                "status": (ctx.early_return or {}).get("status", "ok"),
                "thread_id": ctx.thread_id,
                "draft_id": (ctx.early_return or {}).get("draft_id"),
            },
            "model_selection": effective_model_selection,
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


def _is_mock_value(value: Any) -> bool:
    return type(value).__module__.startswith("unittest.mock")


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
    active_skill = _trace_attr(ctx, "active_skill_context")
    planned_entries = _planned_tool_entries(_trace_attr(ctx, "execution_plan"))
    params_by_tool: dict[str, dict[str, Any]] = {}
    for planned in planned_entries:
        native_name = canonical_tool_name(planned.get("nativeName") or planned.get("tool") or "")
        if native_name and isinstance(planned.get("params"), dict):
            params_by_tool[native_name] = planned["params"]

    executed = _trace_attr(ctx, "executed_tools", []) or []
    called_skills = []
    for item in executed:
        if not isinstance(item, dict):
            continue
        tool_name = str(item.get("tool") or item.get("name") or item.get("action_type") or "unknown")
        called_skills.append({"name": tool_name, "status": item.get("status"), "error": item.get("error")})

    tool_executions: list[dict[str, Any]] = []
    for item in executed:
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

    primary = called_skills[0]["name"] if called_skills else None

    return {
        "activeSkill": active_skill,
        "intentClassification": {
            "intent": primary or "general.chat",
            "skills": called_skills,
            "count": len(called_skills),
        } if called_skills else None,
        "toolPlan": {
            "primaryTool": primary,
            "skillsCalled": [s["name"] for s in called_skills],
            "totalCalled": len(called_skills),
        } if called_skills else None,
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

def _load_hooks_for_template(template_slug: str | None) -> list:
    """Load pipeline hooks."""
    from src.pipeline.hooks import AgentHook, AttachmentHook

    hooks: list[AgentHook] = []

    # Default hooks (run for every agent)
    hooks.append(AttachmentHook())

    # Template-specific hooks
    if template_slug == "hotel-agent":
        from src.agents.hooks.hotel_hook import HotelEnforcementHook

        hooks.append(HotelEnforcementHook())

    return hooks
