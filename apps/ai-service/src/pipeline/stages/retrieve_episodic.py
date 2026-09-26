from __future__ import annotations

import structlog

from src.memory.episodic_memory import episodic_memory_service
from src.pipeline.context import DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL, PipelineContext

logger = structlog.get_logger(__name__)

# Minimum similarity threshold to include a memory
SIMILARITY_THRESHOLD = 0.65
TOP_K = 5


def resolve_episodic_entity_id(ctx: PipelineContext) -> str | None:
    """Resolve the entity identity (customer or merchant) for episodic memory lookup."""
    if ctx.customer_id and ctx.customer_id.strip():
        return ctx.customer_id.strip()

    ext = ctx.external_memory_context or {}
    merchant_id = ext.get("merchant_id") or ext.get("user_id") or ext.get("actor_id")
    if merchant_id and str(merchant_id).strip():
        return str(merchant_id).strip()

    if ctx.channel in ("merchant", "dashboard", "copilot", "admin") or not ctx.is_customer_channel:
        return f"merchant_{ctx.company_id}"

    return None


async def retrieve_episodic_memory(ctx: PipelineContext) -> PipelineContext:
    """Retrieve relevant episodic memories for the current customer or merchant.

    Searches the vector store for past interactions similar to the current
    message and stores them in ctx.episodic_memories so the assembler can
    inject them as a <relevant_memories> block in the system prompt.
    """
    entity_id = resolve_episodic_entity_id(ctx)
    if not ctx.session or not entity_id or not ctx.company_id:
        return ctx
    if (ctx.external_memory_context or {}).get(DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL):
        logger.debug(
            "episodic_memory_retrieval_skipped",
            company_id=ctx.company_id,
            customer_id=entity_id,
            reason=DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL,
        )
        return ctx

    try:
        memories = await episodic_memory_service.search_similar(
            session=ctx.session,
            company_id=ctx.company_id,
            customer_id=entity_id,
            query_text=ctx.message,
            top_k=TOP_K,
        )

        # Filter by similarity threshold
        relevant = [
            m for m in memories
            if m.get("similarity", 0) >= SIMILARITY_THRESHOLD
        ]

        # For merchant/copilot, also include system-level learned episodes if capacity remains
        if entity_id != "__system__" and (ctx.channel in ("merchant", "dashboard", "copilot", "admin") or not ctx.is_customer_channel):
            try:
                system_memories = await episodic_memory_service.search_similar(
                    session=ctx.session,
                    company_id=ctx.company_id,
                    customer_id="__system__",
                    query_text=ctx.message,
                    top_k=max(0, TOP_K - len(relevant)),
                )
                existing_ids = {r.get("id") for r in relevant}
                for sm in system_memories:
                    if sm.get("similarity", 0) >= SIMILARITY_THRESHOLD and sm.get("id") not in existing_ids:
                        relevant.append(sm)
            except Exception as sys_exc:
                logger.debug("system_episodic_search_skipped", error=str(sys_exc))

        if relevant:
            ctx.episodic_memories = relevant
            logger.info(
                "episodic_memories_retrieved",
                company_id=ctx.company_id,
                customer_id=entity_id,
                count=len(relevant),
                top_similarity=relevant[0]["similarity"] if relevant else 0,
            )
    except Exception as e:
        logger.warning(
            "episodic_memory_retrieval_failed",
            error=str(e),
            company_id=ctx.company_id,
            customer_id=entity_id,
        )

    return ctx
