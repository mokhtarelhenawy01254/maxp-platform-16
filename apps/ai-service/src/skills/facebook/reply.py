from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, Field
from src.skills.base import Skill


class FacebookReplyInput(BaseModel):
    recipient_id: str = Field(description="The Facebook Page-Scoped ID (PSID) of the customer recipient")
    message: str = Field(description="The text message content to send")
    page_id: str = Field(description="The Facebook Page ID representing the sending page")
    company_id: str = Field(default="", description="")


async def send_facebook_reply(params: FacebookReplyInput) -> dict:
    from src.tools.definitions.facebook import facebook_reply, FacebookReplyInput as RealInput
    inp = RealInput(
        recipient_id=params.recipient_id,
        message=params.message,
        page_id=params.page_id,
        company_id=params.company_id,
    )
    return await facebook_reply(inp)


facebook_reply = Skill(
    name="facebook_reply",
    description="Send a Facebook Messenger reply directly to a customer. Use ONLY for sending follow-up messages or proactive outreach on Facebook. The main reply is sent automatically — use this for additional messages.",
    input_schema=FacebookReplyInput,
    handler=send_facebook_reply,
    internal_fields=["company_id"],
)
