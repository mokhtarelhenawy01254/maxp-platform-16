from __future__ import annotations

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.config import get_settings

engine: AsyncEngine | None = None
async_session: async_sessionmaker[AsyncSession] | None = None


async def init_db() -> None:
    """Initialize DB engine and session factory."""
    settings = get_settings()
    global engine, async_session
    engine = create_async_engine(
        settings.database_url, pool_size=5, max_overflow=10, echo=settings.debug
    )
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def close_db() -> None:
    """Dispose DB engine."""
    global engine, async_session
    if engine:
        await engine.dispose()
        engine = None
        async_session = None


async def get_session() -> AsyncSession:
    """Dependency: yield async session."""
    global async_session
    if async_session is None:
        await init_db()
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
