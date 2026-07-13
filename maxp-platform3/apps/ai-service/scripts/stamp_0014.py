import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def stamp():
    engine = create_async_engine('postgresql+asyncpg://appuser:0165676135@localhost:5432/maxp')
    async with engine.connect() as conn:
        await conn.execute(text("UPDATE ai.alembic_version SET version_num = '0014'"))
        await conn.commit()
        print('Stamped alembic to 0014')
    await engine.dispose()

asyncio.run(stamp())
