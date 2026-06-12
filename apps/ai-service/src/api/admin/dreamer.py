from __future__ import annotations

import json
import re as _re
from typing import Any

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.llm.agent_client_factory import build_provider_client_async

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/dreamer", tags=["admin-dreamer"])


class DreamerRequest(BaseModel):
    company_id: str
    conversations: list[dict]
    consolidation_type: str = "summary"
    provider: str | None = None
    model: str | None = None


class DreamerResponse(BaseModel):
    success: bool
    result: dict | None = None
    error: str | None = None


SUMMARY_PROMPT_TEMPLATE = """You are a conversation analyst. Summarize the following conversations into a structured JSON object.

For EACH conversation, extract:
- "summary": a 2-3 sentence summary of the conversation
- "key_points": a list of the most important facts or outcomes
- "sentiment": one of "positive", "negative", "neutral"
- "intent": the primary customer intent (e.g. "product_inquiry", "support_request", "order_status", "complaint")

Return ONLY a JSON object with a "conversations" key containing an array of these objects, and an "overall" key with:
- "total_conversations": number of conversations
- "dominant_sentiment": the most common sentiment
- "common_intents": the top 3 most frequent intents

Conversations:
{conversations}
"""

FACTS_PROMPT_TEMPLATE = """You are a fact extractor. Extract factual claims and structured data from the following conversations.

For EACH conversation, extract:
- "entities": objects with names and types (person, product, order, location, etc.)
- "facts": a list of factual statements derived from the conversation
- "actions": any actions taken or requested (e.g. "order placed", "refund requested", "information provided")

Return ONLY a JSON object with a "conversations" key containing an array of these objects, and an "overall" key with:
- "total_conversations": number of conversations
- "total_facts": total number of facts extracted
- "unique_entity_types": list of unique entity types found

Conversations:
{conversations}
"""


def _build_prompt(conversations: list[dict], consolidation_type: str) -> str:
    conversations_json = json.dumps(conversations, ensure_ascii=False, default=str, indent=2)
    if consolidation_type == "facts":
        return FACTS_PROMPT_TEMPLATE.format(conversations=conversations_json)
    return SUMMARY_PROMPT_TEMPLATE.format(conversations=conversations_json)


def _extract_json(text: str) -> dict[str, Any] | None:
    if not text:
        return None
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    match = _re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    return None


@router.post("/consolidate", response_model=DreamerResponse)
async def consolidate_conversations(body: DreamerRequest) -> DreamerResponse:
    """Consolidate conversations into summaries or fact extractions."""
    if not body.conversations:
        raise HTTPException(status_code=400, detail="At least one conversation is required")

    consolidation_type = body.consolidation_type.strip().lower()
    if consolidation_type not in {"summary", "facts"}:
        raise HTTPException(status_code=400, detail="consolidation_type must be 'summary' or 'facts'")

    prompt = _build_prompt(body.conversations, consolidation_type)

    try:
        client = await build_provider_client_async(
            provider_type=body.provider or "GOOGLE",
            model=body.model or "gemini-2.5-flash",
            company_id=body.company_id,
        )
        response = await client.get_response(
            [{"role": "user", "content": prompt}],
            {"temperature": 0.2, "max_tokens": 4096, "tools_enabled": False},
        )
    except Exception as exc:
        logger.error("dreamer_consolidation_llm_failed", error=str(exc), company_id=body.company_id)
        raise HTTPException(status_code=502, detail=f"LLM request failed: {exc}")

    text = str(getattr(response, "text", "") or "")
    parsed = _extract_json(text)

    if not parsed:
        logger.warning(
            "dreamer_consolidation_parse_failed",
            company_id=body.company_id,
            consolidation_type=consolidation_type,
            raw_text_preview=text[:200],
        )
        return DreamerResponse(
            success=True,
            result={"raw": text, "conversations": [], "overall": {}},
        )

    logger.info(
        "dreamer_consolidation_ok",
        company_id=body.company_id,
        consolidation_type=consolidation_type,
        conversation_count=len(body.conversations),
    )
    return DreamerResponse(success=True, result=parsed)
