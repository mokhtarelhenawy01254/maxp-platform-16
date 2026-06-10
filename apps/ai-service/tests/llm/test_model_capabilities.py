from __future__ import annotations

from src.llm.model_capabilities import route_for_modalities, supports_vision


def test_supports_vision_for_gemini_and_gpt_vision_families() -> None:
    assert supports_vision("gemini-2.5-flash", "GOOGLE")
    assert supports_vision("gpt-4o-mini", "OPENAI")
    assert supports_vision("gpt-5.5", "OPENAI")


def test_route_for_image_input_returns_none_when_no_vision_model_configured() -> None:
    route = route_for_modalities(
        model="openai/gpt-oss-120b",
        provider="GROQ",
        has_image_input=True,
    )

    assert route.provider is None
    assert route.model is None
    assert route.reason == "image_input_requires_vision_model"
