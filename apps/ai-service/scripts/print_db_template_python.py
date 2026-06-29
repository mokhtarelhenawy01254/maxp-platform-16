import asyncio
from src.config import get_settings
from src.db.session import init_db, async_session
from src.db.models.agent import AgentTemplate
from sqlalchemy import select

async def main():
    await init_db()
    if async_session is None:
        print("Failed to initialize database!")
        return
    async with async_session() as session:
        result = await session.execute(
            select(AgentTemplate).where(AgentTemplate.slug == 'medical-center-agent')
        )
        t = result.scalar_one_or_none()
        if t:
            print("=== DB Template: medical-center-agent ===")
            print(f"Name: {t.name}")
            print(f"Role: {t.role}")
            print(f"Instructions Persona (t.instructions_persona):")
            print(repr(t.instructions_persona))
            print("\nInstructions Soul (t.instructions_soul):")
            print(repr(t.instructions_soul))
            print("=========================================")
        else:
            print("Template not found in DB!")

if __name__ == "__main__":
    asyncio.run(main())
