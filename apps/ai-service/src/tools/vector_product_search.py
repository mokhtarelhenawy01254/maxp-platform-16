"""
Semantic/vector product search using ai.product_embeddings table.
Supports hybrid search (image_embedding + text_embedding) with RRF fusion.
"""
from __future__ import annotations

import json
import math
import re
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

_RRF_K = 60  # Reciprocal Rank Fusion constant — higher = more weight to top ranks


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


def _extract_keywords(text: str) -> list[str]:
    words = re.findall(r"[\w+#-]+", text.lower())
    stopwords = {"the", "a", "an", "of", "in", "on", "for", "and", "or", "to", "is",
                 "how", "what", "why", "when", "where", "which", "this", "that",
                 "with", "from", "by", "at", "be", "was", "are", "has", "have",
                 "do", "does", "did", "will", "would", "can", "could", "may", "might",
                 "search", "find", "looking", "want", "need", "like", "show",
                 "ال", "في", "من", "على", "الى", "عن", "مع", "كان", "هذا", "هذه",
                 "انا", "أنت", "هو", "هي", "هم", "نحن", "عندي", "عندك", "عاوز",
                 "عايز", "بس", "كده", "دلوقتي", "لو", "لا", "ما", "و", "او"}
    return sorted({w for w in words if len(w) > 1 and w not in stopwords})


def _rrf_merge(
    lists: list[list[dict[str, Any]]],
    name_key: str = "name",
    top_k: int = 10,
) -> list[dict[str, Any]]:
    seen: dict[str, dict[str, Any]] = {}
    scores: dict[str, float] = {}
    for ranked in lists:
        # Only count each product's BEST rank within this list.
        # Products with many stored embeddings would otherwise accumulate
        # multiple RRF contributions from the same ranked list, crowding out
        # products that have fewer (but equally or more relevant) embeddings.
        counted_in_list: set[str] = set()
        for rank, item in enumerate(ranked):
            name = item.get(name_key, "")
            if not name or name in counted_in_list:
                continue
            counted_in_list.add(name)
            if name not in seen:
                seen[name] = dict(item)
            scores[name] = scores.get(name, 0.0) + 1.0 / (_RRF_K + rank)
    for name, item in seen.items():
        item["score"] = round(scores.get(name, 0.0), 4)
    merged = sorted(seen.values(), key=lambda x: -x["score"])
    return merged[:top_k]


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
            task_type="RETRIEVAL_QUERY",
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


def _format_product(r: dict[str, Any]) -> dict[str, Any]:
    return {
        "name":      r["product_name"],
        "sku":       r["sku"],
        "price":     float(r["price"] or 0),
        "status":    r["status"] or "IN_STOCK",
        "image_url": r["image_url"],
        "score":     round(float(r.get("score", 0)), 4),
    }


def _search_query(
    embed_col: str,
    q_vec_str: str,
    company_id: str,
    limit: int,
    min_score: float,
    keywords: list[str] | None = None,
) -> str:
    kw_filter = ""
    if keywords:
        kw_list = "{" + ",".join(f"'{re.escape(k)}'" for k in keywords) + "}"
        kw_filter = f" AND product_name ILIKE ANY(ARRAY[{kw_list[1:-1]}]::text[])"
    # DISTINCT ON (product_name): keep only the closest embedding per product.
    # Without this, products with many stored embeddings dominate the ranked list
    # and accumulate unfair RRF scores in _rrf_merge.
    return f"""
        SELECT * FROM (
            SELECT DISTINCT ON (product_name)
                   product_name, sku, price, status, image_url,
                   1 - ({embed_col} <=> CAST(:q_vec AS vector)) AS score
            FROM ai.product_embeddings
            WHERE company_id = :cid
              AND {embed_col} IS NOT NULL
              {kw_filter}
            ORDER BY product_name, {embed_col} <=> CAST(:q_vec AS vector)
        ) sub
        ORDER BY score DESC
        LIMIT :lim
    """


async def _run_pgvector_search(
    embed_col: str,
    q_vec: list[float],
    company_id: str,
    limit: int,
    min_score: float,
    keywords: list[str] | None = None,
) -> list[dict[str, Any]]:
    import src.db.session as _db_mod
    from sqlalchemy import text

    q_vec_str = "[" + ",".join(str(x) for x in q_vec) + "]"
    sql = text(_search_query(embed_col, q_vec_str, company_id, limit, min_score, keywords))
    try:
        sf = _db_mod.async_session
        async with sf() as sess:
            rows = await sess.execute(sql, {"cid": company_id, "q_vec": q_vec_str, "lim": limit})
            raw = [dict(r._mapping) for r in rows]
    except Exception:
        return []
    return [_format_product(r) for r in raw if float(r.get("score", 0)) >= min_score]


async def vector_product_search(
    company_id: str,
    query: str,
    limit: int = 5,
    min_score: float = 0.30,
    image_bytes: bytes | None = None,
    mime_type: str | None = None,
    keywords: list[str] | None = None,
) -> list[dict[str, Any]]:
    """
    Hybrid search: image_embedding + text_embedding with RRF fusion.
    Falls back gracefully if pgvector or embeddings are unavailable.

    Args:
        company_id:   Tenant ID
        query:        Free-text query (e.g. "winter boots", "حذاء رياضي")
        limit:        Max results to return
        min_score:    Minimum score threshold (cosine or RRF)
        image_bytes:  Optional image bytes for image-based search
        mime_type:    MIME type of the image
        keywords:     Optional brand/name keywords for ILIKE filter

    Returns:
        List of {name, price, sku, status, image_url, score}
    """
    if not company_id or (not query and not image_bytes):
        return []

    # Extract keywords from query text if not explicitly provided
    kw = keywords or (_extract_keywords(query) if query else None)

    # Generate ONE multimodal embedding from text + image (or text-only, or image-only)
    q_emb = await _generate_embedding(
        text=query or None,
        image_bytes=image_bytes,
        mime_type=mime_type,
    )
    if not q_emb:
        return []

    fetch_k = max(limit * 3, 15)

    # Image search (always search image_embedding when image is present)
    # Text search (search text_embedding when query is present — always for hybrid)
    searches: list[list[dict[str, Any]]] = []

    if image_bytes:
        vis = await _run_pgvector_search(
            "image_embedding", q_emb, company_id, fetch_k, min_score, keywords=kw,
        )
        if vis:
            searches.append(vis)

    # Text search — the same multimodal embedding works against text_embedding
    # because Gemini embedding model maps images+text to the same vector space
    txt = await _run_pgvector_search(
        "text_embedding", q_emb, company_id, fetch_k, min_score, keywords=kw,
    )
    if txt:
        searches.append(txt)

    if searches:
        results = _rrf_merge(searches, top_k=limit)
    else:
        # Both pgvector searches failed — try client-side fallback
        embed_col = "image_embedding" if image_bytes else "text_embedding"
        results = await _client_side_fallback(company_id, q_emb, embed_col, limit, min_score, image_bytes)

    if not results:
        results = await _search_product_json_embeddings(
            company_id, q_emb, limit=limit, min_score=min_score, image_bytes=image_bytes,
        )

    # Filter to valid full URLs only (skip bare filenames)
    for r in results:
        url = r.get("image_url") or ""
        if url and not (url.startswith("http://") or url.startswith("https://")):
            r["image_url"] = ""

    logger.info("vector_search results", query=query, company=company_id, count=len(results),
                top=results[0]["name"] if results else None)
    return results


async def _client_side_fallback(
    company_id: str,
    q_emb: list[float],
    embed_col: str,
    limit: int,
    min_score: float,
    image_bytes: bytes | None,
) -> list[dict[str, Any]]:
    import src.db.session as _db_mod
    from sqlalchemy import text

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
                scored.append(_format_product({**r, "score": score}))
        return sorted(scored, key=lambda x: -x["score"])[:limit]
    except Exception:
        return []
