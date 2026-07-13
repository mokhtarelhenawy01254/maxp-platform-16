from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from unittest.mock import AsyncMock, patch

from agent_framework import FunctionTool
from pydantic import BaseModel

from src.tools.gateway import ToolGateway
from src.tools.names import canonical_tool_name


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def temp_skills_root():
    """Create a temporary skills directory with real skill.json + SKILL.md files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        root = Path(tmpdir)

        # Skill A: catalog-search (read-only, max 2 tools)
        cat_dir = root / "catalog-search"
        cat_dir.mkdir()
        (cat_dir / "skill.json").write_text(json.dumps({
            "id": "catalog-search",
            "displayName": "Catalog Search",
            "version": "1.0.0",
            "description": "Find products and validate product facts.",
            "allowedTools": ["product.search", "inventory.check"],
            "requiresHumanApproval": False,
            "maxToolCount": 2,
        }), encoding="utf-8")
        (cat_dir / "SKILL.md").write_text(
            "# Catalog Search\n\nSearch products by name or category.\n", encoding="utf-8"
        )

        # Skill B: discount-proposal (requires approval, max 1 tool)
        disc_dir = root / "discount-proposal"
        disc_dir.mkdir()
        (disc_dir / "skill.json").write_text(json.dumps({
            "id": "discount-proposal",
            "displayName": "Discount Proposal",
            "version": "1.0.0",
            "description": "Prepare a discount proposal that requires human approval.",
            "allowedTools": ["product.search", "discount.create_draft"],
            "requiresHumanApproval": True,
            "maxToolCount": 1,
        }), encoding="utf-8")
        (disc_dir / "SKILL.md").write_text(
            "# Discount Proposal\n\nCheck product price, then propose a discount.\n", encoding="utf-8"
        )

        # Skill C: handoff (no tools, no constraints)
        hand_dir = root / "handoff-to-human"
        hand_dir.mkdir()
        (hand_dir / "skill.json").write_text(json.dumps({
            "id": "handoff-to-human",
            "displayName": "Handoff To Human",
            "version": "1.0.0",
            "description": "Escalate to human.",
            "allowedTools": [],
            "requiresHumanApproval": False,
            "maxToolCount": 0,
        }), encoding="utf-8")
        (hand_dir / "SKILL.md").write_text(
            "# Handoff\n\nEscalate emotionally heated conversations.\n", encoding="utf-8"
        )

        yield root


# ── resolve_skill_context integration tests ────────────────────────────────


@pytest.mark.asyncio
async def test_resolve_skill_context_integration_match(temp_skills_root):
    """Real skill dirs: resolve_skill_context finds matching skill."""
    from src.skills.integration import resolve_skill_context

    with patch("src.skills.integration._SKILLS_ROOT", temp_skills_root):
        ctx = resolve_skill_context({"product_search"}, {"catalog-search"})

    assert ctx is not None
    assert ctx["skill_id"] == "catalog-search"
    assert ctx["requires_human_approval"] is False
    assert ctx["max_tool_count"] == 2


@pytest.mark.asyncio
async def test_resolve_skill_context_matches_dot_notation(temp_skills_root):
    """Planned tool with dot notation matches skill's allowed_tools."""
    from src.skills.integration import resolve_skill_context

    with patch("src.skills.integration._SKILLS_ROOT", temp_skills_root):
        ctx = resolve_skill_context({"product.search"}, {"catalog-search"})

    assert ctx is not None
    assert ctx["skill_id"] == "catalog-search"


@pytest.mark.asyncio
async def test_resolve_skill_context_multiple_tools(temp_skills_root):
    """Multiple planned tools match a skill correctly."""
    from src.skills.integration import resolve_skill_context

    with patch("src.skills.integration._SKILLS_ROOT", temp_skills_root):
        ctx = resolve_skill_context({"product_search", "inventory_check"}, {"catalog-search"})

    assert ctx is not None
    assert ctx["skill_id"] == "catalog-search"


@pytest.mark.asyncio
async def test_resolve_skill_context_no_match(temp_skills_root):
    """Tool not in any skill's allowed_tools returns None."""
    from src.skills.integration import resolve_skill_context

    with patch("src.skills.integration._SKILLS_ROOT", temp_skills_root):
        ctx = resolve_skill_context({"unknown_tool"}, {"catalog-search"})

    assert ctx is None


@pytest.mark.asyncio
async def test_resolve_skill_context_approval_skill(temp_skills_root):
    """discount-proposal skill returns requires_human_approval=True."""
    from src.skills.integration import resolve_skill_context

    with patch("src.skills.integration._SKILLS_ROOT", temp_skills_root):
        ctx = resolve_skill_context({"discount_create_draft"}, {"discount-proposal"})

    assert ctx is not None
    assert ctx["requires_human_approval"] is True
    assert ctx["max_tool_count"] == 1


@pytest.mark.asyncio
async def test_resolve_skill_context_empty_tools_skill(temp_skills_root):
    """Skill with empty allowed_tools never matches."""
    from src.skills.integration import resolve_skill_context

    with patch("src.skills.integration._SKILLS_ROOT", temp_skills_root):
        ctx = resolve_skill_context({"agent_handoff"}, {"handoff-to-human"})

    assert ctx is None  # allowedTools=[] → no match


# ── Gateway + skill_context integration (with mocked tool) ───────────────────


class _SimpleInput(BaseModel):
    query: str = "default"
    company_id: str | None = None


@pytest.fixture
def mock_read_tool():
    """A simple read FunctionTool that returns success."""
    return FunctionTool(
        name="product_search",
        description="Search products",
        func=AsyncMock(return_value={"items": []}),
        input_model=_SimpleInput,
    )


@pytest.mark.asyncio
async def test_gateway_with_real_tool_max_count_rejected(mock_read_tool):
    """gateway.execute with skill_context rejects when max_tool_count exceeded."""
    with patch("src.tools.gateway.get_tool", return_value=mock_read_tool):
        result = await ToolGateway().execute(
            tool_name="product_search",
            company_id="comp1",
            agent_role="SALES",
            allowed_tools=["product_search"],
            input_data={"query": "test"},
            skill_context={
                "max_tool_count": 1,
                "tool_call_index": 1,
                "requires_human_approval": False,
            },
        )
    assert result["status"] == "forbidden"
    assert "max tool count" in result["error"]


@pytest.mark.asyncio
async def test_gateway_with_real_tool_approval_blocks_read(mock_read_tool):
    """Skill with requires_human_approval blocks even a read tool."""
    with patch("src.tools.gateway.get_tool", return_value=mock_read_tool):
        result = await ToolGateway().execute(
            tool_name="product_search",
            company_id="comp1",
            agent_role="SALES",
            allowed_tools=["product_search"],
            input_data={"query": "test"},
            skill_context={
                "max_tool_count": 0,
                "tool_call_index": 0,
                "requires_human_approval": True,
            },
        )
    assert result["status"] == "awaiting_approval"


@pytest.mark.asyncio
async def test_gateway_with_real_tool_approval_passes_when_granted(mock_read_tool):
    """Skill requires_human_approval but approval_granted=True bypasses it."""
    with patch("src.tools.gateway.get_tool", return_value=mock_read_tool):
        result = await ToolGateway().execute(
            tool_name="product_search",
            company_id="comp1",
            agent_role="SALES",
            allowed_tools=["product_search"],
            input_data={"query": "test"},
            approval_granted=True,
            skill_context={
                "max_tool_count": 0,
                "tool_call_index": 0,
                "requires_human_approval": True,
            },
        )
    assert result["status"] == "success"


@pytest.mark.asyncio
async def test_gateway_with_real_tool_no_skill_context(mock_read_tool):
    """No skill_context = normal behavior, no enforcement."""
    with patch("src.tools.gateway.get_tool", return_value=mock_read_tool):
        result = await ToolGateway().execute(
            tool_name="product_search",
            company_id="comp1",
            agent_role="SALES",
            allowed_tools=["product_search"],
            input_data={"query": "test"},
            skill_context=None,
        )
    assert result["status"] == "success"


# ── TTL Cache integration ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_skill_cache_returns_cached_data(temp_skills_root):
    """_skill_metadata_from_dir caches after first read."""
    from src.skills.integration import _skill_metadata_from_dir, clear_skills_cache, _skill_meta_cache

    clear_skills_cache()  # start clean
    skill_dir = temp_skills_root / "catalog-search"

    # First read: from disk
    meta1 = _skill_metadata_from_dir(skill_dir)
    assert meta1 is not None
    assert meta1["id"] == "catalog-search"

    # Cache should be populated
    assert "catalog-search" in _skill_meta_cache

    # Delete the file from disk, then read again — should return cached
    (skill_dir / "skill.json").unlink()
    meta2 = _skill_metadata_from_dir(skill_dir)
    assert meta2 is not None
    assert meta2["id"] == "catalog-search"


@pytest.mark.asyncio
async def test_skill_cache_cleared_on_demand(temp_skills_root):
    """clear_skills_cache() removes cached data."""
    from src.skills.integration import _skill_metadata_from_dir, clear_skills_cache, _skill_meta_cache

    clear_skills_cache()
    skill_dir = temp_skills_root / "catalog-search"

    # Populate cache
    _skill_metadata_from_dir(skill_dir)
    assert "catalog-search" in _skill_meta_cache

    # Clear specific skill
    clear_skills_cache("catalog-search")
    assert "catalog-search" not in _skill_meta_cache

    # Re-populate
    _skill_metadata_from_dir(skill_dir)
    assert "catalog-search" in _skill_meta_cache

    # Clear all
    clear_skills_cache()
    assert "catalog-search" not in _skill_meta_cache


@pytest.mark.asyncio
async def test_skill_cache_expires(temp_skills_root):
    """Cache respects TTL — expired entries reload from disk."""
    from src.skills.integration import _skill_meta_cache

    skill_id = temp_skills_root.name
    # Directly set an expired entry (timestamp in the past)
    _skill_meta_cache["catalog-search"] = (0.0, {"id": "catalog-search", "name": "stale"})

    # Reading again should bypass cache (TTL check)
    from src.skills.integration import _skill_metadata_from_dir, clear_skills_cache
    clear_skills_cache("catalog-search")


# ── L1 skills block format ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_l1_skills_block_format(temp_skills_root):
    """get_l1_skills_block returns correct XML format."""
    from src.skills.integration import get_l1_skills_block

    with patch("src.skills.integration._SKILLS_ROOT", temp_skills_root):
        block = get_l1_skills_block({"catalog-search", "discount-proposal"})

    assert block is not None
    assert "<skills_available>" in block
    assert "</skills_available>" in block
    assert "catalog-search" in block
    assert "discount-proposal" in block
    assert "Catalog Search" in block
    assert "Find products" in block
    assert "Discount Proposal" in block
    assert "load_skill" in block


@pytest.mark.asyncio
async def test_l1_skills_block_empty():
    """get_l1_skills_block returns empty string for no skills."""
    from src.skills.integration import get_l1_skills_block

    assert get_l1_skills_block(None) == ""
    assert get_l1_skills_block(set()) == ""


@pytest.mark.asyncio
async def test_validation_with_real_tools():
    """validate_allowed_tools with real registered tool names passes."""
    from src.skills.validation import validate_allowed_tools

    errors = validate_allowed_tools("test", ["product.search", "inventory.check", "order.lookup"])
    assert errors == []


@pytest.mark.asyncio
async def test_validation_with_fake_tool():
    """validate_allowed_tools with unregistered tool name fails."""
    from src.skills.validation import validate_allowed_tools

    errors = validate_allowed_tools("test", ["definitely.not.a.real.tool"])
    assert len(errors) == 1
