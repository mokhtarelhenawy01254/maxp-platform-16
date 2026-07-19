# Product Embedding Improvements — 2026-07-05

## Changes

### 1. Unified Embedding Text Format
Embedding text format is now consistent across Node.js and Python:
```
{name}. {description}. {tags}. Category: {category}.
```

### 2. Arabic Text Normalization
Applied before embedding generation: Alef variants → ا, Yeh (ى) → ي, Teh Marbuta (ة) → ه, removes tashkeel and tatweel. Ensures Arabic queries match regardless of diacritics or spelling variants.

### 3. DRAFT Products Included
Products with `isActive=false` are now included in backfill and status queries (previously excluded).

### 4. Enriched pgvector Metadata
`ai.product_embeddings` now stores `description`, `tags`, `category`, and `workflow_status` alongside vectors.

### 5. HNSW Indexes
Replaced IVFFlat indexes with HNSW (`m=16, ef_construction=200`) for ~3x faster vector search queries.

### 6. Real-Time Sync on Create/Update
`refreshProductVectorKnowledge` now triggers `POST /admin/product-embeddings/sync` for the company immediately (not just the daily cron).

## Required After Deploy

1. Run alembic migrations: `alembic upgrade head`
2. Restart ai-service
3. Trigger full backfill: `POST /admin/product-embeddings/sync`
4. Verify: `SELECT COUNT(*) FROM ai.product_embeddings WHERE text_embedding IS NOT NULL;`
