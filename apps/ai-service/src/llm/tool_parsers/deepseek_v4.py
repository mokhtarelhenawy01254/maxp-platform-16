from __future__ import annotations

import json
import re
import uuid
from typing import Any

from src.llm.tool_parsers.base import BaseToolParser

_DSML_INVOKE_RE = re.compile(
    r"<[｜| \t]*(?:DSML[｜| \t]*)?invoke\s+name=(?P<quote>['\"])(?P<name>[a-zA-Z0-9_.-]+)(?P=quote)[｜| \t]*>(?P<content>.*?)<[｜| \t/]*(?:DSML[｜| \t]*)?invoke[｜| \t/]*>",
    re.DOTALL
)

_DSML_PARAM_RE = re.compile(
    r"<[｜| \t]*(?:DSML[｜| \t]*)?parameter\s+name=(?P<quote>['\"])(?P<param_name>[a-zA-Z0-9_.-]+)(?P=quote)(?:\s+string=(?P<s_quote>['\"])(?P<is_string>true|false)(?P=s_quote))?[｜| \t]*>(?P<param_value>.*?)<[｜| \t/]*(?:DSML[｜| \t]*)?parameter[｜| \t/]*>",
    re.DOTALL
)

_DSML_JSON_RE = re.compile(
    r"<[｜|]{1,2}(?:DSML[｜|]{1,2})?tool_calls>(.*?)<[｜|]{1,2}(?:DSML[｜|]{1,2})?tool_calls>",
    re.DOTALL,
)


def _parse_param_value(val_str: str, is_string: str | None) -> Any:
    val_str = val_str.strip()
    if is_string == "true":
        return val_str
    if is_string == "false":
        if val_str.lower() == "true":
            return True
        if val_str.lower() == "false":
            return False
        if val_str.lower() in ("null", "none"):
            return None
        try:
            if "." in val_str:
                return float(val_str)
            return int(val_str)
        except ValueError:
            return val_str
    if val_str.lower() == "true":
        return True
    if val_str.lower() == "false":
        return False
    if val_str.lower() in ("null", "none"):
        return None
    try:
        if "." in val_str:
            return float(val_str)
        return int(val_str)
    except ValueError:
        return val_str


def _parse_dsml_tool_calls(text: str) -> list[dict]:
    if not text:
        return []
    xml_calls = []
    for match in _DSML_INVOKE_RE.finditer(text):
        name = match.group("name")
        content = match.group("content")

        arguments = {}
        for p_match in _DSML_PARAM_RE.finditer(content):
            p_name = p_match.group("param_name")
            p_val = p_match.group("param_value")
            is_str = p_match.group("is_string")
            arguments[p_name] = _parse_param_value(p_val, is_str)

        xml_calls.append({
            "id": f"dsml_{uuid.uuid4().hex[:8]}",
            "type": "function",
            "function": {
                "name": name,
                "arguments": json.dumps(arguments, ensure_ascii=False)
            }
        })

    if xml_calls:
        return xml_calls

    m = _DSML_JSON_RE.search(text)
    if not m:
        return []
    try:
        raw = json.loads(m.group(1).strip())
        if not isinstance(raw, list):
            return []
        result = []
        for item in raw:
            if not isinstance(item, dict):
                continue
            func = item.get("function") or {}
            if not func.get("name"):
                continue
            result.append({
                "id": item.get("id") or f"dsml_{uuid.uuid4().hex[:8]}",
                "type": "function",
                "function": {
                    "name": func.get("name", ""),
                    "arguments": func.get("arguments") if isinstance(func.get("arguments"), str) else json.dumps(func.get("arguments") or {}, ensure_ascii=False) if func.get("arguments") is not None else "{}",
                },
            })
        return result
    except (json.JSONDecodeError, KeyError, TypeError):
        return []


class DeepSeekV4ToolParser(BaseToolParser):
    supports_streaming = False
    supports_required_and_named = True

    def render_tools(self, tools: list[dict[str, Any]]) -> str | None:
        return None

    def parse_calls(self, text: str) -> list[dict[str, Any]]:
        return _parse_dsml_tool_calls(text)

    def parse_stream(self, prev: str, curr: str, delta: str) -> list[dict[str, Any]]:
        return []


__all__ = [
    "DeepSeekV4ToolParser",
    "_parse_dsml_tool_calls",
]
