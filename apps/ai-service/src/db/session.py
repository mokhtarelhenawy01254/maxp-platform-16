from __future__ import annotations

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
    """Initialize DB engine and session factory."""
    settings = get_settings()
    global engine, async_session, async_session_factory
    engine = create_async_engine(
        settings.database_url,
        poolclass=NullPool,
        echo=settings.debug,
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


