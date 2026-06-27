import asyncio, os, sys
sys.path.insert(0, '/var/www/ai-service')
os.environ['BACKEND_AGENTS_ROOT'] = '/var/www/backend2/agents'

async def main():
    from src.db.session import get_session
    from src.agents.loader import _discover_templates
    from sqlalchemy import text

    async for session in get_session():
        # Delete old template
        await session.execute(text("DELETE FROM ai.agent_templates WHERE slug = 'medical-center-agent'"))
        await session.commit()

        # Re-discover and create
        templates = _discover_templates()
        for data in templates:
            if data['slug'] == 'medical-center-agent':
                from src.db.models.agent import AgentTemplate
                t = AgentTemplate(**data)
                session.add(t)
                print(f"Created: {data['slug']} | tools={data['allowed_tools']}")
        await session.commit()
        break

asyncio.run(main())
