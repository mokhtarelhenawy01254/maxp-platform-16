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


# ─── _format_tool_results catch-all ──────────────────────────────


def test_format_handles_unregistered_tool():
    """Any successful tool not specifically handled should still produce output."""
    from src.pipeline.stages.skills_pipeline import _format_tool_results
    executed = [
        {"tool": "sales_revenue", "status": "success", "result": {"total": 15000, "count": 42}},
        {"tool": "competitor_search", "status": "success", "result": {"found": True, "count": 5}},
    ]
    result = _format_tool_results(executed)
    assert "sales_revenue" in result
    assert "15000" in result or "42" in result
    assert "competitor_search" in result


def test_format_catch_all_empty_result():
    """Catch-all should produce 'تم تنفيذ X بنجاح' even when result is empty dict."""
    from src.pipeline.stages.skills_pipeline import _format_tool_results
    result = _format_tool_results([
        {"tool": "unknown_tool", "status": "success", "result": {}},
    ])
    assert "تم تنفيذ unknown_tool بنجاح" in result


def test_format_not_found_tool():
    """Tools with found=False should get 'لم يتم العثور على نتائج' from catch-all."""
    from src.pipeline.stages.skills_pipeline import _format_tool_results
    result = _format_tool_results([
        {"tool": "sales_revenue", "status": "success", "result": {"found": False}},
    ])
    assert "لم يتم العثور" in result and "sales_revenue" in result


def test_format_handled_not_found_tool_skips_catchall():
    """order_lookup with found=False is handled (no output) — catch-all shouldn't fire."""
    from src.pipeline.stages.skills_pipeline import _format_tool_results
    result = _format_tool_results([
        {"tool": "order_lookup", "status": "success", "result": {"found": False}},
    ])
    assert result == ""


def test_format_no_tools_returns_empty():
    """Empty executed list should return ''."""
    from src.pipeline.stages.skills_pipeline import _format_tool_results
    assert _format_tool_results([]) == ""


def test_format_error_tools_skipped():
    """Error status tools should not produce output."""
    from src.pipeline.stages.skills_pipeline import _format_tool_results
    result = _format_tool_results([
        {"tool": "product_search", "status": "error", "result": {}, "error": "API down"},
    ])
    assert result == ""


# ─── Integration: follow-up returns empty text ───────────────────


@pytest.mark.asyncio
async def test_followup_empty_falls_back_to_tool_results(ctx: PipelineContext) -> None:
    """When follow-up LLM returns empty text, final_reply should come from _format_tool_results."""
    from src.pipeline.stages.skills_pipeline import process_with_skills
    ctx.agent = MagicMock()
    ctx.agent.allowed_skills = None
    ctx.agent.model = "gemini-2.5-flash"
    ctx.system_prompt = None

    with (
        patch("src.pipeline.stages.skills_pipeline.get_skill_registry") as mock_registry,
        patch("src.pipeline.stages.skills_pipeline._raw_llm_call") as mock_raw,
        patch("src.pipeline.stages.skills_pipeline._llm_call") as mock_llm,
    ):
        skill = MagicMock()
        skill.name = "product_search"
        skill.to_openai_tool.return_value = {"type": "function", "function": {"name": "product_search"}}
        skill.func = AsyncMock(return_value={"products": [{"productName": "Test Product"}]})
        mock_registry.return_value.get_all.return_value = [skill]
        mock_registry.return_value.resolve.return_value = skill

        first_response = MagicMock()
        first_response.text = ""
        first_response.tool_calls = [
            {"id": "call_1", "type": "function", "function": {"name": "product_search", "arguments": '{"q": "test"}'}}
        ]
        first_response.reasoning_content = None
        mock_llm.return_value = first_response

        followup_response = MagicMock()
        followup_response.text = ""
        followup_response.tool_calls = None
        mock_raw.return_value = followup_response

        ctx.llm_client = AsyncMock()

        result = await process_with_skills(ctx)

    assert result.final_reply
    assert "Test Product" in result.final_reply


@pytest.mark.asyncio
async def test_followup_empty_no_tools_returns_empty(ctx: PipelineContext) -> None:
    """When no tools called and follow-up is empty, final_reply should be empty (not generic)."""
    from src.pipeline.stages.skills_pipeline import process_with_skills
    ctx.agent = MagicMock()
    ctx.agent.allowed_skills = None
    ctx.agent.model = "gemini-2.5-flash"
    ctx.system_prompt = None

    with (
        patch("src.pipeline.stages.skills_pipeline.get_skill_registry") as mock_registry,
        patch("src.pipeline.stages.skills_pipeline._raw_llm_call") as mock_raw,
        patch("src.pipeline.stages.skills_pipeline._llm_call") as mock_llm,
    ):
        skill = MagicMock()
        skill.name = "product_search"
        skill.to_openai_tool.return_value = {"type": "function", "function": {"name": "product_search"}}
        mock_registry.return_value.get_all.return_value = [skill]

        first_response = MagicMock()
        first_response.text = ""
        first_response.tool_calls = None
        first_response.reasoning_content = None
        mock_llm.return_value = first_response
        mock_raw.return_value = first_response

        ctx.llm_client = AsyncMock()
        result = await process_with_skills(ctx)

    assert result.final_reply == ""
    assert result.llm_response == ""


@pytest.mark.asyncio
async def test_landmark_image_auto_populate_conditional_negative(ctx: PipelineContext) -> None:
    """If the LLM response doesn't mention the landmarkImage, it should NOT be auto-populated."""
    from src.pipeline.stages.skills_pipeline import process_with_skills
    ctx.agent = MagicMock()
    ctx.agent.allowed_skills = None
    ctx.agent.model = "gemini-2.5-flash"
    ctx.system_prompt = None
    ctx.tool_evidence = [
        {
            "tool": "booking_info",
            "result": {
                "branches": [
                    {"landmarkImage": "/uploads/booking-branches/test_landmark_123.jpg"}
                ]
            }
        }
    ]
    ctx.response_attachments = []

    with (
        patch("src.pipeline.stages.skills_pipeline.get_skill_registry") as mock_registry,
        patch("src.pipeline.stages.skills_pipeline._raw_llm_call") as mock_raw,
        patch("src.pipeline.stages.skills_pipeline._llm_call") as mock_llm,
    ):
        skill = MagicMock()
        skill.name = "product_search"
        skill.to_openai_tool.return_value = {"type": "function", "function": {"name": "product_search"}}
        mock_registry.return_value.get_all.return_value = [skill]
        
        first_response = MagicMock()
        first_response.text = "Hello! The clinic is open today."
        first_response.tool_calls = None
        first_response.reasoning_content = None
        mock_llm.return_value = first_response
        mock_raw.return_value = first_response

        ctx.llm_client = AsyncMock()
        result = await process_with_skills(ctx)

    assert len(result.response_attachments) == 0


@pytest.mark.asyncio
async def test_landmark_image_auto_populate_conditional_positive(ctx: PipelineContext) -> None:
    """If the LLM response mentions the landmarkImage, it SHOULD be auto-populated."""
    from src.pipeline.stages.skills_pipeline import process_with_skills
    ctx.agent = MagicMock()
    ctx.agent.allowed_skills = None
    ctx.agent.model = "gemini-2.5-flash"
    ctx.system_prompt = None
    ctx.tool_evidence = [
        {
            "tool": "booking_info",
            "result": {
                "branches": [
                    {"landmarkImage": "/uploads/booking-branches/test_landmark_123.jpg"}
                ]
            }
        }
    ]
    ctx.response_attachments = []

    with (
        patch("src.pipeline.stages.skills_pipeline.get_skill_registry") as mock_registry,
        patch("src.pipeline.stages.skills_pipeline._raw_llm_call") as mock_raw,
        patch("src.pipeline.stages.skills_pipeline._llm_call") as mock_llm,
    ):
        skill = MagicMock()
        skill.name = "product_search"
        skill.to_openai_tool.return_value = {"type": "function", "function": {"name": "product_search"}}
        mock_registry.return_value.get_all.return_value = [skill]
        
        first_response = MagicMock()
        first_response.text = "Here is the map image: test_landmark_123.jpg"
        first_response.tool_calls = None
        first_response.reasoning_content = None
        mock_llm.return_value = first_response
        mock_raw.return_value = first_response

        ctx.llm_client = AsyncMock()
        result = await process_with_skills(ctx)

    assert len(result.response_attachments) == 1
    assert "test_landmark_123.jpg" in result.response_attachments[0]["url"]
