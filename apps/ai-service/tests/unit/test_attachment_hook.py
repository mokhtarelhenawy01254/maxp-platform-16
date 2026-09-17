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


@pytest.mark.asyncio
async def test_attachment_hook_deduplicates_across_turns():
    """Turn 2 should NOT re-send product images when customer is just confirming size/color."""
    hook = AttachmentHook()
    ctx = PipelineContext(
        message="عايز مقاس 42 لون اسود",
        thread_id="t1",
        company_id="c1",
        customer_id="cust1",
        channel="facebook",
        final_reply="كوتشي Luma مقاس 42 أسود متوفر وجاهز للشحن.",
        session_state={
            "sent_image_urls": [
                "https://mokhtarelhenawy.online/uploads/products/luma-main.jpg",
                "https://mokhtarelhenawy.online/uploads/products/luma-side.jpg",
            ]
        },
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

    # No duplicates should be attached because images were already sent in previous turn
    assert len(ctx.response_attachments) == 0


@pytest.mark.asyncio
async def test_attachment_hook_allows_resending_when_user_explicitly_requests():
    """If customer explicitly asks for photos again ('صور', 'وريني'), allow sending even if sent before."""
    hook = AttachmentHook()
    ctx = PipelineContext(
        message="ممكن اشوف صور Luma تاني؟",
        thread_id="t1",
        company_id="c1",
        customer_id="cust1",
        channel="facebook",
        final_reply="اتفضل يا فندم صور كوتشي Luma مرة تانية.",
        session_state={
            "sent_image_urls": [
                "https://mokhtarelhenawy.online/uploads/products/luma-main.jpg",
            ]
        },
        tool_evidence=[
            {
                "tool": "product_search",
                "result": {
                    "results": [
                        {
                            "name": "Luma",
                            "images": ["/uploads/products/luma-main.jpg"],
                        }
                    ]
                },
            }
        ],
    )
    await hook.before_reply(ctx, [])

    # Explicit request allows re-sending
    assert len(ctx.response_attachments) == 1
    assert "luma-main.jpg" in ctx.response_attachments[0]["url"]


@pytest.mark.asyncio
async def test_attachment_hook_strict_matching_prevents_unrequested_models():
    """Generic words like 'كوتشي' or 'مريح' must not attach unrelated models from search results."""
    hook = AttachmentHook()
    ctx = PipelineContext(
        message="عايز كوتشي اسكوتش",
        thread_id="t1",
        company_id="c1",
        customer_id="cust1",
        channel="facebook",
        final_reply="كوتشي اسكوتش متاح يا فندم بسعر 450 جنيه.",
        session_state={},
        tool_evidence=[
            {
                "tool": "product_search",
                "result": {
                    "results": [
                        {
                            "name": "كوتشي اسكوتش طبي كاجوال",
                            "images": ["/uploads/products/scotch-1.jpg"],
                        },
                        {
                            "name": "كوتشي جلد فلات طبي مريح",
                            "images": ["/uploads/products/unrelated-flat.jpg"],
                        },
                    ]
                },
            }
        ],
    )
    await hook.before_reply(ctx, [])

    # Only scotch-1 should be attached, unrelated-flat must NOT be attached!
    assert len(ctx.response_attachments) == 1
    assert "scotch-1.jpg" in ctx.response_attachments[0]["url"]
    assert not any("unrelated-flat.jpg" in a["url"] for a in ctx.response_attachments)
    # Also verify session_state was updated with the sent URL
    assert any("scotch-1.jpg" in u for u in ctx.session_state.get("sent_image_urls", []))


@pytest.mark.asyncio
async def test_attachment_hook_no_attachments_when_reply_does_not_mention_product():
    """If search returns products but agent reply is a general greeting, do not attach images."""
    hook = AttachmentHook()
    ctx = PipelineContext(
        message="السلام عليكم",
        thread_id="t1",
        company_id="c1",
        customer_id="cust1",
        channel="facebook",
        final_reply="وعليكم السلام يا فندم! أهلاً بحضرتك في متجرنا، إزاي أقدر أساعدك؟",
        session_state={},
        tool_evidence=[
            {
                "tool": "product_search",
                "result": {
                    "results": [
                        {
                            "name": "كوتشي سبيدر رياضي",
                            "images": ["/uploads/products/spider.jpg"],
                        }
                    ]
                },
            }
        ],
    )
    await hook.before_reply(ctx, [])

    # Agent reply didn't mention spider, so nothing should be attached
    assert len(ctx.response_attachments) == 0

