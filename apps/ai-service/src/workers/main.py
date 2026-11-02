from __future__ import annotations

import asyncio
import os

import structlog

from src.db.session import close_db, init_db
from src.services.redis_client import redis_client
from src.workers.agent_worker import start_worker
from src.workers.scheduler_worker import start_scheduler_worker
from src.workers.telegram_worker import run_telegram_worker

logger = structlog.get_logger(__name__)

AGENT_WORKER_POOL_SIZE = int(os.getenv("AGENT_WORKER_POOL_SIZE", "4"))

async def main():
    """Main entry point for all background workers."""
    # 1. Initialize shared resources
    await init_db()
    await redis_client.connect()
    logger.info("database and redis initialized", pool_size=AGENT_WORKER_POOL_SIZE)

    # 2. Define workers to run concurrently
    workers = [
        start_worker(pool_size=AGENT_WORKER_POOL_SIZE), # The main agent-tasks dispatcher with worker pool
        run_telegram_worker(), # The Telegram event listener
        start_scheduler_worker(), # The Routine scheduler
    ]

    try:
        # Run all workers in parallel
        await asyncio.gather(*workers)
    except KeyboardInterrupt:
        logger.info("workers shutting down")
    except Exception as e:
        logger.error("worker process crashed", error=str(e))
    finally:
        await close_db()
        await redis_client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
