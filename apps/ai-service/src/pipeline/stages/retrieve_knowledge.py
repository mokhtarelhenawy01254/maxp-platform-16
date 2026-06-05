from __future__ import annotations

from src.pipeline.context import PipelineContext
from src.rag.knowledge_evidence import get_knowledge_evidence


async def retrieve_knowledge(ctx: PipelineContext) -> PipelineContext:
    # Only retrieve knowledge if it's a read intent or if the user is asking something general
    if ctx.relevance_plan and ctx.relevance_plan.requiresTool:
        # Let tools handle specific data, but we can still add general knowledge
        pass

    evidence = await get_knowledge_evidence(
        session=ctx.session,
        company_id=ctx.company_id,
        message=ctx.message,
    )

    # SOTA 2026: store RAG evidence in ctx.rag_evidence (not ctx.tool_context)
    # This keeps tool execution context separate from RAG context
    if evidence:
        ctx.rag_evidence = evidence if not ctx.rag_evidence else f"{ctx.rag_evidence}\n{evidence}"

    return ctx
