from __future__ import annotations

import structlog

from src.memory.episodic_memory import episodic_memory_service
from src.pipeline.context import DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL, PipelineContext

logger = structlog.get_logger(__name__)

# Minimum similarity threshold to include a memory
SIMILARITY_THRESHOLD = 0.65
TOP_K = 5


async def retrieve_episodic_memory(ctx: PipelineContext) -> PipelineContext:
    """Retrieve relevant episodic memories for the current customer.

    Searches the vector store for past interactions similar to the current
    message and stores them in ctx.episodic_memories so the assembler can
    inject them as a <relevant_memories> block in the system prompt.
    """
    if not ctx.session or not ctx.customer_id or not ctx.company_id:
        return ctx
    if (ctx.external_memory_context or {}).get(DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL):
        logger.debug(
            "episodic_memory_retrieval_skipped",
            company_id=ctx.company_id,
            customer_id=ctx.customer_id,
            reason=DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL,
        )
        return ctx

    try:
        memories = await episodic_memory_service.search_similar(
            session=ctx.session,
            company_id=ctx.company_id,
            customer_id=ctx.customer_id,
            query_text=ctx.message,
            top_k=TOP_K,
        )

        # Filter by similarity threshold
        relevant = [
            m for m in memories
            if m.get("similarity", 0) >= SIMILARITY_THRESHOLD
        ]

        if relevant:
            ctx.episodic_memories = relevant
            logger.info(
                "episodic_memories_retrieved",
                company_id=ctx.company_id,
                customer_id=ctx.customer_id,
                count=len(relevant),
                top_similarity=relevant[0]["similarity"] if relevant else 0,
            )
    except Exception as e:
        logger.warning(
            "episodic_memory_retrieval_failed",
            error=str(e),
            company_id=ctx.company_id,
            customer_id=ctx.customer_id,
        )

    return ctx
