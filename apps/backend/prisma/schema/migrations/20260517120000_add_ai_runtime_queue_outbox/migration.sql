CREATE TABLE "ai_runtime_queue_jobs" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "queueKey" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "lockedAt" TIMESTAMP(3),
  "lockToken" TEXT,
  "lockExpiresAt" TIMESTAMP(3),
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "inputSnapshot" TEXT NOT NULL,
  "resultSnapshot" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_runtime_queue_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_runtime_queue_jobs_queueKey_key"
  ON "ai_runtime_queue_jobs"("queueKey");
CREATE INDEX "ai_runtime_queue_jobs_companyId_idx"
  ON "ai_runtime_queue_jobs"("companyId");
CREATE INDEX "ai_runtime_queue_jobs_status_availableAt_priority_createdAt_idx"
  ON "ai_runtime_queue_jobs"("status", "availableAt", "priority", "createdAt");
CREATE INDEX "ai_runtime_queue_jobs_companyId_status_createdAt_idx"
  ON "ai_runtime_queue_jobs"("companyId", "status", "createdAt");
CREATE INDEX "ai_runtime_queue_jobs_lockExpiresAt_idx"
  ON "ai_runtime_queue_jobs"("lockExpiresAt");

CREATE TABLE "ai_delivery_outbox" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "outboxKey" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "messageType" TEXT NOT NULL DEFAULT 'TEXT',
  "recipientId" TEXT,
  "pageId" TEXT,
  "conversationId" TEXT,
  "customerId" TEXT,
  "messageId" TEXT,
  "facebookMessageId" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "lockedAt" TIMESTAMP(3),
  "lockToken" TEXT,
  "lockExpiresAt" TIMESTAMP(3),
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" TIMESTAMP(3),
  "lastError" TEXT,
  "payload" TEXT NOT NULL,
  "resultSnapshot" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_delivery_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_delivery_outbox_outboxKey_key"
  ON "ai_delivery_outbox"("outboxKey");
CREATE INDEX "ai_delivery_outbox_companyId_idx"
  ON "ai_delivery_outbox"("companyId");
CREATE INDEX "ai_delivery_outbox_status_availableAt_createdAt_idx"
  ON "ai_delivery_outbox"("status", "availableAt", "createdAt");
CREATE INDEX "ai_delivery_outbox_companyId_status_createdAt_idx"
  ON "ai_delivery_outbox"("companyId", "status", "createdAt");
CREATE INDEX "ai_delivery_outbox_conversationId_idx"
  ON "ai_delivery_outbox"("conversationId");
CREATE INDEX "ai_delivery_outbox_messageId_idx"
  ON "ai_delivery_outbox"("messageId");
CREATE INDEX "ai_delivery_outbox_lockExpiresAt_idx"
  ON "ai_delivery_outbox"("lockExpiresAt");
