from __future__ import annotations

import os
from typing import Any

import httpx
import structlog

logger = structlog.get_logger(__name__)

class FacebookGraphClient:
    """Client for interacting with the Facebook Graph API."""

    META_GRAPH_API_VERSION = os.getenv("META_GRAPH_API_VERSION", "v25.0")
    BASE_URL = f"https://graph.facebook.com/{META_GRAPH_API_VERSION}"

    def __init__(self, page_access_token: str):
        self.page_access_token = page_access_token
        self._client = httpx.AsyncClient(
            base_url=self.BASE_URL,
            headers={"Content-Type": "application/json"},
            timeout=30.0,
            trust_env=False,
        )

    async def fetch_user_profile(self, user_id: str) -> dict[str, Any]:
        """Fetch user profile information."""
        params = {
            "fields": "first_name,last_name,profile_pic",
            "access_token": self.page_access_token,
        }
        response = await self._client.get(f"/{user_id}", params=params)
        response.raise_for_status()
        return response.json()

    async def send_message(self, recipient_id: str, text: str) -> dict[str, Any]:
        """Send a text message to a user."""
        payload = {
            "recipient": {"id": recipient_id},
            "message": {"text": text},
            "access_token": self.page_access_token,
        }
        response = await self._client.post("/me/messages", json=payload)
        response.raise_for_status()
        return response.json()

    async def reply_to_comment(self, comment_id: str, text: str) -> dict[str, Any]:
        """Reply to a Facebook comment."""
        payload = {
            "message": text,
            "access_token": self.page_access_token,
        }
        response = await self._client.post(f"/{comment_id}/comments", json=payload)
        response.raise_for_status()
        return response.json()

    async def send_media(self, recipient_id: str, media_url: str, media_type: str = "image") -> dict[str, Any]:
        """Send a media message (image) to a user via URL."""
        payload = {
            "recipient": {"id": recipient_id},
            "message": {
                "attachment": {
                    "type": media_type,
                    "payload": {"url": media_url, "is_reusable": False},
                }
            },
            "access_token": self.page_access_token,
        }
        response = await self._client.post("/me/messages", json=payload)
        response.raise_for_status()
        return response.json()

    async def hide_comment(self, comment_id: str) -> dict[str, Any]:
        """Hide a Facebook comment."""
        payload = {
            "is_hidden": True,
            "access_token": self.page_access_token,
        }
        response = await self._client.post(f"/{comment_id}", json=payload)
        response.raise_for_status()
        return response.json()

    async def close(self) -> None:
        await self._client.aclose()
