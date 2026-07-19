from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill

class KnowledgeSearchInput(BaseModel):
    query: str = Field(description="Search query for FAQs, policies, or store information")
    source_type: str | None = Field(None, description="Filter: 'faq', 'policy', or None for both")
    company_id: str = Field(default="", description="")

async def search_knowledge(params: KnowledgeSearchInput) -> dict:
    from src.tools.knowledge_search import knowledge_search as _search
    results = await _search(
        company_id=params.company_id,
        query=params.query,
        source_type=params.source_type,
        limit=5,
    )
    return {"results": results, "count": len(results)}

knowledge_search = Skill(
    name="knowledge_search",
    description="Search the store's knowledge base for FAQs, policies, store information, and general inquiries. Use when customer asks about store policies, business hours, shipping info, or general questions.",
    input_schema=KnowledgeSearchInput,
    handler=search_knowledge,
    internal_fields=["company_id"],
)
