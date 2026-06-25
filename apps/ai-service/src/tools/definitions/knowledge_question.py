from __future__ import annotations

import json
import uuid
from typing import Any

import structlog
from agent_framework import FunctionTool
from pydantic import BaseModel, Field
from sqlalchemy import text

logger = structlog.get_logger(__name__)


class KnowledgeAskMerchantInput(BaseModel):
    customer_question: str = Field(description="REQUIRED: The exact question the customer asked that the AI couldn't find an answer for. You MUST copy the customer's question here — do NOT omit this field.")
    conversation_id: str | None = Field(default=None, description="Conversation/thread ID")
    channel: str | None = Field(default=None, description="Communication channel (facebook, whatsapp, chat, etc.)")
    context: str | None = Field(default=None, description="JSON string with additional context like product IDs, order IDs, etc.")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def knowledge_ask_merchant(input_data: KnowledgeAskMerchantInput) -> dict[str, Any]:
    company_id = input_data.company_id or ""
    if not company_id:
        return {"status": "error", "message": "Company ID is required"}

    qid = str(uuid.uuid4())
    ctx = {}
    if input_data.context:
        try:
            ctx = json.loads(input_data.context)
        except (json.JSONDecodeError, TypeError):
            ctx = {"raw": input_data.context}

    try:
        from src.db.session import get_session

        sql = text("""
            INSERT INTO ai.knowledge_questions
                (id, company_id, conversation_id, channel, customer_question, context, status, created_at, updated_at)
            VALUES
                (:id, :company_id, :conversation_id, :channel, :customer_question, CAST(:context AS jsonb), 'pending', now(), now())
        """)
        async for sess in get_session():
            await sess.execute(sql, {
                "id": qid,
                "company_id": company_id,
                "conversation_id": input_data.conversation_id,
                "channel": input_data.channel or "chat",
                "customer_question": input_data.customer_question,
                "context": json.dumps(ctx),
            })
            await sess.commit()

        logger.info("knowledge_question_created", id=qid, company=company_id)
        return {
            "status": "success",
            "question_id": qid,
            "message": (
                "I've noted this question and the merchant will be asked to provide an answer. "
                "Tell the customer: 'I'll check on that and get back to you shortly.'"
            ),
        }
    except Exception as exc:
        logger.error("knowledge_question_creation_failed", error=str(exc))
        return {"status": "error", "message": f"Failed to save knowledge question: {str(exc)}"}


knowledge_ask_merchant_tool = FunctionTool(
    name="knowledge_ask_merchant",
    description=(
        "Ask the merchant for information when the AI cannot answer a customer's question. "
        "The merchant will see this question on their dashboard and provide an answer. "
        "Use this when you don't have enough information about pricing, policies, promotions, "
        "stock availability, or any other merchant-specific knowledge. "
        "After calling this tool, tell the customer you will check and get back to them."
    ),
    func=knowledge_ask_merchant,
    input_model=KnowledgeAskMerchantInput,
)

__all_tools__ = [knowledge_ask_merchant_tool]
