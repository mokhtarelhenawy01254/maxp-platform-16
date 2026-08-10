from __future__ import annotations

import hashlib
import time

import structlog

from src.config import get_settings

logger = structlog.get_logger(__name__)


class PromptCacheService:
    """Manages prompt caching for LLM providers.

    Handles Google Gemini cachedContent API for system prompts
    and prefix caching for repeated instruction blocks.
    Reduces costs by 75-90% on cached input tokens.
    """

    def __init__(self) -> None:
        self._cache: dict[str, CachedEntry] = {}
        self._settings = get_settings()
        self._default_ttl = 1800

    def _hash_key(self, company_id: str, prompt_type: str, instructions: str) -> str:
        raw = f"{company_id}:{prompt_type}:{instructions}"
        return hashlib.sha256(raw.encode()).hexdigest()[:32]

    async def get_or_create_cached_prompt(
        self,
        company_id: str,
        prompt_type: str,
        instructions: str,
        ttl: int | None = None,
    ) -> CachedPrompt:
        cache_key = self._hash_key(company_id, prompt_type, instructions)
        now = int(time.time())

        existing = self._cache.get(cache_key)
        if existing and now < existing.expires_at:
            logger.debug("prompt cache hit", cache_key=cache_key)
            return CachedPrompt(
                cache_key=cache_key,
                cached_content_name=existing.cached_content_name,
                is_fresh=True,
                instructions=instructions,
            )

        cached_name = await self._create_cached_content(
            instructions,
            ttl or self._default_ttl,
        )

        self._cache[cache_key] = CachedEntry(
            cached_content_name=cached_name,
            expires_at=now + (ttl or self._default_ttl),
            created_at=now,
        )

        logger.info("prompt cache created", cache_key=cache_key, name=cached_name)
        return CachedPrompt(
            cache_key=cache_key,
            cached_content_name=cached_name,
            is_fresh=False,
            instructions=instructions,
        )

    async def _create_cached_content(self, instructions: str, ttl: int) -> str:
        from src.llm.key_resolver import get_active_key

        api_key = await get_active_key("GOOGLE")
        if not api_key:
            return ""

        import google.generativeai as genai

        genai.configure(api_key=api_key)

        try:
            cached = genai.cached_content(
                model="models/gemini-2.5-flash",
                system_instruction=instructions,
                ttl=f"{ttl}s",
            )
            return cached.name
        except Exception as exc:
            logger.warning("failed to create cached content", error=str(exc))
            return ""

    def invalidate(self, company_id: str, prompt_type: str) -> None:
        keys_to_remove = [
            k for k in self._cache if k.startswith(
                hashlib.sha256(f"{company_id}:{prompt_type}".encode()).hexdigest()[:8]
            )
        ]
        for k in keys_to_remove:
            self._cache.pop(k, None)
        logger.info("prompt cache invalidated", company_id=company_id, prompt_type=prompt_type)


class CachedPrompt:
    def __init__(
        self,
        cache_key: str,
        cached_content_name: str,
        is_fresh: bool,
        instructions: str,
    ) -> None:
        self.cache_key = cache_key
        self.cached_content_name = cached_content_name
        self.is_fresh = is_fresh
        self.instructions = instructions


class CachedEntry:
    def __init__(self, cached_content_name: str, expires_at: int, created_at: int) -> None:
        self.cached_content_name = cached_content_name
        self.expires_at = expires_at
        self.created_at = created_at


prompt_cache_service = PromptCacheService()
