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


def _coerce_embedding(value: Any) -> list[float]:
    if not value:
        return []
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except Exception:
            return []
    if not isinstance(value, list):
        return []
    coerced: list[float] = []
    for item in value:
        try:
            coerced.append(float(item))
        except (TypeError, ValueError):
            return []
    return coerced


def _clean_image_url(value: Any) -> str:
    url = str(value or "").strip()
    return url if url.startswith(("http://", "https://")) else ""


def _row_status(row: dict[str, Any]) -> str:
    if row.get("status"):
        return str(row["status"])
    stock = row.get("stock")
    track_inventory = row.get("track_inventory")
    if track_inventory is False:
        return "IN_STOCK"
    try:
        return "IN_STOCK" if int(stock or 0) > 0 else "OUT_OF_STOCK"
    except (TypeError, ValueError):
        return "IN_STOCK"


def _score_embedding_rows(
    rows: list[dict[str, Any]],
    query_embedding: list[float],
    *,
    min_score: float,
) -> list[dict[str, Any]]:
    scored: list[dict[str, Any]] = []
    for row in rows:
        emb = _coerce_embedding(row.get("embedding_json") or row.get("emb_json"))
        if not emb:
            continue
        score = _cosine(query_embedding, emb)
        if score < min_score:
            continue
        image_url = _clean_image_url(row.get("image_url") or row.get("main_image"))
        scored.append({
            "id": row.get("product_id") or row.get("id"),
            "name": row.get("product_name") or row.get("name"),
            "sku": row.get("sku"),
            "price": float(row.get("price") or 0),
            "status": _row_status(row),
            "image_url": image_url,
            "mainImage": image_url,
            "score": round(score, 4),
        })
    return sorted(scored, key=lambda item: -item["score"])


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
        res = await svc.generate_embedding_with_provider(
            text=text,
            image_bytes=img_b64,
            mime_type=mime_type,
        )
        if res.get("provider") == "pseudo" or res.get("is_pseudo"):
            logger.warning("vector_search: using position-hash pseudo embedding query vector. Results will have no semantic meaning.")
        return res["vector"]
    except Exception as exc:
        logger.warning("vector_search: embedding generation failed", error=str(exc))
        return None


async def _search_product_json_embeddings(
    company_id: str,
    query_embedding: list[float],
    *,
    limit: int,
    min_score: float,
    image_bytes: bytes | None = None,
) -> list[dict[str, Any]]:
    """Fallback for environments without pgvector or ai.product_embeddings.

    The main MaxP catalog already stores Gemini-compatible embeddings on
    products.embedding and products.embeddingImage. Reading those fields keeps
    visual search available while the dedicated AI vector table catches up.
    """
    import src.db.session as _db_mod
    from sqlalchemy import text

    embedding_column = '"embeddingImage"' if image_bytes else "embedding"
    scan_limit = min(max(limit * 20, 100), 1000)
    sql = text(f"""
        SELECT id, name, sku, price, "mainImage" AS main_image,
               stock, "trackInventory" AS track_inventory,
               {embedding_column} AS embedding_json
        FROM products
        WHERE "companyId" = :cid
          AND "deletedAt" IS NULL
          AND "isActive" = TRUE
          AND {embedding_column} IS NOT NULL
          AND {embedding_column} <> ''
        ORDER BY "updatedAt" DESC
        LIMIT :lim
    """)
    try:
        sf = _db_mod.async_session
        async with sf() as sess:
            rows = await sess.execute(sql, {"cid": company_id, "lim": scan_limit})
            raw = [dict(r._mapping) for r in rows]
    except Exception as exc:
        logger.warning("vector_search: product JSON embedding fallback failed", error=str(exc))
        return []

    return _score_embedding_rows(raw, query_embedding, min_score=min_score)[:limit]


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
    results: list[dict[str, Any]] = []
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
                emb = _coerce_embedding(r.get("emb_json"))
                if not emb:
                    continue
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
            results = sorted(scored, key=lambda x: -x["score"])
        except Exception as exc2:
            logger.error("vector_search: fallback also failed", error=str(exc2))
            results = []

    if not results:
        results = await _search_product_json_embeddings(
            company_id,
            q_emb,
            limit=limit,
            min_score=min_score,
            image_bytes=image_bytes,
        )

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
