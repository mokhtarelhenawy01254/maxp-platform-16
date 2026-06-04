import asyncio
from src.main import app
from src.workflows.orchestration_flow import run_orchestration
import src.db.session as db_session
from src.config import get_settings

async def main():
    await db_session.init_db()
    async with db_session.async_session():
        try:
            print("Running CEO Orchestrator...")
            result = await run_orchestration(
                message="عايز ألغي الطلب بتاعي",
                thread_id="test-orchestration",
                company_id="company-1",
                customer_id="customer-1",
                session=None,
            )
            print(f"Result: {result}")
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())

