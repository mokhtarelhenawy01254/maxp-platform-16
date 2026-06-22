from __future__ import annotations

import os

from fastapi import APIRouter, HTTPException, Query, Request

from src.workers.agent_worker import enqueue_agent_task

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

WEBHOOK_VERIFY_TOKEN = os.getenv("META_WA_WEBHOOK_VERIFY_TOKEN", "")


@router.get("/")
async def verify_webhook(
    mode: str = Query(..., alias="hub.mode"),
    token: str = Query(..., alias="hub.verify_token"),
    challenge: str = Query(..., alias="hub.challenge"),
):
    """Verify the WhatsApp webhook for Meta."""
    if mode == "subscribe" and token == WEBHOOK_VERIFY_TOKEN:
        return int(challenge) if challenge.isdigit() else challenge
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/")
async def whatsapp_webhook(request: Request):
    """Receive incoming WhatsApp events."""
    payload = await request.json()

    entries = payload.get("entry", [])
    for entry in entries:
        changes = entry.get("changes", [])
        for change in changes:
            value = change.get("value", {})
            messages = value.get("messages", [])

            for msg in messages:
                sender_id = msg.get("from")
                msg_body = msg.get("text", {}).get("body")
                phone_number_id = value.get("metadata", {}).get("phone_number_id")

                if sender_id and msg_body and phone_number_id:
                    await enqueue_agent_task(
                        task_type="whatsapp.message",
                        payload={
                            "sender_id": sender_id,
                            "text": msg_body,
                            "phone_number_id": phone_number_id,
                        },
                        priority=1,
                    )

    return {"status": "ok"}
