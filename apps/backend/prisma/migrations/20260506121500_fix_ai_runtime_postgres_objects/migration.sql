CREATE TABLE IF NOT EXISTS "ai_runtime_ledger" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "traceId" TEXT,
  "conversationId" TEXT,
  "customerId" TEXT,
  "userMessageId" TEXT,
  "outputMessageId" TEXT,
  "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_runtime_ledger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_runtime_ledger_idempotencyKey_key"
  ON "ai_runtime_ledger"("idempotencyKey");

CREATE INDEX IF NOT EXISTS "ai_runtime_ledger_companyId_idx"
  ON "ai_runtime_ledger"("companyId");

CREATE INDEX IF NOT EXISTS "ai_runtime_ledger_companyId_status_createdAt_idx"
  ON "ai_runtime_ledger"("companyId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "ai_runtime_ledger_conversationId_idx"
  ON "ai_runtime_ledger"("conversationId");

CREATE INDEX IF NOT EXISTS "ai_runtime_ledger_expiresAt_idx"
  ON "ai_runtime_ledger"("expiresAt");

CREATE INDEX IF NOT EXISTS "ai_runtime_ledger_traceId_idx"
  ON "ai_runtime_ledger"("traceId");

ALTER TABLE "ai_settings"
  ADD COLUMN IF NOT EXISTS "writeToolScopes" TEXT,
  ADD COLUMN IF NOT EXISTS "humanApprovalRequiredForWrite" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "ai_tool_approval_requests" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "toolName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "channel" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "sideEffects" TEXT NOT NULL DEFAULT 'write',
  "approvalMode" TEXT NOT NULL DEFAULT 'required',
  "reason" TEXT,
  "conversationId" TEXT,
  "customerId" TEXT,
  "traceId" TEXT,
  "idempotencyKey" TEXT,
  "requestedByType" TEXT NOT NULL DEFAULT 'ai_runtime',
  "requestedByUserId" TEXT,
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "executionStatus" TEXT,
  "executionStartedAt" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),
  "executedByUserId" TEXT,
  "executionTraceId" TEXT,
  "expiresAt" TIMESTAMP(3),
  "inputSnapshot" TEXT,
  "previewSnapshot" TEXT,
  "executionResultSnapshot" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_tool_approval_requests_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ai_tool_approval_requests"
  ADD COLUMN IF NOT EXISTS "executionStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "executionStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "executedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "executedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "executionTraceId" TEXT,
  ADD COLUMN IF NOT EXISTS "executionResultSnapshot" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ai_tool_approval_requests_requestKey_key"
  ON "ai_tool_approval_requests"("requestKey");

CREATE INDEX IF NOT EXISTS "ai_tool_approval_requests_companyId_idx"
  ON "ai_tool_approval_requests"("companyId");

CREATE INDEX IF NOT EXISTS "ai_tool_approval_requests_companyId_status_createdAt_idx"
  ON "ai_tool_approval_requests"("companyId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "ai_tool_approval_requests_companyId_executionStatus_createdAt_idx"
  ON "ai_tool_approval_requests"("companyId", "executionStatus", "createdAt");

CREATE INDEX IF NOT EXISTS "ai_tool_approval_requests_conversationId_idx"
  ON "ai_tool_approval_requests"("conversationId");

CREATE INDEX IF NOT EXISTS "ai_tool_approval_requests_traceId_idx"
  ON "ai_tool_approval_requests"("traceId");

CREATE INDEX IF NOT EXISTS "ai_tool_approval_requests_toolName_status_idx"
  ON "ai_tool_approval_requests"("toolName", "status");
