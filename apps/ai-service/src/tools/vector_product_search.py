"""
Semantic/vector product search using ai.product_embeddings table.
Called as fallback from product_search when text search returns 0 results.
"""
from __future__ import annotations

import json
import math
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na  = math.sqrt(sum(x * x for x in a))
    nb  = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb) if na and nb else 0.0


async def _generate_embedding(
    text: str | None = None,
    image_bytes: bytes | None = None,
    mime_type: str | None = None,
) -> list[float] | None:
    """Generate embedding using the service's internal EpisodicMemoryService (no HTTP)."""
    try:
        from src.memory.episodic_memory import EpisodicMemoryService
        svc = EpisodicMemoryService()
        img_b64: str | None = None
        if image_bytes:
            import base64
            img_b64 = base64.b64encode(image_bytes).decode()
        return await svc.generate_embedding_async(
            text=text,
            image_bytes=img_b64,
            mime_type=mime_type,
        )
    except Exception as exc:
        logger.warning("vector_search: embedding generation failed", error=str(exc))
        return None


async def vector_product_search(
    company_id: str,
    query: str,
    limit: int = 5,
    min_score: float = 0.30,
    image_bytes: bytes | None = None,
    mime_type: str | None = None,
) -> list[dict[str, Any]]:
    """
    Returns top-k products ranked by cosine similarity to the query embedding.

    Args:
        company_id:   Tenant ID
        query:        Free-text query (e.g. "winter boots", "حذاء رياضي")
        limit:        Max results to return
        min_score:    Minimum cosine similarity threshold (0–1)
        image_bytes:  Optional image bytes for image-based search
        mime_type:    MIME type of the image

    Returns:
        List of {name, price, sku, status, score, image_url}
    """
    if not company_id or (not query and not image_bytes):
        return []

    # Generate query embedding
    q_emb = await _generate_embedding(
        text=query or None,
        image_bytes=image_bytes,
        mime_type=mime_type,
    )
    if not q_emb:
        return []

    embed_col = "image_embedding" if image_bytes else "text_embedding"

    import src.db.session as _db_mod
    from sqlalchemy import text

    q_vec_str = "[" + ",".join(str(x) for x in q_emb) + "]"

    # Try pgvector cosine operator (fast index scan)
    try:
        sql = text(f"""
            SELECT product_name, sku, price, status, image_url,
                   1 - ({embed_col} <=> CAST(:q_vec AS vector)) AS score
            FROM ai.product_embeddings
            WHERE company_id = :cid
              AND {embed_col} IS NOT NULL
            ORDER BY {embed_col} <=> CAST(:q_vec AS vector)
            LIMIT :lim
        """)
        sf = _db_mod.async_session
        async with sf() as sess:
            rows = await sess.execute(sql, {"cid": company_id, "q_vec": q_vec_str, "lim": limit * 3})
            raw = [dict(r._mapping) for r in rows]

        results = [
            {
                "name":      r["product_name"],
                "sku":       r["sku"],
                "price":     float(r["price"] or 0),
                "status":    r["status"] or "IN_STOCK",
                "image_url": r["image_url"],
                "score":     round(float(r["score"]), 4),
            }
            for r in raw
            if float(r["score"]) >= min_score
        ]

    except Exception as exc:
        logger.warning("vector_search: pgvector query failed, using client-side cosine", error=str(exc))
        # Client-side fallback
        try:
            sf = _db_mod.async_session
            async with sf() as sess:
                rows = await sess.execute(text(f"""
                    SELECT product_name, sku, price, status, image_url,
                           {embed_col}::text AS emb_json
                    FROM ai.product_embeddings
                    WHERE company_id = :cid AND {embed_col} IS NOT NULL
                """), {"cid": company_id})
                raw = [dict(r._mapping) for r in rows]

            scored = []
            for r in raw:
                try:
                    emb = json.loads(r["emb_json"])
                    score = _cosine(q_emb, emb)
                    if score >= min_score:
                        scored.append({
                            "name":      r["product_name"],
                            "sku":       r["sku"],
                            "price":     float(r["price"] or 0),
                            "status":    r["status"] or "IN_STOCK",
                            "image_url": r["image_url"],
                            "score":     round(score, 4),
                        })
                except Exception:
                    pass
            results = sorted(scored, key=lambda x: -x["score"])
        except Exception as exc2:
            logger.error("vector_search: fallback also failed", error=str(exc2))
            return []

    # Filter to valid full URLs only (skip bare filenames)
    for r in results:
        url = r.get("image_url") or ""
        if url and not (url.startswith("http://") or url.startswith("https://")):
            r["image_url"] = ""

    # Deduplicate by product name (keep highest score per name)
    seen: dict[str, dict] = {}
    for r in results:
        name = r["name"]
        if name not in seen or r["score"] > seen[name]["score"]:
            seen[name] = r

    deduped = sorted(seen.values(), key=lambda x: -x["score"])[:limit]
    logger.info("vector_search results", query=query, company=company_id, count=len(deduped),
                top=deduped[0]["name"] if deduped else None)
    return deduped
