from __future__ import annotations

import pytest

from src.skills.validation import validate_allowed_tools, validate_skill_config


def test_validate_allowed_tools_empty():
    """Empty tool list is always valid."""
    errors = validate_allowed_tools("test-skill", [])
    assert errors == []


def test_validate_allowed_tools_known_tool():
    """A tool that exists in the registry should produce no errors."""
    errors = validate_allowed_tools("test-skill", ["product.search"])
    assert errors == []


def test_validate_allowed_tools_known_canonical():
    """Canonical tool names (underscore) should also validate OK."""
    errors = validate_allowed_tools("test-skill", ["product_search"])
    assert errors == []


def test_validate_allowed_tools_unknown_rejected():
    """A tool name that doesn't exist should produce an error."""
    errors = validate_allowed_tools("test-skill", ["nonexistent.tool"])
    assert len(errors) == 1
    assert "nonexistent.tool" in errors[0]
    assert "not found in tool registry" in errors[0]


def test_validate_allowed_tools_mixed():
    """Mix of valid and invalid tools — only the invalid ones produce errors."""
    errors = validate_allowed_tools("test-skill", ["product.search", "fake.tool", "inventory_check"])
    assert len(errors) == 1
    assert "fake.tool" in errors[0]


def test_validate_allowed_tools_multiple_bad():
    """Multiple invalid tools all reported."""
    errors = validate_allowed_tools("test-skill", ["a.bad", "also.bad"])
    assert len(errors) == 2


def test_validate_allowed_tools_skill_id_in_error():
    """Error messages include the skill ID."""
    errors = validate_allowed_tools("my-skill-123", ["fake.tool"])
    assert len(errors) == 1
    assert "my-skill-123" in errors[0]


def test_validate_skill_config_empty():
    """Empty config without any fields produces no errors."""
    errors, warnings = validate_skill_config({})
    assert errors == []
    assert warnings == []


def test_validate_skill_config_valid():
    """Valid skill config produces no errors or warnings."""
    config = {
        "id": "test-skill",
        "allowedTools": ["product.search", "inventory.check"],
        "maxToolCount": 3,
    }
    errors, warnings = validate_skill_config(config)
    assert errors == []
    assert warnings == []


def test_validate_skill_config_bad_tool():
    """Config with invalid tools produces errors, not warnings."""
    config = {
        "id": "test-skill",
        "allowedTools": ["fake.tool"],
    }
    errors, warnings = validate_skill_config(config)
    assert len(errors) == 1
    assert warnings == []


def test_validate_skill_config_negative_max():
    """Negative max_tool_count produces a warning."""
    config = {
        "id": "test-skill",
        "allowedTools": ["product.search"],
        "maxToolCount": -1,
    }
    errors, warnings = validate_skill_config(config)
    assert errors == []
    assert len(warnings) == 1
    assert "negative" in warnings[0]


def test_validate_skill_config_bad_max_type():
    """Non-integer max_tool_count produces a warning."""
    config = {
        "id": "test-skill",
        "allowedTools": ["product.search"],
        "maxToolCount": "many",
    }
    errors, warnings = validate_skill_config(config)
    assert errors == []
    assert len(warnings) == 1
    assert "not a valid integer" in warnings[0]


def test_validate_allowed_tools_handles_dot_notation():
    """Dot-notation tool names are canonicalized and validated."""
    errors = validate_allowed_tools("test-skill", ["order.lookup", "order.create_draft"])
    assert errors == []
