-- Order confirmation & assignment support

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "confirmedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmationNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmationNotifiedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "assignedTo" TEXT,
  ADD COLUMN IF NOT EXISTS "assignedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "assignmentStrategy" TEXT;

ALTER TABLE "guest_orders"
  ADD COLUMN IF NOT EXISTS "confirmationNotifiedAt" TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS "order_confirmation_settings" (
  "id" TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "requireSourceTypes" TEXT,
  "requireStatuses" TEXT,
  "confirmStatus" TEXT NOT NULL DEFAULT 'CONFIRMED',
  "distributionEnabled" BOOLEAN NOT NULL DEFAULT false,
  "distributionStrategy" TEXT NOT NULL DEFAULT 'round_robin',
  "eligibleRoles" TEXT,
  "eligibleUserIds" TEXT,
  "regionRules" TEXT,
  "specialtyRules" TEXT,
  "workloadMaxOpen" INTEGER,
  "workloadStatuses" TEXT,
  "lastAssignedUserId" TEXT,
  "notifyOnNew" BOOLEAN NOT NULL DEFAULT true,
  "autoAssignOnConfirm" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "order_confirmation_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "order_assignments" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT,
  "guestOrderId" TEXT,
  "companyId" TEXT NOT NULL,
  "assignedTo" TEXT NOT NULL,
  "assignedBy" TEXT,
  "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "strategy" TEXT,
  "metadata" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "order_assignments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE,
  CONSTRAINT "order_assignments_guestOrderId_fkey" FOREIGN KEY ("guestOrderId") REFERENCES "guest_orders"("id") ON DELETE CASCADE,
  CONSTRAINT "order_assignments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "order_confirmation_settings_companyId_key"
  ON "order_confirmation_settings"("companyId");

CREATE INDEX IF NOT EXISTS "order_confirmation_settings_companyId_idx"
  ON "order_confirmation_settings"("companyId");

CREATE INDEX IF NOT EXISTS "orders_confirmedAt_idx"
  ON "orders"("confirmedAt");

CREATE INDEX IF NOT EXISTS "orders_confirmationNotifiedAt_idx"
  ON "orders"("confirmationNotifiedAt");

CREATE INDEX IF NOT EXISTS "orders_assignedTo_idx"
  ON "orders"("assignedTo");

CREATE INDEX IF NOT EXISTS "guest_orders_confirmationNotifiedAt_idx"
  ON "guest_orders"("confirmationNotifiedAt");

CREATE INDEX IF NOT EXISTS "order_assignments_orderId_idx"
  ON "order_assignments"("orderId");

CREATE INDEX IF NOT EXISTS "order_assignments_guestOrderId_idx"
  ON "order_assignments"("guestOrderId");

CREATE INDEX IF NOT EXISTS "order_assignments_companyId_idx"
  ON "order_assignments"("companyId");

CREATE INDEX IF NOT EXISTS "order_assignments_assignedTo_idx"
  ON "order_assignments"("assignedTo");
