from __future__ import annotations

import json

import redis.asyncio as aioredis
import structlog

from src.config import get_settings

logger = structlog.get_logger(__name__)


class RedisClient:
    """Async Redis client for state management, caching, and rate limiting."""

    def __init__(self) -> None:
        self._client: aioredis.Redis | None = None
        self._settings = get_settings()

    async def connect(self) -> None:
        if self._client:
            return
        try:
            redis_url = self._settings.redis_url or "redis://localhost:6379/0"
            self._client = aioredis.from_url(
                redis_url,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
            )
            await self._client.ping()
            logger.info("redis connected")
        except Exception as exc:
            logger.warning("redis not available, running without cache", error=str(exc))
            self._client = None

    async def disconnect(self) -> None:
        if self._client:
            await self._client.close()
            self._client = None

    @property
    def available(self) -> bool:
        return self._client is not None

    async def get(self, key: str) -> str | None:
        if not self._client:
            return None
        try:
            return await self._client.get(key)
        except Exception as exc:
            logger.warning("redis get failed", key=key, error=str(exc))
            return None

    async def set(
        self,
        key: str,
        value: str | dict,
        ttl: int | None = None,
    ) -> bool:
        if not self._client:
            return False
        try:
            val = json.dumps(value) if isinstance(value, dict) else value
            if ttl:
                await self._client.setex(key, ttl, val)
            else:
                await self._client.set(key, val)
            return True
        except Exception as exc:
            logger.warning("redis set failed", key=key, error=str(exc))
            return False

    async def delete(self, key: str) -> bool:
        if not self._client:
            return False
        try:
            await self._client.delete(key)
            return True
        except Exception as exc:
            logger.warning("redis delete failed", key=key, error=str(exc))
            return False

    async def incr(self, key: str) -> int:
        if not self._client:
            return 0
        try:
            return await self._client.incr(key)
        except Exception as exc:
            logger.warning("redis incr failed", key=key, error=str(exc))
            return 0

    async def expire(self, key: str, ttl: int) -> bool:
        if not self._client:
            return False
        try:
            return await self._client.expire(key, ttl)
        except Exception as exc:
            logger.warning("redis expire failed", key=key, error=str(exc))
            return False

    async def acquire_lock(self, lock_key: str, ttl: int = 30) -> bool:
        if not self._client:
            return False
        try:
            result = await self._client.setnx(f"lock:{lock_key}", "1")
            if result:
                await self._client.expire(f"lock:{lock_key}", ttl)
            return bool(result)
        except Exception as exc:
            logger.warning("redis lock acquire failed", key=lock_key, error=str(exc))
            return False

    async def release_lock(self, lock_key: str) -> None:
        if self._client:
            await self._client.delete(f"lock:{lock_key}")


redis_client = RedisClient()
