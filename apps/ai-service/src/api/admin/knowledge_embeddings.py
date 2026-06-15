from __future__ import annotations

import asyncio
import time
from typing import Any

import structlog
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text

from src.db import session as _db_mod

logger = structlog.get_logger(__name__)
router = APIRouter()

_RATE_SLEEP = 0.7  # ~85 req/min, safely under 100/min free tier

_state: dict[str, Any] = {
    "status": "idle",
    "started_at": None,
    "finished_at": None,
    "total": 0,
    "done": 0,
    "errors": 0,
    "company_id": None,
    "last_error": None,
}


class KnowledgeSyncRequest(BaseModel):
    company_id: str | None = None


async def _run_knowledge_backfill(company_id: str | None = None) -> None:
    _state.update(status="running", started_at=time.time(), finished_at=None,
                  total=0, done=0, errors=0, company_id=company_id, last_error=None)

    from src.memory.episodic_memory import EpisodicMemoryService
    svc = EpisodicMemoryService()

    try:
        await _db_mod.init_db()
    except Exception:
        pass

    try:
        where = ""
        params: dict = {}
        if company_id:
            where = 'AND "companyId" = :company_id'
            params["company_id"] = company_id

        async with _db_mod.async_session() as sess:
            faq_rows = await sess.execute(text(f"""
                SELECT id, "companyId", question, answer, category, tags
                FROM public.faqs
                WHERE "isActive" = TRUE {where}
            """), params)
            faqs = [dict(r._mapping) for r in faq_rows.fetchall()]

            pol_rows = await sess.execute(text(f"""
                SELECT id, "companyId", title, content, category, tags
                FROM public.policies
                WHERE "isActive" = TRUE {where}
            """), params)
            policies = [dict(r._mapping) for r in pol_rows.fetchall()]

        items: list[dict] = []
        for f in faqs:
            items.append({
                "source_id": f["id"],
                "source_type": "faq",
                "company_id": f["companyId"],
                "title": f.get("question") or "",
                "content": f.get("answer") or "",
                "category": f.get("category") or "",
                "tags": str(f.get("tags") or ""),
            })
        for p in policies:
            items.append({
                "source_id": p["id"],
                "source_type": "policy",
                "company_id": p["companyId"],
                "title": p.get("title") or "",
                "content": p.get("content") or "",
                "category": p.get("category") or "",
                "tags": str(p.get("tags") or ""),
            })

        _state["total"] = len(items)
        logger.info("knowledge_backfill_start", total=len(items), company_id=company_id)

        for item in items:
            embed_text = f"{item['title']}. {item['content']}".strip(". ")[:800]

            retries = 0
            vec = None
            import math
            while retries < 3:
                try:
                    res = await svc.generate_embedding_with_provider(text=embed_text)
                    vec = res.get("vector")
                    if not vec or len(vec) != 768:
                        break
                    if math.sqrt(sum(x * x for x in vec)) < 0.01:
                        await asyncio.sleep(35)
                        retries += 1
                        continue
                    break
                except Exception as e:
                    if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                        await asyncio.sleep(35)
                        retries += 1
                        continue
                    break

            if vec and len(vec) == 768 and math.sqrt(sum(x * x for x in vec)) >= 0.01:
                vec_str = "[" + ",".join(str(x) for x in vec) + "]"
                try:
                    async with _db_mod.async_session() as sess2:
                        await sess2.execute(text("""
                            INSERT INTO ai.knowledge_embeddings
                                (id, company_id, source_id, source_type, title, content,
                                 category, tags, embed_text, text_embedding)
                            VALUES (gen_random_uuid()::text, :cid, :sid, :stype, :title,
                                    :content, :category, :tags, :embed_text, CAST(:vec AS vector))
                            ON CONFLICT (source_id, source_type) DO UPDATE SET
                                title          = EXCLUDED.title,
                                content        = EXCLUDED.content,
                                text_embedding = EXCLUDED.text_embedding,
                                embed_text     = EXCLUDED.embed_text,
                                category       = EXCLUDED.category,
                                updated_at     = now()
                        """), {
                            "cid": item["company_id"],
                            "sid": item["source_id"],
                            "stype": item["source_type"],
                            "title": item["title"][:500],
                            "content": item["content"][:1000],
                            "category": item["category"][:200],
                            "tags": item["tags"][:200],
                            "embed_text": embed_text[:500],
                            "vec": vec_str,
                        })
                        await sess2.commit()
                    _state["done"] += 1
                except Exception as e:
                    logger.warning("knowledge_backfill_insert_failed", title=item["title"][:80], error=str(e))
                    _state["errors"] += 1
            else:
                _state["errors"] += 1

            await asyncio.sleep(_RATE_SLEEP)

        _state.update(status="done", finished_at=time.time())
        logger.info("knowledge_backfill_done", done=_state["done"], errors=_state["errors"])

    except Exception as e:
        _state.update(status="error", finished_at=time.time(), last_error=str(e))
        logger.error("knowledge_backfill_error", error=str(e))


@router.get("/knowledge-embeddings/status")
async def get_knowledge_status(company_id: str | None = Query(default=None)) -> dict:
    try:
        where = ""
        params: dict = {}
        if company_id:
            where = 'AND k."companyId" = :company_id'
            params["company_id"] = company_id

        async with _db_mod.async_session() as sess:
            rows = await sess.execute(text(f"""
                SELECT
                    k."companyId"           AS company_id,
                    COUNT(CASE WHEN k.type = 'faq'    THEN 1 END) AS total_faqs,
                    COUNT(CASE WHEN k.type = 'policy' THEN 1 END) AS total_policies,
                    COUNT(CASE WHEN ke.source_id IS NOT NULL AND ke.source_type = 'faq'    THEN 1 END) AS embedded_faqs,
                    COUNT(CASE WHEN ke.source_id IS NOT NULL AND ke.source_type = 'policy' THEN 1 END) AS embedded_policies
                FROM (
                    SELECT id, "companyId", 'faq' AS type
                    FROM public.faqs WHERE "isActive" = TRUE
                    UNION ALL
                    SELECT id, "companyId", 'policy' AS type
                    FROM public.policies WHERE "isActive" = TRUE
                ) k
                LEFT JOIN ai.knowledge_embeddings ke
                    ON ke.source_id = k.id AND ke.source_type = k.type
                {where.replace('k."companyId"', 'k."companyId"')}
                GROUP BY k."companyId"
                ORDER BY k."companyId"
            """), params)
            company_stats = [
                {
                    "company_id": r.company_id,
                    "total_faqs": int(r.total_faqs),
                    "total_policies": int(r.total_policies),
                    "embedded_faqs": int(r.embedded_faqs),
                    "embedded_policies": int(r.embedded_policies),
                    "missing_faqs": int(r.total_faqs) - int(r.embedded_faqs),
                    "missing_policies": int(r.total_policies) - int(r.embedded_policies),
                }
                for r in rows.fetchall()
            ]

        total_faqs = sum(s["total_faqs"] for s in company_stats)
        total_policies = sum(s["total_policies"] for s in company_stats)
        embedded_faqs = sum(s["embedded_faqs"] for s in company_stats)
        embedded_policies = sum(s["embedded_policies"] for s in company_stats)

        return {
            "job": {
                "status": _state["status"],
                "started_at": _state["started_at"],
                "finished_at": _state["finished_at"],
                "total": _state["total"],
                "done": _state["done"],
                "errors": _state["errors"],
                "company_id": _state["company_id"],
                "last_error": _state["last_error"],
            },
            "summary": {
                "total_faqs": total_faqs,
                "total_policies": total_policies,
                "embedded_faqs": embedded_faqs,
                "embedded_policies": embedded_policies,
                "missing_faqs": total_faqs - embedded_faqs,
                "missing_policies": total_policies - embedded_policies,
            },
            "companies": company_stats,
        }
    except Exception as e:
        logger.error("knowledge_status_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/knowledge-embeddings/sync")
async def trigger_knowledge_sync(body: KnowledgeSyncRequest) -> dict:
    if _state["status"] == "running":
        return {"started": False, "reason": "already_running", "job": _state}
    asyncio.create_task(_run_knowledge_backfill(body.company_id))
    return {"started": True, "company_id": body.company_id}
