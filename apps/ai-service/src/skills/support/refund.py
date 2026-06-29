from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill

class RefundRequestInput(BaseModel):
    orderId: str | None = Field(None, description="Order ID for the refund")
    reason: str = Field(description="Reason for refund/return")
    items: str | None = Field(None, description="Items to return, if specific")

async def request_refund(params: RefundRequestInput) -> dict:
    # ponytail: stub — creates refund ticket, handoff to support team
    return {
        "status": "ticket_created",
        "ticketId": "tkt_" + __import__("uuid").uuid4().hex[:12],
        "requiresManualReview": True,
        "message": "تم استلام طلب الاسترجاع. فريق الدعم سيتواصل معك قريباً.",
    }

support_refund = Skill(
    name="support_refund",
    description="Handle refund, return, or financial dispute requests. Use when customer wants to return a product, get a refund, or has a payment issue. Arabic keywords: استرجاع, مرتجع, استرداد, فلوس, refund, مرجوع, شكوى مالية",
    input_schema=RefundRequestInput,
    handler=request_refund,
)
