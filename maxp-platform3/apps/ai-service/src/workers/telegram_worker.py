from __future__ import annotations

import structlog
from telethon import TelegramClient, events

from src.workers.agent_worker import enqueue_agent_task

logger = structlog.get_logger(__name__)

class TelegramWorker:
    """Listen for Telegram events and enqueue them as AI tasks."""

    def __init__(self, api_id: int, api_hash: str, session_str: str | None = None):
        self.api_id = api_id
        self.api_hash = api_hash
        self.session_str = session_str
        self.client = TelegramClient(
            session_str or "ai_service_session",
            api_id,
            api_hash,
        )

    async def start(self) -> None:
        """Start the Telegram client and register event handlers."""
        await self.client.start()
        logger.info("telegram worker started")

        @self.client.on(events.NewMessage(incoming=True))
        async def handler(event):
            sender = await event.get_sender()
            if not sender:
                return

            # Extract basic info
            sender_id = str(event.sender_id)
            text = event.text

            # Lookup company associated with this telegram_id
            from src.db.session import async_session
            company_id = "default_company"
            async with async_session() as session:
                row = await session.execute(
                    "SELECT company_id FROM customers WHERE telegram_id = :sid LIMIT 1",
                    {"sid": sender_id}
                )
                res = row.scalar_one_or_none()
                if res:
                    company_id = res

            logger.info("telegram message received", sender_id=sender_id, text=text, company_id=company_id)

            # Enqueue for the agent_worker to process
            await enqueue_agent_task(
                task_type="telegram.message",
                payload={
                    "sender_id": sender_id,
                    "text": text,
                    "company_id": company_id,
                    "mid": str(event.id),
                },
                priority=1,
            )


        await self.client.run_until_disconnected()

    async def stop(self) -> None:
        await self.client.disconnect()

async def run_telegram_worker():
    """Entry point to run the telegram worker."""
    from src.db.repo.telegram_config_repo import TelegramConfigRepository
    from src.db.session import async_session

    async with async_session() as session:
        repo = TelegramConfigRepository(session)
        # For now, we take the first active config as the global userbot
        # In production, we would spawn multiple workers or use a single bot for all
        config = await repo.get_active_config("global") or await repo.get_active_config("")

        if not config:
            logger.error("no active telegram configuration found in database")
            return

        worker = TelegramWorker(
            api_id=int(config.api_id) if config.api_id else 0,
            api_hash=config.api_hash or "",
            session_str=config.session_string
        )
        try:
            await worker.start()
        except Exception as e:
            logger.error("telegram worker failed", error=str(e))
        finally:
            await worker.stop()
