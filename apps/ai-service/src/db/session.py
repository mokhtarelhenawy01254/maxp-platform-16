from __future__ import annotations

from typing import Any
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from sqlalchemy.pool import NullPool

from src.config import get_settings

engine: AsyncEngine | None = None
async_session: async_sessionmaker[AsyncSession] | None = None
async_session_factory: async_sessionmaker[AsyncSession] | None = None


async def init_db() -> None:
    """Initialize DB engine and session factory with connection pooling."""
    settings = get_settings()
    global engine, async_session, async_session_factory
    extra_engine_kwargs: dict[str, Any] = {
        "echo": settings.debug,
    }
    if "sqlite" in settings.database_url:
        pass
    else:
        extra_engine_kwargs.update({
            "pool_size": getattr(settings, "db_pool_size", 10),
            "max_overflow": getattr(settings, "db_max_overflow", 20),
            "pool_timeout": getattr(settings, "db_pool_timeout", 30),
            "pool_recycle": getattr(settings, "db_pool_recycle", 1800),
            "pool_pre_ping": True,
        })
    engine = create_async_engine(
        settings.database_url,
        **extra_engine_kwargs,
    )
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async_session_factory = async_session



async def close_db() -> None:
    """Dispose DB engine."""
    global engine, async_session, async_session_factory
    if engine:
        await engine.dispose()
        engine = None
        async_session = None
        async_session_factory = None


async def get_session() -> AsyncSession:
    """Dependency: yield async session with safe teardown."""
    global async_session
    if async_session is None:
        await init_db()
    session = async_session()
    try:
        yield session
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass
        raise
    finally:
        try:
            await session.close()
        except Exception:
            pass


