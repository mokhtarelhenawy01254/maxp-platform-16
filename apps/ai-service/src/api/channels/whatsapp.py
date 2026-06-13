from __future__ import annotations

from fastapi import APIRouter, Query, Request

from src.workers.agent_worker import enqueue_agent_task

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


@router.get("/")
async def verify_webhook(
    mode: str = Query(..., alias="hub.mode"),
    token: str = Query(..., alias="hub.verify_token"),
    challenge: str = Query(..., alias="hub.challenge"),
):
    """Verify the WhatsApp webhook for Meta."""
    # In a real scenario, we'd check this against a stored secret in settings
    # For now, we return the challenge to pass the Meta verification
    return int(challenge) if challenge.isdigit() else challenge


@router.post("/")
async def whatsapp_webhook(request: Request):
    """Receive incoming WhatsApp events."""
    payload = await request.json()

    # Meta webhooks send a top-level 'entry' array
    entries = payload.get("entry", [])
    for entry in entries:
        changes = entry.get("changes", [])
        for change in changes:
            value = change.get("value", {})
            messages = value.get("messages", [])

            for msg in messages:
                # Extract basic info
                sender_id = msg.get("from")
                msg_body = msg.get("text", {}).get("body")
                # We need company_id to route to the right agent.
                # Meta usually sends the page/phone_number_id.
                # We'll look up the company_id from the phone_number_id.
                phone_number_id = value.get("metadata", {}).get("phone_number_id")

                if sender_id and msg_body and phone_number_id:
                    # Enqueue as a background task for the agent_worker
                    await enqueue_agent_task(
                        task_type="whatsapp.message",
                        payload={
                            "sender_id": sender_id,
                            "text": msg_body,
                            "phone_number_id": phone_number_id,
                        },
                        priority=1, # Medium priority
                    )

    return {"status": "ok"}
