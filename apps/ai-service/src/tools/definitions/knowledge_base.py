from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools.knowledge_search import knowledge_search as _knowledge_search


class KnowledgeSearchInput(BaseModel):
    query: str = Field(description="Natural-language question or topic to search for in the knowledge base")
    source_type: str | None = Field(default=None, description="Filter by source type: 'faq', 'policy', or None for both")
    limit: int = Field(default=5, description="Maximum number of results (default 5)")
    company_id: str | None = Field(default=None, description="Tenant ID (auto-injected)")


async def knowledge_search_handler(input_data: KnowledgeSearchInput) -> dict[str, Any]:
    results = await _knowledge_search(
        company_id=input_data.company_id or "",
        query=input_data.query,
        source_type=input_data.source_type,
        limit=input_data.limit,
    )
    return {"results": results, "count": len(results)}


knowledge_search_tool = FunctionTool(
    name="knowledge_search",
    description="Search the company knowledge base (FAQs + policies) using semantic/embedding search. Use this when you need to find information about company policies, FAQs, or any knowledge the merchant has saved. Returns ranked results with relevance scores. IMPORTANT: If you find no relevant results after 1-2 attempts, stop searching and use 'knowledge_ask_merchant' instead to escalate to the merchant.",
    func=knowledge_search_handler,
    input_model=KnowledgeSearchInput,
)

__all_tools__ = [knowledge_search_tool]
