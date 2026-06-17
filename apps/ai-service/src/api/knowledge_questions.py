from __future__ import annotations

import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_session
from src.deps import get_company_id

logger = structlog.get_logger(__name__)
router = APIRouter()


class CreateKnowledgeQuestionRequest(BaseModel):
    customer_question: str = Field(description="The question the customer asked that the AI couldn't answer")
    conversation_id: str | None = Field(default=None, description="Conversation/thread ID")
    channel: str | None = Field(default=None, description="Channel (facebook, whatsapp, chat, etc.)")
    context: dict | None = Field(default=None, description="Additional context JSON")


class AnswerKnowledgeQuestionRequest(BaseModel):
    answer: str = Field(description="The merchant's answer to the question")


@router.get("/knowledge-questions")
async def list_knowledge_questions(
    request: Request,
    session: AsyncSession = Depends(get_session),
    status: str = Query("pending"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List knowledge questions for the authenticated company."""
    company_id = get_company_id(request)

    sql = text("""
        SELECT id, company_id, conversation_id, channel,
               customer_question, context, status,
               merchant_answer, answered_by, answered_at,
               knowledge_embedding_id, created_at, updated_at
        FROM ai.knowledge_questions
        WHERE company_id = :company_id AND status = :status
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """)
    rows = await session.execute(sql, {
        "company_id": company_id,
        "status": status,
        "limit": limit,
        "offset": offset,
    })
    questions = [dict(r._mapping) for r in rows.fetchall()]

    for q in questions:
        for key in ("created_at", "updated_at", "answered_at"):
            if q.get(key):
                q[key] = q[key].isoformat()

    return {
        "questions": questions,
        "count": len(questions),
    }


@router.get("/knowledge-questions/count")
async def count_pending_knowledge_questions(
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    """Count pending knowledge questions for badge display."""
    company_id = get_company_id(request)

    sql = text("""
        SELECT COUNT(*)::int AS count
        FROM ai.knowledge_questions
        WHERE company_id = :company_id AND status = 'pending'
    """)
    row = await session.execute(sql, {"company_id": company_id})
    return {"count": row.scalar_one()}


@router.post("/knowledge-questions")
async def create_knowledge_question(
    request: Request,
    body: CreateKnowledgeQuestionRequest,
    session: AsyncSession = Depends(get_session),
):
    """Create a new knowledge question (called by AI agent tool)."""
    company_id = get_company_id(request)
    qid = str(uuid.uuid4())

    sql = text("""
        INSERT INTO ai.knowledge_questions
            (id, company_id, conversation_id, channel, customer_question, context, status, created_at, updated_at)
        VALUES
            (:id, :company_id, :conversation_id, :channel, :customer_question, :context::jsonb, 'pending', now(), now())
    """)
    await session.execute(sql, {
        "id": qid,
        "company_id": company_id,
        "conversation_id": body.conversation_id,
        "channel": body.channel,
        "customer_question": body.customer_question,
        "context": "{}" if not body.context else body.context,
    })
    await session.commit()

    logger.info("knowledge_question_created", id=qid, company=company_id, channel=body.channel)
    return {"id": qid, "status": "pending", "message": "Knowledge question recorded. Merchant will be notified."}


@router.post("/knowledge-questions/{question_id}/answer")
async def answer_knowledge_question(
    request: Request,
    question_id: str,
    body: AnswerKnowledgeQuestionRequest,
    session: AsyncSession = Depends(get_session),
):
    """Answer a knowledge question and create a knowledge embedding."""
    company_id = get_company_id(request)

    fetch = text("""
        SELECT id, customer_question, context, channel, status
        FROM ai.knowledge_questions
        WHERE id = :id AND company_id = :company_id
    """)
    row = await session.execute(fetch, {"id": question_id, "company_id": company_id})
    q = row.fetchone()
    if not q:
        raise HTTPException(status_code=404, detail="Knowledge question not found")
    if q.status != "pending":
        raise HTTPException(status_code=400, detail="Question already answered")

    answered_by = getattr(request.state, "user_id", None) or getattr(request.state, "username", None) or "merchant"

    # Try to create a knowledge embedding so the RAG pipeline can find this answer
    embedding_id = None
    try:
        from src.memory.episodic_memory import EpisodicMemoryService

        embed_text = f"Q: {q.customer_question}\nA: {body.answer}"
        title = q.customer_question[:200]

        svc = EpisodicMemoryService()
        res = await svc.generate_embedding_with_provider(text=embed_text)
        q_vec = res.get("vector")

        if q_vec and len(q_vec) == 768:
            embedding_id = str(uuid.uuid4())
            q_vec_str = "[" + ",".join(str(x) for x in q_vec) + "]"
            source_id = f"kq_{question_id}"

            insert_emb = text("""
                INSERT INTO ai.knowledge_embeddings
                    (id, company_id, source_id, source_type, title, content, category, embed_text, text_embedding, created_at, updated_at)
                VALUES
                    (:id, :company_id, :source_id, 'faq', :title, :content, 'knowledge_question', :embed_text, CAST(:q_vec AS vector), now(), now())
                ON CONFLICT (source_id, source_type) DO UPDATE
                    SET title = EXCLUDED.title, content = EXCLUDED.content, embed_text = EXCLUDED.embed_text,
                        text_embedding = EXCLUDED.text_embedding, updated_at = now()
            """)
            await session.execute(insert_emb, {
                "id": embedding_id,
                "company_id": company_id,
                "source_id": source_id,
                "title": title,
                "content": body.answer,
                "embed_text": embed_text,
                "q_vec": q_vec_str,
            })
            logger.info("knowledge_embedding_created", id=embedding_id, source_id=source_id)
    except Exception as exc:
        logger.warning("knowledge_embedding_creation_failed", error=str(exc))

    update = text("""
        UPDATE ai.knowledge_questions
        SET status = 'answered',
            merchant_answer = :answer,
            answered_by = :answered_by,
            answered_at = now(),
            updated_at = now(),
            knowledge_embedding_id = :embedding_id
        WHERE id = :id
    """)
    await session.execute(update, {
        "id": question_id,
        "answer": body.answer,
        "answered_by": answered_by,
        "embedding_id": embedding_id,
    })
    await session.commit()

    logger.info("knowledge_question_answered", id=question_id, company=company_id, has_embedding=bool(embedding_id))

    return {
        "id": question_id,
        "status": "answered",
        "knowledge_embedding_id": embedding_id,
        "message": "Answer recorded. The agent will now have access to this knowledge.",
    }
