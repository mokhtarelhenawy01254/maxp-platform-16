from __future__ import annotations

from typing import Any, Literal

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools import governance_tools


class FacebookReplyInput(BaseModel):
    recipient_id: str = Field(description="The Facebook Page-Scoped ID (PSID) of the customer recipient")
    message: str | None = Field(default=None, description="The text message content to send")
    page_id: str = Field(description="The Facebook Page ID representing the sending page")
    message_type: Literal["TEXT", "IMAGE"] = Field(default="TEXT", description="The Facebook message type to send")
    media_url: str | None = Field(default=None, description="Media URL to send as a Messenger image attachment")
    image_url: str | None = Field(default=None, description="Image URL to send as a Messenger image attachment")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def facebook_reply(input_data: FacebookReplyInput) -> dict[str, Any]:
    media_url = input_data.media_url or input_data.image_url
    return await governance_tools.send_facebook_reply(
        input_data.company_id or "",
        input_data.recipient_id,
        input_data.message or "",
        input_data.page_id,
        message_type=input_data.message_type,
        media_url=media_url,
    )


facebook_reply_tool = FunctionTool(
    name="facebook_reply",
    description="Send a direct Facebook Messenger text or image reply to a customer.",
    func=facebook_reply,
    input_model=FacebookReplyInput,
)

__all_tools__ = [
    facebook_reply_tool,
]
