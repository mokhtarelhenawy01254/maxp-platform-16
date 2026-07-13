from __future__ import annotations

import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test")
os.environ.setdefault("MAXP_API_URL", "http://localhost:8000")
os.environ.setdefault("MAXP_SERVICE_TOKEN", "test-service-token")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-anthropic-key")

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from src.config import Settings, get_settings


@pytest.fixture
def settings() -> Settings:
    get_settings.cache_clear()
    return get_settings()


@pytest.fixture
def client() -> Iterator[TestClient]:
    from src.main import app
    with TestClient(app) as test_client:
        yield test_client
