from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger(__name__)

DEFAULT_SOURCE_ORDER = ["HYBRID_KNOWLEDGE", "FAQ_DB", "POLICY_DB", "VECTOR_STORE", "PRODUCT_DB", "WEB"]
HYBRID_SOURCE_TYPES = ["faq", "policy"]


@dataclass
class RAGDocument:
    content: str
    relevance: float = 0.0
    source: str = "unknown"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class RAGGrading:
    avg_relevance: float = 0.0
    sufficient: bool = False
    blocked: bool = False
    reason: str | None = None
    count: int = 0


@dataclass
class RAGResponse:
    answer: str | None = None
    sources: list[RAGDocument] = field(default_factory=list)
    iterations: int = 0
    grading: RAGGrading = field(default_factory=RAGGrading)
    final_source: str = "EXHAUSTED"
    attempts: list[dict[str, Any]] = field(default_factory=list)
    retrieval_mode: str = "exhausted"


class CorrectiveRAGEngine:
    def __init__(self) -> None:
        self.max_iterations = len(DEFAULT_SOURCE_ORDER)
        self._sources: dict[str, list[Any]] = {}

    def _arabic_normalize(self, text: str) -> str:
        if not text:
            return ""
        text = text.lower()
        text = re.sub(r"[\u064B-\u065F\u0670\u0640]", "", text)
        text = re.sub(r"[\u0623\u0625\u0622]", "ا", text)
        text = re.sub(r"ى", "ي", text)
        text = re.sub(r"ة", "ه", text)
        text = re.sub(r"[^\w\s.-]", " ", text, flags=re.UNICODE)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def _tokenize(self, text: str) -> list[str]:
        normalized = self._arabic_normalize(text)
        if not normalized:
            return []
        return [t for t in normalized.split() if len(t) > 1]

    def _score_documents(self, query: str, docs: list[Any]) -> list[RAGDocument]:
        if not docs:
            return []
        norm_query = self._arabic_normalize(query)
        query_words = norm_query.split()

        results = []
        for doc in docs:
            content = doc.content if hasattr(doc, "content") else doc.get("content", "")
            norm_content = self._arabic_normalize(content)

            word_overlap = sum(1 for w in query_words if w in norm_content)
            score = word_overlap / len(query_words) if query_words else 0

            results.append(
                RAGDocument(
                    content=content,
                    relevance=min(1.0, score),
                    source="calculated",
                    metadata=doc.metadata if hasattr(doc, "metadata") else doc.get("metadata", {}),
                )
            )

        results.sort(key=lambda x: x.relevance, reverse=True)
        return results[:5]

    async def _retrieve(
        self,
        session: AsyncSession,
        company_id: str,
        query: str,
        source: str,
        options: dict[str, Any] | None = None,
    ) -> list[RAGDocument]:
        options = options or {}

        # 1. In-memory
        mem_key = f"{company_id}:{source}"
        if mem_key in self._sources:
            return self._score_documents(query, self._sources[mem_key])

        # 2. FAQ_DB
        if source == "FAQ_DB":
            try:
                from src.db.models.faq import FAQ  # type: ignore[import-not-found]

                stmt = select(FAQ).where(FAQ.company_id == company_id, FAQ.isActive)
                result = await session.execute(stmt)
                faqs = result.scalars().all()
                if faqs:
                    docs = [
                        {
                            "content": f"Question: {f.question}\nAnswer: {f.answer}",
                            "metadata": {"type": "faq", "id": f.id},
                        }
                        for f in faqs
                    ]
                    return self._score_documents(query, docs)
            except ModuleNotFoundError:
                logger.debug("FAQ model unavailable for RAG source", source=source)

        # 3. POLICY_DB
        if source == "POLICY_DB":
            try:
                from src.db.models.policy import Policy  # type: ignore[import-not-found]

                stmt = select(Policy).where(Policy.company_id == company_id, Policy.isActive)
                result = await session.execute(stmt)
                policies = result.scalars().all()
                if policies:
                    docs = [
                        {
                            "content": f"Title: {p.title}\nContent: {p.content}",
                            "metadata": {"type": "policy", "id": p.id},
                        }
                        for p in policies
                    ]
                    return self._score_documents(query, docs)
            except ModuleNotFoundError:
                logger.debug("Policy model unavailable for RAG source", source=source)

        # 4. VECTOR_STORE — semantic similarity via episodic memory service
        if source == "VECTOR_STORE":
            try:
                from src.memory.episodic_memory import episodic_memory_service

                customer_id = options.get("customerId", "global")
                results = await episodic_memory_service.search_similar(
                    session=session,
                    company_id=company_id,
                    customer_id=customer_id,
                    query_text=query,
                    top_k=10,
                )
                if results:
                    return [
                        RAGDocument(
                            content=r["content"],
                            relevance=min(1.0, max(0.0, r.get("similarity", 0.0))),
                            source="VECTOR_STORE",
                            metadata=r.get("metadata", {}),
                        )
                        for r in results
                    ][:5]
            except Exception as exc:
                logger.debug("Vector memory source unavailable for RAG", error=str(exc))

        # 5. PRODUCT_DB
        if source == "PRODUCT_DB":
            try:
                from src.db.models.product import Product  # type: ignore[import-not-found]

                stmt = select(Product).where(Product.company_id == company_id, Product.isActive).limit(20)
                result = await session.execute(stmt)
                products = result.scalars().all()
                if products:
                    docs = [
                        {
                            "content": f"Product {p.name} {p.description} price {p.price}",
                            "metadata": {"type": "product", "id": p.id},
                        }
                        for p in products
                    ]
                    return self._score_documents(query, docs)
            except ModuleNotFoundError:
                logger.debug("Product model unavailable for RAG source", source=source)

        return []

    def _grade_documents(self, query: str, documents: list[RAGDocument]) -> RAGGrading:
        if not documents:
            return RAGGrading(avg_relevance=0, sufficient=False, count=0)
        top_relevance = max(d.relevance for d in documents)
        return RAGGrading(
            avg_relevance=top_relevance,
            sufficient=top_relevance >= 0.7,
            count=len(documents),
        )

    def _reformulate_query(self, query: str, grading: RAGGrading) -> str:
        return f"{query} specific details"

    def _generate_answer(self, query: str, documents: list[RAGDocument]) -> str:
        if not documents:
            return ""
        return f"Based on internal knowledge: {documents[0].content}"

    async def query(
        self,
        session: AsyncSession,
        company_id: str,
        query: str,
        options: dict[str, Any] | None = None,
    ) -> RAGResponse:
        options = options or {}
        current_query = query
        source_order = options.get("sourceOrder", DEFAULT_SOURCE_ORDER)
        iterations = 0
        best_docs = []
        best_score = 0.0
        attempts = []

        for source in source_order:
            iterations += 1
            docs = await self._retrieve(session, company_id, current_query, source, options)
            grading = self._grade_documents(current_query, docs)

            attempts.append({
                "source": source,
                "query": current_query,
                "count": len(docs),
                "grading": grading.__dict__,
            })

            if grading.sufficient:
                return RAGResponse(
                    answer=self._generate_answer(current_query, docs),
                    sources=docs,
                    iterations=iterations,
                    grading=grading,
                    final_source=source,
                    attempts=attempts,
                    retrieval_mode="source_fallback",
                )

            if grading.avg_relevance > best_score:
                best_docs = docs
                best_score = grading.avg_relevance

            current_query = self._reformulate_query(current_query, grading)

        return RAGResponse(
            answer=self._generate_answer(current_query, best_docs) if best_docs else None,
            sources=best_docs,
            iterations=iterations,
            grading=RAGGrading(avg_relevance=best_score, sufficient=False, count=len(best_docs)),
            final_source="EXHAUSTED",
            attempts=attempts,
            retrieval_mode="exhausted",
        )


corrective_rag_engine = CorrectiveRAGEngine()
