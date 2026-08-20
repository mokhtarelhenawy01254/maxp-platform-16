from __future__ import annotations

import contextlib
import json
import math
import re
import time
from dataclasses import dataclass, field
from typing import Any

import httpx
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.pipeline.context import DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL

logger = structlog.get_logger(__name__)

DEFAULT_SOURCE_ORDER = ["HYBRID_KNOWLEDGE", "FAQ_DB", "POLICY_DB", "VECTOR_STORE", "PRODUCT_DB", "WEB"]
HYBRID_SOURCE_TYPES = ["faq", "policy"]

SKIPPABLE_PATTERNS = [
    re.compile(r"^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening)|thank|thanks|bye|goodbye|ok|okay)$", re.IGNORECASE),
    re.compile(r"^(\u0645\u0631\u062D\u0628\u0627|\u0627\u0647\u0644\u064A\u0646|\u0627\u0644\u0633\u0644\u0627\u0645|\u062A\u062D\u064A\u0629|\u0635\u0628\u0627\u062D|\u0645\u0633\u0627\u0621|\u0634\u0643\u0631\u0627|\u0645\u0639\u0020\u0627\u0644\u0633\u0644\u0627\u0645\u0647|\u0645\u0639\u0020\u0627\u0644\u0633\u0644\u0627\u0645\u0629|\u062A\u0645\u0627\u0645|\u062D\u0633\u0646\u0627|\u0627\u064A\u0648\u0647|\u0623\u064A\u0648\u0647|\u062E\u0644\u0627\u0635|\u0645\u0627\u0634\u064A)$", re.UNICODE),
]

PROMPT_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|system|developer|instructions)", re.IGNORECASE),
    re.compile(r"disregard\s+(all\s+)?(previous|system|developer|instructions)", re.IGNORECASE),
    re.compile(r"reveal\s+(the\s+)?(system|developer|hidden|secret)", re.IGNORECASE),
    re.compile(r"\u0627\u0646\u0633\u064A|\u0627\u0646\u0633\u0649|\u062A\u062C\u0627\u0647\u0644|\u0627\u0643\u0633\u0631|\u062A\u0639\u0644\u064A\u0645\u0627\u062A|\u0633\u064A\u0633\u062A\u0645|\u0628\u0631\u0648\u0645\u0628\u062A"),
    re.compile(r"(\u0627\u0643\u0634\u0641|\u0627\u0638\u0647\u0631|\u0637\u0644\u0639|\u0642\u0648\u0644\u064A).*(\u0633\u0631\u064A|\u062F\u0627\u062E\u0644\u064A|\u0645\u062E\u0641\u064A)"),
]

ARABIC_STOP_WORDS = frozenset({
    "\u0645\u0646", "\u0625\u0644\u0649", "\u0639\u0646", "\u0639\u0644\u0649", "\u0641\u064A",
    "\u0647\u0648", "\u0647\u064A", "\u062A\u0645", "\u0627\u0646", "\u0627\u0646\u0643",
    "\u062D\u062A\u064A", "\u062D\u062A\u0649", "\u0627\u0648", "\u0623\u0648", "\u0648",
    "\u0641", "\u0628", "\u0643", "\u062F\u0647", "\u062F\u0627", "\u062F\u064A",
    "\u0627\u0644\u0644\u064A", "\u0647\u0644", "\u0639\u0646\u062F\u0643\u0645",
    "\u0639\u0627\u064A\u0632", "\u0645\u0645\u0643\u0646",
})

ENGLISH_STOP_WORDS = frozenset({
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were",
    "in", "on", "at", "to", "for", "of", "with", "by",
})

ARABIC_PREFIXES = [
    "\u0648\u0627\u0644", "\u0628\u0627\u0644", "\u0643\u0627\u0644",
    "\u0641\u0627\u0644", "\u0644\u0644", "\u0627\u0644",
    "\u0648", "\u0641", "\u0628", "\u0643", "\u0644",
]


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
    skippable: bool = False
    count: int = 0
    raw_avg: float = 0.0


@dataclass
class RAGAttempt:
    source: str
    query_used: str
    document_count: int
    grading: dict[str, Any] | None = None
    latency_ms: float = 0.0


@dataclass
class RAGResponse:
    answer: str | None = None
    sources: list[RAGDocument] = field(default_factory=list)
    iterations: int = 0
    grading: RAGGrading = field(default_factory=RAGGrading)
    final_source: str = "EXHAUSTED"
    attempts: list[RAGAttempt] = field(default_factory=list)
    retrieval_mode: str = "exhausted"
    trace_id: str | None = None


class CorrectiveRAGEngine:
    def __init__(self) -> None:
        self.max_iterations = len(DEFAULT_SOURCE_ORDER)
        self._sources: dict[str, list[Any]] = {}
        self._rerank_top_k = 10
        self._enable_llm_reranker = True
        self._query_log: list[dict[str, Any]] = []

    # ------------------------------------------------------------------
    # Arabic NLP
    # ------------------------------------------------------------------

    def _arabic_normalize(self, text: str) -> str:
        if not text:
            return ""
        text = text.lower()
        text = re.sub(r"[\u064B-\u065F\u0670\u0640]", "", text)
        text = re.sub(r"[\u0623\u0625\u0622]", "\u0627", text)
        text = re.sub(r"\u0649", "\u064A", text)
        text = re.sub(r"\u0629", "\u0647", text)
        text = re.sub(r"[^\w\s.-]", " ", text, flags=re.UNICODE)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def _normalize_arabic_token(self, token: str) -> str:
        normalized = token.strip()
        for prefix in ARABIC_PREFIXES:
            if normalized.startswith(prefix) and len(normalized) > len(prefix) + 2:
                normalized = normalized[len(prefix):]
                break
        return normalized

    def _tokenize(self, text: str) -> list[str]:
        normalized = self._arabic_normalize(text)
        if not normalized:
            return []
        return [
            self._normalize_arabic_token(t)
            for t in normalized.split()
            if len(t) > 1 and t not in ARABIC_STOP_WORDS and t not in ENGLISH_STOP_WORDS
        ]

    def _get_ngrams(self, text: str, n: int) -> list[str]:
        return [text[i:i + n] for i in range(len(text) - n + 1)]

    # ------------------------------------------------------------------
    # Guardrails
    # ------------------------------------------------------------------

    def _detect_prompt_injection(self, query: str) -> dict[str, Any]:
        normalized = self._arabic_normalize(query)
        for pattern in PROMPT_INJECTION_PATTERNS:
            if pattern.search(normalized):
                return {"blocked": True, "reason": "prompt-injection-or-secret-request"}
        return {"blocked": False, "reason": None}

    def _is_query_rag_relevant(self, query: str) -> bool:
        text = str(query or "").strip()
        if not text or len(text) < 3:
            return False
        normalized = re.sub(r"[.,!?;:]", "", text.lower()).strip()
        return not any(p.match(normalized) for p in SKIPPABLE_PATTERNS)

    # ------------------------------------------------------------------
    # Intent detection
    # ------------------------------------------------------------------

    def _has_any_intent_term(self, text: str, terms: list[str]) -> bool:
        normalized = self._arabic_normalize(text)
        return any(term in normalized for term in terms)

    def _detect_knowledge_intent(self, text: str) -> str:
        normalized = self._arabic_normalize(text)
        if not normalized:
            return "unknown"

        if self._has_any_intent_term(normalized, [
            "shipping", "delivery", "ship", "deliver",
            "\u0634\u062D\u0646", "\u062A\u0648\u0635\u064A\u0644", "\u0645\u062F\u0629 \u0627\u0644\u062A\u0648\u0635\u064A\u0644",
            "\u0645\u0646\u062F\u0648\u0628", "\u0645\u062D\u0627\u0641\u0638\u0627\u062A",
        ]):
            return "shipping"

        if self._has_any_intent_term(normalized, [
            "return_policy", "returns", "return", "exchange",
            "\u0627\u0633\u062A\u0628\u062F\u0627\u0644", "\u0627\u0631\u062C\u0627\u0639", "\u0625\u0631\u062C\u0627\u0639",
            "\u0645\u0631\u062A\u062C\u0639", "\u0631\u062F \u0627\u0644\u0645\u0646\u062A\u062C",
        ]):
            return "returns"

        if self._has_any_intent_term(normalized, [
            "refund_policy", "refund",
            "\u0627\u0633\u062A\u0631\u062F\u0627\u062F", "\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0627\u0644\u0645\u0628\u0644\u063A",
            "\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0627\u0644\u0641\u0644\u0648\u0633", "\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0645\u0627\u0644\u064A",
        ]):
            return "refund"

        if self._has_any_intent_term(normalized, [
            "discount", "discounts", "coupon", "promo",
            "\u062E\u0635\u0645", "\u0643\u0648\u0628\u0648\u0646", "\u0643\u0648\u062F \u062E\u0635\u0645", "\u0639\u0631\u0636",
        ]):
            return "discount"

        if self._has_any_intent_term(normalized, [
            "branch", "pickup", "location",
            "\u0641\u0631\u0639", "\u0627\u0633\u062A\u0644\u0627\u0645 \u0645\u0646 \u0627\u0644\u0641\u0631\u0639",
            "\u0627\u0633\u062A\u0644\u0627\u0645", "\u0639\u0646\u0648\u0627\u0646",
        ]):
            return "location"

        return "unknown"

    def _detect_document_intent(self, doc: RAGDocument) -> str:
        category_intent = self._detect_knowledge_intent(doc.metadata.get("category", ""))
        if category_intent != "unknown":
            return category_intent
        return self._detect_knowledge_intent(doc.content)

    # ------------------------------------------------------------------
    # Embedding helpers
    # ------------------------------------------------------------------

    def _parse_embedding(self, embedding: Any) -> list[float] | None:
        if embedding is None:
            return None
        if isinstance(embedding, list):
            return [float(x) for x in embedding if isinstance(x, (int, float)) and math.isfinite(x)]
        if not isinstance(embedding, str):
            return None
        try:
            parsed = json.loads(embedding)
            if isinstance(parsed, list):
                return [float(x) for x in parsed if isinstance(x, (int, float)) and math.isfinite(x)]
        except (json.JSONDecodeError, TypeError):
            pass
        vector = [
            float(x.strip())
            for x in embedding.strip("[]").split(",")
        ]
        vector = [v for v in vector if math.isfinite(v)]
        return vector if vector else None

    @staticmethod
    def _local_embedding(text: str, dims: int = 768) -> list[float]:
        vec = [0.0] * dims
        if not text:
            return vec
        normalized = text.lower().strip()
        for _, char in enumerate(normalized):
            h = 2166136261
            for c in char.encode("utf-8"):
                h ^= c
                h = (h * 16777619) & 0xFFFFFFFF
            idx = abs(h) % dims
            vec[idx] += 1.0
        mag = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / mag for v in vec]

    @staticmethod
    def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
        if not vec_a or not vec_b:
            return 0.0
        length = min(len(vec_a), len(vec_b))
        dot = sum(vec_a[i] * vec_b[i] for i in range(length))
        mag_a = math.sqrt(sum(vec_a[i] * vec_a[i] for i in range(length)))
        mag_b = math.sqrt(sum(vec_b[i] * vec_b[i] for i in range(length)))
        denom = mag_a * mag_b
        return dot / denom if denom != 0 else 0.0

    # ------------------------------------------------------------------
    # Scoring
    # ------------------------------------------------------------------

    def _bm25_scores(self, query: str, docs: list[RAGDocument]) -> dict[int, float]:
        query_tokens = self._tokenize(query)
        if not query_tokens or not docs:
            return {}

        tokenized_docs = [self._tokenize(d.content) for d in docs]
        avg_doc_length = sum(len(t) for t in tokenized_docs) / max(len(tokenized_docs), 1)

        doc_freq: dict[str, int] = {}
        for tokens in tokenized_docs:
            for token in set(tokens):
                doc_freq[token] = doc_freq.get(token, 0) + 1

        k1 = 1.4
        b_val = 0.72
        raw_scores: dict[int, float] = {}
        max_score = 0.0

        for idx, tokens in enumerate(tokenized_docs):
            freq: dict[str, int] = {}
            for token in tokens:
                freq[token] = freq.get(token, 0) + 1
            score = 0.0
            for token in query_tokens:
                tf = freq.get(token, 0)
                if tf == 0:
                    continue
                df = doc_freq.get(token, 0)
                idf = math.log(1 + ((len(docs) - df + 0.5) / (df + 0.5)))
                denominator = tf + k1 * (1 - b_val + b_val * (len(tokens) / max(avg_doc_length, 1)))
                score += idf * ((tf * (k1 + 1)) / denominator)
            raw_scores[idx] = score
            max_score = max(max_score, score)

        if max_score > 0:
            return {idx: s / max_score for idx, s in raw_scores.items()}
        return raw_scores

    @staticmethod
    def _rank_map(scores: dict[int, float]) -> dict[int, int]:
        sorted_items = sorted(
            [(idx, score) for idx, score in scores.items() if score > 0],
            key=lambda x: x[1],
            reverse=True,
        )
        return {idx: rank + 1 for rank, (idx, _) in enumerate(sorted_items)}

    def _score_documents(self, query: str, docs: list[Any]) -> list[RAGDocument]:
        if not docs:
            return []
        normalized_query = self._arabic_normalize(query)
        query_words = normalized_query.split()
        query_bigrams = self._get_ngrams(normalized_query, 2)
        query_trigrams = self._get_ngrams(normalized_query, 3)

        results = []
        for doc in docs:
            content = doc.content if hasattr(doc, "content") else doc.get("content", "")
            normalized_content = self._arabic_normalize(content)
            content_words = normalized_content.split()
            content_bigrams = self._get_ngrams(normalized_content, 2)
            content_trigrams = self._get_ngrams(normalized_content, 3)

            word_overlap = sum(1 for w in query_words if w in content_words)
            word_score = word_overlap / len(query_words) if query_words else 0

            bigram_overlap = sum(1 for b in query_bigrams if b in content_bigrams)
            bigram_score = bigram_overlap / len(query_bigrams) if query_bigrams else 0

            trigram_overlap = sum(1 for t in query_trigrams if t in content_trigrams)
            trigram_score = trigram_overlap / len(query_trigrams) if query_trigrams else 0

            relevance = word_score
            if word_score < 0.7 and (bigram_score > 0 or trigram_score > 0):
                relevance = max(word_score, bigram_score * 0.4 + trigram_score * 0.6)

            metadata = doc.metadata if hasattr(doc, "metadata") else doc.get("metadata", {})
            results.append(
                RAGDocument(
                    content=content,
                    relevance=min(1.0, relevance),
                    source="calculated",
                    metadata=metadata,
                )
            )

        results.sort(key=lambda x: x.relevance, reverse=True)
        return results[:5]

    def _hybrid_score_documents(self, query: str, docs: list[RAGDocument]) -> list[RAGDocument]:
        if not docs:
            return []

        normalized_query = self._arabic_normalize(query)
        query_words = normalized_query.split()
        query_bigrams = self._get_ngrams(normalized_query, 2)
        query_trigrams = self._get_ngrams(normalized_query, 3)

        ngram_scores: dict[int, float] = {}
        max_ngram = 0.0
        for idx, doc in enumerate(docs):
            normalized_content = self._arabic_normalize(doc.content)
            content_words = normalized_content.split()
            content_bigrams = self._get_ngrams(normalized_content, 2)
            content_trigrams = self._get_ngrams(normalized_content, 3)

            word_overlap = sum(1 for w in query_words if w in content_words)
            word_score = word_overlap / len(query_words) if query_words else 0

            bigram_overlap = sum(1 for b in query_bigrams if b in content_bigrams)
            bigram_score = bigram_overlap / len(query_bigrams) if query_bigrams else 0

            trigram_overlap = sum(1 for t in query_trigrams if t in content_trigrams)
            trigram_score = trigram_overlap / len(query_trigrams) if query_trigrams else 0

            ngram = word_score
            if word_score < 0.7 and (bigram_score > 0 or trigram_score > 0):
                ngram = max(word_score, bigram_score * 0.4 + trigram_score * 0.6)
            ngram_scores[idx] = min(1.0, ngram)
            max_ngram = max(max_ngram, ngram)

        query_vec = self._local_embedding(query)
        vector_scores: dict[int, float] = {}
        max_vec = 0.0
        for idx, doc in enumerate(docs):
            stored = self._parse_embedding(doc.metadata.get("embedding"))
            doc_vec = stored or self._local_embedding(doc.content)
            sim = max(0.0, self._cosine_similarity(query_vec, doc_vec))
            score = sim if sim >= 0.15 else 0.0
            vector_scores[idx] = score
            max_vec = max(max_vec, score)
        if max_vec > 0:
            vector_scores = {idx: s / max_vec for idx, s in vector_scores.items()}

        results = []
        for idx, doc in enumerate(docs):
            ngram_norm = (ngram_scores.get(idx, 0) / max_ngram) if max_ngram > 0 else 0
            vec_norm = vector_scores.get(idx, 0)
            has_vector = bool(doc.metadata.get("embedding"))
            vec_weight = 0.4 if has_vector else 0
            ngram_weight = 1 - vec_weight
            relevance = min(1.0, ngram_norm * ngram_weight + vec_norm * vec_weight)

            doc.metadata["retrieval"] = {
                "pipeline": "hybrid-ngram-vector" if has_vector else "ngram-only",
                "ngram_score": round(ngram_norm, 4),
                "vector_score": round(vec_norm, 4),
                "vector_provider": "stored" if has_vector else "none",
            }
            doc.relevance = relevance
            results.append(doc)

        results.sort(key=lambda x: x.relevance, reverse=True)
        return results[:5]

    def _score_hybrid_documents(self, query: str, docs: list[RAGDocument]) -> list[RAGDocument]:
        if not docs:
            return []

        bm25 = self._bm25_scores(query, docs)
        query_intent = self._detect_knowledge_intent(query)
        query_vec = self._local_embedding(query)

        vec_scores: dict[int, float] = {}
        max_vec = 0.0
        for idx, doc in enumerate(docs):
            stored = self._parse_embedding(doc.metadata.get("embedding"))
            doc_vec = stored or self._local_embedding(doc.content)
            raw_sim = max(0.0, self._cosine_similarity(query_vec, doc_vec))
            sim = raw_sim if raw_sim >= 0.18 else 0.0
            vec_scores[idx] = sim
            max_vec = max(max_vec, sim)
        if max_vec > 0:
            vec_scores = {idx: s / max_vec for idx, s in vec_scores.items()}

        bm25_ranks = self._rank_map(bm25)
        vec_ranks = self._rank_map(vec_scores)
        now_ts = time.time()

        results = []
        for idx, doc in enumerate(docs):
            lexical_score = bm25.get(idx, 0)
            vector_score = vec_scores.get(idx, 0)
            lexical_rank_boost = 1 / (60 + bm25_ranks[idx]) if idx in bm25_ranks else 0
            vector_rank_boost = 1 / (60 + vec_ranks[idx]) if idx in vec_ranks else 0
            rrf_score = lexical_rank_boost + vector_rank_boost
            normalized_rrf = min(1.0, rrf_score * 35)

            updated_at = doc.metadata.get("updatedAt") or doc.metadata.get("effectiveAt")
            age_days: float = 365.0
            if updated_at:
                with contextlib.suppress(ValueError, TypeError):
                    age_days = max(0, (now_ts - _parse_dt(updated_at)) / 86400)
            recency_score = max(0.0, 1 - min(age_days, 365) / 365)

            trust_score = 1.0 if doc.metadata.get("type") == "policy" else 0.92
            doc_intent = self._detect_document_intent(doc)
            intent_aligned = query_intent != "unknown" and doc_intent == query_intent
            intent_conflict = query_intent != "unknown" and doc_intent != "unknown" and doc_intent != query_intent
            intent_score = 0.2 if intent_aligned else 0

            exact_phrase_boost = 0.08 if self._arabic_normalize(query) in self._arabic_normalize(doc.content) else 0

            doc_category = self._arabic_normalize(doc.metadata.get("category", ""))
            doc_title = self._arabic_normalize(doc.metadata.get("title", doc.metadata.get("id", "")))
            doc_tags = self._arabic_normalize(str(doc.metadata.get("tags", "")))
            query_words = self._tokenize(query)
            matches_category = any(w in doc_category for w in query_words)
            matches_title = bool(doc_title) and any(w in doc_title for w in query_words)
            matches_tags = bool(doc_tags) and any(w in doc_tags for w in query_words)
            context_boost = (0.05 if matches_category else 0) + (0.05 if matches_title else 0) + (0.04 if matches_tags else 0)

            rerank = min(1.0, (
                lexical_score * 0.42
                + vector_score * 0.28
                + normalized_rrf * 0.18
                + recency_score * 0.06
                + trust_score * 0.06
                + intent_score
                + exact_phrase_boost
                + context_boost
            ))
            if intent_conflict:
                rerank = min(rerank, 0.58)
            if not doc.metadata.get("embedding") and lexical_score < 0.15:
                rerank = min(rerank, 0.55)
            if lexical_score == 0 and vector_score == 0:
                rerank = min(rerank, 0.18)

            doc.relevance = rerank
            doc.metadata["retrieval"] = {
                "pipeline": "hybrid-bm25-vector-rrf-rerank",
                "lexical_score": round(lexical_score, 4),
                "vector_score": round(vector_score, 4),
                "rrf_score": round(normalized_rrf, 4),
                "recency_score": round(recency_score, 4),
                "trust_score": trust_score,
                "query_intent": query_intent,
                "document_intent": doc_intent,
                "intent_aligned": intent_aligned,
                "intent_conflict": intent_conflict,
                "rerank_score": round(rerank, 4),
                "vector_provider": "stored" if doc.metadata.get("embedding") else "local-fallback",
            }
            results.append(doc)

        results.sort(key=lambda x: x.relevance, reverse=True)
        return results[:5]

    # ------------------------------------------------------------------
    # LLM Reranker
    # ------------------------------------------------------------------

    async def _rerank_with_gemini(self, company_id: str, query: str, documents: list[RAGDocument]) -> list[RAGDocument]:
        if len(documents) < 2:
            return documents
        try:
            from src.llm.key_resolver import get_active_key

            api_key = await get_active_key("GOOGLE")
            if not api_key:
                return documents

            candidates = documents[:self._rerank_top_k]
            pairs = "\n\n".join(
                f"[{i + 1}] Document: {d.content[:500]}".strip()
                for i, d in enumerate(candidates)
            )

            prompt = (
                f"You are a relevance re-ranker. Rate how relevant each document is to the query "
                f"on a scale of 0.00 to 1.00.\n\n"
                f"Query: {query}\n\n{pairs}\n\n"
                f"Return a JSON object with keys being the document numbers (1-{len(candidates)}) "
                f"and values being the relevance scores. Only respond with valid JSON, no other text. "
                f'Example: {{"1": 0.95, "2": 0.32}}'
            )

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key={api_key}"
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 512},
                    },
                )
                if not response.is_success:
                    return documents
                data = response.json()
                text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                if not text:
                    return documents

            match = re.search(r"\{[\s\S]*\}", text)
            if not match:
                return documents
            scores = json.loads(match.group())

            for i, doc in enumerate(candidates):
                s = scores.get(str(i + 1))
                if s is not None:
                    doc.relevance = float(s) or doc.relevance
                doc.metadata.setdefault("retrieval", {})["llm_rerank_score"] = float(scores.get(str(i + 1), 0))
                doc.metadata["retrieval"]["pipeline"] = (
                    f"{doc.metadata['retrieval'].get('pipeline', '')}-llm-rerank".strip("-")
                )

            candidates.sort(key=lambda x: x.relevance, reverse=True)
            return candidates
        except Exception as exc:
            logger.warning("LLM reranker failed, using original scores", error=str(exc))
            return documents

    # ------------------------------------------------------------------
    # Sources
    # ------------------------------------------------------------------

    async def _retrieve_faq_db(self, session: AsyncSession, company_id: str, query: str, options: dict[str, Any]) -> list[RAGDocument]:
        try:
            from src.db.models.faq import FAQ
            where = FAQ.company_id == company_id
            stmt = select(FAQ).where(where, FAQ.isActive)
            category = options.get("category") or options.get("knowledgeCategory")
            if category:
                stmt = stmt.where(FAQ.category == category)
            stmt = stmt.order_by(FAQ.order.asc(), FAQ.updatedAt.desc()).limit(50)
            result = await session.execute(stmt)
            faqs = result.scalars().all()
            if not faqs:
                return []

            docs = []
            for f in faqs:
                category_label = f.category or "general"
                tags = self._format_tags(f.tags)
                context = (
                    f"This chunk is part of the merchant's official FAQ database, specifically answering "
                    f'a customer question under category "{category_label}". Tags: [{tags}]. Question: {f.question}'
                )
                docs.append(RAGDocument(
                    content=f"[Context: {context}]\nFAQ question: {f.question}\nFAQ answer: {f.answer}\nCategory: {category_label}\nTags: {tags}",
                    metadata={
                        "type": "faq",
                        "id": f.id,
                        "title": f.question,
                        "category": category_label,
                        "tags": tags,
                        "version": getattr(f, "version", 1),
                        "updatedAt": f.updatedAt,
                        "embedding": getattr(f, "embedding", None),
                    },
                ))
            return self._hybrid_score_documents(query, docs)
        except ModuleNotFoundError:
            logger.debug("FAQ model unavailable for RAG source", source="FAQ_DB")
            return []

    async def _retrieve_policy_db(self, session: AsyncSession, company_id: str, query: str, options: dict[str, Any]) -> list[RAGDocument]:
        try:
            import datetime

            from src.db.models.policy import Policy
            now = datetime.datetime.now(datetime.UTC)
            where_clause = Policy.company_id == company_id
            stmt = select(Policy).where(where_clause, Policy.isActive, Policy.effectiveAt <= now)
            stmt = stmt.where((Policy.expiresAt.is_(None)) | (Policy.expiresAt > now))
            category = options.get("category") or options.get("knowledgeCategory")
            if category:
                stmt = stmt.where(Policy.category == category)
            stmt = stmt.order_by(Policy.order.asc(), Policy.effectiveAt.desc()).limit(50)
            result = await session.execute(stmt)
            policies = result.scalars().all()
            if not policies:
                return []

            docs = []
            for p in policies:
                category_label = p.category or "general"
                tags = self._format_tags(p.tags)
                context = (
                    f'This chunk is part of the merchant\'s official policy document, titled "{p.title}", '
                    f'under category "{category_label}". This document governs operations and terms. Tags: [{tags}]'
                )
                docs.append(RAGDocument(
                    content=f"[Context: {context}]\nPolicy title: {p.title}\nPolicy content: {p.content}\nCategory: {category_label}\nTags: {tags}",
                    metadata={
                        "type": "policy",
                        "id": p.id,
                        "title": p.title,
                        "category": category_label,
                        "tags": tags,
                        "version": getattr(p, "version", 1),
                        "effectiveAt": p.effectiveAt,
                        "expiresAt": getattr(p, "expiresAt", None),
                        "updatedAt": p.updatedAt,
                        "embedding": getattr(p, "embedding", None),
                    },
                ))
            return self._hybrid_score_documents(query, docs)
        except ModuleNotFoundError:
            logger.debug("Policy model unavailable for RAG source", source="POLICY_DB")
            return []

    async def _retrieve_vector_store(self, session: AsyncSession, company_id: str, query: str, options: dict[str, Any]) -> list[RAGDocument]:
        if options.get("disableVectorStore") or options.get(DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL):
            logger.debug("Vector memory source skipped for RAG", reason="disabled_by_options")
            return []
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
            return []
        except Exception as exc:
            logger.debug("Vector memory source unavailable for RAG", error=str(exc))
            return []

    async def _retrieve_product_db(self, session: AsyncSession, company_id: str, query: str, options: dict[str, Any]) -> list[RAGDocument]:
        try:
            from src.db.models.product import Product
            stmt = select(Product).where(Product.company_id == company_id, Product.isActive).limit(20)
            result = await session.execute(stmt)
            products = result.scalars().all()
            if products:
                docs = [
                    {
                        "content": f"Product {p.name} {getattr(p, 'description', '') or ''} price {getattr(p, 'price', '')}",
                        "productId": p.id,
                    }
                    for p in products
                ]
                return self._score_documents(query, docs)
            return []
        except ModuleNotFoundError:
            logger.debug("Product model unavailable for RAG source", source="PRODUCT_DB")
            return []

    async def _retrieve_web(self, session: AsyncSession, company_id: str, query: str, options: dict[str, Any]) -> list[RAGDocument]:
        try:
            from src.db.models import AiSetting
            stmt = select(AiSetting).where(AiSetting.company_id == company_id)
            result = await session.execute(stmt)
            ai_setting = result.scalar_one_or_none()
            write_tool_scopes = getattr(ai_setting, "writeToolScopes", None) or "No active restrictions"
            human_approval = getattr(ai_setting, "humanApprovalRequiredForWrite", True)
            max_replies = getattr(ai_setting, "maxRepliesPerCustomer", 5)
            content = (
                f"Web Search Results: Company {company_id} guidelines: "
                f"write tool scopes allowed: [{write_tool_scopes}]. "
                f"Human approval for write operations is set to {human_approval}. "
                f"Max replies allowed: {max_replies}. "
                f"Search matched general merchant guidelines."
            )
            return self._score_documents(query, [{"content": content, "source": "WEB"}])
        except ModuleNotFoundError:
            logger.debug("AiSetting model unavailable for RAG source", source="WEB")
            return []
        except Exception as exc:
            logger.warning("WEB source retrieval failed", error=str(exc))
            return []

    async def _retrieve_hybrid_knowledge(self, session: AsyncSession, company_id: str, query: str, options: dict[str, Any]) -> list[RAGDocument]:
        try:
            import datetime
            now = datetime.datetime.now(datetime.UTC)
            category = options.get("category") or options.get("knowledgeCategory")
            faqs: list[Any] = []
            policies: list[Any] = []

            if "faq" in HYBRID_SOURCE_TYPES:
                try:
                    from src.db.models.faq import FAQ
                    faq_stmt = select(FAQ).where(FAQ.company_id == company_id, FAQ.isActive)
                    if category:
                        faq_stmt = faq_stmt.where(FAQ.category == category)
                    faq_stmt = faq_stmt.order_by(FAQ.order.asc(), FAQ.updatedAt.desc()).limit(80)
                    faq_result = await session.execute(faq_stmt)
                    faqs = list(faq_result.scalars().all())
                except ModuleNotFoundError:
                    logger.debug("FAQ model unavailable for HYBRID_KNOWLEDGE")

            if "policy" in HYBRID_SOURCE_TYPES:
                try:
                    from src.db.models.policy import Policy
                    pol_stmt = select(Policy).where(
                        Policy.company_id == company_id,
                        Policy.isActive,
                        Policy.effectiveAt <= now,
                    )
                    pol_stmt = pol_stmt.where((Policy.expiresAt.is_(None)) | (Policy.expiresAt > now))
                    if category:
                        pol_stmt = pol_stmt.where(Policy.category == category)
                    pol_stmt = pol_stmt.order_by(Policy.order.asc(), Policy.effectiveAt.desc()).limit(80)
                    pol_result = await session.execute(pol_stmt)
                    policies = list(pol_result.scalars().all())
                except ModuleNotFoundError:
                    logger.debug("Policy model unavailable for HYBRID_KNOWLEDGE")

            candidates: list[RAGDocument] = []

            for f in faqs:
                category_label = f.category or "general"
                tags = self._format_tags(f.tags)
                context = (
                    f"This chunk is part of the merchant's official FAQ database, specifically answering "
                    f'a customer question under category "{category_label}". Tags: [{tags}]. Question: {f.question}'
                )
                candidates.append(RAGDocument(
                    content=f"[Context: {context}]\nFAQ question: {f.question}\nFAQ answer: {f.answer}\nCategory: {category_label}\nTags: {tags}",
                    metadata={
                        "type": "faq",
                        "id": f.id,
                        "title": f.question,
                        "category": category_label,
                        "tags": tags,
                        "version": getattr(f, "version", 1),
                        "updatedAt": f.updatedAt,
                        "embedding": getattr(f, "embedding", None),
                    },
                ))

            for p in policies:
                category_label = p.category or "general"
                tags = self._format_tags(p.tags)
                context = (
                    f'This chunk is part of the merchant\'s official policy document, titled "{p.title}", '
                    f'under category "{category_label}". This document governs operations and terms. Tags: [{tags}]'
                )
                candidates.append(RAGDocument(
                    content=f"[Context: {context}]\nPolicy title: {p.title}\nPolicy content: {p.content}\nCategory: {category_label}\nTags: {tags}",
                    metadata={
                        "type": "policy",
                        "id": p.id,
                        "title": p.title,
                        "category": category_label,
                        "tags": tags,
                        "version": getattr(p, "version", 1),
                        "effectiveAt": p.effectiveAt,
                        "expiresAt": getattr(p, "expiresAt", None),
                        "updatedAt": p.updatedAt,
                        "embedding": getattr(p, "embedding", None),
                    },
                ))

            return self._score_hybrid_documents(query, candidates)
        except Exception as exc:
            logger.warning("HYBRID_KNOWLEDGE retrieval failed", error=str(exc))
            return []

    # ------------------------------------------------------------------
    # Main retrieval dispatcher
    # ------------------------------------------------------------------

    async def _retrieve(
        self,
        session: AsyncSession,
        company_id: str,
        query: str,
        source: str,
        options: dict[str, Any] | None = None,
    ) -> list[RAGDocument]:
        options = options or {}

        mem_key = f"{company_id}:{source}"
        if mem_key in self._sources:
            return self._score_documents(query, self._sources[mem_key])

        try:
            if source == "HYBRID_KNOWLEDGE":
                return await self._retrieve_hybrid_knowledge(session, company_id, query, options)
            if source == "FAQ_DB":
                return await self._retrieve_faq_db(session, company_id, query, options)
            if source == "POLICY_DB":
                return await self._retrieve_policy_db(session, company_id, query, options)
            if source == "VECTOR_STORE":
                return await self._retrieve_vector_store(session, company_id, query, options)
            if source == "PRODUCT_DB":
                return await self._retrieve_product_db(session, company_id, query, options)
            if source == "WEB":
                return await self._retrieve_web(session, company_id, query, options)

            return []
        except Exception as exc:
            logger.debug("Source retrieval failed, falling back", source=source, error=str(exc))
            return []

    # ------------------------------------------------------------------
    # Grading, reformulation, answer generation
    # ------------------------------------------------------------------

    def _grade_documents(self, query: str, documents: list[RAGDocument]) -> RAGGrading:
        if not documents:
            return RAGGrading(avg_relevance=0, sufficient=False, count=0)
        top_relevance = max(d.relevance for d in documents)
        avg = sum(d.relevance for d in documents) / len(documents)
        return RAGGrading(
            avg_relevance=top_relevance,
            sufficient=top_relevance >= 0.7,
            count=len(documents),
            raw_avg=avg,
        )

    @staticmethod
    def _reformulate_query(query: str, grading: RAGGrading) -> str:
        additions = ["details", "specific", "exact"]
        addition = additions[hash(str(grading)) % len(additions)]
        return f"{query} {addition}".strip()

    @staticmethod
    def _generate_answer(query: str, documents: list[RAGDocument]) -> str | None:
        if not documents:
            return None
        return f"Based on available information: {documents[0].content}"

    # ------------------------------------------------------------------
    # Trace persistence
    # ------------------------------------------------------------------

    async def _persist_trace(
        self,
        session: AsyncSession,
        company_id: str,
        query: str,
        result: RAGResponse,
        options: dict[str, Any],
        latency_ms: float,
        status: str,
    ) -> str | None:
        if options.get("persistTrace") is not True:
            return None
        try:
            from src.db.models import AiTrace as AiTraceModel  # type: ignore[attr-defined]
            from src.db.models import AiTraceStep  # type: ignore[attr-defined]
            metadata = {
                "feature": "agentic-rag",
                "ragStatus": status,
                "finalSource": result.final_source,
                "retrievalMode": result.retrieval_mode,
                "avgRelevance": result.grading.avg_relevance,
                "sufficient": bool(result.grading.sufficient),
                "sourceCount": len(result.sources),
                "sourceOrder": options.get("sourceOrder", DEFAULT_SOURCE_ORDER),
                "category": options.get("category") or options.get("knowledgeCategory"),
                "blocked": bool(result.grading.blocked),
            }
            trace = AiTraceModel(
                company_id=company_id,
                query=query,
                latency_ms=int(latency_ms) if math.isfinite(latency_ms) else None,
                metadata=json.dumps(metadata),
            )
            session.add(trace)
            await session.flush()

            if hasattr(trace, "id") and result.attempts and (hasattr(AiTraceStep, "create_many") or True):
                    for order, attempt in enumerate(result.attempts, 1):
                        step = AiTraceStep(
                            trace_id=trace.id,
                            step_type="HYBRID_RETRIEVAL" if attempt.source == "HYBRID_KNOWLEDGE" else "RETRIEVAL",
                            latency_ms=int(attempt.latency_ms) if math.isfinite(attempt.latency_ms) else 0,
                            input=attempt.query_used or query,
                            output=json.dumps({
                                "source": attempt.source,
                                "documentCount": attempt.document_count,
                                "grading": attempt.grading,
                            }),
                            metadata=json.dumps({
                                "finalSource": result.final_source,
                                "retrievalMode": result.retrieval_mode,
                            }),
                            order=order,
                        )
                        session.add(step)

            await session.commit()
            return str(getattr(trace, "id", ""))
        except ModuleNotFoundError:
            logger.debug("AiTrace/AiTraceStep models unavailable for RAG trace persistence")
            return None
        except Exception as exc:
            logger.warning("RAG trace persistence failed", error=str(exc))
            await session.rollback()
            return None

    # ------------------------------------------------------------------
    # Main query method
    # ------------------------------------------------------------------

    async def query(
        self,
        session: AsyncSession,
        company_id: str,
        query: str,
        options: dict[str, Any] | None = None,
    ) -> RAGResponse:
        options = options or {}
        started_at = time.time()
        current_query = query
        source_order = (
            options.get("sourceOrder", DEFAULT_SOURCE_ORDER)
            if isinstance(options.get("sourceOrder"), list) and len(options["sourceOrder"]) > 0
            else DEFAULT_SOURCE_ORDER
        )
        max_iterations = options.get("maxIterations")
        if max_iterations is not None:
            max_iterations = max(1, int(max_iterations))
        else:
            max_iterations = max(self.max_iterations, len(source_order))

        if options.get("disableVectorStore") or options.get(DISABLE_EXTERNAL_EMBEDDING_RETRIEVAL):
            source_order = [s for s in source_order if s != "VECTOR_STORE"]

        guarded = self._detect_prompt_injection(query)
        if guarded["blocked"]:
            grading = RAGGrading(avg_relevance=0, sufficient=False, blocked=True, reason=guarded["reason"])
            response = RAGResponse(
                answer=None,
                sources=[],
                iterations=0,
                grading=grading,
                final_source="GUARDRAIL",
                retrieval_mode="guardrail",
            )
            response.trace_id = await self._persist_trace(
                session, company_id, query, response, options,
                latency_ms=(time.time() - started_at) * 1000, status="failed",
            )
            return response

        if not self._is_query_rag_relevant(query):
            grading = RAGGrading(avg_relevance=0, sufficient=False, skippable=True)
            response = RAGResponse(
                answer=None,
                sources=[],
                iterations=0,
                grading=grading,
                final_source="SKIP_RETRIEVAL",
                retrieval_mode="skip-retrieval",
            )
            response.trace_id = await self._persist_trace(
                session, company_id, query, response, options,
                latency_ms=(time.time() - started_at) * 1000, status="failed",
            )
            return response

        iterations = 0
        best_docs: list[RAGDocument] = []
        best_score = 0.0
        attempts: list[RAGAttempt] = []
        best_effort_threshold = options.get("bestEffortThreshold")
        if best_effort_threshold is not None:
            best_effort_threshold = max(0.0, min(1.0, float(best_effort_threshold)))
        else:
            best_effort_threshold = 0.7

        for source in source_order:
            if iterations >= max_iterations:
                break
            iterations += 1

            attempt_start = time.time()
            docs = await self._retrieve(session, company_id, current_query, source, options)

            if source == "HYBRID_KNOWLEDGE" and self._enable_llm_reranker and len(docs) > 1:
                docs = await self._rerank_with_gemini(company_id, current_query, docs)

            grading = self._grade_documents(current_query, docs)
            attempt_latency = (time.time() - attempt_start) * 1000
            attempts.append(RAGAttempt(
                source=source,
                query_used=current_query,
                document_count=len(docs),
                grading={
                    "avg_relevance": grading.avg_relevance,
                    "sufficient": grading.sufficient,
                    "count": grading.count,
                },
                latency_ms=attempt_latency,
            ))

            if grading.avg_relevance >= 0.7:
                answer = self._generate_answer(current_query, docs)
                response = RAGResponse(
                    answer=answer,
                    sources=docs,
                    iterations=iterations,
                    grading=grading,
                    final_source=source,
                    attempts=attempts,
                    retrieval_mode="hybrid" if source == "HYBRID_KNOWLEDGE" else "source_fallback",
                )
                response.trace_id = await self._persist_trace(
                    session, company_id, query, response, options,
                    latency_ms=(time.time() - started_at) * 1000, status="answered",
                )
                return response

            if grading.avg_relevance > best_score:
                best_docs = docs
                best_score = grading.avg_relevance

            current_query = self._reformulate_query(current_query, grading)

        should_use_best_effort = len(best_docs) > 0 and best_score >= best_effort_threshold
        answer = self._generate_answer(current_query, best_docs) if should_use_best_effort else None

        response = RAGResponse(
            answer=answer,
            sources=[
                RAGDocument(content=d.content, relevance=d.relevance, source="BEST_EFFORT", metadata=d.metadata)
                for d in best_docs
            ],
            iterations=iterations,
            grading=RAGGrading(avg_relevance=best_score, sufficient=False, count=len(best_docs)),
            final_source="EXHAUSTED",
            attempts=attempts,
            retrieval_mode="exhausted",
        )
        response.trace_id = await self._persist_trace(
            session, company_id, query, response, options,
            latency_ms=(time.time() - started_at) * 1000, status="failed",
        )
        return response

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------

    @staticmethod
    def _format_tags(tags: Any) -> str:
        if tags is None:
            return ""
        if isinstance(tags, list):
            return ", ".join(str(t) for t in tags)
        if isinstance(tags, str):
            try:
                parsed = json.loads(tags)
                if isinstance(parsed, list):
                    return ", ".join(str(t) for t in parsed)
            except (json.JSONDecodeError, TypeError):
                pass
            return tags
        return str(tags)

    # ------------------------------------------------------------------
    # Public helpers (testing/seeding)
    # ------------------------------------------------------------------

    def add_documents(self, company_id: str, source: str, documents: list[Any]) -> None:
        key = f"{company_id}:{source}"
        if key not in self._sources:
            self._sources[key] = []
        self._sources[key].extend(documents)

    def get_query_log(self, company_id: str) -> list[dict[str, Any]]:
        return [entry for entry in self._query_log if entry.get("company_id") == company_id]

    def _reset(self) -> None:
        self._sources.clear()
        self._query_log.clear()


def _parse_dt(value: object) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if hasattr(value, "timestamp"):
        ts = value.timestamp()
        assert isinstance(ts, float)
        return ts
    import datetime
    if isinstance(value, str):
        return datetime.datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    return 0.0


corrective_rag_engine = CorrectiveRAGEngine()
