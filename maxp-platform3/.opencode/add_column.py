import asyncio
from sqlalchemy import text
from src.db.session import get_session

async def run():
    async_gen = get_session()
    session = await async_gen.__anext__()
    try:
        await session.execute(text("ALTER TABLE ai.agents ADD COLUMN IF NOT EXISTS custom_instructions JSONB DEFAULT '{}'::jsonb NOT NULL"))
        await session.commit()
        print("Column added successfully")
    finally:
        await session.close()

asyncio.run(run())
