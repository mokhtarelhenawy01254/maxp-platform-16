CREATE TABLE "ai_tool_approval_requests" (
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
  "expiresAt" TIMESTAMP(3),
  "inputSnapshot" TEXT,
  "previewSnapshot" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_tool_approval_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_tool_approval_requests_requestKey_key"
  ON "ai_tool_approval_requests"("requestKey");

CREATE INDEX "ai_tool_approval_requests_companyId_idx"
  ON "ai_tool_approval_requests"("companyId");

CREATE INDEX "ai_tool_approval_requests_companyId_status_createdAt_idx"
  ON "ai_tool_approval_requests"("companyId", "status", "createdAt");

CREATE INDEX "ai_tool_approval_requests_conversationId_idx"
  ON "ai_tool_approval_requests"("conversationId");

CREATE INDEX "ai_tool_approval_requests_traceId_idx"
  ON "ai_tool_approval_requests"("traceId");

CREATE INDEX "ai_tool_approval_requests_toolName_status_idx"
  ON "ai_tool_approval_requests"("toolName", "status");
