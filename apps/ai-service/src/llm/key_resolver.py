from __future__ import annotations

import structlog

logger = structlog.get_logger(__name__)

# Provider -> active apiKey (cached after first DB read)
_cache: dict[str, str] = {}


async def get_active_key(provider: str = "GOOGLE") -> str | None:
    """Return the active API key for a provider from the DB (ai_keys table).

    This is the DB-first source of truth for API keys. Environment variables
    are intentionally not consulted here.
    """
    from src.db.session import async_session
    from sqlalchemy import text

    cached = _cache.get(provider.upper())
    if cached:
        return cached

    if async_session is None:
        logger.warning("key_resolver.db_uninitialized", provider=provider)
        return None

    try:
        async with async_session() as db:
            row = await db.execute(
                text(
                    'SELECT "apiKey" FROM public.ai_keys '
                    'WHERE provider = :provider AND "isActive" = true '
                    'ORDER BY priority ASC, "createdAt" ASC LIMIT 1'
                ),
                {"provider": provider.upper()},
            )
            result = row.fetchone()
            if result and result[0]:
                _cache[provider.upper()] = result[0]
                return result[0]
    except Exception as exc:
        logger.warning("key_resolver.db_fetch_failed", provider=provider, error=str(exc)[:120])
        return _cache.get(provider.upper())

    return None


def get_active_key_sync(provider: str = "GOOGLE") -> str | None:
    """Sync variant for callers that cannot await (psycopg2 direct read)."""
    import psycopg2
    from urllib.parse import urlparse

    from src.config import get_settings

    cached = _cache.get(provider.upper())
    if cached:
        return cached

    settings = get_settings()
    url = settings.database_url.replace("+asyncpg", "")
    parsed = urlparse(url)

    try:
        conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=parsed.username,
            password=parsed.password,
            dbname=parsed.path.lstrip("/"),
            connect_timeout=5,
        )
        try:
            cur = conn.cursor()
            cur.execute(
                'SELECT "apiKey" FROM public.ai_keys '
                'WHERE provider = %s AND "isActive" = true '
                'ORDER BY priority ASC, "createdAt" ASC LIMIT 1',
                (provider.upper(),),
            )
            row = cur.fetchone()
            cur.close()
            if row and row[0]:
                _cache[provider.upper()] = row[0]
                return row[0]
        finally:
            conn.close()
    except Exception as exc:
        logger.warning("key_resolver.sync_fetch_failed", provider=provider, error=str(exc)[:120])
        return _cache.get(provider.upper())

    return None
