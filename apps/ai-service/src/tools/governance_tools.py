from __future__ import annotations

from typing import Any

import structlog
from sqlalchemy import text

import src.db.session as _db_mod
from src.tools.facebook_client import FacebookGraphClient

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
    if not company_id or not recipient_id or not page_id:
        return {"success": False, "error": "Missing required params"}

    sf = _db_mod.async_session
    async with sf() as sess:
        row = await sess.execute(text("""
            SELECT page_access_token FROM facebook_pages
            WHERE page_id = :pid AND company_id = :cid
            LIMIT 1
        """), {"pid": page_id, "cid": company_id})
        token_row = row.first()

    if not token_row:
        return {"success": False, "error": "Facebook page not configured or token not found"}

    token = token_row[0]
    client = FacebookGraphClient(token)

    try:
        if message_type == "IMAGE" and media_url:
            result = await client._client.request(
                "POST", "/me/messages",
                json={
                    "recipient": {"id": recipient_id},
                    "message": {
                        "attachment": {
                            "type": "image",
                            "payload": {"url": media_url, "is_reusable": True},
                        }
                    },
                    "access_token": token,
                },
            )
            result.raise_for_status()
            data = result.json()
        else:
            data = await client.send_message(recipient_id, message)

        return {"success": True, "result": data, "messageId": data.get("message_id", "")}
    except Exception as exc:
        logger.error("facebook_reply_failed", error=str(exc))
        return {"success": False, "error": str(exc)}
