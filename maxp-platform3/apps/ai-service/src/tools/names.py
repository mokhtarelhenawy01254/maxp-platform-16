from __future__ import annotations

from collections.abc import Iterable


def canonical_tool_name(name: str | None) -> str:
    """Return the Python registry name for a tool identifier."""
    return str(name or "").strip().replace(".", "_")


def canonical_tool_set(names: Iterable[str] | None) -> set[str]:
    return {
        canonical
        for canonical in (canonical_tool_name(name) for name in (names or []))
        if canonical
    }


def canonical_tool_list(names: Iterable[str] | None) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for name in names or []:
        canonical = canonical_tool_name(name)
        if canonical and canonical not in seen:
            seen.add(canonical)
            result.append(canonical)
    return result
