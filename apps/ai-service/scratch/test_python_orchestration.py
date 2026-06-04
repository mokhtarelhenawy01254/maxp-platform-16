import asyncio
import os
import sys

# Ensure apps/ai-service is in sys.path
sys.path.append(os.path.abspath(os.path.dirname(__file__) + "/.."))

from src.workflows.orchestration_flow import run_orchestration

async def test():
    print("Running run_orchestration test directly...")
    try:
        res = await run_orchestration(
            message="hello, what products do you have?",
            thread_id="test-thread-direct-001",
            company_id="cmptxk6k30000vpf07j03os8s",
            customer_id="test-user-456",
            session=None,
        )
        print("SUCCESS! Result:")
        print(res)
    except Exception as e:
        print("FAILED with error:", str(e))
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
