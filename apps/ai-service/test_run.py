import asyncio
import traceback
import uuid
from sqlalchemy import select
from src.config import get_settings
from src.db import session as db_session
from src.db.models.thread import Thread
from src.workflows.orchestration_flow import run_orchestration

async def test():
    await db_session.init_db()
    
    message = 'ايه المنتجات المتاحة عندكم؟'
    thread_id = '12345678-1234-5678-1234-567812345678'
    company_id = 'cmptxk6k30000vpf07j03os8s'
    customer_id = 'test-customer-123'
    agent_id = 'agent_03os8s_7'

    async with db_session.async_session() as session:
        try:
            # Ensure the thread exists in the database first to satisfy foreign key constraints
            stmt = select(Thread).where(Thread.id == uuid.UUID(thread_id))
            existing_thread = (await session.execute(stmt)).scalar_one_or_none()
            if not existing_thread:
                new_thread = Thread(
                    id=uuid.UUID(thread_id),
                    company_id=company_id,
                    customer_id=customer_id,
                    channel='chat',
                    status='active'
                )
                session.add(new_thread)
                await session.commit()
                print("Created thread in database:", thread_id)
            
            print("Running orchestration...")
            res = await run_orchestration(
                message=message,
                thread_id=thread_id,
                company_id=company_id,
                customer_id=customer_id,
                session=session
            )
            print("Success result:", res)
        except Exception as e:
            print("Error occurred:")
            traceback.print_exc()
            
    await db_session.close_db()

if __name__ == '__main__':
    asyncio.run(test())
