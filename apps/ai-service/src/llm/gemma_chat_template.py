"""Gemma 4 native chat template adapter.

Gemma 4 uses a custom function-calling protocol with six special tokens that
differ from Gemini's functionDeclarations and from OpenAI's tool_calls. The
Google OpenAI-compat layer at /v1beta/openai/ does not reliably translate
``tools`` for Gemma 4, so this module renders tool definitions in the form
Gemma 4 expects and parses tool calls/results back out of model output.

The exact token format is taken from the official Gemma 4 chat template
shipped with vLLM (see ``docs.vllm.ai/projects/recipes/en/latest/Google/Gemma4``).
"""

from __future__ import annotations

import json
import re
from typing import Any

TOOL_BEGIN = "<|tool>"
TOOL_END = "<tool|>"
TOOL_CALL_BEGIN = "<|tool_call>"
TOOL_CALL_END = "<tool_call|>"
TOOL_RESPONSE_BEGIN = "<|tool_response>"
TOOL_RESPONSE_END = "<tool_response|>"
TURN_BEGIN = "<|turn|>"
TURN_END = "<turn|>"
QUOTE_TOKEN = '<|"|>'

_TOOL_DECL_RE = re.compile(
    re.escape(TOOL_BEGIN)
    + r"\s*declaration:([A-Za-z0-9_]+)\s*(.*?)\s*"
    + r"(?:"
    + re.escape(TOOL_END)
    + r"|"
    + r"<\|tool\|>"
    + r")",
    re.DOTALL,
)
_TOOL_CALL_RE = re.compile(
    re.escape(TOOL_CALL_BEGIN)
    + r"\s*(?:call:)?([A-Za-z0-9_]+)\s*(.*?)\s*"
    + r"(?:"
    + re.escape(TOOL_CALL_END)
    + r"|"
    + r"<\|tool_call\|>"
    + r")",
    re.DOTALL,
)
_TOOL_RESPONSE_RE = re.compile(
    re.escape(TOOL_RESPONSE_BEGIN)
    + r"\s*response:([A-Za-z0-9_]+)\s*(.*?)\s*"
    + r"(?:"
    + re.escape(TOOL_RESPONSE_END)
    + r"|"
    + r"<\|tool_response\|>"
    + r")",
    re.DOTALL,
)


def _q(value: str) -> str:
    """Wrap a value in the Gemma 4 quote-token pair."""
    return QUOTE_TOKEN + value + QUOTE_TOKEN


def _escape_quote(value: str) -> str:
    return value.replace('"', QUOTE_TOKEN)


def _unescape_quote(value: str) -> str:
    return value.replace(QUOTE_TOKEN, '"')


def _pydantic_to_json_schema(model_cls: type) -> dict[str, Any]:
    if hasattr(model_cls, "model_json_schema"):
        return model_cls.model_json_schema()
    return {}


def _render_schema_value(prop_name: str, prop_schema: dict[str, Any], required: set[str]) -> str:
    prop_type = prop_schema.get("type", "string")
    description = prop_schema.get("description", "")
    optional_marker = "" if prop_name in required else ",optional:true"

    inner_parts: list[str] = []
    if description:
        inner_parts.append("description:" + _q(_escape_quote(description)))

    if "enum" in prop_schema:
        enum_values = ",".join(_q(_escape_quote(str(v))) for v in prop_schema["enum"])
        inner_parts.append("type:" + _q("string"))
        inner_parts.append("enum:[" + enum_values + "]")
    elif prop_type == "array":
        items = prop_schema.get("items", {"type": "string"})
        item_type = items.get("type", "string")
        inner_parts.append("type:" + _q("array"))
        inner_parts.append("items:" + _q(_escape_quote(item_type)))
    elif prop_type == "object":
        nested = _schema_to_gemma_params(prop_schema)
        inner_parts.append("type:" + _q("object"))
        inner_parts.append("properties:" + nested)
    else:
        inner_parts.append("type:" + _q(_escape_quote(prop_type)))

    inner = ",".join(inner_parts) + optional_marker
    return prop_name + ":{" + inner + "}"


def _schema_to_gemma_params(schema: dict[str, Any]) -> str:
    properties = schema.get("properties", {}) or {}
    required = set(schema.get("required", []) or [])
    parts = [
        _render_schema_value(prop_name, prop_schema, required)
        for prop_name, prop_schema in properties.items()
    ]
    return "{" + ",".join(parts) + "}"


def _render_tool_declaration(tool: Any) -> str:
    name = getattr(tool, "name", None) or getattr(tool, "__name__", "unknown_tool")
    description = getattr(tool, "description", "") or ""
    input_model = getattr(tool, "input_model", None)

    body_parts: list[str] = []
    if description:
        body_parts.append("description:" + _q(_escape_quote(description)))

    if input_model is not None:
        schema = _pydantic_to_json_schema(input_model)
        params_body = _schema_to_gemma_params(schema)
    else:
        params_body = "{}"
    body_parts.append("parameters:" + params_body)

    body = ",".join(body_parts)
    return TOOL_BEGIN + "declaration:" + name + "{" + body + "}" + TOOL_END


def render_tools(tools: list[Any]) -> str:
    if not tools:
        return ""
    return "\n".join(_render_tool_declaration(t) for t in tools)


def render_tool_definitions(tools: list[Any]) -> str:
    body = render_tools(tools)
    if not body:
        return ""
    return "You have access to the following tools:\n" + body


def render_tool_response(name: str, content: Any) -> str:
    if isinstance(content, str):
        content_str = content
    else:
        content_str = json.dumps(content, ensure_ascii=False, default=str)
    body = (
        "name:" + _q(_escape_quote(name)) + ","
        "content:" + _q(_escape_quote(content_str))
    )
    return TOOL_RESPONSE_BEGIN + "response:" + name + "{" + body + "}" + TOOL_RESPONSE_END


def _parse_kv_body(body: str) -> dict[str, str]:
    """Parse a Gemma 4 ``key:value,key:value`` body into a flat dict.

    Top-level commas are delimiters; commas inside ``<|"|>`` quoted values
    are preserved. Brace depth is tracked so nested objects stay intact.
    """
    result: dict[str, str] = {}
    if not body:
        return result

    parts: list[str] = []
    depth = 0
    in_quote = False
    current: list[str] = []
    quote_char = '"'
    for ch in body:
        if ch == quote_char:
            in_quote = not in_quote
            current.append(ch)
        elif ch == "{":
            depth += 1
            current.append(ch)
        elif ch == "}":
            depth -= 1
            current.append(ch)
        elif ch == "," and not in_quote and depth == 0:
            parts.append("".join(current).strip())
            current = []
        else:
            current.append(ch)
    if current:
        parts.append("".join(current).strip())

    for part in parts:
        if ":" not in part:
            continue
        key, _, value = part.partition(":")
        result[key.strip()] = value.strip()
    return result


def _decode_value(raw: str) -> str:
    cleaned = raw.strip()
    if (
        cleaned.startswith(QUOTE_TOKEN)
        and cleaned.endswith(QUOTE_TOKEN)
        and len(cleaned) >= 2 * len(QUOTE_TOKEN)
    ):
        return _unescape_quote(cleaned[len(QUOTE_TOKEN) : -len(QUOTE_TOKEN)])
    if len(cleaned) >= 2 and cleaned[0] == '"' and cleaned[-1] == '"':
        return cleaned[1:-1]
    return _unescape_quote(cleaned)


def parse_tool_calls(text: str) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for match in _TOOL_CALL_RE.finditer(text):
        name = match.group(1)
        body = (match.group(2) or "").strip()
        if body.startswith("{"):
            body = body[1:]
        if body.endswith("}"):
            body = body[:-1]
        kv = _parse_kv_body(body)
        arguments: dict[str, Any] = {
            k: _decode_value(v) for k, v in kv.items()
        }
        results.append({"name": name, "arguments": arguments})
    return results


def parse_tool_declarations(text: str) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for match in _TOOL_DECL_RE.finditer(text):
        name = match.group(1)
        body = (match.group(2) or "").strip()
        if body.startswith("{"):
            body = body[1:]
        if body.endswith("}"):
            body = body[:-1]
        kv = _parse_kv_body(body)
        results.append({"name": name, **{k: _decode_value(v) for k, v in kv.items()}})
    return results


def parse_tool_responses(text: str) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for match in _TOOL_RESPONSE_RE.finditer(text):
        name = match.group(1)
        body = (match.group(2) or "").strip()
        if body.startswith("{"):
            body = body[1:]
        if body.endswith("}"):
            body = body[:-1]
        kv = _parse_kv_body(body)
        decoded = {k: _decode_value(v) for k, v in kv.items()}
        results.append({"name": name, **decoded})
    return results


def strip_tool_blocks(text: str) -> str:
    cleaned = _TOOL_DECL_RE.sub("", text)
    cleaned = _TOOL_CALL_RE.sub("", cleaned)
    cleaned = _TOOL_RESPONSE_RE.sub("", cleaned)
    return cleaned.strip()


def is_gemma_model(model_name: str | None) -> bool:
    if not model_name:
        return False
    name = model_name.strip().lower()
    return "gemma-4" in name or "gemma4" in name


__all__ = [
    "is_gemma_model",
    "parse_tool_calls",
    "render_tool_definitions",
]
