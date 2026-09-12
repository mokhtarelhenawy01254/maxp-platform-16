from __future__ import annotations

import os
from typing import Any

import httpx
import structlog

from src.tools.whatsapp_error_codes import WhatsAppAPIError, map_whatsapp_error

logger = structlog.get_logger(__name__)

META_GRAPH_API_VERSION = os.getenv("META_GRAPH_API_VERSION", "v26.0")
META_GRAPH_API_BASE_URL = os.getenv(
    "META_GRAPH_API_BASE_URL", "https://graph.facebook.com"
)


class WhatsAppClient:
    """Client for interacting with the WhatsApp Business Cloud API."""

    def __init__(self, page_access_token: str, phone_number_id: str):
        self.page_access_token = page_access_token
        self.phone_number_id = phone_number_id
        self._client = httpx.AsyncClient(
            base_url=f"{META_GRAPH_API_BASE_URL}/{META_GRAPH_API_VERSION}",
            headers={
                "Authorization": f"Bearer {page_access_token}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
            trust_env=False,
        )

    async def _request(self, method: str, path: str, **kwargs) -> dict[str, Any]:
        try:
            response = await self._client.request(method, path, **kwargs)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as exc:
            mapped = map_whatsapp_error(exc)
            raise WhatsAppAPIError(
                code=mapped["code"],
                reason=mapped["reason"],
                retryable=mapped["retryable"],
                api_message=mapped["api_message"],
                http_status=mapped["http_status"],
                details=mapped["details"],
            ) from exc

    async def send_text(self, recipient_id: str, text: str) -> dict[str, Any]:
        payload = {
            "messaging_product": "whatsapp",
            "to": recipient_id,
            "type": "text",
            "text": {"body": text},
        }
        return await self._request("POST", f"/{self.phone_number_id}/messages", json=payload)

    async def send_media(self, recipient_id: str, media_url: str, media_type: str) -> dict[str, Any]:
        media_key = media_type
        media_payload = {"link": media_url}
        if media_type == "document":
            media_payload["filename"] = "file"

        payload = {
            "messaging_product": "whatsapp",
            "to": recipient_id,
            "type": media_type,
            media_key: media_payload,
        }

        return await self._request("POST", f"/{self.phone_number_id}/messages", json=payload)

    async def close(self) -> None:
        await self._client.aclose()
