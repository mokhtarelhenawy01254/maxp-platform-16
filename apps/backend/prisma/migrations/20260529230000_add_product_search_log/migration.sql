-- CreateTable: ProductSearchLog
-- Tracks all product search queries, extracted filters, matched products, and conversion outcomes.
-- Used for observability, reporting, and future relevance-tuning feedback loops.

CREATE TABLE IF NOT EXISTS "product_search_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "conversationId" TEXT,
    "queryText" TEXT NOT NULL,
    "expandedQuery" TEXT,
    "extractedFilters" JSONB DEFAULT '{}',
    "searchWeights" JSONB DEFAULT '{}',
    "resolvedProductIds" TEXT[] DEFAULT '{}',
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "topScore" DOUBLE PRECISION DEFAULT 0,
    "searchStrategy" TEXT DEFAULT 'hybrid',
    "recoveryUsed" BOOLEAN NOT NULL DEFAULT false,
    "recoveryStrategy" TEXT,
    "conversionType" TEXT,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_search_logs_pkey" PRIMARY KEY ("id")
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS "product_search_logs_companyId_idx" ON "product_search_logs"("companyId");
CREATE INDEX IF NOT EXISTS "product_search_logs_createdAt_idx" ON "product_search_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "product_search_logs_conversionType_idx" ON "product_search_logs"("conversionType");
CREATE INDEX IF NOT EXISTS "product_search_logs_companyId_createdAt_idx" ON "product_search_logs"("companyId", "createdAt" DESC);
