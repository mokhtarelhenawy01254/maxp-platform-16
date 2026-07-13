"""Regression tests for unified embedding model + provider tracking + Redis cache.

Background:
- The Python AI service used to send text-only requests to ``text-embedding-004``
  while multimodal requests went to ``gemini-embedding-2``. The two model outputs
  lived in different vector spaces, so similarity rankings were unreliable.
- The service also stored embeddings without recording which provider produced
  them, so callers could not tell apart real embeddings from pseudo fallbacks.
- Every embed call hit the upstream API, even for repeated identical inputs.
"""
import json
import os
from unittest.mock import AsyncMock, MagicMock, patch

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test")
os.environ.setdefault("MAXP_API_URL", "http://localhost:8000")
os.environ.setdefault("MAXP_SERVICE_TOKEN", "test-service-token")

import pytest

from src.config import Settings
from src.memory import embedding_cache
from src.memory.episodic_memory import (
    DEFAULT_EMBEDDING_MODEL,
    EMBEDDING_PROVIDER_GEMINI,
    EMBEDDING_PROVIDER_PSEUDO,
)


def _settings_with_key(key):
    return Settings(database_url="postgresql://x", maxp_api_url="http://x", maxp_service_token="x", google_api_key=key)


@pytest.mark.asyncio
async def test_default_model_is_gemini_embedding_2_for_text() -> None:
    """Text-only and multimodal paths must both use gemini-embedding-2."""
    with patch("src.memory.episodic_memory.requests.post") as mock_post, \
         patch("src.memory.episodic_memory.get_settings", return_value=_settings_with_key("k")), \
         patch.object(embedding_cache, "redis_client") as fake_redis:
        mock_post.return_value = MagicMock(
            ok=True, json=lambda: {"embedding": {"values": [0.1] * 768}}
        )
        fake_redis.available = False

        from src.memory.episodic_memory import EpisodicMemoryService
        svc = EpisodicMemoryService()
        result = await svc.generate_embedding_with_provider(text="hi")

    assert result["model"] == "gemini-embedding-2"
    assert result["dimension"] == 768
    assert result["provider"] == EMBEDDING_PROVIDER_GEMINI
    called_url = mock_post.call_args[0][0]
    assert DEFAULT_EMBEDDING_MODEL in called_url
    assert "text-embedding-004" not in called_url


@pytest.mark.asyncio
async def test_default_model_is_gemini_embedding_2_for_multimodal() -> None:
    """Multimodal path must also use gemini-embedding-2 (unified model)."""
    with patch("src.memory.episodic_memory.requests.post") as mock_post, \
         patch("src.memory.episodic_memory.get_settings", return_value=_settings_with_key("k")), \
         patch.object(embedding_cache, "redis_client") as fake_redis:
        mock_post.return_value = MagicMock(
            ok=True, json=lambda: {"embedding": {"values": [0.2] * 768}}
        )
        fake_redis.available = False

        from src.memory.episodic_memory import EpisodicMemoryService
        svc = EpisodicMemoryService()
        result = await svc.generate_embedding_with_provider(
            text="see image",
            image_bytes="aaaa",
            mime_type="image/jpeg",
        )

    assert result["model"] == "gemini-embedding-2"
    assert "text-embedding-004" not in mock_post.call_args[0][0]


@pytest.mark.asyncio
async def test_provider_tracked_in_response() -> None:
    """Returned dict exposes the provider so callers can filter pseudo rows."""
    with patch("src.memory.episodic_memory.requests.post") as mock_post, \
         patch("src.memory.episodic_memory.get_settings", return_value=_settings_with_key("k")), \
         patch.object(embedding_cache, "redis_client") as fake_redis:
        mock_post.return_value = MagicMock(
            ok=True, json=lambda: {"embedding": {"values": [0.3] * 768}}
        )
        fake_redis.available = False

        from src.memory.episodic_memory import EpisodicMemoryService
        svc = EpisodicMemoryService()
        result = await svc.generate_embedding_with_provider(text="x")

    for key in ("provider", "model", "dimension", "cached", "vector"):
        assert key in result


@pytest.mark.asyncio
async def test_pseudo_fallback_when_no_api_key() -> None:
    """When GOOGLE_API_KEY is missing, the service falls back to a pseudo
    embedding and reports the provider honestly."""
    with patch("src.memory.episodic_memory.get_settings", return_value=_settings_with_key(None)), \
         patch.object(embedding_cache, "redis_client") as fake_redis:
        fake_redis.available = False
        from src.memory.episodic_memory import EpisodicMemoryService
        svc = EpisodicMemoryService()
        result = await svc.generate_embedding_with_provider(text="hi")

    assert result["provider"] == EMBEDDING_PROVIDER_PSEUDO
    assert result["model"] == "gemini-embedding-2"
    assert len(result["vector"]) == 768


@pytest.mark.asyncio
async def test_cache_hit_skips_upstream_call() -> None:
    """A cache hit must short-circuit the upstream embedding call."""
    cached_vec = [0.5] * 768
    payload = json.dumps({
        "vector": cached_vec,
        "provider": EMBEDDING_PROVIDER_GEMINI,
        "model": "gemini-embedding-2",
        "dimension": 768,
    })

    with patch.object(embedding_cache, "redis_client") as fake_redis, \
         patch("src.memory.episodic_memory.get_settings", return_value=_settings_with_key("k")):
        fake_redis.available = True
        fake_redis.get = AsyncMock(return_value=payload)
        fake_redis.set = AsyncMock(return_value=True)

        with patch("src.memory.episodic_memory.requests.post") as mock_post:
            from src.memory.episodic_memory import EpisodicMemoryService
            svc = EpisodicMemoryService()
            result = await svc.generate_embedding_with_provider(text="cached-text")

    assert result["cached"] is True
    assert result["provider"] == EMBEDDING_PROVIDER_GEMINI
    assert result["vector"] == cached_vec
    mock_post.assert_not_called()


@pytest.mark.asyncio
async def test_cache_miss_stores_result() -> None:
    """A successful Gemini call must populate the cache for next time."""
    with patch("src.memory.episodic_memory.requests.post") as mock_post, \
         patch("src.memory.episodic_memory.get_settings", return_value=_settings_with_key("k")), \
         patch.object(embedding_cache, "redis_client") as fake_redis:
        mock_post.return_value = MagicMock(
            ok=True, json=lambda: {"embedding": {"values": [0.7] * 768}}
        )
        fake_redis.available = True
        fake_redis.get = AsyncMock(return_value=None)
        fake_redis.set = AsyncMock(return_value=True)

        from src.memory.episodic_memory import EpisodicMemoryService
        svc = EpisodicMemoryService()
        await svc.generate_embedding_with_provider(text="fresh-text")

    assert fake_redis.set.await_count == 1
    call_args = fake_redis.set.await_args
    payload = json.loads(call_args.args[1])
    assert payload["provider"] == EMBEDDING_PROVIDER_GEMINI
    assert payload["model"] == "gemini-embedding-2"
    assert payload["dimension"] == 768
    ttl = call_args.kwargs.get("ttl", call_args.args[2] if len(call_args.args) > 2 else None)
    assert ttl == 24 * 60 * 60


@pytest.mark.asyncio
async def test_pseudo_never_cached() -> None:
    """Pseudo fallback results must never pollute the cache."""
    with patch("src.memory.episodic_memory.get_settings", return_value=_settings_with_key(None)), \
         patch.object(embedding_cache, "redis_client") as fake_redis:
        fake_redis.available = True
        fake_redis.get = AsyncMock(return_value=None)
        fake_redis.set = AsyncMock(return_value=True)

        from src.memory.episodic_memory import EpisodicMemoryService
        svc = EpisodicMemoryService()
        result = await svc.generate_embedding_with_provider(text="x")

    assert result["provider"] == EMBEDDING_PROVIDER_PSEUDO
    fake_redis.set.assert_not_called()
