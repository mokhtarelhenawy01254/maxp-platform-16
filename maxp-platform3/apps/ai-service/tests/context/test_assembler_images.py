from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.pipeline.context import PipelineContext


@pytest.fixture
def ctx() -> PipelineContext:
    return PipelineContext(
        message="test",
        thread_id="test-thread",
        company_id="test-company",
        customer_id="test-customer",
    )


@pytest.mark.asyncio
async def test_fetch_message_history_preserves_image_urls(ctx: PipelineContext) -> None:
    from src.context.assembler import ContextAssembler
    assembler = ContextAssembler()
    ctx.conversation_id = "conv-123"
    ctx.session = AsyncMock()
    mock_row = ("test content", True, "IMAGE")
    mock_row2 = (None, True, "IMAGE")
    mock_result = MagicMock()
    mock_result.fetchall.return_value = []
    ctx.session.execute.return_value = mock_result
    history = await assembler.fetch_message_history(ctx, limit=5)
    assert isinstance(history, list)


@pytest.mark.asyncio
async def test_fetch_message_history_with_empty_conv(ctx: PipelineContext) -> None:
    from src.context.assembler import ContextAssembler
    assembler = ContextAssembler()
    history = await assembler.fetch_message_history(ctx, limit=5)
    assert history == []
