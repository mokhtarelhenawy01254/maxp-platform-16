from __future__ import annotations

from dataclasses import dataclass


VISION_MODEL_DEFAULT = "gemini-2.5-flash"
VISION_PROVIDER_DEFAULT = "GOOGLE"


@dataclass(frozen=True)
class ModelRoute:
    provider: str | None
    model: str | None
    reason: str


def supports_vision(model: str | None, provider: str | None = None) -> bool:
    name = str(model or "").strip().lower()
    provider_name = str(provider or "").strip().upper()
    if not name:
        return False
    if provider_name == "GOOGLE" and name.startswith(("gemini-", "gemma-")):
        return True
    if any(marker in name for marker in ("gpt-4o", "gpt-4.1", "gpt-5", "o3", "o4")):
        return True
    if "vision" in name or "image" in name:
        return True
    if provider_name == "OPENROUTER" and any(marker in name for marker in ("llava", "qwen-vl", "pixtral")):
        return True
    return False


def route_for_modalities(
    *,
    model: str | None,
    provider: str | None,
    has_image_input: bool,
) -> ModelRoute:
    if not has_image_input:
        return ModelRoute(provider=provider, model=model, reason="text")
    if supports_vision(model, provider):
        return ModelRoute(provider=provider, model=model, reason="selected_model_supports_vision")
    return ModelRoute(
        provider=VISION_PROVIDER_DEFAULT,
        model=VISION_MODEL_DEFAULT,
        reason="image_input_requires_vision_model",
    )
