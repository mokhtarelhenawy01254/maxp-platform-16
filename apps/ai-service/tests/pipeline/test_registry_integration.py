from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.pipeline.context import PipelineContext


@pytest.fixture
def ctx() -> PipelineContext:
    return PipelineContext(
        message="search for product",
        thread_id="test-thread",
        company_id="test-company",
        customer_id="test-customer",
    )


@pytest.mark.asyncio
async def test_execute_one_resolves_from_skill_registry(ctx: PipelineContext) -> None:
    """Tool in SkillRegistry is found and executed; no ALL_TOOLS fallback."""
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
        from agent_framework import FunctionTool
        from pydantic import BaseModel
        class _Input(BaseModel):
            q: str | None = None
        async def _handler(input_data: _Input) -> dict:
            return {"products": [{"productName": "Widget"}]}
        tool = FunctionTool(name="product_search", description="Search products", func=_handler, input_model=_Input)
        mock_registry.return_value.get_all.return_value = [tool]
        mock_registry.return_value.resolve.return_value = tool

        first_response = MagicMock()
        first_response.text = ""
        first_response.tool_calls = [
            {"id": "call_1", "type": "function", "function": {"name": "product_search", "arguments": '{"q": "widget"}'}}
        ]
        first_response.reasoning_content = None
        mock_llm.return_value = first_response

        followup_response = MagicMock()
        followup_response.text = "Here are the results."
        followup_response.tool_calls = None
        mock_raw.return_value = followup_response

        ctx.llm_client = AsyncMock()

        result = await process_with_skills(ctx)

    assert result.final_reply == "Here are the results."
    assert len(result.executed_tools) == 1
    assert result.executed_tools[0]["tool"] == "product_search"
    assert result.executed_tools[0]["status"] == "success"


@pytest.mark.asyncio
async def test_execute_one_unknown_tool_returns_unknown_status(ctx: PipelineContext) -> None:
    """Tool NOT in SkillRegistry returns 'unknown' status — no silent failure."""
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
        mock_registry.return_value.resolve.return_value = None

        first_response = MagicMock()
        first_response.text = ""
        first_response.tool_calls = [
            {"id": "call_1", "type": "function", "function": {"name": "nonexistent_tool", "arguments": "{}"}}
        ]
        first_response.reasoning_content = None
        mock_llm.return_value = first_response

        followup_response = MagicMock()
        followup_response.text = "Done."
        followup_response.tool_calls = None
        mock_raw.return_value = followup_response

        ctx.llm_client = AsyncMock()

        result = await process_with_skills(ctx)

    assert len(result.executed_tools) == 1
    assert result.executed_tools[0]["status"] == "unknown"
    assert result.executed_tools[0]["tool"] == "nonexistent_tool"


@pytest.mark.asyncio
async def test_execute_one_no_fallback_to_all_tools(ctx: PipelineContext) -> None:
    """_execute_one must NOT fall back to ALL_TOOLS — only SkillRegistry.resolve()."""
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
        first_response.tool_calls = [
            {"id": "call_1", "type": "function", "function": {"name": "product_search", "arguments": '{"q": "test"}'}}
        ]
        first_response.reasoning_content = None
        mock_llm.return_value = first_response

        followup_response = MagicMock()
        followup_response.text = "Result."
        followup_response.tool_calls = None
        mock_raw.return_value = followup_response

        ctx.llm_client = AsyncMock()

        result = await process_with_skills(ctx)

    assert result.final_reply == "Result."


@pytest.mark.asyncio
async def test_build_tool_dicts_uses_skill_registry(ctx: PipelineContext) -> None:
    """_build_tool_dicts must resolve tools via SkillRegistry, not ALL_TOOLS."""
    from src.pipeline.stages.skills_pipeline import _build_skill_tool_dicts
    ctx.agent = MagicMock()
    ctx.agent.allowed_tools = ["product_search", "order_lookup"]

    with patch("src.pipeline.stages.skills_pipeline.get_skill_registry") as mock_registry:
        tool_a = MagicMock()
        tool_a.name = "product_search"
        tool_a.to_json_schema_spec.return_value = {"type": "function", "function": {"name": "product_search"}}
        tool_b = MagicMock()
        tool_b.name = "order_lookup"
        tool_b.to_json_schema_spec.return_value = {"type": "function", "function": {"name": "order_lookup"}}

        def resolve_side_effect(name: str):
            mapping = {"product_search": tool_a, "order_lookup": tool_b}
            return mapping.get(name)
        mock_registry.return_value.resolve = resolve_side_effect

        tool_dicts = _build_skill_tool_dicts([], ctx)

    assert len(tool_dicts) == 2
    names = [d["function"]["name"] for d in tool_dicts]
    assert "product_search" in names
    assert "order_lookup" in names


@pytest.mark.asyncio
async def test_llm_call_appends_allowed_tools_via_registry(ctx: PipelineContext) -> None:
    """_llm_call must use registry.resolve() for agent allowed_tools, not ALL_TOOLS."""
    from src.pipeline.stages.skills_pipeline import _llm_call
    ctx.agent = MagicMock()
    ctx.agent.model = "gemini-2.5-flash"
    ctx.agent.allowed_tools = ["product_search"]
    ctx.agent.allowed_skills = None
    ctx.agent.config.tool_choice = None
    ctx.llm_client = AsyncMock()
    ctx.llm_client.generate = AsyncMock()
    ctx.llm_client.model = "gemini-2.5-flash"
    ctx.llm_client.provider = "GOOGLE"
    ctx.message = "test"
    ctx.attachments = []
    ctx.external_memory_context = {}

    with patch("src.pipeline.stages.skills_pipeline.get_skill_registry") as mock_registry:
        tool = MagicMock()
        tool.name = "product_search"
        tool.to_json_schema_spec.return_value = {"type": "function", "function": {"name": "product_search"}}
        mock_registry.return_value.resolve.return_value = tool

        result = await _llm_call(ctx, "system prompt", [])

    assert result is not None
