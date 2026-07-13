from __future__ import annotations

import json as _json
from pathlib import Path

_TOOL_OVERRIDES_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "tool_overrides.json"


def _ensure_file() -> None:
    _TOOL_OVERRIDES_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not _TOOL_OVERRIDES_PATH.exists():
        _TOOL_OVERRIDES_PATH.write_text("{}", encoding="utf-8")


def read_all() -> dict[str, str]:
    _ensure_file()
    try:
        return _json.loads(_TOOL_OVERRIDES_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def get_override(tool_name: str) -> str | None:
    return read_all().get(tool_name)


def set_override(tool_name: str, description: str) -> None:
    overrides = read_all()
    if description.strip():
        overrides[tool_name] = description.strip()
    else:
        overrides.pop(tool_name, None)
    _ensure_file()
    _TOOL_OVERRIDES_PATH.write_text(
        _json.dumps(overrides, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def merge_descriptions(tools: list[dict]) -> list[dict]:
    overrides = read_all()
    if not overrides:
        return tools
    result = []
    for tool in tools:
        t = dict(tool)
        name = t.get("name", "")
        if name in overrides:
            t["description"] = overrides[name]
            t["description_overridden"] = True
        result.append(t)
    return result
