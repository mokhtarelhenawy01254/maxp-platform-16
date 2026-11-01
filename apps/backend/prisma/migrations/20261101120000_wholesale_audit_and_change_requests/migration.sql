-- CreateTable
CREATE TABLE IF NOT EXISTS "wholesale_change_requests" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wholesale_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "wholesale_audit_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "performedBy" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wholesale_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wholesale_change_requests_companyId_idx" ON "wholesale_change_requests"("companyId");
CREATE INDEX IF NOT EXISTS "wholesale_change_requests_entityType_entityId_idx" ON "wholesale_change_requests"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "wholesale_change_requests_companyId_status_idx" ON "wholesale_change_requests"("companyId", "status");
CREATE INDEX IF NOT EXISTS "wholesale_change_requests_createdAt_idx" ON "wholesale_change_requests"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wholesale_audit_logs_companyId_idx" ON "wholesale_audit_logs"("companyId");
CREATE INDEX IF NOT EXISTS "wholesale_audit_logs_entityType_entityId_idx" ON "wholesale_audit_logs"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "wholesale_audit_logs_companyId_action_idx" ON "wholesale_audit_logs"("companyId", "action");
CREATE INDEX IF NOT EXISTS "wholesale_audit_logs_createdAt_idx" ON "wholesale_audit_logs"("createdAt");
