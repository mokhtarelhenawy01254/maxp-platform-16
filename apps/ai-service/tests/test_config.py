from __future__ import annotations

import pytest

from src.config import Settings


def test_default_settings_load():
    settings = Settings(
        database_url="postgresql+asyncpg://test:test@localhost:5432/test",
        maxp_api_url="http://localhost:8000",
        maxp_service_token="test-token",
        anthropic_api_key="test-key",
    )
    assert settings.app_name == "maxp-ai-service"


def test_production_requires_api_key():
    with pytest.raises(ValueError, match="LLM API key"):
        Settings(
            database_url="postgresql+asyncpg://pg:5432/db",
            maxp_api_url="https://api.maxp.com",
            maxp_service_token="prod-token",
            environment="production",
            anthropic_api_key=None,
            openai_api_key=None,
            google_api_key=None,
        )


def test_production_requires_service_token():
    with pytest.raises(ValueError, match="MAXP_SERVICE_TOKEN"):
        Settings(
            database_url="postgresql+asyncpg://pg:5432/db",
            maxp_api_url="https://api.maxp.com",
            maxp_service_token="",
            environment="production",
            anthropic_api_key="sk-test",
        )


def test_production_warns_localhost_maxp_api_url():
    with pytest.warns(UserWarning, match="localhost"):
        Settings(
            database_url="postgresql+asyncpg://pg:5432/db",
            maxp_api_url="http://localhost:3000",
            maxp_service_token="prod-token",
            environment="production",
            anthropic_api_key="sk-test",
        )


def test_development_skips_validation():
    settings = Settings(
        database_url="postgresql+asyncpg://pg:5432/db",
        maxp_api_url="http://localhost:3000",
        maxp_service_token="",
        anthropic_api_key="",
        openai_api_key="",
        environment="development",
    )
    assert settings.environment == "development"
