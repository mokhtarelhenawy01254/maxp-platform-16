import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check():
    engine = create_async_engine('postgresql+asyncpg://appuser:0165676135@localhost:5432/maxp')
    async with engine.connect() as conn:
        # Final state check
        print('=== FINAL DB STATE AFTER REFACTOR ===')
        
        result = await conn.execute(text('SELECT COUNT(*) FROM ai.agent_templates'))
        print(f'ai.agent_templates: {result.scalar()} rows')
        
        result = await conn.execute(text('SELECT COUNT(*) FROM ai.agents'))
        print(f'ai.agents: {result.scalar()} rows')
        
        result = await conn.execute(text("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'ai' AND table_name = 'company_agents'
        """))
        print(f'ai.company_agents exists: {bool(result.fetchone())}')
        
        result = await conn.execute(text("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'agent_definitions'
        """))
        print(f'public.agent_definitions exists: {bool(result.fetchone())}')
        
        # Check template slugs
        result = await conn.execute(text('SELECT slug, role, name FROM ai.agent_templates ORDER BY slug'))
        print('\\nAgent Templates:')
        for row in result.fetchall():
            print(f'  {row[0]} ({row[1]}): {row[2]}')
        
        # Check agent with new fields
        result = await conn.execute(text("""
            SELECT id, name, role, soul, department_id, manager_type
            FROM ai.agents WHERE soul IS NOT NULL LIMIT 5
        """))
        print('\\nAgents with new fields:')
        for row in result.fetchall():
            soul_preview = (row[3] or '')[:40]
            print(f'  {row[0][:15]}... | {row[1]} | {row[2]} | soul={soul_preview}... | dept={row[4]} | mgr={row[5]}')
        
    await engine.dispose()

asyncio.run(check())
