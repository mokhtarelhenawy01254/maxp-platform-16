import pytest
from src.pipeline.context import PipelineContext
from src.pipeline.hooks import AttachmentHook


@pytest.mark.asyncio
async def test_attachment_hook_strips_urls_and_populates_attachments():
    hook = AttachmentHook()
    ctx = PipelineContext(
        message="ممكن اشوف صور الموديل",
        thread_id="t1",
        company_id="c1",
        customer_id="cust1",
        channel="facebook",
        final_reply=(
            "طبعاً يا شادي، دي Luma 👇\n"
            "👠 السعر: 520 جنيه\n"
            "https://mokhtarelhenawy.online/uploads/products/product-123.jpg\n"
            "بالتوفيق!"
        ),
    )
    await hook.before_reply(ctx, [])

    assert "https://mokhtarelhenawy.online" not in ctx.final_reply
    assert "product-123.jpg" not in ctx.final_reply
    assert len(ctx.response_attachments) == 1
    assert ctx.response_attachments[0]["url"] == "https://mokhtarelhenawy.online/uploads/products/product-123.jpg"


@pytest.mark.asyncio
async def test_attachment_hook_populates_from_product_search():
    hook = AttachmentHook()
    ctx = PipelineContext(
        message="ممكن اشوف صور الموديل",
        thread_id="t1",
        company_id="c1",
        customer_id="cust1",
        channel="facebook",
        final_reply="كوتشي Luma متاح بمقاس 39 ولون أزرق جينز وسعره 520 جنيه.",
        tool_evidence=[
            {
                "tool": "product_search",
                "result": {
                    "results": [
                        {
                            "name": "Luma",
                            "images": ["/uploads/products/luma-main.jpg", "/uploads/products/luma-side.jpg"],
                        }
                    ]
                },
            }
        ],
    )
    await hook.before_reply(ctx, [])

    assert len(ctx.response_attachments) == 2
    assert any("luma-main.jpg" in a["url"] for a in ctx.response_attachments)
    assert any("luma-side.jpg" in a["url"] for a in ctx.response_attachments)
    assert "uploads" not in ctx.final_reply
