"""Thinking-level resolution (2026-11-13).

Two vocabularies coexist:
- Company choice: config.reasoning_effort = "none" | "low" | "high"
  (written by /admin/agent-profiles settings UI)
- Platform default: model_policy.thinking = "fast" | "balanced" | "deep"
  (template-level, editable from super-admin)

Precedence: company config.reasoning_effort WINS over model_policy.thinking.
The only hard model mapping today is DeepSeek: "deep"/"high" upgrades
deepseek-chat/flash to deepseek-reasoner (the client routes reasoner models
natively). Other providers keep default behavior until dedicated params land.
"""

from __future__ import annotations

_DEEP = {"deep", "high"}
_MEDIUM = {"low", "balanced"}
_FAST = {"none", "fast"}


def normalize_thinking_level(raw: str | None) -> str | None:
    value = str(raw or "").strip().lower()
    if value in _DEEP:
        return "deep"
    if value in _MEDIUM:
        return "low"
    if value in _FAST:
        return "fast"
    return None


def resolve_thinking_level(config: dict | None, model_policy: dict | None) -> str | None:
    """Company config.reasoning_effort wins; model_policy.thinking is the default."""
    for source in (config, model_policy):
        if not isinstance(source, dict):
            continue
        resolved = normalize_thinking_level(
            source.get("reasoning_effort") or source.get("thinking")
        )
        if resolved:
            return resolved
    return None


def apply_thinking_level(model: str | None, thinking: str | None) -> str | None:
    """Return the model adjusted for the resolved thinking level.

    - "deep" on a DeepSeek chat/flash model → deepseek-reasoner
    - anything else returns the model unchanged
    """
    if not model or not thinking:
        return model
    model_l = str(model).strip().lower()
    if thinking == "deep" and model_l.startswith("deepseek") and "reasoner" not in model_l:
        return "deepseek-reasoner"
    return model


def resolve_agent_model(model: str | None, config: dict | None, model_policy: dict | None) -> str | None:
    """One-call helper: resolve thinking level then apply it to the model."""
    return apply_thinking_level(model, resolve_thinking_level(config, model_policy))
