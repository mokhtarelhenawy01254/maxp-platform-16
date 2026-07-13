import asyncio
from src.db.session import get_db_session
from src.db.models.agent import AgentTemplate
from sqlalchemy import select

async def main():
    async with get_db_session() as session:
        result = await session.execute(
            select(AgentTemplate).where(AgentTemplate.slug == "social-media-image-agent")
        )
        template = result.scalar_one_or_none()
        if template:
            print(f"slug: {template.slug}")
            print(f"model_policy: {template.model_policy}")
        else:
            print("Template not found in DB")

asyncio.run(main())
