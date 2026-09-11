from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.context.assembler import ContextAssembler
from src.context.compressor import compress_history, count_tokens
from src.pipeline.context import PipelineContext


def test_count_tokens():
    # Test English tokens (~4 chars per token)
    assert count_tokens("hello") == 1
    assert count_tokens("hello world") == 2

    # Test Arabic tokens (~1.5 chars per token)
    # "مرحبا" is 5 chars -> should be ~3 tokens
    assert count_tokens("مرحبا") == 3

    # Empty string
    assert count_tokens("") == 0
    assert count_tokens(None) == 0


@pytest.mark.asyncio
async def test_compress_history_no_compression_needed():
    messages = [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "hello"},
    ]
    retained, summary = await compress_history(messages, max_tokens=100)
    assert retained == messages
    assert summary is None


@pytest.mark.asyncio
async def test_compress_history_with_rule_based_compression():
    messages = [
        {"role": "user", "content": "i want to buy a shoe"},
        {"role": "assistant", "content": "sure, what size?"},
        {"role": "user", "content": "size 42 please"},
        {"role": "assistant", "content": "we have black and white"},
        {"role": "user", "content": "black please"},
        {"role": "assistant", "content": "added to cart!"},
    ]

    # keep_recent = 2, max_tokens = 5 (very small, forces compression)
    retained, summary = await compress_history(messages, max_tokens=5, keep_recent=2)

    assert len(retained) == 2
    assert retained == messages[-2:]
    assert summary is not None
    assert "نقاش سابق:" in summary
    assert "العميل" in summary
    assert "الوكيل" in summary


@pytest.mark.asyncio
async def test_context_assembler_fetch_customer_profile():
    # Mock context and session
    ctx = MagicMock(spec=PipelineContext)
    ctx.customer_id = "cust_123"
    ctx.session = AsyncMock(spec=AsyncSession)

    # Mock DB row using tuple
    mock_row = ("Ahmed", "Ali", "01012345678", "ahmed@example.com", "{}")

    mock_result = MagicMock()
    mock_result.fetchone.return_value = mock_row
    ctx.session.execute.return_value = mock_result

    assembler = ContextAssembler()
    profile = await assembler.fetch_customer_profile(ctx)

    assert profile is not None
    assert profile["first_name"] == "Ahmed"
    assert profile["last_name"] == "Ali"
    assert profile["phone"] == "01012345678"
    assert profile["email"] == "ahmed@example.com"


@pytest.mark.asyncio
async def test_context_assembler_fetch_message_history():
    ctx = MagicMock(spec=PipelineContext)
    ctx.thread_id = "conv_123"
    ctx.session = AsyncMock(spec=AsyncSession)

    # Mock messages using tuples
    mock_rows = [
        ("hi there", True, "TEXT"),
        ("hello! how can I help you?", False, "TEXT"),
    ]

    mock_result = MagicMock()
    mock_result.fetchall.return_value = mock_rows
    ctx.session.execute.return_value = mock_result

    assembler = ContextAssembler()
    history = await assembler.fetch_message_history(ctx)

    # fetchall returns newest first, so mock_rows has newest first.
    # The fetch_message_history reverses them to chronological order.
    assert len(history) == 2
    assert history[0]["role"] == "assistant"
    assert history[0]["content"] == "hello! how can I help you?"
    assert history[1]["role"] == "user"
    assert history[1]["content"] == "hi there"


@pytest.mark.asyncio
async def test_context_assembler_uses_conversation_id_for_message_history():
    ctx = MagicMock(spec=PipelineContext)
    ctx.thread_id = "9a8f8cc4-2c75-4bde-8f54-f7f562502e57"
    ctx.conversation_id = "cmqodplse007dju4hdnz1shav"
    ctx.external_memory_context = {}
    ctx.session = AsyncMock(spec=AsyncSession)

    mock_result = MagicMock()
    mock_result.fetchall.return_value = [("مصاريف الشحن كام ؟", True, "TEXT")]
    ctx.session.execute.return_value = mock_result

    history = await ContextAssembler().fetch_message_history(ctx)

    assert history == [{"role": "user", "content": "مصاريف الشحن كام ؟"}]
    assert ctx.session.execute.await_args.args[1]["conversation_id"] == "cmqodplse007dju4hdnz1shav"


@pytest.mark.asyncio
async def test_context_assembler_dedupes_adjacent_duplicate_history():
    ctx = MagicMock(spec=PipelineContext)
    ctx.thread_id = "conv_123"
    ctx.session = AsyncMock(spec=AsyncSession)

    mock_rows = [
        ("لقيت ايه ؟", True, "TEXT"),
        ("لقيت ايه ؟", True, "TEXT"),
        ("هراجع مصاريف الشحن.", False, "TEXT"),
        ("هراجع مصاريف الشحن.", False, "TEXT"),
        ("مصاريف الشحن كام ؟", True, "TEXT"),
    ]

    mock_result = MagicMock()
    mock_result.fetchall.return_value = mock_rows
    ctx.session.execute.return_value = mock_result

    history = await ContextAssembler().fetch_message_history(ctx)

    assert history == [
        {"role": "user", "content": "مصاريف الشحن كام ؟"},
        {"role": "assistant", "content": "هراجع مصاريف الشحن."},
        {"role": "user", "content": "لقيت ايه ؟"},
    ]


@pytest.mark.asyncio
async def test_context_assembler_uses_external_memory_history_before_db():
    ctx = PipelineContext(
        message="continue",
        thread_id="thread_123",
        company_id="company_abc",
        customer_id="cust_123",
        external_memory_context={
            "recentMessages": [
                {"role": "user", "content": "I prefer black shoes"},
                {"role": "assistant", "content": "I will remember that"},
            ],
        },
    )
    ctx.session = AsyncMock(spec=AsyncSession)

    history = await ContextAssembler().fetch_message_history(ctx)

    assert history == [
        {"role": "user", "content": "I prefer black shoes"},
        {"role": "assistant", "content": "I will remember that"},
    ]
    ctx.session.execute.assert_not_called()


@pytest.mark.asyncio
async def test_context_assembler_injects_external_session_state():
    ctx = PipelineContext(
        message="what did I ask for?",
        thread_id="thread_123",
        company_id="company_abc",
        customer_id="cust_123",
        system_prompt="base",
        external_memory_context={
            "recentMessages": [{"role": "user", "content": "show black shoes"}],
            "activeSearchFilters": {"color": "black"},
            "lastShownProductIds": ["prod_1"],
        },
    )

    messages = await ContextAssembler().assemble_messages(ctx)

    assert messages[0]["role"] == "system"
    assert "<session_state>" in messages[0]["content"]
    assert "prod_1" in messages[0]["content"]
    assert "black" in messages[0]["content"]
    # recentMessages is preserved in the messages history array to avoid cache-busting the system prompt prefix
    assert any(message["content"] == "show black shoes" for message in messages)


@pytest.mark.asyncio
async def test_context_assembler_preserves_image_attachments_as_content_parts():
    ctx = PipelineContext(
        message="what is in this image?",
        thread_id="thread_vision",
        company_id="company_abc",
        customer_id="cust_123",
        system_prompt="base",
        attachments=[
            {
                "type": "image",
                "mime_type": "image/png",
                "base64_data": "iVBORw0KGgo=",
                "detail": "low",
            }
        ],
    )

    messages = await ContextAssembler().assemble_messages(ctx)

    user_message = messages[-1]
    assert user_message["role"] == "user"
    assert isinstance(user_message["content"], list)
    assert user_message["content"][0] == {"type": "text", "text": "what is in this image?"}
    assert user_message["content"][1]["type"] == "image_url"
    assert user_message["content"][1]["image_url"]["url"].startswith("data:image/png;base64,")
    assert user_message["content"][1]["image_url"]["detail"] == "low"


@pytest.mark.asyncio
async def test_assemble_messages_integration():
    ctx = MagicMock(spec=PipelineContext)
    ctx.message = "yes, that color is fine"
    ctx.thread_id = "conv_123"
    ctx.customer_id = "cust_123"
    ctx.company_id = "company_abc"
    ctx.system_prompt = "You are a helpful agent."
    ctx.agent = MagicMock()
    ctx.agent.instructions = "You are a helpful agent."
    ctx.agent.client = None
    ctx.rag_evidence = ""
    ctx.episodic_memories = []
    ctx.session_state = None
    ctx.token_budget = 120_000

    ctx.session = AsyncMock(spec=AsyncSession)

    # Mock Customer DB call returning tuple
    mock_customer_row = ("Ahmed", "Ali", "01012345678", "ahmed@example.com", "{}")
    mock_customer_result = MagicMock()
    mock_customer_result.fetchone.return_value = mock_customer_row

    # Mock Message DB call (return empty history)
    mock_message_result = MagicMock()
    mock_message_result.fetchall.return_value = []

    # Mock execute: first call is fetch_message_history, second call is fetch_customer_profile
    ctx.session.execute.side_effect = [mock_message_result, mock_customer_result]

    assembler = ContextAssembler()
    messages = await assembler.assemble_messages(ctx)

    assert len(messages) == 2
    assert messages[0]["role"] == "system"
    assert "<customer_profile>" in messages[0]["content"]
    assert "Ahmed Ali" in messages[0]["content"]
    assert messages[1]["role"] == "user"
    assert messages[1]["content"] == "yes, that color is fine"


@pytest.mark.asyncio
async def test_facebook_channel_injects_continuation_instructions():
    ctx = MagicMock(spec=PipelineContext)
    ctx.message = "hello"
    ctx.thread_id = "conv_123"
    ctx.customer_id = "cust_123"
    ctx.company_id = "company_abc"
    ctx.system_prompt = "base"
    ctx.channel = "facebook"
    ctx.agent = None
    ctx.rag_evidence = ""
    ctx.episodic_memories = []
    ctx.session_state = None
    ctx.session = AsyncMock(spec=AsyncSession)

    assembler = ContextAssembler()
    prompt = await assembler.build_system_prompt(ctx)

    assert "<continuation>" in prompt
    assert "Do NOT introduce yourself" in prompt
    assert "seamless continuity" in prompt


@pytest.mark.asyncio
async def test_non_facebook_channel_does_not_inject_continuation():
    ctx = MagicMock(spec=PipelineContext)
    ctx.message = "hello"
    ctx.thread_id = "conv_123"
    ctx.customer_id = "cust_123"
    ctx.company_id = "company_abc"
    ctx.system_prompt = "base"
    ctx.channel = "chat"
    ctx.agent = None
    ctx.rag_evidence = ""
    ctx.episodic_memories = []
    ctx.session_state = None
    ctx.session = AsyncMock(spec=AsyncSession)

    assembler = ContextAssembler()
    prompt = await assembler.build_system_prompt(ctx)

    assert "<continuation>" not in prompt


@pytest.mark.asyncio
async def test_context_caching_prefix_invariance_across_turns():
    """Verify that the system prompt prefix is 100% invariant across turns for DeepSeek KV caching."""
    agent = MagicMock()
    agent.id = "agent_1"
    agent._db_rules = "Never offer discounts above 20%"
    agent.allowed_skills = []

    # Turn 1
    ctx1 = MagicMock(spec=PipelineContext)
    ctx1.message = "What shoes do you have?"
    ctx1.thread_id = "conv_123"
    ctx1.customer_id = None
    ctx1.company_id = "company_abc"
    ctx1.system_prompt = "You are Yasmine, an AI sales assistant."
    ctx1.channel = "web"
    ctx1.agent = agent
    ctx1.rag_evidence = "Knowledge about shoes"
    ctx1.episodic_memories = [{"content": "Customer asked about shoes", "similarity": 0.88}]
    ctx1.session_state = {"cart": ["shoe_1"]}
    ctx1.external_memory_context = {"cart": ["shoe_1"]}
    ctx1.session = None

    assembler = ContextAssembler()
    prompt1 = await assembler.build_system_prompt(ctx1)

    # Turn 2 (Customer asks something completely different, different RAG, different cart)
    ctx2 = MagicMock(spec=PipelineContext)
    ctx2.message = "How much is shipping to Cairo?"
    ctx2.thread_id = "conv_123"
    ctx2.customer_id = None
    ctx2.company_id = "company_abc"
    ctx2.system_prompt = "You are Yasmine, an AI sales assistant."
    ctx2.channel = "web"
    ctx2.agent = agent
    ctx2.rag_evidence = "Knowledge about shipping to Cairo"
    ctx2.episodic_memories = [{"content": "Customer asked about shipping", "similarity": 0.92}]
    ctx2.session_state = {"cart": ["shoe_1", "shirt_2"]}
    ctx2.external_memory_context = {"cart": ["shoe_1", "shirt_2"]}
    ctx2.session = None

    prompt2 = await assembler.build_system_prompt(ctx2)

    # 1. Verify that dynamic minute is NOT in current_datetime (to avoid breaking cache every 60s)
    assert "<current_datetime>" in prompt1
    assert "Today:" in prompt1
    assert "Current Time:" not in prompt1  # Time moved to user turn

    # 2. Verify that the static prefix (base prompt + rules + current date) is 100% identical between turns
    prefix_cut = prompt1.find("<session_state>")
    assert prefix_cut != -1
    assert prompt1[:prefix_cut] == prompt2[:prefix_cut]

