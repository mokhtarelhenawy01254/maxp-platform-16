from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill

class ComplaintInput(BaseModel):
    orderId: str | None = Field(None, description="Order ID related to the complaint")
    issue: str = Field(description="Description of the complaint or issue")
    priority: str | None = Field(None, description="Priority level: high, medium, low")

async def handle_complaint(params: ComplaintInput) -> dict:
    # ponytail: stub — creates complaint ticket, handoff to support
    return {
        "status": "ticket_created",
        "ticketId": "tkt_" + __import__("uuid").uuid4().hex[:12],
        "priority": params.priority or "medium",
        "message": "تم تسجيل شكواك. فريق الدعم سيتولى المتابعة.",
    }

support_complaint = Skill(
    name="support_complaint",
    description="Handle customer complaints, damage reports, or service issues. Use when customer has a complaint about product, delivery, or service quality. Arabic keywords: شكوى, مشكلة, عطل, تلف, سيء, مش عجبني, غلط, اتأخر",
    input_schema=ComplaintInput,
    handler=handle_complaint,
)
