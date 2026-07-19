from __future__ import annotations

import hashlib

import structlog

from src.services.redis_client import redis_client

logger = structlog.get_logger(__name__)

DEFAULT_TTL_SECONDS = 24 * 60 * 60
MULTIMODAL_TTL_SECONDS = 6 * 60 * 60
KEY_PREFIX = "embed:v1"


def _hash_text(text: str) -> str:
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()


def _hash_image(image_bytes: str | None) -> str:
    if not image_bytes:
        return ""
    return hashlib.sha256(image_bytes.encode("utf-8")).hexdigest()[:32]


def build_key(
    *,
    text: str | None,
    model: str,
    dimension: int,
    image_bytes: str | None = None,
    mime_type: str | None = None,
) -> str:
    text_hash = _hash_text(text or "")
    image_hash = _hash_image(image_bytes)
    mime = mime_type or "" if image_bytes else ""
    return f"{KEY_PREFIX}:{model}:{dimension}:{text_hash}:{image_hash}:{mime}"


async def get_cached_embedding(
    *,
    text: str | None,
    model: str,
    dimension: int,
    image_bytes: str | None = None,
    mime_type: str | None = None,
) -> dict | None:
    if not redis_client.available:
        return None
    key = build_key(
        text=text, model=model, dimension=dimension,
        image_bytes=image_bytes, mime_type=mime_type,
    )
    try:
        raw = await redis_client.get(key)
        if not raw:
            return None
        import json
        payload = json.loads(raw)
        vector = payload.get("vector")
        if isinstance(vector, list) and len(vector) == dimension:
            return {
                "vector": vector,
                "provider": payload.get("provider", "gemini"),
                "model": payload.get("model", model),
                "dimension": dimension,
                "cached": True,
            }
        return None
    except Exception as exc:
        logger.warning("embedding cache get failed", error=str(exc))
        return None


async def set_cached_embedding(
    *,
    text: str | None,
    model: str,
    dimension: int,
    vector: list[float],
    provider: str = "gemini",
    image_bytes: str | None = None,
    mime_type: str | None = None,
) -> bool:
    if provider != "gemini":
        return False
    if not isinstance(vector, list) or len(vector) != dimension:
        return False
    if not redis_client.available:
        return False
    key = build_key(
        text=text, model=model, dimension=dimension,
        image_bytes=image_bytes, mime_type=mime_type,
    )
    ttl = MULTIMODAL_TTL_SECONDS if image_bytes else DEFAULT_TTL_SECONDS
    try:
        import json
        payload = json.dumps({
            "vector": vector,
            "provider": provider,
            "model": model,
            "dimension": dimension,
        })
        return await redis_client.set(key, payload, ttl=ttl)
    except Exception as exc:
        logger.warning("embedding cache set failed", error=str(exc))
        return False
