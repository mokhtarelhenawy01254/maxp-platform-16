from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from src.context.compressor import count_tokens


@dataclass
class ContextMetrics:
    """Dataclass holding context window utilization and quality metrics."""

    total_tokens: int
    system_prompt_tokens: int
    context_tokens: int  # tokens from history + tools + RAG
    utilization_pct: float  # percentage of model's context window used
    relevance_score: float | None  # maximum document relevance score from RAG
    compression_ratio: float  # history original tokens / compressed tokens


def compute_context_metrics(
    system_prompt: str | None,
    messages: list[dict[str, Any]],
    tool_context: str | None,
    model_name: str = "claude-sonnet-4-6",
    original_history_tokens: int = 0,
    compressed_history_tokens: int = 0,
) -> ContextMetrics:
    """Compute context window metrics for the current execution turn."""
    # 1. System prompt tokens
    sys_tokens = count_tokens(system_prompt)

    # 2. Context tokens (from non-system messages and tool execution context)
    non_sys_tokens = sum(
        count_tokens(m.get("content"))
        for m in messages
        if m.get("role") != "system"
    )
    tool_tokens = count_tokens(tool_context)
    context_tokens = non_sys_tokens + tool_tokens

    total_tokens = sys_tokens + context_tokens

    # 3. Model context window limits (SOTA 2026 presets)
    model_lower = model_name.lower() if model_name else ""
    if "gemini" in model_lower:
        window = 1000000
    elif "gemma" in model_lower:
        window = 8192
    elif "claude" in model_lower:
        window = 200000
    else:
        window = 32000  # Default fallback limit

    utilization_pct = (total_tokens / window) * 100.0 if window > 0 else 0.0

    # 4. Relevance score: Parse from RAG source markings (e.g. "(Rel: 0.85)") in tool_context
    relevance_score = None
    if tool_context:
        scores = [float(m) for m in re.findall(r"Rel:\s*(\d+\.\d+)", tool_context)]
        if scores:
            relevance_score = max(scores)

    # 5. Compression ratio calculation
    if original_history_tokens > 0 and compressed_history_tokens > 0:
        compression_ratio = original_history_tokens / compressed_history_tokens
    else:
        compression_ratio = 1.0

    return ContextMetrics(
        total_tokens=total_tokens,
        system_prompt_tokens=sys_tokens,
        context_tokens=context_tokens,
        utilization_pct=round(utilization_pct, 2),
        relevance_score=relevance_score,
        compression_ratio=round(compression_ratio, 2),
    )
