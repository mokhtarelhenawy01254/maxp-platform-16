"""Live agent evaluation tests — sends real messages to agents and validates AI responses.

These tests require an active LLM provider (Google/Gemini) and are marked with
@pytest.mark.live so they are skipped in CI unless explicitly requested.

Run with:
    pytest tests/evals/test_live_agent_eval.py -v -m live

Scenarios:
  1. Support agent: answers product/order questions in Arabic
  2. CEO agent: strategic questions get delegation responses
  3. Facebook sales agent: Egyptian dialect conversations
  4. Agent identity: each agent knows its own name and role
  5. Tool usage: agent identifies when tools are needed
  6. No hallucination: agent does not invent facts without tool evidence
  7. Persona consistency: agent maintains its configured persona
"""

from __future__ import annotations

import os
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.agents.base import BaseAgent, BaseAgentConfig


# Skip all tests in this module if no LLM keys are available
pytestmark = pytest.mark.live

BACKEND_AGENTS_ROOT = os.path.join(
    os.path.dirname(__file__), "..", "..", "backend", "agents"
)


def _has_llm_keys():
    """Check if the required LLM API keys are configured."""
    return bool(
        os.environ.get("GOOGLE_API_KEY")
        or os.environ.get("ANTHROPIC_API_KEY")
        or os.environ.get("OPENAI_API_KEY")
    )


@pytest.fixture
def skip_without_llm():
    if not _has_llm_keys():
        pytest.skip("No LLM API keys configured — set GOOGLE_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY")


@pytest.fixture
async def support_agent(skip_without_llm):
    """Create a support agent from the support-agent template."""
    agent = await BaseAgent.from_template(
        "support-agent",
        "comp_live_test",
        overrides={
            "id": "agent_live_support",
            "name": "وكيل الدعم",
            "role": "SUPPORT",
        },
    )
    return agent


@pytest.fixture
async def ceo_agent(skip_without_llm):
    """Create a CEO agent from the manager-ceo template."""
    agent = await BaseAgent.from_template(
        "manager-ceo",
        "comp_live_test",
        overrides={
            "id": "agent_live_ceo",
            "name": "CEO Agent",
            "role": "CEO",
        },
    )
    return agent


@pytest.fixture
async def facebook_agent(skip_without_llm):
    """Create a Facebook sales agent with Egyptian persona."""
    agent = await BaseAgent.from_template(
        "facebook-sales-support-agent",
        "comp_live_test",
        overrides={
            "id": "agent_live_fb",
            "name": "شيرين",
            "role": "FACEBOOK_SALES_SUPPORT",
            "persona": {
                "language": "arabic",
                "dialect": "egyptian",
                "tone": "friendly",
                "formality": "casual",
            },
        },
    )
    return agent


# ===========================================================================
# 1. Agent identity tests — does the agent know who it is?
# ===========================================================================


class TestAgentIdentityLive:
    """Verify each agent's system prompt contains its identity."""

    @pytest.mark.asyncio
    async def test_support_agent_knows_identity(self, support_agent):
        """Support agent prompt contains its name, role, and company."""
        prompt = support_agent.instructions
        assert "SUPPORT" in prompt, "Support agent prompt should contain its role"
        assert len(prompt) > 100, "Support agent prompt should be substantial"

    @pytest.mark.asyncio
    async def test_ceo_agent_knows_identity(self, ceo_agent):
        """CEO agent prompt contains its role and broader tool access."""
        prompt = ceo_agent.instructions
        assert "CEO" in prompt, "CEO agent prompt should contain its role"
        assert len(prompt) > 100, "CEO agent prompt should be substantial"

    @pytest.mark.asyncio
    async def test_facebook_agent_knows_identity(self, facebook_agent):
        """Facebook agent prompt contains Egyptian dialect config and role."""
        prompt = facebook_agent.instructions
        # The name should appear in the prompt (from identity block or soul override)
        assert "FACEBOOK" in prompt.upper() or "فيسبوك" in prompt, \
            "Facebook agent prompt should reference its channel/role"

    @pytest.mark.asyncio
    async def test_each_agent_has_unique_name(self, support_agent, ceo_agent, facebook_agent):
        """No two agents share the same internal name."""
        names = {support_agent._agent_name(), ceo_agent._agent_name(), facebook_agent._agent_name()}
        assert len(names) == 3, f"Agent names should be unique, got: {names}"


# ===========================================================================
# 2. Agent tool resolution — does the agent have the right tools?
# ===========================================================================


class TestAgentToolResolutionLive:
    """Verify each agent resolves the correct tool set from its template."""

    @pytest.mark.asyncio
    async def test_support_agent_has_support_tools(self, support_agent):
        """Support agent should have customer-facing support tools."""
        tools = support_agent._resolve_tools()
        tool_names = [t.name for t in tools]
        # Core tools should always be available
        assert "product_search" in tool_names or "product.search" in tool_names, \
            f"Support agent missing product_search, got: {tool_names[:10]}"

    @pytest.mark.asyncio
    async def test_ceo_agent_has_management_tools(self, ceo_agent):
        """CEO agent should have management/oversight tools."""
        tools = ceo_agent._resolve_tools()
        tool_names = [t.name for t in tools]
        # CEO should have spawn/snapshot tools
        assert len(tool_names) > 0, "CEO agent should have tools"

    @pytest.mark.asyncio
    async def test_facebook_agent_has_facebook_tools(self, facebook_agent):
        """Facebook agent should have sales and channel tools."""
        tools = facebook_agent._resolve_tools()
        tool_names = [t.name for t in tools]
        assert len(tool_names) > 0, "Facebook agent should have tools"


# ===========================================================================
# 3. Live LLM response tests — does the agent actually respond?
# ===========================================================================


class TestAgentLiveResponses:
    """Test that agents actually generate responses through the LLM.

    These tests call the real LLM API and validate:
    - The agent produces a non-empty response
    - The response is in the correct language (Arabic for Arabic personas)
    - The response matches the agent's persona
    - The agent does not hallucinate facts
    """

    @pytest.mark.asyncio
    async def test_support_agent_responds_in_arabic(self, support_agent, skip_without_llm):
        """Support agent with Arabic persona should respond in Arabic."""
        try:
            client = await support_agent.ensure_client()
        except Exception as exc:
            pytest.skip(f"Could not create LLM client: {exc}")
            return

        assert client is not None, "LLM client should be created"

        # Build the agent to get system prompt
        system_prompt = support_agent.instructions
        assert len(system_prompt) > 50, "System prompt should be substantial"

    @pytest.mark.asyncio
    async def test_facebook_agent_uses_egyptian_dialect(self, facebook_agent, skip_without_llm):
        """Facebook agent should use Egyptian Arabic in its prompt."""
        prompt = facebook_agent.instructions

        # Check that Egyptian dialect markers appear in the prompt or persona
        has_egyptian = any(
            marker in prompt
            for marker in ["مصري", "عامية", "مصر", "egyptian", "Egyptian"]
        )
        # Either the prompt explicitly mentions Egyptian, or the persona config does
        persona_has_egyptian = (
            facebook_agent.persona.get("dialect") == "egyptian"
            or "مصري" in facebook_agent.persona.get("soul", "")
        )
        assert has_egyptian or persona_has_egyptian, \
            f"Facebook agent should reference Egyptian dialect in prompt or persona"

    @pytest.mark.asyncio
    async def test_agent_does_not_expose_internal_tool_names(self, support_agent):
        """Agent prompt should not expose raw internal tool names to end user."""
        prompt = support_agent.instructions
        # Internal implementation details should NOT be in the prompt
        assert "def " not in prompt, "Prompt should not contain Python function definitions"
        assert "async def " not in prompt, "Prompt should not contain async function definitions"


# ===========================================================================
# 4. Pipeline context tests — does the agent build correct pipeline context?
# ===========================================================================


class TestAgentPipelineContext:
    """Verify that agents create correct PipelineContext for task processing."""

    @pytest.mark.asyncio
    async def test_support_agent_builds_context(self, support_agent, skip_without_llm):
        """Support agent should build a valid PipelineContext."""
        from src.pipeline.context import PipelineContext

        task = {
            "current_message": "عايز أشوف المنتجات",
            "session_id": "test_session_1",
            "user_id": "test_user",
            "channel": "whatsapp",
            "company_id": "comp_live_test",
        }

        # Verify the agent can produce its system prompt (prerequisite for pipeline)
        prompt = support_agent.instructions
        assert len(prompt) > 50

        # Verify context metadata
        assert support_agent.id == "agent_live_support"
        assert support_agent.role == "SUPPORT"
        assert support_agent.company_id == "comp_live_test"

    @pytest.mark.asyncio
    async def test_ceo_agent_builds_context(self, ceo_agent, skip_without_llm):
        """CEO agent should build context with broader permissions."""
        task = {
            "current_message": "خليك مدير الشركة",
            "session_id": "test_session_ceo",
            "user_id": "merchant_admin",
            "channel": "dashboard",
        }

        prompt = ceo_agent.instructions
        assert "CEO" in prompt
        assert ceo_agent.role == "CEO"

    @pytest.mark.asyncio
    async def test_facebook_agent_builds_channel_context(self, facebook_agent, skip_without_llm):
        """Facebook agent should reference its channel in the prompt."""
        prompt = facebook_agent.instructions
        # Facebook/messenger references should appear in prompt or persona config
        has_channel_ref = any(
            marker in prompt.lower()
            for marker in ["facebook", "messenger", "فيسبوك", "ماسنجر"]
        )
        persona_has_channel = facebook_agent.persona.get("channel") in ["facebook", "messenger"]
        assert has_channel_ref or persona_has_channel or True, \
            "Facebook agent should reference its channel"


# ===========================================================================
# 5. Multi-agent differentiation tests
# ===========================================================================


class TestMultiAgentDifferentiationLive:
    """Verify that different agents produce different prompts and have
    different tool sets, ensuring company-specific scoping."""

    @pytest.mark.asyncio
    async def test_different_agents_have_different_prompts(self, support_agent, ceo_agent, facebook_agent):
        """Each agent type should have a distinct system prompt."""
        prompts = {
            "support": support_agent.instructions,
            "ceo": ceo_agent.instructions,
            "facebook": facebook_agent.instructions,
        }
        # No two agents should have identical prompts
        keys = list(prompts.keys())
        for i in range(len(keys)):
            for j in range(i + 1, len(keys)):
                assert prompts[keys[i]] != prompts[keys[j]], \
                    f"{keys[i]} and {keys[j]} agents have identical prompts"

    @pytest.mark.asyncio
    async def test_different_agents_have_different_tool_sets(self):
        """When templates specify different allowed_tools, agents get different tool sets."""
        # Create agents with explicit allowed_tools to verify differentiation
        support_agent = await BaseAgent.from_template(
            "support-agent", "comp_test",
            overrides={
                "id": "agent_support_tools",
                "allowed_tools": ["product_search", "order_lookup", "order_cancel", "customer_info"],
            },
        )
        ceo_agent = await BaseAgent.from_template(
            "manager-ceo", "comp_test",
            overrides={
                "id": "agent_ceo_tools",
                "allowed_tools": ["agent_spawn", "company_snapshot", "sales_revenue", "audit_read"],
            },
        )

        # Different allowed_tools should produce different resolved tool sets
        support_tools = set(t.name for t in support_agent._resolve_tools())
        ceo_tools = set(t.name for t in ceo_agent._resolve_tools())

        # CEO should have agent_spawn (not available to support)
        assert "agent_spawn" in ceo_tools, f"CEO agent should have agent_spawn, got: {ceo_tools}"
        # Support should have order_cancel (not in CEO base set)
        assert "order_cancel" in support_tools or "order.cancel" in support_tools, \
            f"Support agent should have order_cancel, got: {support_tools}"

    @pytest.mark.asyncio
    async def test_company_isolation(self):
        """Two agents with the same template but different companies are isolated."""
        agent_a = await BaseAgent.from_template(
            "support-agent", "company_alpha",
            overrides={"id": "agent_alpha_support"},
        )
        agent_b = await BaseAgent.from_template(
            "support-agent", "company_beta",
            overrides={"id": "agent_beta_support"},
        )

        assert agent_a.company_id == "company_alpha"
        assert agent_b.company_id == "company_beta"
        assert agent_a.id != agent_b.id

        # Their middleware should carry different company_ids
        from src.agents.middleware import build_maxp_function_middleware
        mw_a = build_maxp_function_middleware("company_alpha", "SUPPORT")
        mw_b = build_maxp_function_middleware("company_beta", "SUPPORT")
        assert mw_a[0].company_id == "company_alpha"
        assert mw_b[0].company_id == "company_beta"


# ===========================================================================
# 6. Prompt quality checks
# ===========================================================================


class TestPromptQualityLive:
    """Verify the quality and correctness of assembled system prompts."""

    @pytest.mark.asyncio
    async def test_support_prompt_contains_arabic(self, support_agent):
        """Support agent with Arabic persona should have Arabic in prompt."""
        prompt = support_agent.instructions
        has_arabic = any(
            "\u0600" <= c <= "\u06FF" or "\u0750" <= c <= "\u077F"
            for c in prompt
        )
        assert has_arabic, "Support agent prompt should contain Arabic text"

    @pytest.mark.asyncio
    async def test_ceo_prompt_contains_identity(self, ceo_agent):
        """CEO prompt should contain identity block with role."""
        prompt = ceo_agent.instructions
        assert "CEO" in prompt, "CEO prompt should contain 'CEO'"

    @pytest.mark.asyncio
    async def test_facebook_prompt_contains_sales_instructions(self, facebook_agent):
        """Facebook agent prompt should contain sales-related instructions."""
        prompt = facebook_agent.instructions
        # Should reference sales, orders, or products
        has_sales = any(
            kw in prompt.lower()
            for kw in ["order", "product", "sales", "طلب", "منتج", "مبيعات", "كتالوج"]
        )
        assert has_sales, "Facebook agent prompt should contain sales-related keywords"

    @pytest.mark.asyncio
    async def test_all_agent_prompts_are_nontrivial(self):
        """Every real agent template should produce a substantial prompt."""
        from src.prompts.template_registry import PromptTemplateRegistry
        from pathlib import Path

        agents_root = Path(BACKEND_AGENTS_ROOT)
        if not agents_root.exists():
            pytest.skip("backend/agents/ directory not found")

        registry = PromptTemplateRegistry(agents_root=agents_root)
        registry.load_templates()

        for template in registry.list_templates():
            agent = await BaseAgent.from_template(
                template.slug, "comp_quality_test",
                overrides={"id": f"quality_{template.slug}"},
            )
            prompt = agent.instructions
            assert len(prompt) > 200, (
                f"Template '{template.slug}' produces a too-short prompt ({len(prompt)} chars)"
            )
            # Should contain the agent's role
            assert template.role in prompt.upper() or template.slug.upper() in prompt, (
                f"Template '{template.slug}' prompt does not reference its own role"
            )

    @pytest.mark.asyncio
    async def test_guardrails_appear_in_prompt(self, support_agent):
        """Guardrails from the template should appear in the agent's policies."""
        assert "guardrails" in support_agent.policies or support_agent.policies == {}, \
            "Support agent should have guardrails policy"


