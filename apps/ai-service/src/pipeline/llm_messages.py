from __future__ import annotations

from typing import Any

from agent_framework import Message


def to_client_message(message: dict[str, Any]) -> Message | dict[str, Any]:
    """Return an SDK Message for text-only turns, or raw dict for multimodal turns."""
    role = str(message.get("role") or "user")
    content = message.get("content", "")
    if isinstance(content, list):
        return {"role": role, "content": content}
    return Message(role=role, contents=[str(content)])


def to_client_messages(messages: list[dict[str, Any]]) -> list[Message | dict[str, Any]]:
    return [to_client_message(message) for message in messages]
