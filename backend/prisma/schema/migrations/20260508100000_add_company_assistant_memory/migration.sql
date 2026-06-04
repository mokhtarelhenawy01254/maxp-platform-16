CREATE TABLE "company_assistant_memories" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "channelId" TEXT,
    "externalUserId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'FACT',
    "content" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 3,
    "metadata" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_assistant_memories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "company_assistant_memories_companyId_type_importance_idx" ON "company_assistant_memories"("companyId", "type", "importance");
CREATE INDEX "company_assistant_memories_companyId_channelId_externalUserId_idx" ON "company_assistant_memories"("companyId", "channelId", "externalUserId");
CREATE INDEX "company_assistant_memories_companyId_expiresAt_idx" ON "company_assistant_memories"("companyId", "expiresAt");
