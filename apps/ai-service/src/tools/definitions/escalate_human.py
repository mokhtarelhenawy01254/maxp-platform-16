from __future__ import annotations

from typing import Any

import structlog
from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools.backend_client import get_backend_client

logger = structlog.get_logger(__name__)


class EscalateToHumanInput(BaseModel):
    reason: str = Field(..., description="Short reason why a human teammate must follow up (complaint, refund request, unknown info the customer insists on, management confirmation).")
    customer_request: str | None = Field(default=None, description="What the customer asked for, in one short sentence.")
    conversation_id: str | None = Field(default=None, description="Conversation/thread ID (auto-injected when available)")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def escalate_to_human(input_data: EscalateToHumanInput) -> dict[str, Any]:
    """Flags the conversation for human follow-up so a teammate sees it in the inbox."""
    company_id = input_data.company_id or ""
    conversation_id = input_data.conversation_id or ""
    if not company_id or not conversation_id:
        return {"status": "error", "message": "company_id and conversation_id are required"}

    client = get_backend_client()
    try:
        result = await client.flag_conversation_for_human(
            company_id=company_id,
            conversation_id=conversation_id,
            reason=input_data.reason[:200],
        )
        logger.info(
            "escalate_to_human_flagged",
            company_id=company_id,
            conversation_id=conversation_id,
            reason=input_data.reason[:100],
        )
        return {
            "status": "success",
            "flagged": bool(result.get("flagged", True)),
            "message": (
                "المحادثة اتعلّمت للفريق البشري بمراجعة — قولي للعميل: "
                "«حد من فريقنا هيكلم حضرتك قريب»"
            ),
        }
    except Exception as exc:
        logger.error("escalate_to_human_failed", error=str(exc))
        return {"status": "error", "message": f"تعذر وضع علامة المتابعة: {str(exc)[:150]}"}


escalate_to_human_tool = FunctionTool(
    name="escalate_to_human",
    description=(
        "Flag the current conversation for HUMAN teammate follow-up. Use ONLY when you cannot "
        "resolve the customer's request yourself: complaints or angry customers, refunds/payments, "
        "management approval the customer insists on, or any request outside your center's programs. "
        "Do NOT use for normal questions you can answer. After flagging, tell the customer a teammate "
        "will follow up shortly."
    ),
    func=escalate_to_human,
    input_model=EscalateToHumanInput,
)

__all_tools__ = [escalate_to_human_tool]
