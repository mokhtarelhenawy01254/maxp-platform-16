"""
Standalone conftest for billing tests - avoids loading the full FastAPI app.
"""

from __future__ import annotations

import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test")
os.environ.setdefault("MAXP_API_URL", "http://localhost:8000")
os.environ.setdefault("MAXP_SERVICE_TOKEN", "test-service-token")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-anthropic-key")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
os.environ.setdefault("GOOGLE_API_KEY", "test-google-key")

import pytest


@pytest.fixture
def anyio_backend():
    return "asyncio"
