from __future__ import annotations

from typing import Any

from agent_framework import Message


def to_client_message(message: dict[str, Any]) -> Message | dict[str, Any]:
    """Return an SDK Message for text-only turns, or raw dict for multimodal/tool turns."""
    role = str(message.get("role") or "user")
    content = message.get("content", "")
    if isinstance(content, list):
        return {"role": role, "content": content}
    if role == "tool" or message.get("tool_calls"):
        result: dict[str, Any] = {"role": role, "content": content}
        if "tool_call_id" in message:
            result["tool_call_id"] = message["tool_call_id"]
        if "tool_calls" in message:
            result["tool_calls"] = message["tool_calls"]
        return result
    return Message(role=role, contents=[str(content)])


def to_client_messages(messages: list[dict[str, Any]]) -> list[Message | dict[str, Any]]:
    return [to_client_message(message) for message in messages]
