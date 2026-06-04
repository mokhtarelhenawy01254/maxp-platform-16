CREATE TABLE "company_assistant_memory_indexes" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "channelId" TEXT,
    "externalUserId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'FACT',
    "contentHash" TEXT NOT NULL,
    "chunkText" TEXT NOT NULL,
    "keywords" TEXT,
    "embedding" TEXT,
    "embeddingProvider" TEXT,
    "embeddingGeneratedAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_assistant_memory_indexes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "company_assistant_memory_feedback" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "memoryId" TEXT,
    "commandLogId" TEXT,
    "channelId" TEXT,
    "externalUserId" TEXT,
    "signal" TEXT NOT NULL DEFAULT 'HELPFUL',
    "reason" TEXT,
    "metadata" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_assistant_memory_feedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_assistant_memory_index_memory_chunk" ON "company_assistant_memory_indexes"("memoryId", "contentHash");
CREATE INDEX "company_assistant_memory_indexes_companyId_type_idx" ON "company_assistant_memory_indexes"("companyId", "type");
CREATE INDEX "company_assistant_memory_indexes_companyId_channelId_externalUserId_idx" ON "company_assistant_memory_indexes"("companyId", "channelId", "externalUserId");
CREATE INDEX "company_assistant_memory_indexes_memoryId_idx" ON "company_assistant_memory_indexes"("memoryId");

CREATE INDEX "company_assistant_memory_feedback_companyId_memoryId_idx" ON "company_assistant_memory_feedback"("companyId", "memoryId");
CREATE INDEX "company_assistant_memory_feedback_companyId_commandLogId_idx" ON "company_assistant_memory_feedback"("companyId", "commandLogId");
CREATE INDEX "company_assistant_memory_feedback_companyId_createdAt_idx" ON "company_assistant_memory_feedback"("companyId", "createdAt");
