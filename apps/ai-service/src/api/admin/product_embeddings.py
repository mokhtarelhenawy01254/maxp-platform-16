from __future__ import annotations

import asyncio
import time
from typing import Any

import structlog
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text

from src.db import session as _db_mod
from src.memory.episodic_memory import EpisodicMemoryService
from src.tools.vector_product_search import vector_product_search  # noqa: F401 — ensures table exists

logger = structlog.get_logger(__name__)
router = APIRouter()

_RATE_SLEEP = 0.7  # seconds between embedding calls (~85 req/min, under 100/min free tier)

_state: dict[str, Any] = {
    "status": "idle",       # idle | running | done | error
    "started_at": None,
    "finished_at": None,
    "total": 0,
    "done": 0,
    "errors": 0,
    "company_id": None,
    "last_error": None,
}


class SyncRequest(BaseModel):
    company_id: str | None = None


async def _run_backfill(company_id: str | None = None) -> None:
    _state.update(status="running", started_at=time.time(), finished_at=None,
                  total=0, done=0, errors=0, company_id=company_id, last_error=None)

    svc = EpisodicMemoryService()
    try:
        await _db_mod.init_db()
    except Exception:
        pass  # already initialised

    try:
        where_clause = '"deletedAt" IS NULL AND "isActive" = TRUE'
        params: dict = {}
        if company_id:
            where_clause += ' AND "companyId" = :company_id'
            params["company_id"] = company_id

        async with _db_mod.async_session() as sess:
            r = await sess.execute(
                text(f"""
                    SELECT id, name, sku, price, stock, "trackInventory",
                           "mainImage", "companyId", description, tags
                    FROM public.products
                    WHERE {where_clause}
                    ORDER BY "companyId", "updatedAt" DESC
                """),
                params,
            )
            products = [dict(row._mapping) for row in r.fetchall()]

        _state["total"] = len(products)
        logger.info("product_embedding_backfill_start", total=len(products), company_id=company_id)

        for p in products:
            name = p.get("name") or ""
            desc = p.get("description") or ""
            tags = p.get("tags") or ""
            embed_text = f"{name}. {desc}. {tags}".strip(". ")

            retries = 0
            vec = None
            while retries < 3:
                try:
                    res = await svc.generate_embedding_with_provider(text=embed_text)
                    vec = res.get("vector")
                    if not vec or len(vec) != 768:
                        break
                    norm = sum(x * x for x in vec) ** 0.5
                    if norm < 0.01:
                        # pseudo-embedding from rate limit — wait and retry
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

            if vec and len(vec) == 768 and sum(x * x for x in vec) ** 0.5 >= 0.01:
                vec_str = "[" + ",".join(str(x) for x in vec) + "]"
                status = "IN_STOCK" if (p.get("stock") or 0) > 0 else "OUT_OF_STOCK"
                if not p.get("trackInventory"):
                    status = "IN_STOCK"
                try:
                    async with _db_mod.async_session() as sess2:
                        await sess2.execute(
                            text("""
                                INSERT INTO ai.product_embeddings
                                    (id, company_id, product_id, product_name, sku, price, status,
                                     text_embedding, embed_text, image_url)
                                VALUES (gen_random_uuid()::text, :cid, :pid, :name, :sku,
                                        :price, :status, CAST(:vec AS vector), :embed_text, :image_url)
                                ON CONFLICT (product_id) DO UPDATE SET
                                    product_name   = EXCLUDED.product_name,
                                    text_embedding = EXCLUDED.text_embedding,
                                    embed_text     = EXCLUDED.embed_text,
                                    status         = EXCLUDED.status,
                                    price          = EXCLUDED.price,
                                    updated_at     = now()
                            """),
                            {
                                "cid": p["companyId"],
                                "pid": p["id"],
                                "name": name,
                                "sku": p.get("sku") or "",
                                "price": float(p.get("price") or 0),
                                "status": status,
                                "vec": vec_str,
                                "embed_text": embed_text[:500],
                                "image_url": p.get("mainImage") or "",
                            },
                        )
                        await sess2.commit()
                    _state["done"] += 1
                except Exception as e:
                    logger.warning("product_embedding_insert_failed", product=name, error=str(e))
                    _state["errors"] += 1
            else:
                _state["errors"] += 1

            await asyncio.sleep(_RATE_SLEEP)

        _state.update(status="done", finished_at=time.time())
        logger.info("product_embedding_backfill_done",
                    done=_state["done"], errors=_state["errors"], total=_state["total"])

    except Exception as e:
        _state.update(status="error", finished_at=time.time(), last_error=str(e))
        logger.error("product_embedding_backfill_error", error=str(e))


@router.get("/product-embeddings/status")
async def get_status(company_id: str | None = Query(default=None)) -> dict:
    """
    Returns current sync job state + per-company embedding coverage stats.
    """
    try:
        where_clause = '"deletedAt" IS NULL AND "isActive" = TRUE'
        params: dict = {}
        if company_id:
            where_clause += ' AND p."companyId" = :company_id'
            params["company_id"] = company_id

        async with _db_mod.async_session() as sess:
            # Per-company stats: total products vs embedded
            rows = await sess.execute(
                text(f"""
                    SELECT
                        p."companyId"           AS company_id,
                        COUNT(p.id)             AS total_products,
                        COUNT(pe.product_id)    AS embedded_count
                    FROM public.products p
                    LEFT JOIN ai.product_embeddings pe ON pe.product_id = p.id
                    WHERE {where_clause.replace('"deletedAt"', 'p."deletedAt"').replace('"isActive"', 'p."isActive"')}
                    GROUP BY p."companyId"
                    ORDER BY p."companyId"
                """),
                params,
            )
            company_stats = [
                {
                    "company_id": r.company_id,
                    "total": int(r.total_products),
                    "embedded": int(r.embedded_count),
                    "missing": int(r.total_products) - int(r.embedded_count),
                }
                for r in rows.fetchall()
            ]

            # Latest update across all embeddings (persisted fallback for last-run display)
            lu_row = await sess.execute(text("SELECT MAX(updated_at) AS lu FROM ai.product_embeddings"))
            last_db_update = lu_row.scalar()

            # Products that have no embedding yet
            missing_rows = await sess.execute(
                text(f"""
                    SELECT p.id, p.name, p.sku, p."companyId" AS company_id
                    FROM public.products p
                    LEFT JOIN ai.product_embeddings pe ON pe.product_id = p.id
                    WHERE {where_clause.replace('"deletedAt"', 'p."deletedAt"').replace('"isActive"', 'p."isActive"')}
                      AND pe.product_id IS NULL
                    ORDER BY p."companyId", p."updatedAt" DESC
                    LIMIT 500
                """),
                params,
            )
            missing_products = [
                {"id": r.id, "name": r.name, "sku": r.sku, "company_id": r.company_id}
                for r in missing_rows.fetchall()
            ]

        total_products = sum(s["total"] for s in company_stats)
        total_embedded = sum(s["embedded"] for s in company_stats)

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
                "last_db_update": last_db_update.isoformat() if last_db_update else None,
            },
            "summary": {
                "total_products": total_products,
                "total_embedded": total_embedded,
                "total_missing": total_products - total_embedded,
            },
            "companies": company_stats,
            "missing_products": missing_products,
        }
    except Exception as e:
        logger.error("product_embedding_status_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/product-embeddings/sync")
async def trigger_sync(body: SyncRequest) -> dict:
    """
    Trigger a product embedding backfill (runs in the background).
    Pass company_id to sync only one company, or omit for all companies.
    """
    if _state["status"] == "running":
        return {"started": False, "reason": "already_running", "job": _state}

    asyncio.create_task(_run_backfill(body.company_id))
    return {"started": True, "company_id": body.company_id}
