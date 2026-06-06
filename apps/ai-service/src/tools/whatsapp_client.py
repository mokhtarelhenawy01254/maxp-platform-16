from __future__ import annotations

import httpx
import structlog
from typing import Any

logger = structlog.get_logger(__name__)

class WhatsAppClient:
    """Client for interacting with the WhatsApp Business Cloud API."""

    BASE_URL = "https://graph.facebook.com/v21.0"

    def __init__(self, page_access_token: str, phone_number_id: str):
        self.page_access_token = page_access_token
        self.phone_number_id = phone_number_id
        self._client = httpx.AsyncClient(
            base_url=self.BASE_URL,
            headers={"Content-Type": "application/json"},
            timeout=30.0,
            trust_env=False,
        )

    async def send_text(self, recipient_id: str, text: str) -> dict[str, Any]:
        """Send a text message to a WhatsApp user."""
        payload = {
            "messaging_product": "whatsapp",
            "to": recipient_id,
            "type": "text",
            "text": {"body": text},
            "access_token": self.page_access_token,
        }
        # Use the phone_number_id endpoint for sending messages
        response = await self._client.post(f"/{self.phone_number_id}/messages", json=payload)
        response.raise_for_status()
        return response.json()

    async def send_media(self, recipient_id: str, media_url: str, media_type: str) -> dict[str, Any]:
        """Send a media message (image, video, document) to a WhatsApp user."""
        payload = {
            "messaging_product": "whatsapp",
            "to": recipient_id,
            "type": media_type,
            "image": {"link": media_url} if media_type == "image" else None,
            "video": {"link": media_url} if media_type == "video" else None,
            "document": {"link": media_url, "filename": "file"},
            "access_token": self.page_access_token,
        }
        # Clean up None values
        payload = {k: v for k, v in payload.items() if v is not None}
        
        response = await self._client.post(f"/{self.phone_number_id}/messages", json=payload)
        response.raise_for_status()
        return response.json()

    async def close(self) -> None:
        await self._client.aclose()
