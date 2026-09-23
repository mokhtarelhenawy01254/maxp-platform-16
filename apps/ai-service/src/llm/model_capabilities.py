from __future__ import annotations

from dataclasses import dataclass




@dataclass(frozen=True)
class ModelRoute:
    provider: str | None
    model: str | None
    reason: str


DEFAULT_VISION_PROVIDER = "GOOGLE"
DEFAULT_VISION_MODEL = "gemini-2.5-flash"

DEFAULT_PROVIDER_MODELS = {
    "GOOGLE": DEFAULT_VISION_MODEL,
    "GROQ": "openai/gpt-oss-120b",
    "OPENROUTER": "openrouter/auto",
    "DEEPSEEK": "deepseek-flash",
    "NVIDIA": "meta/llama-3.1-70b-instruct",
    "OLLAMA": "llama3",
}


def default_model_for_provider(provider: str | None) -> str:
    provider_name = str(provider or DEFAULT_VISION_PROVIDER).strip().upper()
    return DEFAULT_PROVIDER_MODELS.get(provider_name, DEFAULT_VISION_MODEL)


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
    if provider_name == "DEEPSEEK" and any(marker in name for marker in ("deepseek-flash", "deepseek-v4", "deepseek-v4.1", "deepseek-vl")):
        return True
    if any(marker in name for marker in ("deepseek-flash", "deepseek-v4", "deepseek-v4.1")):
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
        provider=None,
        model=None,
        reason="image_input_requires_vision_model",
    )
