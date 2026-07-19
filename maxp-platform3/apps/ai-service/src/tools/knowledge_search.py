"""
Semantic search over company knowledge base (FAQs + policies).
Queries ai.knowledge_embeddings table using pgvector cosine similarity.
"""
from __future__ import annotations

import math
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb) if na and nb else 0.0


async def knowledge_search(
    company_id: str,
    query: str,
    source_type: str | None = None,  # 'faq' | 'policy' | None = both
    limit: int = 5,
    min_score: float = 0.35,
) -> list[dict[str, Any]]:
    """
    Returns top-k knowledge entries (FAQs or policies) ranked by
    cosine similarity to the query embedding.

    Args:
        company_id:  Tenant ID
        query:       Natural-language question or topic
        source_type: Filter to 'faq', 'policy', or None for both
        limit:       Max results
        min_score:   Minimum cosine similarity (0–1)

    Returns:
        List of {source_type, title, content, category, score}
    """
    if not company_id or not query:
        return []

    try:
        from src.memory.episodic_memory import EpisodicMemoryService
        svc = EpisodicMemoryService()
        res = await svc.generate_embedding_with_provider(text=query)
        q_emb = res.get("vector")
        if not q_emb or len(q_emb) != 768:
            return []
        norm = math.sqrt(sum(x * x for x in q_emb))
        if norm < 0.01:
            logger.warning("knowledge_search: pseudo embedding, skipping", query=query)
            return []
    except Exception as exc:
        logger.warning("knowledge_search: embedding generation failed", error=str(exc))
        return []

    q_vec_str = "[" + ",".join(str(x) for x in q_emb) + "]"

    import src.db.session as _db_mod
    from sqlalchemy import text

    type_filter = "AND source_type = :stype" if source_type else ""
    params: dict[str, Any] = {"cid": company_id, "q_vec": q_vec_str, "lim": limit * 3}
    if source_type:
        params["stype"] = source_type

    try:
        sql = text(f"""
            SELECT source_type, title, content, category, tags,
                   1 - (text_embedding <=> CAST(:q_vec AS vector)) AS score
            FROM ai.knowledge_embeddings
            WHERE company_id = :cid
              AND text_embedding IS NOT NULL
              {type_filter}
            ORDER BY text_embedding <=> CAST(:q_vec AS vector)
            LIMIT :lim
        """)
        async with _db_mod.async_session() as sess:
            rows = await sess.execute(sql, params)
            raw = [dict(r._mapping) for r in rows.fetchall()]

        results = [
            {
                "source_type": r["source_type"],
                "title": r["title"],
                "content": (r["content"] or "")[:600],
                "category": r["category"],
                "score": round(float(r["score"]), 4),
            }
            for r in raw
            if float(r["score"]) >= min_score
        ]

        logger.info("knowledge_search results",
                    query=query, company=company_id,
                    count=len(results), top=results[0]["title"] if results else None)
        return results[:limit]

    except Exception as exc:
        logger.warning("knowledge_search: pgvector query failed", error=str(exc))
        return []
