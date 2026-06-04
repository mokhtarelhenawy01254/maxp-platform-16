import asyncio
import traceback
from src.config import get_settings
from src.db import session as db_session
from src.workflows.orchestration_flow import run_orchestration

async def test():
    await db_session.init_db()
    
    message = 'ما اسمك؟ وما هو دورك؟ كلمني بالمصري'
    thread_id = 'test-thread-12345'
    company_id = 'cmptxk6k30000vpf07j03os8s'
    customer_id = 'test-customer-123'
    agent_id = 'agent_03os8s_7'

    async with db_session.async_session() as session:
        try:
            print("Running orchestration...")
            res = await run_orchestration(
                message=message,
                thread_id=thread_id,
                company_id=company_id,
                customer_id=customer_id,
                session=session,
                agent_id=agent_id
            )
            print("Success result:", res)
        except Exception as e:
            print("Error occurred:")
            traceback.print_exc()
            
    await db_session.close_db()

if __name__ == '__main__':
    asyncio.run(test())
