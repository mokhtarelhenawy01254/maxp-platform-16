from __future__ import annotations

import pytest

from src.llm.model_manager import ModelManager, ModelManagerError


def test_provider_priority_falls_through_to_all_supported_providers():
    priority = ModelManager().resolve_provider_priority(None)

    assert priority[:3] == ["GOOGLE", "GROQ", "OPENROUTER"]
    assert "DEEPSEEK" in priority
    assert "NVIDIA" in priority


@pytest.mark.asyncio
async def test_get_global_ui_config_skips_db_when_session_factory_is_uninitialized(monkeypatch):
    errors: list[dict[str, object]] = []

    def record_error(*args, **kwargs):
        errors.append({"args": args, "kwargs": kwargs})

    monkeypatch.setattr("src.db.session.async_session", None)
    monkeypatch.setattr("src.llm.model_manager.logger.error", record_error)

    config = await ModelManager().get_global_ui_config()

    assert config is None
    assert errors == []


@pytest.mark.asyncio
async def test_get_next_key_reports_db_uninitialized(monkeypatch):
    monkeypatch.setattr("src.db.session.async_session", None)

    with pytest.raises(ModelManagerError) as exc_info:
        await ModelManager().get_next_key("gemini-2.5-flash", "comp1")

    assert exc_info.value.code == "DB_UNINITIALIZED"
