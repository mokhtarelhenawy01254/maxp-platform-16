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


# ─── evidence digest + LLM fallback synthesis (2026 law) ─────────


def test_evidence_digest_lists_tools_and_awaiting():
    from src.pipeline.stages.skills_pipeline import _build_evidence_digest

    digest = _build_evidence_digest([
        {"tool": "order_recent_list", "status": "success", "result": {"count": 50}},
        {"tool": "conversion_tool_toggle", "status": "awaiting_approval", "result": {"status": "awaiting_approval"}},
        {"tool": "product_search", "status": "error", "error": "timeout"},
    ])
    assert "order_recent_list" in digest and "50" in digest
    assert "بانتظار موافقة" in digest
    assert "timeout" in digest


def test_evidence_digest_empty_executed():
    from src.pipeline.stages.skills_pipeline import _build_evidence_digest

    assert "لم تُنفَّذ" in _build_evidence_digest([])


@pytest.mark.asyncio
async def test_synthesize_fallback_returns_llm_voice(ctx: PipelineContext) -> None:
    from unittest.mock import AsyncMock, patch

    from src.pipeline.stages.skills_pipeline import _synthesize_fallback_reply

    ctx.message = "كام أوردر دخل؟"
    ctx.agent = None
    with patch("src.pipeline.stages.skills_pipeline._raw_llm_call") as mock_raw:
        mock_raw.return_value = MagicMock(text="عندك 50 أوردر آخر يومين يا فندم.")
        reply = await _synthesize_fallback_reply(ctx, [
            {"tool": "order_recent_list", "status": "success", "result": {"count": 50}},
        ])
    assert reply == "عندك 50 أوردر آخر يومين يا فندم."
    # evidence reached the model
    sent = mock_raw.call_args.args[1][-1]["content"]
    assert "order_recent_list" in sent and "50" in sent


@pytest.mark.asyncio
async def test_synthesize_fallback_neutral_line_when_llm_dead(ctx: PipelineContext) -> None:
    from unittest.mock import AsyncMock, patch

    from src.pipeline.stages.skills_pipeline import _FALLBACK_NEUTRAL_LINE, _synthesize_fallback_reply

    ctx.message = "وريني المنتجات"
    ctx.agent = None
    with patch("src.pipeline.stages.skills_pipeline._raw_llm_call", side_effect=RuntimeError("provider down")):
        reply = await _synthesize_fallback_reply(ctx, [])
    assert reply == _FALLBACK_NEUTRAL_LINE
    assert "😊" not in reply


def test_no_hardcoded_fallback_templates_remain():
    """Radar-skill law: customer replies must be LLM-generated, never templates."""
    import pathlib

    source = (
        pathlib.Path(__file__).resolve().parents[2]
        / "src" / "pipeline" / "stages" / "skills_pipeline.py"
    ).read_text(encoding="utf-8")
    assert "_format_fallback_reply" not in source
    assert "_format_tool_results" not in source
    assert "راجعتلك الطلب رقم" not in source
    assert "😉" not in source and "😊" not in source


# ─── Integration: follow-up returns empty text ───────────────────


@pytest.mark.asyncio
async def test_followup_empty_falls_back_to_llm_synthesis(ctx: PipelineContext) -> None:
    """When follow-up LLM returns empty text, final_reply comes from the
    evidence-grounded synthesis call (never hardcoded templates)."""
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
        synthesized = MagicMock()
        synthesized.text = "لقيت المنتج اللي بتدور عليه: Test Product متاح."
        # 1st: followup empty → 2nd: stripped retry empty → 3rd: synthesis
        mock_raw.side_effect = [followup_response, followup_response, synthesized]

        ctx.llm_client = AsyncMock()

        result = await process_with_skills(ctx)

    assert result.final_reply == "لقيت المنتج اللي بتدور عليه: Test Product متاح."


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
    """If the LLM response doesn't mention the landmarkImage (and there are
    multiple branches, so the single-branch always-show heuristic doesn't
    apply), it should NOT be auto-populated."""
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
                    {"name": "Maadi Branch", "landmarkImage": "/uploads/booking-branches/test_landmark_123.jpg"},
                    {"name": "Nasr City Branch", "landmarkImage": "/uploads/booking-branches/test_landmark_456.jpg"},
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


@pytest.mark.asyncio
async def test_execute_one_tool_validation_error(ctx: PipelineContext) -> None:
    from src.pipeline.stages.skills_pipeline import _execute_one_tool
    from pydantic import BaseModel, Field

    class DummyInput(BaseModel):
        required_field: str = Field(..., description="A required parameter")

    mock_tool = MagicMock()
    mock_tool.input_model = DummyInput
    mock_tool.func = AsyncMock()

    mock_registry = MagicMock()
    mock_registry.resolve.return_value = mock_tool

    tc = {
        "function": {
            "name": "dummy_tool",
            "arguments": "{}"  # Missing required_field
        }
    }

    res = await _execute_one_tool(ctx, mock_registry, tc)
    assert res["status"] == "error"
    assert "Validation failed" in res["error"]
    assert "required_field" in res["error"]
    assert "Field required" in res["error"]

