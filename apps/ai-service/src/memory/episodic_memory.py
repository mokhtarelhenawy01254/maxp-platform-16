from __future__ import annotations

import math
import uuid

import requests
import structlog
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.db.models.memory import AgenticMemoryFact
from src.memory import embedding_cache

logger = structlog.get_logger(__name__)

DEFAULT_EMBEDDING_MODEL = "gemini-embedding-2"
EMBEDDING_PROVIDER_GEMINI = "gemini"
EMBEDDING_PROVIDER_PSEUDO = "pseudo"


class EpisodicMemoryService:
    def __init__(self) -> None:
        self._embedding_failure_state: dict[str, int] = {}
        self._pgvector_search_available: bool | None = None

    def _generate_pseudo_embedding(self, text: str, dims: int = 768) -> list[float]:
        vec = [0.0] * dims
        if not text:
            return vec
        normalized = text.lower().strip()
        for i, char in enumerate(normalized):
            idx = (ord(char) * (i + 1)) % dims
            vec[idx] += 1.0 / (1 + i * 0.1)
        mag = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / mag for v in vec]

    async def generate_embedding_async(
        self,
        text: str | None = None,
        image_bytes: str | None = None,
        mime_type: str | None = None,
        dimension: int = 768,
    ) -> list[float]:
        """Backwards-compatible wrapper that returns only the vector."""
        result = await self.generate_embedding_with_provider(
            text=text,
            image_bytes=image_bytes,
            mime_type=mime_type,
            dimension=dimension,
        )
        return result["vector"]

    async def generate_embedding_with_provider(
        self,
        text: str | None = None,
        image_bytes: str | None = None,
        mime_type: str | None = None,
        dimension: int = 768,
        skip_cache: bool = False,
    ) -> dict:
        """Generate an embedding and return provenance metadata.

        The text-only and multimodal paths now use the same model
        ('gemini-embedding-2') so vectors live in the same vector space and
        can be compared reliably.
        """
        settings = get_settings()
        api_key = settings.google_api_key
        model_name = DEFAULT_EMBEDDING_MODEL

        cache_text = text or ""
        cacheable = (cache_text or image_bytes) and not skip_cache
        if cacheable:
            cached = await embedding_cache.get_cached_embedding(
                text=cache_text,
                model=model_name,
                dimension=dimension,
                image_bytes=image_bytes,
                mime_type=mime_type,
            )
            if cached and cached.get("vector"):
                return {
                    "vector": cached["vector"],
                    "provider": cached.get("provider", EMBEDDING_PROVIDER_GEMINI),
                    "model": model_name,
                    "dimension": dimension,
                    "cached": True,
                }

        if not api_key:
            return {
                "vector": self._generate_pseudo_embedding(cache_text, dimension),
                "provider": EMBEDDING_PROVIDER_PSEUDO,
                "model": model_name,
                "dimension": dimension,
                "cached": False,
            }

        try:
            parts = []
            if text:
                parts.append({"text": text})
            if image_bytes:
                parts.append({
                    "inlineData": {
                        "mimeType": mime_type or "image/jpeg",
                        "data": image_bytes,
                    }
                })

            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:embedContent"
            payload = {
                "model": f"models/{model_name}",
                "content": {"parts": parts},
                "outputDimensionality": dimension,
            }
            headers = {"Content-Type": "application/json", "x-goog-api-key": api_key}
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            if response.ok:
                data = response.json()
                vec = data.get("embedding", {}).get("values")
                if isinstance(vec, list) and len(vec) > 0:
                    if cacheable:
                        await embedding_cache.set_cached_embedding(
                            text=cache_text,
                            model=model_name,
                            dimension=dimension,
                            vector=vec,
                            provider=EMBEDDING_PROVIDER_GEMINI,
                            image_bytes=image_bytes,
                            mime_type=mime_type,
                        )
                    return {
                        "vector": vec,
                        "provider": EMBEDDING_PROVIDER_GEMINI,
                        "model": model_name,
                        "dimension": dimension,
                        "cached": False,
                    }
        except Exception as exc:
            logger.warning("embedding API failed, falling back to pseudo", error=str(exc))

        return {
            "vector": self._generate_pseudo_embedding(cache_text, dimension),
            "provider": EMBEDDING_PROVIDER_PSEUDO,
            "model": model_name,
            "dimension": dimension,
            "cached": False,
        }

    def cosine_similarity(self, vec_a: list[float], vec_b: list[float]) -> float:
        dot = sum(a * b for a, b in zip(vec_a, vec_b, strict=False))
        mag_a = math.sqrt(sum(a * a for a in vec_a))
        mag_b = math.sqrt(sum(b * b for b in vec_b))
        denom = mag_a * mag_b
        return dot / denom if denom != 0 else 0.0

    async def _is_pgvector_search_available(self, session: AsyncSession) -> bool:
        if self._pgvector_search_available is not None:
            return self._pgvector_search_available

        if not get_settings().enable_pgvector:
            self._pgvector_search_available = False
            return False

        try:
            result = await session.execute(text("""
                SELECT
                    EXISTS (
                        SELECT 1 FROM pg_extension WHERE extname = 'vector'
                    )
                    AND EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'ai'
                          AND table_name = 'agentic_memory_fact'
                          AND column_name = 'embedding'
                          AND udt_name = 'vector'
                    ) AS available
            """))
            self._pgvector_search_available = bool(result.scalar())
        except Exception as exc:
            logger.warning("pgvector_capability_check_failed", error=str(exc))
            try:
                await session.rollback()
            except Exception as rollback_exc:
                logger.warning("pgvector_capability_rollback_failed", error=str(rollback_exc))
            self._pgvector_search_available = False

        return self._pgvector_search_available

    async def store_episode(
        self,
        session: AsyncSession,
        company_id: str,
        customer_id: str,
        content: str,
        metadata: dict | None = None,
    ) -> dict:
        result = await self.generate_embedding_with_provider(text=content)
        metadata = metadata or {}
        stored_metadata = {
            **metadata,
            "_embedding_provider": result["provider"],
            "_embedding_model": result["model"],
            "_embedding_dimension": result["dimension"],
        }

        fact = AgenticMemoryFact(
            id=str(uuid.uuid4()),
            company_id=company_id,
            customer_id=customer_id,
            type="EPISODIC",
            content=content,
            embedding=result["vector"],
            embedding_provider=result["provider"],
            metadata_json=stored_metadata,
        )
        session.add(fact)
        await session.commit()

        return {
            "id": fact.id,
            "content": content,
            "embedding": result["vector"],
            "embedding_provider": result["provider"],
            "metadata": metadata,
        }

    async def search_similar(
        self,
        session: AsyncSession,
        company_id: str,
        customer_id: str,
        query_text: str,
        top_k: int = 5,
        include_pseudo: bool = False,
    ) -> list[dict]:
        query_result = await self.generate_embedding_with_provider(text=query_text)
        if query_result["provider"] == EMBEDDING_PROVIDER_PSEUDO and not include_pseudo:
            return []

        query_vec = query_result["vector"]
        vec_literal = "[" + ",".join(str(v) for v in query_vec) + "]"

        rows = []
        if await self._is_pgvector_search_available(session):
            sql = text("""
                SELECT id, content, metadata_json, embedding_provider,
                       1 - (embedding <=> CAST(:query_vec AS vector)) AS similarity
                FROM ai.agentic_memory_fact
                WHERE company_id = :company_id
                  AND customer_id = :customer_id
                  AND type = 'EPISODIC'
                  AND embedding IS NOT NULL
                  AND (:include_pseudo = TRUE OR embedding_provider = :gemini_provider)
                ORDER BY embedding <=> CAST(:query_vec2 AS vector)
                LIMIT :top_k
            """)
            try:
                result = await session.execute(
                    sql,
                    {
                        "query_vec": vec_literal,
                        "query_vec2": vec_literal,
                        "company_id": company_id,
                        "customer_id": customer_id,
                        "top_k": top_k,
                        "include_pseudo": include_pseudo,
                        "gemini_provider": EMBEDDING_PROVIDER_GEMINI,
                    },
                )
                rows = result.fetchall()
            except Exception as exc:
                self._pgvector_search_available = False
                logger.warning("pgvector_search_unavailable", error=str(exc))
                try:
                    await session.rollback()
                except Exception as rollback_exc:
                    logger.warning("pgvector_search_rollback_failed", error=str(rollback_exc))

        if rows:
            scored = []
            for row in rows:
                meta = row[2] or {}
                provider = row[3] or meta.get("_embedding_provider", EMBEDDING_PROVIDER_GEMINI)
                scored.append({
                    "id": row[0],
                    "content": row[1],
                    "similarity": float(row[4]),
                    "embedding_provider": provider,
                    "metadata": {k: v for k, v in meta.items() if not k.startswith("_embedding_")},
                })
            return scored

        stmt = select(AgenticMemoryFact).where(
            AgenticMemoryFact.company_id == company_id,
            AgenticMemoryFact.customer_id == customer_id,
            AgenticMemoryFact.type == "EPISODIC",
        )
        if not include_pseudo:
            stmt = stmt.where(AgenticMemoryFact.embedding_provider == EMBEDDING_PROVIDER_GEMINI)
        result = await session.execute(stmt)
        facts = result.scalars().all()

        scored = []
        for fact in facts:
            embedding = fact.embedding or []
            meta = fact.metadata_json or {}
            provider = fact.embedding_provider or meta.get("_embedding_provider", EMBEDDING_PROVIDER_GEMINI if embedding else EMBEDDING_PROVIDER_PSEUDO)
            similarity = self.cosine_similarity(query_vec, embedding) if embedding else 0.0
            scored.append({
                "id": fact.id,
                "content": fact.content,
                "similarity": similarity,
                "embedding_provider": provider,
                "metadata": {k: v for k, v in meta.items() if not k.startswith("_embedding_")},
            })

        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:top_k]

    async def delete_customer_episodes(
        self,
        session: AsyncSession,
        company_id: str,
        customer_id: str,
    ) -> None:
        stmt = delete(AgenticMemoryFact).where(
            AgenticMemoryFact.company_id == company_id,
            AgenticMemoryFact.customer_id == customer_id,
        )
        await session.execute(stmt)
        await session.commit()

    async def get_episode_count(
        self,
        session: AsyncSession,
        company_id: str,
    ) -> int:
        stmt = select(AgenticMemoryFact).where(
            AgenticMemoryFact.company_id == company_id,
        )
        result = await session.execute(stmt)
        return len(result.all())


episodic_memory_service = EpisodicMemoryService()
