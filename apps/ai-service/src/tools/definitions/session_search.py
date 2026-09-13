from __future__ import annotations

from typing import Any
import structlog
from agent_framework import FunctionTool
from pydantic import BaseModel, Field
from sqlalchemy import text

logger = structlog.get_logger(__name__)


class SessionSearchInput(BaseModel):
    query: str = Field(
        description="Keyword or topic to search for across previous chat sessions and conversations (e.g. 'حملة العيد', 'سياسة الاسترجاع', 'خصم الشحن')"
    )
    limit: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Maximum number of historical messages to return (1-20)",
    )
    company_id: str | None = Field(
        default=None,
        description="Tenant ID (automatically injected)",
    )


async def session_search(input_data: SessionSearchInput) -> dict[str, Any]:
    """Hermes-grade cross-session historical search tool:
    Retrieves previous conversation turns and user decisions across sessions,
    strictly scoped to the merchant (company_id) and excluding raw tool call bloat.
    """
    company_id = input_data.company_id or ""
    if not company_id:
        return {"success": False, "error": "company_id is required", "results": []}

    query_term = (input_data.query or "").strip()
    if not query_term:
        return {"success": True, "count": 0, "results": []}

    limit = min(max(input_data.limit, 1), 20)
    search_pattern = f"%{query_term}%"
    results: list[dict[str, Any]] = []

    try:
        import src.db.session as _db_mod
        async with _db_mod.async_session() as db_session:
            # 1. Search Marketing Studio / Copilot messages (Hermes role <> 'tool' discipline)
            try:
                copilot_sql = text(
                    """
                    SELECT 
                        m.id, 
                        m."sessionId" AS session_id, 
                        m.role, 
                        m.content, 
                        m."createdAt" AS created_at, 
                        s.title AS session_title
                    FROM public.facebook_ads_ai_chat_messages m
                    JOIN public.facebook_ads_ai_chat_sessions s ON s.id = m."sessionId"
                    WHERE s."companyId" = :company_id
                      AND m.role IN ('user', 'assistant')
                      AND m.content ILIKE :pattern
                    ORDER BY m."createdAt" DESC
                    LIMIT :limit
                    """
                )
                res = await db_session.execute(
                    copilot_sql,
                    {"company_id": company_id, "pattern": search_pattern, "limit": limit},
                )
                for row in res.fetchall():
                    results.append({
                        "id": str(row[0]),
                        "session_id": str(row[1]),
                        "role": str(row[2]),
                        "content": str(row[3] or "").strip(),
                        "created_at": row[4].isoformat() if hasattr(row[4], "isoformat") else str(row[4]),
                        "context_title": str(row[5] or "Marketing Session"),
                        "source": "marketing_copilot",
                    })
            except Exception as e:
                logger.debug("copilot session search skipped or table missing", error=str(e))

            # 2. Search Customer Conversations (WhatsApp / Storefront)
            try:
                conv_sql = text(
                    """
                    SELECT 
                        m.id, 
                        m."conversationId" AS session_id, 
                        m."isFromCustomer", 
                        m.content, 
                        m."createdAt" AS created_at, 
                        c.subject AS session_title
                    FROM public.messages m
                    JOIN public.conversations c ON c.id = m."conversationId"
                    WHERE c."companyId" = :company_id
                      AND m.content ILIKE :pattern
                    ORDER BY m."createdAt" DESC
                    LIMIT :limit
                    """
                )
                res = await db_session.execute(
                    conv_sql,
                    {"company_id": company_id, "pattern": search_pattern, "limit": limit},
                )
                for row in res.fetchall():
                    is_customer = bool(row[2])
                    role = "user" if is_customer else "assistant"
                    results.append({
                        "id": str(row[0]),
                        "session_id": str(row[1]),
                        "role": role,
                        "content": str(row[3] or "").strip(),
                        "created_at": row[4].isoformat() if hasattr(row[4], "isoformat") else str(row[4]),
                        "context_title": str(row[5] or "Customer Conversation"),
                        "source": "customer_support",
                    })
            except Exception as e:
                logger.debug("conversation search skipped or table missing", error=str(e))

        # Sort combined results chronologically descending and take top N
        results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        final_results = results[:limit]

        return {
            "success": True,
            "query": query_term,
            "count": len(final_results),
            "results": final_results,
        }
    except Exception as exc:
        logger.error("session_search execution error", error=str(exc))
        return {
            "success": False,
            "error": f"Failed to search sessions: {str(exc)}",
            "results": [],
        }


def _format_session_search(result: dict) -> str:
    if not result.get("success"):
        return f"تعذر البحث في الجلسات السابقة: {result.get('error', 'خطأ غير معروف')}"

    count = result.get("count", 0)
    query = result.get("query", "")
    if count == 0:
        return f"لم يتم العثور على أي رسائل سابقة مطابقة لـ '{query}'."

    lines = [f"نتائج البحث في المحادثات السابقة لـ '{query}' ({count} نتيجة):"]
    for idx, item in enumerate(result.get("results", []), 1):
        role_arabic = "المستخدم" if item.get("role") == "user" else "المساعد"
        content_preview = item.get("content", "")
        if len(content_preview) > 180:
            content_preview = content_preview[:180] + "..."
        created = item.get("created_at", "")[:10]
        title = item.get("context_title", "")
        lines.append(f"{idx}. [{created}] ({role_arabic}) [{title}]: {content_preview}")

    return "\n".join(lines)


session_search_tool = FunctionTool(
    name="session_search",
    description="Search across previous chat sessions and conversations for past decisions, marketing discussions, customer notes, or agreements.",
    func=session_search,
    input_model=SessionSearchInput,
    format_result=_format_session_search,
)

__all_tools__ = [
    session_search_tool,
]
