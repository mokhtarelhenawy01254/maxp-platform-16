from __future__ import annotations

from typing import Any

import structlog
from telethon import TelegramClient

logger = structlog.get_logger(__name__)

class TelegramUserbotClient:
    """Client for interacting with Telegram via a Userbot (Telethon)."""

    def __init__(self, api_id: int, api_hash: str, session_str: str | None = None):
        self.api_id = api_id
        self.api_hash = api_hash
        self.session_str = session_str
        self._client: TelegramClient | None = None

    async def connect(self) -> None:
        """Initialize and start the Telethon client."""
        if self._client:
            return

        # Create client using session string for persistence
        self._client = TelegramClient(
            StringSession(self.session_str) if self.session_str else "ai_service_session",
            self.api_id,
            self.api_hash,
        )
        await self._client.start()
        logger.info("telegram userbot connected")

    async def send_message(self, entity: str | int, text: str) -> Any:
        """Send a message to a user, chat, or channel."""
        if not self._client:
            await self.connect()

        try:
            return await self._client.send_message(entity, text)
        except Exception as e:
            logger.error("failed to send telegram message", entity=entity, error=str(e))
            raise

    async def get_user_info(self, user_id: str) -> dict[str, Any]:
        """Fetch user profile info."""
        if not self._client:
            await self.connect()

        user = await self._client.get_entity(user_id)
        return {
            "id": user.id,
            "first_name": getattr(user, "first_name", ""),
            "last_name": getattr(user, "last_name", ""),
            "username": getattr(user, "username", ""),
            "phone": getattr(user, "phone", ""),
        }

    async def close(self) -> None:
        if self._client:
            await self._client.disconnect()
            self._client = None

from telethon.sessions import StringSession
