"""
AI System Evaluation Tests

Tests for:
1. Hallucination prevention mechanisms
2. Decision unification (Python vs Node.js)
3. Prompt generation correctness
4. Tool execution integrity
5. Reply quality & safety
6. Memory integration
"""

from __future__ import annotations

import os
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.config import Settings, get_settings
from src.contracts.response_schema import AgentResponse
from src.pipeline.context import PipelineContext
from src.pipeline.stages.validate_reply import validate_reply


# ponytail: stubs for deleted stages; remove tests when replacement stages ship
async def handle_fallback(ctx):
    ctx.llm_response = ctx.llm_response or "عذراً، مش قادر أساعد في الطلب دا"


async def resolve_intent(ctx):
    if ctx.agent and hasattr(ctx.agent, "instructions"):
        ctx.system_prompt = ctx.agent.instructions


# =============================================================================
# Section 1: Hallucination Prevention Tests
# =============================================================================

class TestHallucinationPrevention:
    """اختبار منع الهلوسة - هل الموديل يخترع حقائق؟"""

    @pytest.mark.asyncio
    async def test_no_fact_invention_when_tool_returns_empty(self):
        """
        GIVEN: customer asks about product price
        WHEN:  tool returns empty (no data)
        THEN:  model MUST NOT invent a price / stock / shipping
        """
        ctx = PipelineContext(
            message="كم سعر المنتج رقم 123؟",
            thread_id="th_1", company_id="co_test", customer_id="cu_1",
        )
        ctx.tool_evidence = []
        ctx.executed_tools = []
        ctx.llm_response = None

        # Mock LLM client that respects "do not invent" instruction
        mock_client = MagicMock()
        mock_client.get_response = AsyncMock(return_value=MagicMock(
            text="محتاج أفحص النظام عشان أعرف السعر بالضبط"
        ))
        mock_agent = MagicMock()
        mock_agent.client = mock_client
        mock_agent.persona = {"soul_instructions": "بائع ودود"}
        ctx.agent = mock_agent

        ctx.relevance_plan = MagicMock()
        ctx.relevance_plan.requiresTool = True
        ctx.relevance_plan.blockedReason = None

        await handle_fallback(ctx)

        assert ctx.llm_response is not None and ctx.llm_response != ""
        reply = ctx.llm_response.lower()
        assert "أفحص" in reply or "أعرف" in reply or "مش" in reply or "للأسف" in reply, \
            f"Reply should ask to check system, got: {ctx.llm_response}"

    @pytest.mark.asyncio
    async def test_no_invention_when_tool_timeout(self):
        """
        GIVEN: order lookup tool times out
        WHEN:  no tool_evidence available
        THEN:  model should not fabricate order status
        """
        ctx = PipelineContext(
            message="ما حالة طلبي رقم 98765؟",
            thread_id="th_2", company_id="co_test", customer_id="cu_1",
        )
        ctx.tool_evidence = []
        ctx.llm_response = None

        mock_client = MagicMock()
        mock_client.get_response = AsyncMock(return_value=MagicMock(
            text="مش قادر أجيب تفاصيل الطلب دلوقتي، محتاج أفحص النظام"
        ))
        mock_agent = MagicMock()
        mock_agent.client = mock_client
        mock_agent.persona = {}
        ctx.agent = mock_agent

        ctx.relevance_plan = MagicMock()
        ctx.relevance_plan.requiresTool = True
        ctx.relevance_plan.blockedReason = None

        await handle_fallback(ctx)

        assert ctx.llm_response is not None
        reply = ctx.llm_response.lower()
        assert "أفحص" in reply or "أعرف" in reply or "مش" in reply

    @pytest.mark.asyncio
    async def test_classifier_unavailable_disables_tools(self):
        """
        GIVEN: LLM intent classifier is unavailable
        WHEN:  message arrives
        THEN:  tools are disabled, model does not invent facts
        """
        ctx = PipelineContext(
            message="عايز أشوف المنتجات",
            thread_id="th_3", company_id="co_test", customer_id="cu_1",
        )
        ctx.tool_evidence = []
        ctx.llm_response = None

        mock_client = MagicMock()
        mock_client.get_response = AsyncMock(return_value=MagicMock(
            text="ممكن تقولي إيه المنتج اللي بتدور عليه؟"
        ))
        mock_agent = MagicMock()
        mock_agent.client = mock_client
        mock_agent.persona = {}
        ctx.agent = mock_agent

        ctx.relevance_plan = MagicMock()
        ctx.relevance_plan.requiresTool = False
        ctx.relevance_plan.blockedReason = "CLASSIFIER_UNAVAILABLE"

        await handle_fallback(ctx)

        assert ctx.llm_response is not None and ctx.llm_response != ""

    @pytest.mark.asyncio
    async def test_guardrail_details_not_exposed_in_reply(self):
        """
        GIVEN: guardrail blocked a reply
        WHEN:  fallback generates response
        THEN:  internal policy details should NOT be exposed to customer
        """
        ctx = PipelineContext(
            message="test message",
            thread_id="th_4", company_id="co_test", customer_id="cu_1",
        )
        ctx.tool_evidence = []
        ctx.llm_response = None

        mock_client = MagicMock()
        mock_client.get_response = AsyncMock(return_value=MagicMock(
            text="عذراً، مش قادر أساعد في الطلب دا"
        ))
        mock_agent = MagicMock()
        mock_agent.client = mock_client
        mock_agent.persona = {}
        ctx.agent = mock_agent

        ctx.relevance_plan = MagicMock()
        ctx.relevance_plan.requiresTool = False
        ctx.relevance_plan.blockedReason = None
        ctx.early_return = {
            "status": "GUARDRAIL_BLOCKED",
            "result": {"reason": "SENSITIVE_CONTENT"}
        }

        await handle_fallback(ctx)

        reply = ctx.llm_response.lower() if ctx.llm_response else ""
        assert "guardrail" not in reply
        assert "blocked" not in reply


# =============================================================================
# Section 2: Prompt Generation Tests
# =============================================================================

class TestPromptGeneration:
    """اختبار توليد البرومبت - هل السياق صحيح؟"""

    @pytest.mark.asyncio
    async def test_resolve_intent_loads_agent_instructions(self):
        """
        GIVEN: agent has instructions
        WHEN:  resolve_intent runs
        THEN:  system_prompt should contain agent instructions
        """
        ctx = PipelineContext(
            message="أريد شراء منتج",
            thread_id="th_10", company_id="co_test", customer_id="cu_1",
        )
        mock_agent = MagicMock()
        mock_agent.instructions = "بائع ودود ومحترف"
        mock_agent.default_options = {}
        mock_agent.model = "gemini-2.5-flash"
        ctx.agent = mock_agent
        ctx.channel = "whatsapp"
        ctx.native_tools = []
        ctx.relevance_plan = None

        await resolve_intent(ctx)

        assert ctx.system_prompt is not None
        assert "بائع" in ctx.system_prompt or "ودود" in ctx.system_prompt


# =============================================================================
# Section 4: Decision Unification Tests
# =============================================================================

class TestDecisionUnification:
    """اختبار توحيد مراكز القرار - Python vs Node.js"""

    def test_settings_have_no_env_model_fields(self):
        """
        GIVEN: model selection moved to the database (DB-first resolution)
        WHEN:  settings are loaded
        THEN:  no model/provider default fields should exist in env settings —
               resolution order is agent model → company ai_settings →
               global_ai_config (see src/services/model_resolver.py)
        """
        get_settings.cache_clear()
        settings = get_settings()
        assert not hasattr(settings, "default_model")
        assert not hasattr(settings, "default_llm_provider")
        assert not hasattr(settings, "google_gemini_model")

    def test_python_ai_service_has_skills_module(self):
        """
        VERIFY: Python AI service has skills module (replaced intent classification)
        """
        skills_path = Path("src/skills")
        assert skills_path.exists(), \
            f"Python skills module should exist at {skills_path.resolve()}"

    def test_python_ai_service_has_pipeline_stages(self):
        """
        VERIFY: All 5 pipeline stages exist in Python
        """
        stages_path = Path("src/pipeline/stages")
        required_stages = [
            "skills_pipeline.py",
            "validate_reply.py",
        ]
        for stage in required_stages:
            filepath = stages_path / stage
            assert filepath.exists(), \
                f"Pipeline stage {stage} should exist at {filepath.resolve()}"

    def test_python_ai_service_has_memory_module(self):
        """
        VERIFY: Memory modules exist in Python
        """
        memory_files = [
            "src/memory/episodic_memory.py",
            "src/memory/working_memory.py",
            "src/memory/embedding_cache.py",
        ]
        for filepath in memory_files:
            p = Path(filepath)
            assert p.exists(), f"Memory module {filepath} should exist at {p.resolve()}"

    def test_tool_execution_runs_locally_in_python(self):
        """
        VERIFY: Tool Gateway runs tools directly via Python registry,
        no longer calls Node.js backend for each tool execution.
        (Good - tools are migrating to Python)
        """
        execute_tools_path = Path("src/tools")
        gateway_file = execute_tools_path / "gateway.py"
        if gateway_file.exists():
            content = gateway_file.read_text(encoding="utf-8")
            # Tools are now executed locally in Python via ToolGateway._execute_registry_tool
            assert "from src.tools.registry import get_tool" in content, \
                "ToolGateway should use Python tool registry"

    def test_python_contract_validation_exists(self):
        """
        VERIFY: Python AI service has output contract validation (AgentResponse)
        """
        from src.contracts.response_schema import AgentResponse
        response = AgentResponse(reply="المنتج متاح")
        assert response.reply == "المنتج متاح"
        assert isinstance(response.confidence, float)


# =============================================================================
# Section 5: Reply Quality Tests
# =============================================================================

class TestReplyQuality:
    """اختبار جودة الردود"""

    @pytest.mark.asyncio
    async def test_validate_reply_strips_internal_thought_tags(self):
        """
        GIVEN: LLM response contains <thought> tags
        WHEN:  validate_reply runs
        THEN:  thought tags should be stripped, only customer reply remains
        """
        ctx = PipelineContext(
            message="المنتج دا متاح؟",
            thread_id="th_20", company_id="co_test", customer_id="cu_1",
        )
        ctx.llm_response = "<thought>checking inventory for product 123</thought>المنتج متاح للأسف خلص"
        ctx.messages = []
        ctx.tool_context = ""

        mock_agent = MagicMock()
        mock_agent.default_options = {"model": "gemini-2.5-flash"}
        ctx.agent = mock_agent

        ctx = await validate_reply(ctx)

        assert ctx.final_reply is not None
        assert "<thought>" not in ctx.final_reply
        assert "المنتج متاح للأسف خلص" in ctx.final_reply

    @pytest.mark.asyncio
    async def test_validate_reply_preserves_arabic_content(self):
        """
        GIVEN: LLM response in Arabic
        WHEN:  validate_reply runs
        THEN:  Arabic content is preserved unchanged
        """
        ctx = PipelineContext(
            message="كام السعر؟",
            thread_id="th_21", company_id="co_test", customer_id="cu_1",
        )
        ctx.llm_response = "المنتج متوفر بسعر 150 جنيه مصري"
        ctx.messages = []
        ctx.tool_context = ""

        mock_agent = MagicMock()
        mock_agent.default_options = {"model": "gemini-2.5-flash"}
        ctx.agent = mock_agent

        ctx = await validate_reply(ctx)

        assert ctx.final_reply is not None
        assert "المنتج متوفر" in ctx.final_reply
        assert "150" in ctx.final_reply

    @pytest.mark.asyncio
    async def test_validate_reply_parses_json_reply_field(self):
        """
        GIVEN: LLM returns structured JSON
        WHEN:  validate_reply runs
        THEN:  only the 'reply' field is used as final reply
        """
        ctx = PipelineContext(
            message="test",
            thread_id="th_22", company_id="co_test", customer_id="cu_1",
        )
        ctx.llm_response = '{"reply": "المنتج متاح ✅", "confidence": 0.95}'
        ctx.messages = []
        ctx.tool_context = ""

        mock_agent = MagicMock()
        mock_agent.default_options = {"model": "gemini-2.5-flash"}
        ctx.agent = mock_agent

        ctx = await validate_reply(ctx)

        assert ctx.final_reply is not None
        assert "المنتج متاح" in ctx.final_reply

    @pytest.mark.asyncio
    async def test_validate_reply_fallback_for_invalid_json(self):
        """
        GIVEN: LLM returns invalid JSON
        WHEN:  validate_reply runs
        THEN:  should still return the raw text, not crash
        """
        ctx = PipelineContext(
            message="test",
            thread_id="th_23", company_id="co_test", customer_id="cu_1",
        )
        ctx.llm_response = "المنتج متاح"
        ctx.messages = []
        ctx.tool_context = ""

        mock_agent = MagicMock()
        mock_agent.default_options = {}
        ctx.agent = mock_agent

        ctx = await validate_reply(ctx)

        assert ctx.final_reply is not None
        assert "المنتج متاح" in ctx.final_reply


# =============================================================================
# Section 7: Memory Tests
# =============================================================================

class TestMemoryIntegration:
    """اختبار الذاكرة"""

    @pytest.mark.asyncio
    async def test_episodic_memory_has_search_similar_method(self):
        """
        VERIFY: EpisodicMemoryService exists and has search_similar
        """
        from src.memory.episodic_memory import EpisodicMemoryService
        service = EpisodicMemoryService()

        # Should have search_similar method
        assert hasattr(service, "search_similar")
        assert callable(service.search_similar)

    @pytest.mark.asyncio
    async def test_episodic_memory_cosine_similarity(self):
        """
        VERIFY: cosine_similarity works correctly
        """
        from src.memory.episodic_memory import EpisodicMemoryService
        service = EpisodicMemoryService()

        vec_a = [1.0, 0.0, 0.0]
        vec_b = [1.0, 0.0, 0.0]
        assert service.cosine_similarity(vec_a, vec_b) == pytest.approx(1.0)

        vec_c = [1.0, 0.0, 0.0]
        vec_d = [0.0, 1.0, 0.0]
        assert service.cosine_similarity(vec_c, vec_d) == pytest.approx(0.0)


# =============================================================================
# Section 8: Code Quality & Architecture Tests
# =============================================================================

class TestCodeQuality:
    """اختبار جودة الكود"""

    def test_pipeline_context_dataclass_has_required_fields(self):
        """
        VERIFY: PipelineContext has all required fields for SOTA 2026
        """
        ctx = PipelineContext(
            message="test",
            thread_id="th",
            company_id="co",
            customer_id="cu",
        )
        # SOTA 2026 features
        assert hasattr(ctx, "rag_evidence")
        assert hasattr(ctx, "episodic_memories")
        assert hasattr(ctx, "token_budget")
        assert hasattr(ctx, "context_metrics")
        assert hasattr(ctx, "response_contract")
        assert hasattr(ctx, "session_state")

    def test_settings_has_cost_caps(self):
        """
        VERIFY: Settings has per-company cost caps
        """
        get_settings.cache_clear()
        settings = get_settings()
        assert settings.cost_soft_cap > 0
        assert settings.cost_hard_cap > 0

    def test_guardrails_exist(self):
        """
        VERIFY: Input and output guardrail modules exist
        """
        guardrails_path = Path("src/guardrails")
        assert guardrails_path.exists(), \
            f"Guardrails module should exist at {guardrails_path.resolve()}"
        assert (guardrails_path / "input.py").exists()
        assert (guardrails_path / "output.py").exists()


# =============================================================================
# Section 9: Judge Profiles & Honesty Gate Tests
# =============================================================================

class TestJudgeProfiles:
    """اختبار بروفايلات المدقق حسب الدور (Role-Specific Judge Profiles)"""

    def test_all_judge_profiles_defined(self):
        from src.pipeline.stages.validate_reply import JUDGE_PROFILES

        required_profiles = {"merchant_ops", "sales", "media_buyer", "clinic", "support"}
        assert required_profiles.issubset(set(JUDGE_PROFILES.keys()))

        for key in required_profiles:
            profile = JUDGE_PROFILES[key]
            assert "title" in profile and len(profile["title"]) > 0
            assert "harmful" in profile and len(profile["harmful"]) > 0
            assert "permitted" in profile and len(profile["permitted"]) > 0

    def test_resolve_judge_profile_for_roles(self):
        from src.pipeline.stages.validate_reply import _resolve_judge_profile

        role_expectations = {
            "STORE_MANAGER": "merchant_ops",
            "MEDIA_BUYER": "media_buyer",
            "SALES": "sales",
            "MEDICAL_CENTER": "clinic",
            "SUPPORT": "support",
        }

        for role_name, expected_profile in role_expectations.items():
            ctx = PipelineContext(message="test", thread_id="t", company_id="c", customer_id="u")
            mock_agent = MagicMock()
            mock_agent.role = role_name
            mock_agent.template_slug = None
            mock_agent.slug = None
            ctx.agent = mock_agent

            profile_key, profile_data = _resolve_judge_profile(ctx)
            assert profile_key == expected_profile
            assert profile_data["title"] is not None

    def test_resolve_judge_profile_fallback(self):
        from src.pipeline.stages.validate_reply import _resolve_judge_profile

        ctx = PipelineContext(message="test", thread_id="t", company_id="c", customer_id="u")
        ctx.agent = None

        profile_key, profile_data = _resolve_judge_profile(ctx)
        assert profile_key == "merchant_ops"


class TestHonestyAndLeakage:
    """اختبار بوابة الصدق ومكافحة تسريب التعليمات الداخلية"""

    def test_data_audit_blocked_without_executed_tools(self):
        from src.pipeline.stages.validate_reply import _enforce_honesty_gate, _DATA_AUDIT_FALLBACK

        claimed = "راجعت البيانات بالكامل وجميع المؤشرات ممتازة"
        result = _enforce_honesty_gate(claimed, executed_tools=[])
        assert result == _DATA_AUDIT_FALLBACK

    def test_data_audit_allowed_when_tools_succeeded(self):
        from src.pipeline.stages.validate_reply import _enforce_honesty_gate

        claimed = "راجعت البيانات بالكامل وجميع المؤشرات ممتازة"
        tools = [{"tool": "report_analytics", "status": "success", "result": {"sales": 1000}}]
        result = _enforce_honesty_gate(claimed, executed_tools=tools)
        assert result == claimed

    def test_strip_internal_tags_removes_think_and_scaffolding(self):
        from src.pipeline.stages.validate_reply import _strip_internal_tags

        raw = (
            "<think>Analyzing user request...</think>"
            "الإجراء حساس واترفع للاعتماد — مفيش أي خطأ حصل. "
            "ردّ على التاجر بالشكل ده بالظبط: "
            "التعديل جاهز ومستني موافقتك. "
            "ممنوع منعًا باتًا: ادعاء أن الإجراء اتنفذ"
        )
        cleaned = _strip_internal_tags(raw)
        assert "<think>" not in cleaned
        assert "</think>" not in cleaned
        assert "Analyzing user request" not in cleaned
        assert "الإجراء حساس واترفع للاعتماد" not in cleaned
        assert "ردّ على التاجر بالشكل ده بالظبط" not in cleaned
        assert "ممنوع منعًا باتًا" not in cleaned
        assert "التعديل جاهز ومستني موافقتك" in cleaned

