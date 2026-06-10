from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from src.llm.model_manager import ModelManagerError
from src.llm.providers.factory import ProviderFactory
from src.llm.providers.google_provider import GoogleProvider


@pytest.mark.asyncio
async def test_provider_factory_uses_env_google_key_when_db_key_is_unavailable(monkeypatch):
    monkeypatch.setattr(
        "src.llm.providers.factory.get_settings",
        lambda: SimpleNamespace(google_api_key="env-google-key"),
    )
    monkeypatch.setattr(
        "src.llm.providers.factory.model_manager.get_next_key",
        AsyncMock(side_effect=ModelManagerError("ALL_KEYS_UNAVAILABLE", "no db keys")),
    )
    provider = await ProviderFactory().get_provider("GOOGLE", company_id="comp1")

    assert isinstance(provider, GoogleProvider)
    assert provider.api_key == "env-google-key"
    assert provider.model == "gemini-2.5-flash"
    assert provider.config["key_id"] == "env:GOOGLE"
    assert provider.config["provider_type"] == "GOOGLE"
    assert provider.config["company_id"] == "comp1"


@pytest.mark.asyncio
async def test_provider_factory_routes_exact_selected_key_to_model_manager(monkeypatch):
    get_next_key = AsyncMock(
        return_value={
            "key_id": "selected-groq-key",
            "api_key": "test-groq-secret",
            "base_url": "https://api.groq.com/openai/v1",
            "model": "openai/gpt-oss-120b",
            "provider": "GROQ",
            "company_id": "comp1",
        }
    )
    monkeypatch.setattr(
        "src.llm.providers.factory.model_manager.get_next_key",
        get_next_key,
    )

    provider = await ProviderFactory().get_provider(
        "GROQ",
        model="openai/gpt-oss-120b",
        company_id="comp1",
        key_id="selected-groq-key",
    )

    assert provider is not None
    assert provider.model == "openai/gpt-oss-120b"
    assert provider.config["key_id"] == "selected-groq-key"
    get_next_key.assert_awaited_once_with(
        "openai/gpt-oss-120b",
        "comp1",
        preferred_provider="GROQ",
        key_id="selected-groq-key",
    )
