import asyncio
from src.main import app
from src.workflows.support_flow import run_support
import src.db.session as db_session
from src.config import get_settings

async def main():
    await db_session.init_db()
    async with db_session.async_session():
        try:
            print("Running support agent with Gemini...")
            result = await run_support(
                message="Hello!",
                thread_id="test-thread",
                company_id="company-1",
                customer_id="customer-1",
                session=None, # run_support will use the session if provided or handle it
            )
            print(f"Result: {result}")
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())

