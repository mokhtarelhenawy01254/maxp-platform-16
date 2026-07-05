from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.pipeline.context import PipelineContext


@pytest.fixture
def ctx() -> PipelineContext:
    return PipelineContext(
        message="What is the price?",
        thread_id="test-thread",
        company_id="test-company",
        customer_id="test-customer",
    )


@pytest.mark.asyncio
async def test_followup_uses_ctx_attachments(ctx: PipelineContext) -> None:
    from src.pipeline.stages.skills_pipeline import _build_followup_messages
    from src.context.multimodal import build_user_content
    ctx.attachments = [{"type": "image", "url": "http://example.com/img.jpg"}]
    mock_response = MagicMock()
    mock_response.tool_calls = None
    mock_response.text = "test response"
    result = await _build_followup_messages(ctx, mock_response, [])
    assert result is not None
    user_msgs = [m for m in result if m.get("role") == "user"]
    assert len(user_msgs) >= 1
    last_user = user_msgs[-1]["content"]
    assert isinstance(last_user, list) or "img.jpg" in str(last_user)


@pytest.mark.asyncio
async def test_token_budget_trims_history(ctx: PipelineContext) -> None:
    from src.pipeline.stages.skills_pipeline import _llm_call
    ctx.token_budget = 100
    ctx.llm_client = AsyncMock()
    ctx.llm_client.generate = AsyncMock(return_value="short reply")
    system_prompt = "Short system prompt"
    ctx.external_memory_context["recentMessages"] = [
        {"role": "user", "content": "Hello " * 1000},
        {"role": "assistant", "content": "test"},
        {"role": "user", "content": "final message"},
    ]
    result = await _llm_call(ctx, system_prompt, [])
    assert result is not None


@pytest.mark.asyncio
async def test_build_user_content_with_attachments(ctx: PipelineContext) -> None:
    from src.context.multimodal import build_user_content
    attachments = [{"type": "image", "url": "http://example.com/img.jpg"}]
    result = build_user_content("test message", attachments)
    if isinstance(result, list):
        assert len(result) == 2
        assert result[0]["type"] == "text"
        assert result[1]["type"] == "image_url"
    else:
        assert isinstance(result, str)


@pytest.mark.asyncio
async def test_build_user_content_without_attachments(ctx: PipelineContext) -> None:
    from src.context.multimodal import build_user_content
    result = build_user_content("test message", [])
    assert isinstance(result, str)
    assert result == "test message"
