from __future__ import annotations

from typing import Any

import structlog

from src.tools.names import canonical_tool_name

logger = structlog.get_logger(__name__)


def validate_allowed_tools(
    skill_id: str,
    allowed_tools: list[str],
) -> list[str]:
    """Check that every tool in allowed_tools exists in the tool registry.

    Returns a list of error messages (empty = all tools valid).
    """
    errors: list[str] = []
    if not allowed_tools:
        return errors
    # lazy import to avoid circular dep: tools.registry → skills.integration → skills.__init__ → skills.validation
    from src.tools.registry import get_tool as _get_tool
    for raw_name in allowed_tools:
        canonical = canonical_tool_name(raw_name)
        if _get_tool(canonical) is None:
            errors.append(
                f"Skill '{skill_id}': allowed_tool '{raw_name}' "
                f"(canonical: '{canonical}') not found in tool registry"
            )
    return errors


def validate_skill_config(
    skill_data: dict[str, Any],
) -> tuple[list[str], list[str]]:
    """Validate a skill's configuration. Returns (errors, warnings).

    Errors: must-fix problems (invalid tool names).
    Warnings: should-fix (questionable values, missing fields).
    """
    skill_id = skill_data.get("id") or skill_data.get("name") or "unknown"
    errors: list[str] = []
    warnings: list[str] = []

    allowed_tools = skill_data.get("allowed_tools") or skill_data.get("allowedTools") or []
    errors.extend(validate_allowed_tools(skill_id, allowed_tools))

    max_count = skill_data.get("max_tool_count") or skill_data.get("maxToolCount") or 0
    try:
        if int(max_count) < 0:
            warnings.append(
                f"Skill '{skill_id}': max_tool_count is negative ({max_count})"
            )
    except (TypeError, ValueError):
        warnings.append(
            f"Skill '{skill_id}': max_tool_count is not a valid integer ({max_count})"
        )

    return errors, warnings


def log_validation(
    skill_id: str,
    errors: list[str],
    warnings: list[str],
) -> bool:
    """Log validation results. Returns True if no errors."""
    for err in errors:
        logger.error("skill.tool_validation_error", skill_id=skill_id, message=err)
    for warn in warnings:
        logger.warning("skill.tool_validation_warning", skill_id=skill_id, message=warn)
    return len(errors) == 0
