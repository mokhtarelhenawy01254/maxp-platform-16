-- Order confirmation queue indexes

CREATE INDEX IF NOT EXISTS "orders_companyId_status_createdAt_idx"
  ON "orders"("companyId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "orders_companyId_sourceType_createdAt_idx"
  ON "orders"("companyId", "sourceType", "createdAt");

CREATE INDEX IF NOT EXISTS "orders_companyId_confirmationNotifiedAt_idx"
  ON "orders"("companyId", "confirmationNotifiedAt");

CREATE INDEX IF NOT EXISTS "guest_orders_companyId_status_createdAt_idx"
  ON "guest_orders"("companyId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "guest_orders_companyId_confirmationNotifiedAt_idx"
  ON "guest_orders"("companyId", "confirmationNotifiedAt");

CREATE INDEX IF NOT EXISTS "order_assignments_companyId_assignedAt_idx"
  ON "order_assignments"("companyId", "assignedAt");

CREATE INDEX IF NOT EXISTS "order_assignments_companyId_strategy_assignedAt_idx"
  ON "order_assignments"("companyId", "strategy", "assignedAt");
