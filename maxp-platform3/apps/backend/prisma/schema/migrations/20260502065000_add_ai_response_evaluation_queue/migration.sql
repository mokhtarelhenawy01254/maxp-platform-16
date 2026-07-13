CREATE TABLE IF NOT EXISTS "ai_response_evaluations" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "conversationId" TEXT,
  "customerId" TEXT,
  "userMessageId" TEXT,
  "aiMessageId" TEXT,
  "channel" TEXT,
  "agentMode" TEXT NOT NULL DEFAULT 'CORE',
  "provider" TEXT,
  "model" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PASS',
  "score" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "issueTypes" TEXT,
  "issues" TEXT,
  "evidence" TEXT,
  "userMessage" TEXT,
  "aiResponse" TEXT,
  "metadata" TEXT,
  "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_response_evaluations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_correction_queue" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "evaluationId" TEXT,
  "conversationId" TEXT,
  "customerId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "issueType" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'medium',
  "title" TEXT NOT NULL,
  "suggestedAction" TEXT NOT NULL,
  "suggestedRule" TEXT,
  "suggestedFewShot" TEXT,
  "userMessage" TEXT,
  "aiResponse" TEXT,
  "reviewerNote" TEXT,
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "appliedArtifactType" TEXT,
  "appliedArtifactId" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_correction_queue_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_response_evaluations_companyId_fkey'
  ) THEN
    ALTER TABLE "ai_response_evaluations"
      ADD CONSTRAINT "ai_response_evaluations_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_correction_queue_companyId_fkey'
  ) THEN
    ALTER TABLE "ai_correction_queue"
      ADD CONSTRAINT "ai_correction_queue_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_correction_queue_evaluationId_fkey'
  ) THEN
    ALTER TABLE "ai_correction_queue"
      ADD CONSTRAINT "ai_correction_queue_evaluationId_fkey"
      FOREIGN KEY ("evaluationId") REFERENCES "ai_response_evaluations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ai_response_evaluations_companyId_idx" ON "ai_response_evaluations"("companyId");
CREATE INDEX IF NOT EXISTS "ai_response_evaluations_companyId_status_createdAt_idx" ON "ai_response_evaluations"("companyId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "ai_response_evaluations_conversationId_idx" ON "ai_response_evaluations"("conversationId");
CREATE INDEX IF NOT EXISTS "ai_response_evaluations_aiMessageId_idx" ON "ai_response_evaluations"("aiMessageId");
CREATE INDEX IF NOT EXISTS "ai_response_evaluations_status_idx" ON "ai_response_evaluations"("status");
CREATE INDEX IF NOT EXISTS "ai_response_evaluations_createdAt_idx" ON "ai_response_evaluations"("createdAt");

CREATE INDEX IF NOT EXISTS "ai_correction_queue_companyId_idx" ON "ai_correction_queue"("companyId");
CREATE INDEX IF NOT EXISTS "ai_correction_queue_companyId_status_createdAt_idx" ON "ai_correction_queue"("companyId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "ai_correction_queue_evaluationId_idx" ON "ai_correction_queue"("evaluationId");
CREATE INDEX IF NOT EXISTS "ai_correction_queue_issueType_idx" ON "ai_correction_queue"("issueType");
CREATE INDEX IF NOT EXISTS "ai_correction_queue_status_idx" ON "ai_correction_queue"("status");
CREATE INDEX IF NOT EXISTS "ai_correction_queue_createdAt_idx" ON "ai_correction_queue"("createdAt");
