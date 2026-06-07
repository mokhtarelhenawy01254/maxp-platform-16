"""Unit tests for Phase 2 (remaining 30%) and Phase 3 completion.

Covers:
- RAG evidence injection into system prompt
- Working memory session state integration
- Episodic memory retrieval pipeline stage
- Token budget hard enforcement
- JIT tool scoping
- Admin CRUD API for intents
"""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.context.assembler import ContextAssembler
from src.pipeline.context import PipelineContext, TOKEN_BUDGET_DEFAULT
from src.pipeline.stages.retrieve_episodic import retrieve_episodic_memory, SIMILARITY_THRESHOLD
from src.pipeline.stages.retrieve_knowledge import retrieve_knowledge
from src.pipeline.stages.route_to_tools import _scope_tools


# ─── Helpers ──────────────────────────────────────────────────────

def _make_ctx(**overrides) -> PipelineContext:
    defaults = dict(
        message="hello",
        thread_id="t1",
        company_id="c1",
        customer_id="cu1",
        session=None,
    )
    defaults.update(overrides)
    return PipelineContext(**defaults)


# ═══════════════════════════════════════════════════════════════════
# Phase 2.1: RAG Injection into System Prompt
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_retrieve_knowledge_stores_in_rag_evidence():
    """RAG evidence should go to ctx.rag_evidence, NOT ctx.tool_context."""
    ctx = _make_ctx()
    with patch("src.pipeline.stages.retrieve_knowledge.get_knowledge_evidence", new_callable=AsyncMock) as mock_rag:
        mock_rag.return_value = "Product X is available in sizes M, L, XL."
        result = await retrieve_knowledge(ctx)

    assert result.rag_evidence == "Product X is available in sizes M, L, XL."
    assert "Knowledge" not in result.tool_context  # Should NOT be in tool_context


@pytest.mark.asyncio
async def test_retrieve_knowledge_handles_empty():
    ctx = _make_ctx()
    with patch("src.pipeline.stages.retrieve_knowledge.get_knowledge_evidence", new_callable=AsyncMock) as mock_rag:
        mock_rag.return_value = ""
        result = await retrieve_knowledge(ctx)

    assert result.rag_evidence == ""


@pytest.mark.asyncio
async def test_rag_evidence_injected_in_system_prompt():
    """build_system_prompt should inject RAG as <company_knowledge> XML block."""
    ctx = _make_ctx(
        system_prompt="You are a helpful agent.",
        rag_evidence="Our return policy is 30 days.",
    )
    assembler = ContextAssembler()
    prompt = await assembler.build_system_prompt(ctx)

    assert "<company_knowledge>" in prompt
    assert "Our return policy is 30 days." in prompt
    assert "</company_knowledge>" in prompt


# ═══════════════════════════════════════════════════════════════════
# Phase 2.2: Working Memory → Assembler
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_session_state_injected_in_system_prompt():
    """Session state with cart should appear as <session_state> in system prompt."""
    ctx = _make_ctx(
        system_prompt="You are a helpful agent.",
        session_state=None,
    )
    # Pre-populate session_state (simulating what fetch_session_state would do)
    ctx.session_state = {"cart": {"items": [{"name": "Shoe", "qty": 1}]}, "activeSearchFilters": {"color": "red"}}

    assembler = ContextAssembler()
    # Mock fetch_session_state to return pre-set state
    with patch.object(assembler, "fetch_session_state", new_callable=AsyncMock, return_value=ctx.session_state):
        with patch.object(assembler, "fetch_customer_profile", new_callable=AsyncMock, return_value=None):
            prompt = await assembler.build_system_prompt(ctx)

    assert "<session_state>" in prompt
    assert "Cart:" in prompt
    assert "Active Filters:" in prompt


# ═══════════════════════════════════════════════════════════════════
# Phase 2.3: Episodic Memory Pipeline Stage
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_retrieve_episodic_memory_stores_relevant():
    """Memories above similarity threshold should be stored in ctx."""
    ctx = _make_ctx(session=AsyncMock())

    mock_memories = [
        {"id": "m1", "content": "Customer asked about shoe sizes", "similarity": 0.85},
        {"id": "m2", "content": "Customer complained about shipping", "similarity": 0.70},
        {"id": "m3", "content": "Unrelated query", "similarity": 0.30},  # Below threshold
    ]

    with patch("src.pipeline.stages.retrieve_episodic.episodic_memory_service") as mock_svc:
        mock_svc.search_similar = AsyncMock(return_value=mock_memories)
        result = await retrieve_episodic_memory(ctx)

    assert len(result.episodic_memories) == 2
    assert all(m["similarity"] >= SIMILARITY_THRESHOLD for m in result.episodic_memories)


@pytest.mark.asyncio
async def test_retrieve_episodic_memory_graceful_failure():
    """Should not crash if episodic memory service fails."""
    ctx = _make_ctx(session=AsyncMock())

    with patch("src.pipeline.stages.retrieve_episodic.episodic_memory_service") as mock_svc:
        mock_svc.search_similar = AsyncMock(side_effect=Exception("DB down"))
        result = await retrieve_episodic_memory(ctx)

    assert result.episodic_memories == []


@pytest.mark.asyncio
async def test_episodic_memories_injected_in_system_prompt():
    """Episodic memories should appear as <relevant_memories> in system prompt."""
    ctx = _make_ctx(
        system_prompt="You are a helpful agent.",
        episodic_memories=[
            {"content": "Previously bought running shoes", "similarity": 0.9},
            {"content": "Preferred color is blue", "similarity": 0.75},
        ],
    )

    assembler = ContextAssembler()
    with patch.object(assembler, "fetch_customer_profile", new_callable=AsyncMock, return_value=None):
        with patch.object(assembler, "fetch_session_state", new_callable=AsyncMock, return_value=None):
            prompt = await assembler.build_system_prompt(ctx)

    assert "<relevant_memories>" in prompt
    assert "[0.90] Previously bought running shoes" in prompt
    assert "[0.75] Preferred color is blue" in prompt
    assert "</relevant_memories>" in prompt


# ═══════════════════════════════════════════════════════════════════
# Phase 2.4: Token Budget Hard Enforcement
# ═══════════════════════════════════════════════════════════════════


def test_token_budget_default():
    """PipelineContext should have a default token budget."""
    ctx = _make_ctx()
    assert ctx.token_budget == TOKEN_BUDGET_DEFAULT


def test_enforce_budget_no_trim_needed():
    """If under budget, nothing should change."""
    assembler = ContextAssembler()
    prompt = "Short system prompt."
    history = [{"role": "user", "content": "hi"}]
    message = "hello"

    result_prompt, result_history = assembler._enforce_token_budget(
        prompt, history, message, budget=10_000
    )
    assert result_prompt == prompt
    assert result_history == history


def test_enforce_budget_drops_history():
    """When over budget, oldest history messages should be dropped first."""
    assembler = ContextAssembler()
    prompt = "System."
    # Create history where total tokens exceed budget
    history = [{"role": "user", "content": f"message {i} " * 20} for i in range(10)]
    message = "current"

    result_prompt, result_history = assembler._enforce_token_budget(
        prompt, history, message, budget=30
    )
    # Should have fewer history messages
    assert len(result_history) < 10


def test_enforce_budget_drops_sections():
    """When history trimming isn't enough, low-priority sections should be dropped."""
    assembler = ContextAssembler()
    prompt = (
        "Base instructions.\n"
        "<relevant_memories>\nOld memory content\n</relevant_memories>\n"
        "<company_knowledge>\nLong knowledge article.\n</company_knowledge>"
    )
    history = [{"role": "user", "content": "hi"}]
    message = "current"

    result_prompt, _ = assembler._enforce_token_budget(
        prompt, history, message, budget=10
    )
    # relevant_memories should be dropped first (lowest priority)
    assert "<relevant_memories>" not in result_prompt


# ═══════════════════════════════════════════════════════════════════
# Phase 2.5: JIT Tool Scoping
# ═══════════════════════════════════════════════════════════════════


def test_jit_scope_filters_by_allowed():
    """Only tools in allowedTools should remain."""
    ctx = _make_ctx()
    ctx.native_tools = [
        {"name": "product_search"},
        {"name": "order_lookup"},
        {"name": "shipping_rates"},
    ]
    plan = MagicMock()
    plan.allowedTools = ["product_search", "shipping_rates"]
    plan.blockedTools = []
    ctx.relevance_plan = plan

    _scope_tools(ctx)

    names = [t["name"] for t in ctx.native_tools]
    assert "product_search" in names
    assert "shipping_rates" in names
    assert "order_lookup" not in names


def test_jit_scope_removes_blocked():
    """Blocked tools should be removed even if in allowed list."""
    ctx = _make_ctx()
    ctx.native_tools = [
        {"name": "product_search"},
        {"name": "dangerous_tool"},
    ]
    plan = MagicMock()
    plan.allowedTools = []
    plan.blockedTools = ["dangerous_tool"]
    ctx.relevance_plan = plan

    _scope_tools(ctx)

    names = [t["name"] for t in ctx.native_tools]
    assert "product_search" in names
    assert "dangerous_tool" not in names


def test_jit_scope_no_plan_passthrough():
    """No relevance plan = all tools pass through."""
    ctx = _make_ctx()
    ctx.native_tools = [{"name": "a"}, {"name": "b"}]
    ctx.relevance_plan = None

    _scope_tools(ctx)
    assert len(ctx.native_tools) == 2


# ═══════════════════════════════════════════════════════════════════
# Phase 3.1: Admin CRUD API for Intents
# ═══════════════════════════════════════════════════════════════════


def test_intent_create_schema_validates_risk_level():
    """Risk level must be one of low/medium/high/critical."""
    from src.api.admin.intents_schemas import IntentDefinitionCreate

    # Valid
    intent = IntentDefinitionCreate(
        intent="test.intent",
        action_type="read",
        risk_level="high",
        next_state="read_data",
    )
    assert intent.risk_level == "high"

    # Invalid
    with pytest.raises(ValueError, match="risk_level"):
        IntentDefinitionCreate(
            intent="test.intent",
            action_type="read",
            risk_level="extreme",
            next_state="read_data",
        )


def test_intent_update_schema_partial():
    """Update schema should allow partial updates."""
    from src.api.admin.intents_schemas import IntentDefinitionUpdate

    update = IntentDefinitionUpdate(risk_level="low")
    data = update.model_dump(exclude_unset=True)
    assert data == {"risk_level": "low"}
    assert "action_type" not in data


def test_intent_response_schema():
    """Response schema should include id and timestamps."""
    from src.api.admin.intents_schemas import IntentDefinitionResponse
    from datetime import datetime

    resp = IntentDefinitionResponse(
        id="uuid-123",
        intent="orders.create_draft",
        action_type="write",
        risk_level="high",
        next_state="create_order_draft",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    assert resp.id == "uuid-123"
    assert resp.intent == "orders.create_draft"


# ═══════════════════════════════════════════════════════════════════
# Phase 3.2: Cache Invalidation (DynamicIntentRegistry)
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_dynamic_registry_force_reload():
    """force_reload=True should re-fetch from DB even if already loaded."""
    from src.intent.dynamic_registry import DynamicIntentRegistry

    registry = DynamicIntentRegistry()
    session = AsyncMock()

    # First load (mock empty table → fallback)
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    session.execute.return_value = mock_result

    await registry.load_intents(session)
    assert registry._is_loaded is True

    # Force reload should call execute again
    session.execute.reset_mock()
    await registry.load_intents(session, force_reload=True)
    session.execute.assert_called_once()


# ═══════════════════════════════════════════════════════════════════
# Full Integration: All sections in system prompt
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_full_system_prompt_all_sections():
    """System prompt should contain all injected sections when data is available."""
    ctx = _make_ctx(
        system_prompt="You are an e-commerce assistant.",
        rag_evidence="Return policy: 30 day full refund.",
        episodic_memories=[
            {"content": "Customer previously ordered running shoes", "similarity": 0.88},
        ],
    )

    assembler = ContextAssembler()
    mock_customer = {"first_name": "Sara", "last_name": "Ahmed", "phone": "012345", "email": "s@x.com"}
    mock_state = {"cart": {"items": [{"name": "Shoe"}]}, "lastShownProductIds": ["p1", "p2"]}

    with patch.object(assembler, "fetch_customer_profile", new_callable=AsyncMock, return_value=mock_customer):
        with patch.object(assembler, "fetch_session_state", new_callable=AsyncMock, return_value=mock_state):
            prompt = await assembler.build_system_prompt(ctx)

    # All sections should be present
    assert "<customer_profile>" in prompt
    assert "Sara Ahmed" in prompt
    assert "<session_state>" in prompt
    assert "Cart:" in prompt
    assert "<company_knowledge>" in prompt
    assert "30 day full refund" in prompt
    assert "<relevant_memories>" in prompt
    assert "running shoes" in prompt
