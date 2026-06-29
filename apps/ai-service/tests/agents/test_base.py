"""Tests for the BaseAgent class and its public API.

Covers construction, factory loading, tool/skill permissions, handoffs,
guardrails, system-prompt caching, lifecycle, and observability hooks.
"""

from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.agents.base import (
    SYSTEM_PROMPT_CACHE_TTL_SECONDS,
    BaseAgent,
    BaseAgentConfig,
    _StreamEmitter,
    _TemplateAdapter,
)
from src.context.sdk_provider import MaxPContextProvider
from src.guardrails.base import BaseGuardrail, GuardrailResult

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def cfg() -> BaseAgentConfig:
    return BaseAgentConfig(
        id="agent_test_001",
        name="Test Agent",
        role="SUPPORT",
        company_id="comp_001",
        allowed_tools=["product.search", "order.lookup"],
        allowed_skills=["skill.refund_lookup"],
        template_slug="support-agent",
        version="1.0.0",
        model="gemini-2.5-flash",
        persona={"language": "arabic", "tone": "professional"},
        policies={"max_tool_calls_per_run": 5},
        instructions={
            "soul": "You are a test agent.",
            "persona": "Speak formally in Arabic.",
            "agents": "Follow the rules.",
            "tools": "Use product.search when needed.",
        },
        handoffs=[
            {"agent_id": "ceo_001", "role": "CEO", "description": "Escalate"},
        ],
    )


@pytest.fixture
def agent(cfg: BaseAgentConfig) -> BaseAgent:
    return BaseAgent(cfg)


# ---------------------------------------------------------------------------
# Construction
# ---------------------------------------------------------------------------


class TestConstruction:
    def test_from_dict_config(self):
        agent = BaseAgent(
            {
                "id": "a1",
                "name": "A1",
                "role": "SALES",
                "company_id": "c1",
                "allowed_tools": ["product.search"],
            }
        )
        assert agent.id == "a1"
        assert agent.role == "SALES"
        assert agent.allowed_tools == {"product.search"}

    def test_from_config_object(self, cfg: BaseAgentConfig):
        agent = BaseAgent(cfg)
        assert agent.config is cfg
        assert agent.id == cfg.id
        assert agent.allowed_tools == set(cfg.allowed_tools)
        assert agent.allowed_skills == set(cfg.allowed_skills)

    def test_defaults(self, agent: BaseAgent):
        assert agent.status == "ACTIVE"
        assert agent._children == []
        assert agent._task_log == []
        assert agent._framework_agent is None
        assert agent._system_prompt_cache is None

    def test_created_at_is_utc(self, agent: BaseAgent):
        assert isinstance(agent.created_at, datetime)
        assert agent.created_at.tzinfo is not None

    @pytest.mark.asyncio
    async def test_from_template_honors_runtime_role_override_when_template_is_missing(self):
        agent = await BaseAgent.from_template(
            "facebook-sales-support-agent",
            "comp_001",
            overrides={
                "id": "agent_fb",
                "name": "شيرين",
                "role": "FACEBOOK_SALES_SUPPORT",
                "model": "llama-3.3-70b-versatile",
            },
            session=None,
        )

        assert agent.id == "agent_fb"
        assert agent.name == "شيرين"
        assert agent.role == "FACEBOOK_SALES_SUPPORT"

    @pytest.mark.asyncio
    async def test_from_template_prompt_uses_runtime_identity(self):
        agent = await BaseAgent.from_template(
            "facebook-sales-support-agent",
            "comp_001",
            overrides={
                "id": "agent_fb",
                "name": "شرين",
                "role": "FACEBOOK_SALES_SUPPORT",
                "model": "llama-3.3-70b-versatile",
                "instructions": {
                    "soul": "اسمك شرين\nاتكلمي بالعامية المصرية",
                },
            },
            session=None,
        )

        prompt = agent.instructions

        assert "Name: شرين" in prompt
        assert "Role: FACEBOOK_SALES_SUPPORT" in prompt
        assert "اسمك شرين" in prompt


# ---------------------------------------------------------------------------
# Tool / skill permissions
# ---------------------------------------------------------------------------


class TestPermissions:
    def test_can_use_tool(self, agent: BaseAgent):
        assert agent.can_use_tool("product.search") is True
        assert agent.can_use_tool("unknown.tool") is False

    def test_can_use_skill(self, agent: BaseAgent):
        assert agent.can_use_skill("skill.refund_lookup") is True
        assert agent.can_use_skill("unknown") is False

    def test_get_tools_returns_sorted_list(self, agent: BaseAgent):
        tools = agent.get_tools()
        assert tools == sorted(tools)
        assert "product.search" in tools

    def test_get_skills_returns_sorted_list(self, agent: BaseAgent):
        skills = agent.get_skills()
        assert skills == sorted(skills)


# ---------------------------------------------------------------------------
# Handoffs
# ---------------------------------------------------------------------------


class TestHandoffs:
    def test_initial_handoffs(self, agent: BaseAgent):
        assert len(agent.handoffs) == 1
        assert agent.handoffs[0]["role"] == "CEO"

    def test_add_handoff_from_dict(self, agent: BaseAgent):
        agent.add_handoff(
            {"agent_id": "s1", "role": "SALES", "description": "Sales agent"}
        )
        assert any(h["role"] == "SALES" for h in agent.handoffs)

    def test_add_handoff_from_base_agent(self, agent: BaseAgent):
        target = BaseAgent(
            BaseAgentConfig(
                id="other_001",
                name="Other",
                role="ORDER",
                company_id="c1",
            )
        )
        agent.add_handoff(target)
        assert any(h["role"] == "ORDER" for h in agent.handoffs)

    def test_get_handoff_descriptions_format(self, agent: BaseAgent):
        desc = agent.get_handoff_descriptions()
        assert "transfer_to_ceo" in desc
        assert "Escalate" in desc

    def test_get_handoff_descriptions_empty(self, cfg: BaseAgentConfig):
        cfg.handoffs = []
        agent = BaseAgent(cfg)
        assert agent.get_handoff_descriptions() == ""


# ---------------------------------------------------------------------------
# as_tool
# ---------------------------------------------------------------------------


class TestAsTool:
    def test_returns_tool_descriptor(self, agent: BaseAgent):
        tool = agent.as_tool()
        assert tool.name.startswith("agent_support_")
        assert "SUPPORT" in tool.description
        assert tool.approval_mode == "never_require"

    @pytest.mark.asyncio
    async def test_handler_delegates_to_process_task(self, agent: BaseAgent):
        with patch.object(agent, "process_task", new=AsyncMock(return_value={
            "status": "SUCCESS",
            "result": {"reply": "delegated reply", "summary": "delegated reply"},
        })) as mock_proc:
            result = await agent._as_tool_handler(
                "c1", {"task": "do x", "handoff_context": None}, {"run_id": "r1"}
            )
            assert result["reply"] == "delegated reply"
            assert result["agent_role"] == "SUPPORT"
            mock_proc.assert_awaited_once()


# ---------------------------------------------------------------------------
# Guardrails
# ---------------------------------------------------------------------------


class _AllowGuardrail(BaseGuardrail):
    async def validate(self, context, text: str) -> GuardrailResult:
        return GuardrailResult(allowed=True)


class _BlockGuardrail(BaseGuardrail):
    async def validate(self, context, text: str) -> GuardrailResult:
        return GuardrailResult(allowed=False, reason="blocked", violations=["x"])


class TestGuardrails:
    def test_add_input_guardrail(self, agent: BaseAgent):
        g = _AllowGuardrail()
        agent.add_input_guardrail(g)
        assert g in agent.input_guardrails

    def test_add_output_guardrail(self, agent: BaseAgent):
        g = _AllowGuardrail()
        agent.add_output_guardrail(g)
        assert g in agent.output_guardrails

    @pytest.mark.asyncio
    async def test_run_input_guardrails_all_pass(self, agent: BaseAgent):
        agent.add_input_guardrail(_AllowGuardrail())
        result = await agent.run_input_guardrails({}, "hi")
        assert result["allowed"] is True
        assert result["violations"] == []

    @pytest.mark.asyncio
    async def test_run_input_guardrails_one_blocks(self, agent: BaseAgent):
        agent.add_input_guardrail(_AllowGuardrail())
        agent.add_input_guardrail(_BlockGuardrail())
        result = await agent.run_input_guardrails({}, "hi")
        assert result["allowed"] is False
        assert len(result["violations"]) == 1

    @pytest.mark.asyncio
    async def test_run_output_guardrails(self, agent: BaseAgent):
        agent.add_output_guardrail(_BlockGuardrail())
        result = await agent.run_output_guardrails({}, "out")
        assert result["allowed"] is False


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------


class TestSystemPrompt:
    def test_assemble_inline_prompt_contains_sections(self, agent: BaseAgent):
        prompt = agent._assemble_inline_prompt(
            {
                "company_name": agent.company_id,
                "handoffs_block": agent.get_handoff_descriptions(),
                "tools_list": agent.get_tools(),
            }
        )
        assert "[SOUL]" in prompt
        assert "[PERSONA]" in prompt
        assert "[AGENT_IDENTITY]" in prompt
        assert "[HANDOFFS]" in prompt
        assert "[AVAILABLE_TOOLS]" in prompt
        assert "product.search" in prompt

    def test_caching(self, agent: BaseAgent):
        agent._system_prompt_cache = "cached"
        agent._system_prompt_cache_at = datetime.now(UTC).timestamp()
        assert agent._get_system_prompt() == "cached"

    def test_clear_prompt_cache(self, agent: BaseAgent):
        agent._system_prompt_cache = "cached"
        agent._system_prompt_cache_at = 1.0
        agent.clear_prompt_cache()
        assert agent._system_prompt_cache is None
        assert agent._system_prompt_cache_at == 0.0

    def test_cache_ttl_constant(self):
        assert SYSTEM_PROMPT_CACHE_TTL_SECONDS == 300


# ---------------------------------------------------------------------------
# Children / lifecycle
# ---------------------------------------------------------------------------


class TestLifecycle:
    def test_add_child(self, agent: BaseAgent):
        child = BaseAgent(
            BaseAgentConfig(id="c1", name="C1", role="SALES", company_id="co")
        )
        agent.add_child(child)
        assert agent.get_children() == [child]

    def test_activate_deactivate(self, agent: BaseAgent):
        agent.deactivate()
        assert agent.status == "INACTIVE"
        agent.activate()
        assert agent.status == "ACTIVE"


# ---------------------------------------------------------------------------
# Observability
# ---------------------------------------------------------------------------


class TestObservability:
    def test_get_info_shape(self, agent: BaseAgent):
        info = agent.get_info()
        for key in (
            "id", "name", "role", "company_id", "model", "template_slug",
            "version", "tool_count", "skill_count", "status",
            "child_count", "created_at",
        ):
            assert key in info
        assert info["tool_count"] == 2
        assert info["skill_count"] == 1
        assert info["child_count"] == 0

    def test_task_log_appended(self, agent: BaseAgent):
        agent.append_to_task_log({"event": "x"})
        agent.append_to_task_log([{"event": "y"}, {"event": "z"}])
        log = agent.get_task_log()
        assert len(log) == 3
        assert log[0]["event"] == "x"
        assert log[1]["event"] == "y"

    def test_task_log_truncated_to_max(self, agent: BaseAgent, monkeypatch):
        from src.agents import base as base_mod

        monkeypatch.setattr(base_mod, "MAX_TASK_LOG_ENTRIES", 3)
        for i in range(10):
            agent.append_to_task_log({"i": i})
        log = agent.get_task_log()
        assert len(log) == 3
        assert log[0]["i"] == 7
        assert log[-1]["i"] == 9


# ---------------------------------------------------------------------------
# Stream emitter
# ---------------------------------------------------------------------------


class TestStreamEmitter:
    def test_collects_events(self):
        sink = MagicMock()
        em = _StreamEmitter("run_1", sink)
        em.emit("a", {"x": 1})
        em.emit("b", {"y": 2})
        sink.assert_any_call("a", {"x": 1})
        sink.assert_any_call("b", {"y": 2})
        events = em.events()
        assert events == [("a", {"x": 1}), ("b", {"y": 2})]

    def test_sink_exception_does_not_break_stream(self):
        def bad_sink(event, payload):
            raise RuntimeError("boom")

        em = _StreamEmitter("run_2", bad_sink)
        em.emit("x", {})  # must not raise
        assert len(em.events()) == 1


# ---------------------------------------------------------------------------
# Template adapter
# ---------------------------------------------------------------------------


class TestTemplateAdapter:
    def test_from_none_uses_fallback(self):
        adapter = _TemplateAdapter.from_db_or_proxy(None, "missing", "comp_1")
        assert adapter.role == "MISSING"
        assert adapter.allowed_tools == []
        assert adapter.persona_meta == {"language": "arabic"}

    def test_from_db_template(self):
        fake = MagicMock()
        fake.slug = "support-agent"
        fake.role = "SUPPORT"
        fake.name = "Support"
        fake.version = "2.0.0"
        fake.model_policy = {"default": "gemini-2.5-flash"}
        fake.allowed_tools = ["product.search"]
        fake.allowed_skills = ["skill.1"]
        fake.guardrails = {"read_only": True}
        fake.persona_meta = {"language": "arabic"}
        fake.instructions_agents = "rules"
        fake.instructions_soul = "soul"
        fake.instructions_tools = "tools"
        fake.instructions_persona = "persona"
        fake.handoffs = []
        fake.budget = {"maxToolCallsPerRun": 5}
        fake.output_schema = None

        adapter = _TemplateAdapter.from_db_or_proxy(fake, "support-agent", "c1")
        assert adapter.role == "SUPPORT"
        assert adapter.model_policy["default"] == "gemini-2.5-flash"
        assert adapter.allowed_tools == ["product.search"]
        assert adapter.budget["maxToolCallsPerRun"] == 5


# ---------------------------------------------------------------------------
# build() — Microsoft Agent Framework integration
# ---------------------------------------------------------------------------


class TestBuild:
    def test_build_caches_framework_agent(self, agent: BaseAgent):
        with patch("src.agents.base.build_agent_client") as mock_client, \
             patch.object(agent, "_resolve_tools", return_value=[]):
            mock_client.return_value = MagicMock()
            fa1 = agent.build()
            fa2 = agent.build()
            assert fa1 is fa2
            mock_client.assert_called_once()

    def test_build_attaches_sdk_context_provider(self, agent: BaseAgent):
        with patch("src.agents.base.build_agent_client", return_value=MagicMock()), \
             patch.object(agent, "_resolve_tools", return_value=[]):
            framework_agent = agent.build()

        providers = getattr(framework_agent, "context_providers", [])
        assert any(isinstance(provider, MaxPContextProvider) for provider in providers)

    def test_build_attaches_sdk_mcp_skills_provider(self, agent: BaseAgent):
        from agent_framework import SkillsProvider

        fake_registry = MagicMock()
        fake_registry.get_skill_clients.return_value = [MagicMock()]

        with patch("src.agents.base.build_agent_client", return_value=MagicMock()), \
             patch.object(agent, "_resolve_tools", return_value=[]), \
             patch("src.agents.base.get_mcp_registry", return_value=fake_registry):
            framework_agent = agent.build()

        providers = getattr(framework_agent, "context_providers", [])
        assert any(isinstance(provider, SkillsProvider) for provider in providers)

    def test_build_passes_output_schema_to_sdk_default_options(self, cfg: BaseAgentConfig):
        schema = {"type": "object", "properties": {"status": {"type": "string"}}}
        cfg.output_schema = schema
        agent = BaseAgent(cfg)

        with patch("src.agents.base.build_agent_client", return_value=MagicMock()), \
             patch.object(agent, "_resolve_tools", return_value=[]):
            framework_agent = agent.build()

        assert getattr(framework_agent, "default_options", {})["output_schema"] == schema

    def test_resolve_tools_filters_by_allowed(self, agent: BaseAgent):
        from src.tools.registry import CORE_TOOLS

        agent.allowed_tools = {"product_search"}
        with patch("src.tools.registry.CORE_TOOLS", CORE_TOOLS):
            tools = agent._resolve_tools()
        names = [t.name for t in tools]
        assert "product_search" in names
        assert "unlock_advanced_tools" in names
        assert "order_lookup" not in names

    def test_resolve_tools_returns_all_when_no_scope(self, cfg: BaseAgentConfig):
        from src.tools.registry import CORE_TOOLS

        cfg.allowed_tools = []
        cfg.allowed_skills = []
        agent = BaseAgent(cfg)
        with patch("src.tools.registry.CORE_TOOLS", CORE_TOOLS):
            tools = agent._resolve_tools()
        assert [tool.name for tool in tools] == [tool.name for tool in CORE_TOOLS]

    def test_agent_name_format(self, agent: BaseAgent):
        name = agent._agent_name()
        assert name.startswith("maxp_support_")
        assert name.endswith(agent.id[-8:])

    @pytest.mark.asyncio
    async def test_ensure_client_reuses_framework_agent_client(self, agent: BaseAgent):
        framework_client = MagicMock()
        with patch("src.agents.base.build_agent_client_async", new=AsyncMock(return_value=framework_client)) as build_async, \
             patch.object(agent, "_resolve_tools", return_value=[]):
            client = await agent.ensure_client()

        assert client is framework_client
        assert agent.client is framework_client
        build_async.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_ensure_client_forwards_explicit_provider_key_id(self):
        agent = BaseAgent(
            BaseAgentConfig(
                id="agent_key_001",
                name="Keyed Agent",
                role="SALES",
                company_id="comp_001",
                model="openai/gpt-oss-120b",
                provider="GROQ",
                key_id="selected-groq-key",
            )
        )
        provider_client = MagicMock()

        with patch("src.agents.base.build_provider_client_async", new=AsyncMock(return_value=provider_client)) as build_provider, \
             patch.object(agent, "_resolve_tools", return_value=[]), \
             patch.object(agent, "_get_system_prompt", return_value="system"):
            client = await agent.ensure_client()

        assert client is provider_client
        build_provider.assert_awaited_once()
        assert build_provider.await_args.kwargs["key_id"] == "selected-groq-key"

    @pytest.mark.asyncio
    async def test_ensure_client_does_not_fallback_for_explicit_provider(self):
        agent = BaseAgent(
            BaseAgentConfig(
                id="agent_key_002",
                name="Keyed Agent",
                role="SALES",
                company_id="comp_001",
                model="openai/gpt-oss-120b",
                provider="NVIDIA",
                key_id="selected-nvidia-key",
            )
        )

        with patch("src.agents.base.build_provider_client_async", new=AsyncMock(return_value=None)), \
             patch("src.agents.base.build_agent_client_async", new=AsyncMock()) as build_default, \
             patch.object(agent, "_resolve_tools", return_value=[]), \
             patch.object(agent, "_get_system_prompt", return_value="system"):
            with pytest.raises(RuntimeError, match="No LLM client available"):
                await agent.ensure_client()

        build_default.assert_not_awaited()

    def test_create_session_delegates_to_framework_agent(self, agent: BaseAgent):
        sdk_session = object()
        framework_agent = MagicMock()
        framework_agent.create_session.return_value = sdk_session

        with patch.object(agent, "build", return_value=framework_agent) as build:
            result = agent.create_session(session_id="thread-1")

        assert result is sdk_session
        build.assert_called_once()
        framework_agent.create_session.assert_called_once_with(session_id="thread-1")


# ---------------------------------------------------------------------------
# process_task / process_task_streamed — high-level integration
# ---------------------------------------------------------------------------


class TestProcessTask:
    @pytest.mark.asyncio
    async def test_process_task_uses_sdk_runtime_for_internal_tasks(self, agent: BaseAgent):
        sdk_session = object()
        sdk_response = MagicMock()
        sdk_response.text = "sdk reply"
        sdk_response.user_input_requests = []

        framework_agent = MagicMock()
        framework_agent.create_session.return_value = sdk_session
        framework_agent.run = AsyncMock(return_value=sdk_response)

        with patch.object(agent, "build", return_value=framework_agent), \
             patch("src.agents.base.execute_pipeline", new=AsyncMock()) as pipeline:
            result = await agent.process_task({
                "description": "summarize yesterday's sales",
                "job_id": "job_1",
            })

        assert result["status"] == "SUCCESS"
        assert result["result"]["reply"] == "sdk reply"
        assert result["result"]["runtime"] == "sdk_agent"
        assert result["result"]["thread_id"] == "job_1"
        framework_agent.create_session.assert_called_once_with(session_id="job_1")
        framework_agent.run.assert_awaited_once_with(
            "summarize yesterday's sales",
            session=sdk_session,
            options={"maxp_token_budget": 120_000},
        )
        pipeline.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_task_passes_task_token_budget_to_sdk_runtime(self, agent: BaseAgent):
        sdk_response = MagicMock()
        sdk_response.text = "sdk reply"
        sdk_response.user_input_requests = []

        framework_agent = MagicMock()
        framework_agent.create_session.return_value = object()
        framework_agent.run = AsyncMock(return_value=sdk_response)

        with patch.object(agent, "build", return_value=framework_agent):
            await agent.process_task({
                "description": "run a short routine",
                "job_id": "job_budget",
                "token_budget": 2048,
            })

        framework_agent.run.assert_awaited_once_with(
            "run a short routine",
            session=framework_agent.create_session.return_value,
            options={"maxp_token_budget": 2048},
        )

    @pytest.mark.asyncio
    async def test_process_task_falls_back_to_pipeline_when_sdk_runtime_fails(self, agent: BaseAgent):
        fake_ctx = MagicMock()
        fake_ctx.early_return = None
        fake_ctx.final_reply = "pipeline reply"
        fake_ctx.executed_tools = []
        fake_ctx.rounds = 0
        fake_ctx.repaired = False
        fake_ctx.thread_id = "job_2"

        framework_agent = MagicMock()
        framework_agent.create_session.return_value = object()
        framework_agent.run = AsyncMock(side_effect=RuntimeError("sdk unavailable"))

        with patch.object(agent, "build", return_value=framework_agent), \
             patch("src.agents.base.execute_pipeline", new=AsyncMock(return_value=fake_ctx)) as pipeline:
            result = await agent.process_task({
                "description": "run routine",
                "job_id": "job_2",
            })

        assert result["status"] == "SUCCESS"
        assert result["result"]["reply"] == "pipeline reply"
        pipeline.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_process_task_sdk_user_input_request_marks_paused(self, agent: BaseAgent):
        from agent_framework import UserInputRequiredException

        exc = UserInputRequiredException(contents=[])
        exc.id = "approval_1"
        exc.name = "order.cancel"
        exc.arguments = {"orderId": "o_1"}

        framework_agent = MagicMock()
        framework_agent.create_session.return_value = object()
        framework_agent.run = AsyncMock(side_effect=exc)

        with patch.object(agent, "build", return_value=framework_agent):
            result = await agent.process_task({
                "description": "cancel a stuck order",
                "job_id": "job_3",
            })

        assert result["status"] == "PAUSED"
        assert result["result"]["status"] == "AWAITING_APPROVAL"
        assert result["result"]["draft_id"] == "approval_1"

    @pytest.mark.asyncio
    async def test_process_task_uses_pipeline_for_customer_channels(self, agent: BaseAgent):
        fake_ctx = MagicMock()
        fake_ctx.early_return = None
        fake_ctx.final_reply = "customer-safe reply"
        fake_ctx.executed_tools = []
        fake_ctx.rounds = 0
        fake_ctx.repaired = False
        fake_ctx.thread_id = "thread_1"

        with patch.object(agent, "build") as build, \
             patch("src.agents.base.execute_pipeline", new=AsyncMock(return_value=fake_ctx)) as pipeline:
            result = await agent.process_task({
                "description": "where is my order?",
                "session_id": "thread_1",
                "user_id": "cust_1",
                "channel": "whatsapp",
            })

        assert result["status"] == "SUCCESS"
        assert result["result"]["reply"] == "customer-safe reply"
        build.assert_not_called()
        pipeline.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_process_task_requires_vision_client_for_image_inputs(self):
        agent = BaseAgent(
            BaseAgentConfig(
                id="agent_vision_001",
                name="Vision Gate",
                role="SUPPORT",
                company_id="comp_001",
                model="openai/gpt-oss-120b",
                provider="GROQ",
            )
        )

        with patch.object(agent, "_resolve_tools", return_value=[]), \
             patch.object(agent, "_get_system_prompt", return_value="system"), \
             patch("src.agents.base.build_provider_client_async", new=AsyncMock(side_effect=RuntimeError("no vision key"))), \
             patch("src.agents.base.execute_pipeline", new=AsyncMock()) as pipeline:
            result = await agent.process_task({
                "current_message": "what is in this image?",
                "session_id": "thread_vision",
                "user_id": "cust_1",
                "channel": "facebook",
                "attachments": [{"type": "image", "base64_data": "iVBORw0KGgo=", "mime_type": "image/png"}],
                "force_pipeline": True,
            })

        assert result["status"] == "ERROR"
        assert result["result"]["errorCode"] == "vision_model_unavailable"
        pipeline.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_task_returns_structured_result(self, agent: BaseAgent):
        fake_ctx = MagicMock()
        fake_ctx.early_return = None
        fake_ctx.final_reply = "hello back"
        fake_ctx.executed_tools = []
        fake_ctx.rounds = 0
        fake_ctx.repaired = False
        fake_ctx.thread_id = "thread_1"

        with patch("src.agents.base.execute_pipeline", new=AsyncMock(return_value=fake_ctx)):
            result = await agent.process_task({"current_message": "hi"})

        assert result["status"] == "SUCCESS"
        assert result["result"]["reply"] == "hello back"
        assert result["role"] == "SUPPORT"
        assert "run_id" in result

    @pytest.mark.asyncio
    async def test_process_task_returns_pipeline_trace_for_sandbox_tools(self, agent: BaseAgent):
        fake_plan = SimpleNamespace(
            intent="inventory.check",
            primaryTool="inventory_check",
            allowedTools=["inventory.check"],
            reason="classified by model",
            confidence=0.91,
            confidenceLevel="high",
            ambiguous=False,
            clarificationQuestion=None,
            slots={"productName": "black shoes"},
            missingSlots=[],
        )

        fake_ctx = SimpleNamespace(
            early_return=None,
            final_reply="tool-backed reply",
            relevance_plan=fake_plan,
            execution_plan={
                "deterministicReadExecution": {
                    "tool": "inventory.check",
                    "nativeName": "inventory_check",
                    "params": {"product_name_or_sku": "black shoes"},
                },
                "deterministicActionExecution": None,
                "plannedExecutions": [],
            },
            executed_tools=[{
                "tool": "inventory_check",
                "status": "success",
                "success": True,
                "result": {"status": "NOT_FOUND"},
                "latencyMs": 12,
            }],
            rounds=1,
            repaired=False,
            thread_id="thread_1",
            system_prompt="",
        )

        with patch("src.agents.base.execute_pipeline", new=AsyncMock(return_value=fake_ctx)):
            result = await agent.process_task({"current_message": "check black shoes"})

        trace = result["result"]["pipeline_trace"]
        assert trace["intentClassification"]["intent"] == "inventory.check"
        assert trace["toolPlan"]["primaryTool"] == "inventory_check"
        assert trace["toolExecutions"][0]["name"] == "inventory_check"
        assert trace["toolExecutions"][0]["params"] == {"product_name_or_sku": "black shoes"}
        assert trace["toolExecutions"][0]["output"] == {"status": "NOT_FOUND"}

    @pytest.mark.asyncio
    async def test_process_task_awaiting_approval_marks_paused(self, agent: BaseAgent):
        fake_ctx = MagicMock()
        fake_ctx.early_return = {
            "status": "AWAITING_APPROVAL",
            "result": {"reply": ""},
            "draft_id": "draft_123",
        }
        fake_ctx.final_reply = None
        fake_ctx.executed_tools = []
        fake_ctx.rounds = 1
        fake_ctx.repaired = False
        fake_ctx.thread_id = "t1"

        with patch("src.agents.base.execute_pipeline", new=AsyncMock(return_value=fake_ctx)):
            result = await agent.process_task({"current_message": "cancel order"})

        assert result["status"] == "PAUSED"
        assert result["result"]["draft_id"] == "draft_123"

    @pytest.mark.asyncio
    async def test_process_task_guardrail_blocked_marks_blocked(self, agent: BaseAgent):
        fake_ctx = MagicMock()
        fake_ctx.early_return = {
            "status": "GUARDRAIL_BLOCKED",
            "result": {"reply": "nope"},
        }
        fake_ctx.final_reply = None
        fake_ctx.executed_tools = []
        fake_ctx.rounds = 0
        fake_ctx.repaired = False
        fake_ctx.thread_id = "t2"

        with patch("src.agents.base.execute_pipeline", new=AsyncMock(return_value=fake_ctx)):
            result = await agent.process_task({"current_message": "bad"})

        assert result["status"] == "BLOCKED"

    @pytest.mark.asyncio
    async def test_process_task_streamed_yields_events(self, agent: BaseAgent):
        ctx_seq = [
            MagicMock(early_return=None, final_reply=None, executed_tools=[],
                      system_prompt="", thread_id="t1", rounds=0, repaired=False)
            for _ in range(6)
        ] + [
            MagicMock(early_return=None, final_reply="done", executed_tools=[],
                      system_prompt="", thread_id="t1", rounds=0, repaired=False),
        ]
        iter_ctx = iter(ctx_seq)

        async def fake_stage(ctx):
            return next(iter_ctx)

        with patch("src.agents.base.resolve_intent", side_effect=fake_stage), \
             patch("src.agents.base.route_to_tools", side_effect=fake_stage), \
             patch("src.agents.base.execute_tools", side_effect=fake_stage), \
             patch("src.agents.base.retrieve_knowledge", side_effect=fake_stage), \
             patch("src.agents.base.retrieve_episodic_memory", side_effect=fake_stage), \
             patch("src.agents.base.handle_fallback", side_effect=fake_stage), \
             patch("src.agents.base.validate_reply", side_effect=fake_stage):
            events = []
            async for ev in agent.process_task_streamed({"current_message": "hi"}):
                events.append(ev)

        event_names = [e[0] for e in events]
        assert "agent_start" in event_names
        assert "agent_reply" in event_names
        assert "run_complete" in event_names
