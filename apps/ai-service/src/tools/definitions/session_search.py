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
    session_id: str | None = Field(
        default=None,
        description="Current session ID to exclude from past results (automatically injected)",
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
    is_browse_all = not query_term or query_term in {"all", "*", "الكل", "المحادثات كلها", "المحادثات القديمة", "السابقة", "محادثات", "جلسات"}
    limit = min(max(input_data.limit, 1), 20)
    
    # Extract keywords for resilient search: if multiple words, match any significant keyword
    words = [w.strip() for w in query_term.split() if len(w.strip()) >= 3 and w.strip() not in {"في", "من", "عن", "على", "إلى", "كل", "كلها", "قبل", "بعد", "كنا", "شوف"}]
    search_keywords = words[:4] if words and not is_browse_all else []
    search_pattern = "%" if is_browse_all else f"%{query_term}%"
    results: list[dict[str, Any]] = []

    try:
        import src.db.session as _db_mod
        if _db_mod.async_session is None:
            await _db_mod.init_db()
        sf = _db_mod.async_session
        async with sf() as db_session:
            # 1. Search Agent Studio / Copilot messages (General sessions: Merchant Copilot, Specialists, etc.)
            try:
                where_clauses = ['s."companyId" = :company_id', "s.status != 'DELETED'", '(m."isDeleted" IS FALSE OR m."isDeleted" IS NULL)', "m.role IN ('user', 'assistant', 'agent')"]
                params = {"company_id": company_id, "limit": limit}

                if is_browse_all:
                    pass
                elif search_keywords:
                    kw_or = []
                    for idx, kw in enumerate(search_keywords):
                        kw_param = f"kw_{idx}"
                        kw_or.append(f"m.content ILIKE :{kw_param}")
                        params[kw_param] = f"%{kw}%"
                    where_clauses.append(f"({' OR '.join(kw_or)})")
                else:
                    where_clauses.append("m.content ILIKE :pattern")
                    params["pattern"] = search_pattern

                studio_sql = text(
                    f"""
                    SELECT 
                        m.id, 
                        m."sessionId" AS session_id, 
                        m.role, 
                        m.content, 
                        m."createdAt" AS created_at, 
                        s.title AS session_title
                    FROM public.agent_studio_messages m
                    JOIN public.agent_studio_sessions s ON s.id = m."sessionId"
                    WHERE {' AND '.join(where_clauses)}
                    ORDER BY m."createdAt" DESC
                    LIMIT :limit
                    """
                )
                res = await db_session.execute(studio_sql, params)
                for row in res.fetchall():
                    r = str(row[2] or "assistant").lower()
                    role = "user" if r == "user" else "assistant"
                    results.append({
                        "id": str(row[0]),
                        "session_id": str(row[1]),
                        "role": role,
                        "content": str(row[3] or "").strip(),
                        "created_at": row[4].isoformat() if hasattr(row[4], "isoformat") else str(row[4]),
                        "context_title": str(row[5] or "Copilot Session"),
                        "source": "agent_studio",
                    })
            except Exception as e:
                logger.debug("agent studio session search skipped or table missing", error=str(e))

            # 2. Search Marketing Studio / Copilot messages (Hermes role <> 'tool' discipline)
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

            # 3. Search Customer Conversations (WhatsApp / Storefront)
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
        # Filter out current active session if available in session_id so historical conversations stand out
        current_sess = (input_data.session_id or "").strip()
        filtered = [r for r in results if not current_sess or r.get("session_id") != current_sess] if current_sess else results
        filtered.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        final_results = filtered[:limit]

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
        return f"لم يتم العثور على أي رسائل أو جلسات سابقة مطابقة لـ '{query}'."

    lines = [f"تم العثور على {count} من الرسائل والمحادثات السابقة لـ '{query}':"]
    for idx, item in enumerate(result.get("results", []), 1):
        source = item.get("source", "")
        source_label = "جلسة كوبيلوت التاجر" if source == "agent_studio" else ("جلسة تسويق وإعلانات" if source == "marketing_copilot" else "محادثة عملاء")
        role_arabic = "التاجر" if item.get("role") == "user" else "المساعد"
        content_preview = item.get("content", "")
        if len(content_preview) > 220:
            content_preview = content_preview[:220] + "..."
        created = item.get("created_at", "")[:10]
        title = item.get("context_title", "محادثة سابقة")
        lines.append(f"{idx}. [{created}] [{source_label} - \"{title}\"] {role_arabic}: {content_preview}")

    return "\n".join(lines)


session_search_tool = FunctionTool(
    name="session_search",
    description="Search across past and previous chat sessions, copilot conversations, marketing discussions, and customer logs. Use this whenever the merchant asks about previous conversations ('المحادثات السابقة', 'اتكلمنا في ايه قبل كده', 'الجلسات القديمة', 'العروض اللي اتكلمنا فيها').",
    func=session_search,
    input_model=SessionSearchInput,
    format_result=_format_session_search,
)

__all_tools__ = [
    session_search_tool,
]
