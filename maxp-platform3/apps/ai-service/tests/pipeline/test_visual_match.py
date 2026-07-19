from unittest.mock import AsyncMock, patch

import pytest

from src.pipeline.context import PipelineContext


@pytest.fixture
def ctx() -> PipelineContext:
    return PipelineContext(
        message="Show me products like this",
        thread_id="test-thread",
        company_id="test-company",
        customer_id="test-customer",
    )


@pytest.mark.asyncio
async def test_no_attachments_unchanged(ctx: PipelineContext) -> None:
    from src.pipeline.stages.visual_match import match_product_by_image
    original = ctx.message
    result = await match_product_by_image(ctx)
    assert result.message == original


@pytest.mark.asyncio
async def test_image_download_failure_returns_ctx(ctx: PipelineContext) -> None:
    from src.pipeline.stages.visual_match import match_product_by_image
    ctx.attachments = [{"type": "image", "url": "http://example.com/img.jpg"}]
    with patch("httpx.AsyncClient.get", side_effect=Exception("timeout")):
        result = await match_product_by_image(ctx)
    assert result.message and "صورة" in result.message


@pytest.mark.asyncio
async def test_all_image_urls(ctx: PipelineContext) -> None:
    from src.pipeline.stages.visual_match import _all_image_urls
    attachments = [
        {"type": "image", "url": "http://example.com/1.jpg"},
        {"type": "image", "url": "http://example.com/2.jpg"},
        {"type": "photo", "url": "http://example.com/3.jpg"},
    ]
    urls = _all_image_urls(attachments)
    assert len(urls) == 3
    assert "http://example.com/2.jpg" in urls


@pytest.mark.asyncio
async def test_image_urls_filters_non_image(ctx: PipelineContext) -> None:
    from src.pipeline.stages.visual_match import _all_image_urls
    attachments = [
        {"type": "image", "url": "http://example.com/img.jpg"},
        {"type": "file", "url": "http://example.com/doc.pdf"},
    ]
    urls = _all_image_urls(attachments)
    assert len(urls) == 1


@pytest.mark.asyncio
async def test_all_image_urls_handles_missing_url(ctx: PipelineContext) -> None:
    from src.pipeline.stages.visual_match import _all_image_urls
    attachments = [
        {"type": "image"},  # no url key
        {"type": "image", "url": "http://example.com/img.jpg"},
    ]
    urls = _all_image_urls(attachments)
    assert len(urls) == 1
