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
async def test_failover_provider_skips_provider_types(monkeypatch):
    factory = ProviderFactory()
    calls: list[dict[str, object]] = []

    async def fake_get_provider(
        provider_type: str,
        model: str | None = None,
        company_id: str | None = None,
        excluded_key_ids: set[str] | None = None,
    ):
        calls.append(
            {
                "provider_type": provider_type,
                "model": model,
                "company_id": company_id,
                "excluded_key_ids": excluded_key_ids,
            }
        )
        if provider_type == "GOOGLE":
            return GoogleProvider("env-google-key", "gemini-2.5-flash", provider_type="GOOGLE")
        return None

    monkeypatch.setattr(factory, "get_provider", fake_get_provider)
    monkeypatch.setattr(
        "src.llm.providers.factory.model_manager.provider_priority",
        ["GOOGLE", "GROQ", "OPENROUTER"],
    )

    provider = await factory.get_failover_provider(
        current_provider_type="GROQ",
        model="llama-3.3-70b-versatile",
        company_id="comp1",
        attempted_key_ids={"groq-key"},
        skip_provider_types={"GROQ"},
    )

    assert isinstance(provider, GoogleProvider)
    assert [call["provider_type"] for call in calls] == ["GOOGLE"]
    assert calls[0]["model"] is None
    assert calls[0]["excluded_key_ids"] == {"groq-key"}
