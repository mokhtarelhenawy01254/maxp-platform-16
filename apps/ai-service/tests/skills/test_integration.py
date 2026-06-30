from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from src.skills.integration import resolve_skill_context


def test_resolve_skill_context_no_planned_tools():
    """No planned tools → no context."""
    assert resolve_skill_context(set(), {"catalog-search"}) is None


def test_resolve_skill_context_no_allowed_skills():
    """No allowed skills → no context."""
    assert resolve_skill_context({"product_search"}, set()) is None


def test_resolve_skill_context_match():
    """Tool matching a skill's allowed_tools returns the skill's constraints."""
    with (
        patch("src.skills.integration._get_allowed_skill_dirs") as mock_dirs,
        patch("src.skills.integration._skill_metadata_from_dir") as mock_meta,
    ):
        mock_dirs.return_value = [MagicMock(spec=Path)]
        mock_meta.return_value = {
            "id": "catalog-search",
            "allowed_tools": ["product_search", "inventory_check"],
            "requires_human_approval": False,
            "max_tool_count": 2,
        }
        ctx = resolve_skill_context({"product_search"}, {"catalog-search"})

    assert ctx is not None
    assert ctx["skill_id"] == "catalog-search"
    assert ctx["requires_human_approval"] is False
    assert ctx["max_tool_count"] == 2


def test_resolve_skill_context_no_match():
    """Planned tools that don't overlap with any skill → no context."""
    with patch("src.skills.integration._get_allowed_skill_dirs", return_value=[]):
        ctx = resolve_skill_context({"some_tool"}, {"some-skill"})
    assert ctx is None


def test_resolve_skill_context_first_match_wins():
    """When multiple skills match, the first one found is returned."""
    mock_dir_a = MagicMock(spec=Path)
    mock_dir_a.is_dir.return_value = True
    mock_dir_a.name = "skill-a"

    mock_dir_b = MagicMock(spec=Path)
    mock_dir_b.is_dir.return_value = True
    mock_dir_b.name = "skill-b"

    with patch("src.skills.integration._get_skill_meta") as mock_get:
        mock_get.side_effect = [
            {
                "id": "skill-a",
                "allowed_tools": ["tool_one"],
                "requires_human_approval": True,
                "max_tool_count": 1,
                "instructions": "",
                "name": "Skill A",
            },
            {
                "id": "skill-b",
                "allowed_tools": ["tool_two"],
                "requires_human_approval": False,
                "max_tool_count": 5,
                "instructions": "",
                "name": "Skill B",
            },
        ]
        ctx = resolve_skill_context({"tool_one"}, {"skill-a", "skill-b"})

    assert ctx is not None
    assert ctx["skill_id"] == "skill-a"
    assert ctx["requires_human_approval"] is True
    assert ctx["max_tool_count"] == 1


def test_clear_skills_cache_clears_all():
    """clear_skills_cache() without skill_id clears everything."""
    from src.skills.integration import clear_skills_cache, _skill_meta_cache, _skill_json_cache, _skill_md_cache

    _skill_meta_cache["x"] = (1.0, {"id": "x"})
    _skill_json_cache["x"] = (1.0, {})
    _skill_md_cache["x"] = (1.0, "# X")
    clear_skills_cache()
    assert _skill_meta_cache == {}
    assert _skill_json_cache == {}
    assert _skill_md_cache == {}


def test_clear_skills_cache_clears_one():
    """clear_skills_cache(skill_id) clears only that skill."""
    from src.skills.integration import clear_skills_cache, _skill_meta_cache, _skill_json_cache, _skill_md_cache

    _skill_meta_cache["a"] = (1.0, {})
    _skill_meta_cache["b"] = (1.0, {})
    _skill_json_cache["a"] = (1.0, {})
    _skill_md_cache["a"] = (1.0, "# A")
    clear_skills_cache("a")
    assert "a" not in _skill_meta_cache
    assert "b" in _skill_meta_cache
    assert "a" not in _skill_json_cache
    assert "a" not in _skill_md_cache


def test_clear_skills_cache_unknown_is_noop():
    """Clearing a non-existent skill doesn't error."""
    from src.skills.integration import clear_skills_cache
    clear_skills_cache("nonexistent")  # should not raise


def test_resolve_skill_context_requires_approval():
    """Skill with requires_human_approval=True passes that through."""
    with patch("src.skills.integration._get_allowed_skill_dirs", return_value=[]):
        pass

    with patch("src.skills.integration._get_skill_meta") as mock_get:
        mock_get.return_value = {
            "id": "approval-skill",
            "name": "Approval Skill",
            "allowed_tools": ["write_tool"],
            "requires_human_approval": True,
            "max_tool_count": 3,
            "instructions": "",
        }
        ctx = resolve_skill_context({"write_tool"}, {"approval-skill"})

    assert ctx is not None
    assert ctx["requires_human_approval"] is True
    assert ctx["max_tool_count"] == 3
