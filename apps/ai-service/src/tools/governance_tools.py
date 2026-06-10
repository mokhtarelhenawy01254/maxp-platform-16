from __future__ import annotations

from typing import Any

import structlog

from src.tools.backend_client import get_backend_client

logger = structlog.get_logger(__name__)


async def send_whatsapp(
    company_id: str, phone: str, message: str
) -> dict[str, Any]:
    """Send a WhatsApp message to a customer."""
    client = get_backend_client()
    return await client.send_whatsapp_message(company_id, phone, message)


async def send_facebook_reply(
    company_id: str,
    recipient_id: str,
    message: str,
    page_id: str,
    message_type: str = "TEXT",
    media_url: str | None = None,
) -> dict[str, Any]:
    """Send a Facebook Messenger reply to a customer."""
    client = get_backend_client()
    return await client.send_facebook_message(
        company_id,
        recipient_id,
        message,
        page_id,
        message_type=message_type,
        media_url=media_url,
    )
