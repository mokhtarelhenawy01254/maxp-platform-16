from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.rag.corrective_rag import corrective_rag_engine


async def get_knowledge_evidence(
    session: AsyncSession,
    company_id: str,
    message: str,
    options: dict[str, Any] | None = None,
) -> str:
    """
    Query the RAG engine and format the results as evidence for the LLM.
    """
    options = options or {}
    rag_response = await corrective_rag_engine.query(
        session=session,
        company_id=company_id,
        query=message,
        options=options
    )

    if not rag_response.sources:
        return "No specific internal knowledge found for this query."

    evidence_parts = []
    for doc in rag_response.sources:
        evidence_parts.append(f"Source [{doc.source}] (Rel: {doc.relevance:.2f}): {doc.content}")

    return "\n".join(evidence_parts)
