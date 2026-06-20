from __future__ import annotations

from typing import Any

import structlog

logger = structlog.get_logger(__name__)


def count_tokens(text: str | None) -> int:
    """Estimate token count for bilingual English/Arabic text.
    
    1 token ≈ 4 ASCII characters (English)
    1 token ≈ 1.5 non-ASCII characters (Arabic)
    """
    if not text:
        return 0
    non_ascii = sum(1 for c in text if ord(c) > 127)
    ascii_chars = len(text) - non_ascii
    return int((ascii_chars / 4.0) + (non_ascii / 1.5))


async def compress_history(
    messages: list[dict[str, Any]],
    max_tokens: int = 1000,
    keep_recent: int = 15,
    llm_client: Any = None,
) -> tuple[list[dict[str, Any]], str | None]:
    """Compress conversation history if it exceeds max_tokens budget.
    
    Keeps the most recent `keep_recent` messages intact.
    Older messages are either summarized using the LLM or concatenated into a brief history log.
    
    Args:
        messages: List of {"role": str, "content": str} message dicts.
        max_tokens: The maximum token budget allowed for the history.
        keep_recent: The number of recent messages to preserve as-is (15 = all, no compression).
        llm_client: Optional LLM client to generate a summary.
        
    Returns:
        tuple of (retained_messages, summary_text)
    """
    if not messages:
        return [], None

    # Calculate total tokens
    total_tokens = sum(count_tokens(m.get("content", "")) for m in messages)
    if total_tokens <= max_tokens or len(messages) <= keep_recent:
        return messages, None

    # Split into old history (to summarize/compress) and recent history (to keep)
    split_idx = len(messages) - keep_recent
    old_messages = messages[:split_idx]
    recent_messages = messages[split_idx:]

    summary_text = None

    # Attempt LLM summarization if client is provided
    if llm_client and len(old_messages) > 1:
        try:
            formatted_old = "\n".join(
                f"{'العميل' if m['role'] == 'user' else 'الوكيل'}: {m['content']}"
                for m in old_messages
                if m.get("content")
            )

            summary_prompt = (
                "قم بتلخيص نقاط هذا النقاش السابق بين العميل والوكيل باختصار شديد في سطرين:\n\n"
                f"{formatted_old}\n\n"
                "التلخيص:"
            )

            from agent_framework import Message
            response = await llm_client.get_response([
                Message(role="user", contents=[summary_prompt])
            ])
            summary_text = response.text.strip()
            logger.info("history compressed via LLM", original_messages=len(old_messages), summary=summary_text)
        except Exception as exc:
            logger.warning("failed to summarize history via LLM, falling back to concatenation", error=str(exc))

    # Fallback to rule-based concatenation if summary failed or client not provided
    if not summary_text:
        summary_lines = []
        for m in old_messages:
            role_label = "العميل" if m["role"] == "user" else "الوكيل"
            content = m.get("content", "").strip()
            if content:
                # Truncate long content in summary
                preview = content[:50] + "..." if len(content) > 50 else content
                summary_lines.append(f"- {role_label}: {preview}")

        summary_text = "نقاش سابق:\n" + "\n".join(summary_lines)
        logger.info("history compressed via rule-based list", original_messages=len(old_messages))

    return recent_messages, summary_text
